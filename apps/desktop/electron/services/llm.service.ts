import { authedFetch } from "../core/http";
import { ollamaChat, OllamaError } from "../core/ollama";
import { cliService } from "./cli.service";
import {
  buildAboutPrompt,
  buildCvImportPrompt,
  buildCvMarkdownPrompt,
  buildExtractPrompt,
  buildJobDescriptionPrompt,
  buildOptimizePrompt,
  type BuiltPrompt,
} from "../core/prompts";
import { ok, err, type Result } from "@compass/ipc-contract";

/** Profile-level fields the CV parser may derive. */
export interface ParsedProfileFields {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  currentCompany?: string;
  currentDesignation?: string;
  totalExperienceYears?: number;
  highestQualification?: string;
  graduationYear?: number;
}

/** Parsed structured records the CV-import prompt yields (camelCase, app-side). */
export interface ParsedCv {
  headline?: string;
  summary?: string;
  skills: string[];
  experiences: Array<{
    company?: string; title?: string; location?: string; employmentType?: string;
    startDate?: string; endDate?: string; isCurrent?: boolean; bullets?: string[]; skills?: string[];
  }>;
  education: Array<{
    institution?: string; degree?: string; field?: string;
    startYear?: number; endYear?: number; cgpa?: number; percentage?: number;
  }>;
  certifications: Array<{
    name?: string; issuer?: string; issueDate?: string; expiryDate?: string; credentialId?: string; url?: string;
  }>;
  projects: Array<{ title?: string; description?: string; techStack?: string[]; url?: string; metrics?: string }>;
  profileFields: ParsedProfileFields;
  reviewFlags: string[];
}

/** Fetch the user's stored CV dump (markdown) for grounding, if any. */
async function fetchStoredCv(): Promise<string> {
  const res = await authedFetch("/cv", { method: "GET" }).catch(() => null);
  if (!res || !res.ok) return "";
  const json = await res.json().catch(() => ({}));
  return typeof json?.contentMd === "string" ? json.contentMd : "";
}

/**
 * LLM service (BYO-LLM / BYO-agent). Prompts are assembled IN THE APP (core/prompts)
 * — no server endpoint, no API key from us. Inference runs on the user's own tools:
 * first the detected agent CLI (`claude -p`, their Claude quota), then local Ollama.
 */

/**
 * Pull the JSON value out of a model reply that may include prose, code fences, or
 * a chatty preamble — slices from the first brace/bracket to its matching close so
 * `JSON.parse` doesn't choke on surrounding text.
 */
function extractJson(s: string): string {
  let t = s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  const objStart = t.indexOf("{");
  const arrStart = t.indexOf("[");
  const start =
    objStart === -1 ? arrStart : arrStart === -1 ? objStart : Math.min(objStart, arrStart);
  if (start === -1) return t;
  const open = t[start];
  const close = open === "{" ? "}" : "]";
  const end = t.lastIndexOf(close);
  if (end > start) t = t.slice(start, end + 1);
  return t;
}

/**
 * Run an assembled prompt and return the model's text. Provider order: detected
 * agent CLI → local Ollama → error. The agent gets system+user merged (CLI has no
 * separate system channel). `json` (default true) appends a strict JSON-only
 * instruction, uses structured Ollama output, and extracts the JSON from the reply.
 * Pass false for prose/markdown.
 */
async function runInference(p: BuiltPrompt, opts: { json?: boolean } = {}): Promise<Result<{ text: string }>> {
  const json = opts.json ?? true;
  const merged = json
    ? `${p.systemPrompt}\n\n${p.userPrompt}\n\n` +
      "Respond with ONLY a single JSON object matching the shape described above. " +
      "No markdown, no code fences, no commentary."
    : `${p.systemPrompt}\n\n${p.userPrompt}`;

  const agent = await cliService.runAgent(merged);
  if (agent.ok && agent.data.text.trim()) {
    return ok({ text: json ? extractJson(agent.data.text) : agent.data.text });
  }

  // No agent (or it failed) → local Ollama. Structured output only for JSON.
  try {
    const out = await ollamaChat(p.systemPrompt, p.userPrompt, json ? { format: p.schema } : {});
    if (!out.text.trim()) return err("The model returned nothing — try again.", "EMPTY_RESULT");
    return ok({ text: json ? extractJson(out.text) : out.text });
  } catch (e) {
    if (e instanceof OllamaError) return err(e.message, e.code);
    return err(e instanceof Error ? e.message : "Local model failed", "OLLAMA_ERROR");
  }
}

export const llmService = {
  /** Rewrite a rough proof-point draft into a polished line + extracted metric. */
  async optimizeProofPoint(draft: string, metric?: string): Promise<Result<{ text: string; metric: string }>> {
    if (!draft?.trim()) return err("Write something first", "EMPTY");

    const run = await runInference(buildOptimizePrompt(draft, metric));
    if (!run.ok) return run;

    const clean = (s: unknown) => (typeof s === "string" ? s.replace(/^["'\s]+|["'\s]+$/g, "") : "");
    let text = "";
    let outMetric = "";
    try {
      const parsed = JSON.parse(run.data.text) as { text?: string; metric?: string };
      text = clean(parsed.text);
      outMetric = clean(parsed.metric);
    } catch {
      text = clean(run.data.text); // model ignored the schema — treat the whole reply as the line
    }
    if (!text) return err("The model returned nothing — try again.", "EMPTY_RESULT");
    return ok({ text, metric: outMetric });
  },

  /** Generate or refine a profile headline + bio, grounded in the stored resume. */
  async generateAbout(headline?: string, bio?: string): Promise<Result<{ headline: string; bio: string }>> {
    const cvText = await fetchStoredCv();
    const run = await runInference(buildAboutPrompt(headline, bio, cvText));
    if (!run.ok) return run;

    let outHeadline = "";
    let outBio = "";
    try {
      const parsed = JSON.parse(run.data.text) as { headline?: string; bio?: string };
      outHeadline = (parsed.headline ?? "").trim();
      outBio = (parsed.bio ?? "").trim();
    } catch {
      outHeadline = run.data.text.trim();
    }
    if (!outHeadline) return err("The model returned nothing — try again.", "EMPTY_RESULT");
    return ok({ headline: outHeadline, bio: outBio });
  },

  /**
   * Extract candidate proof points from resume text. If no text is passed (e.g.
   * the profile page, or a reused on-file resume), fall back to the stored CV dump.
   */
  async extractProofPoints(resumeText?: string): Promise<Result<{ points: { title: string; metric: string }[] }>> {
    const text = resumeText?.trim() || (await fetchStoredCv());
    if (!text.trim()) return err("No resume on file — upload one first.", "EMPTY");

    const run = await runInference(buildExtractPrompt(text));
    if (!run.ok) return run;

    let points: { title: string; metric: string }[] = [];
    try {
      const parsed = JSON.parse(run.data.text) as { points?: { title?: string; metric?: string }[] };
      points = (parsed.points ?? [])
        .map((p) => ({ title: (p.title ?? "").trim(), metric: (p.metric ?? "").trim() }))
        .filter((p) => p.title);
    } catch {
      return err("The model returned an unexpected format — try again.", "BAD_OUTPUT");
    }
    return ok({ points });
  },

  /** Write/rewrite one job's description from the stored resume (claude → Ollama). */
  async writeJobDescription(
    company: string,
    title: string,
    draft?: string,
  ): Promise<Result<{ text: string }>> {
    const cvText = await fetchStoredCv();
    if (!cvText.trim()) return err("No resume on file — upload one first.", "EMPTY");
    const run = await runInference(buildJobDescriptionPrompt(company, title, cvText, draft), { json: false });
    if (!run.ok) return run;
    const text = run.data.text.trim();
    if (!text) return err("The model returned nothing — try again.", "EMPTY_RESULT");
    return ok({ text });
  },

  /** Reformat messy extracted resume text into clean, well-sectioned markdown. */
  async formatCvMarkdown(rawText: string): Promise<Result<{ markdown: string }>> {
    if (!rawText?.trim()) return err("No resume text to format", "EMPTY");
    const run = await runInference(buildCvMarkdownPrompt(rawText), { json: false });
    if (!run.ok) return run;
    const markdown = run.data.text.trim();
    if (!markdown) return err("The model returned nothing — try again.", "EMPTY_RESULT");
    return ok({ markdown });
  },

  /** Parse a resume into structured records (experiences/education/certs/projects). */
  async importCv(cvText: string): Promise<Result<ParsedCv>> {
    if (!cvText?.trim() || cvText.trim().length < 50) {
      return err("CV text too short to parse", "EMPTY");
    }

    const run = await runInference(buildCvImportPrompt(cvText));
    if (!run.ok) return run;

    try {
      const p = JSON.parse(run.data.text) as Partial<ParsedCv>;
      return ok({
        headline: typeof p.headline === "string" ? p.headline : undefined,
        summary: typeof p.summary === "string" ? p.summary : undefined,
        skills: Array.isArray(p.skills) ? p.skills.filter((s): s is string => typeof s === "string") : [],
        experiences: Array.isArray(p.experiences) ? p.experiences : [],
        education: Array.isArray(p.education) ? p.education : [],
        certifications: Array.isArray(p.certifications) ? p.certifications : [],
        projects: Array.isArray(p.projects) ? p.projects : [],
        profileFields: (p.profileFields as ParsedCv["profileFields"]) ?? {},
        reviewFlags: Array.isArray(p.reviewFlags) ? p.reviewFlags : [],
      });
    } catch {
      return err("The model returned an unexpected format — try again.", "BAD_OUTPUT");
    }
  },
};
