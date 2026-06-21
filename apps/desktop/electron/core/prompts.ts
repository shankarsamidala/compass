/**
 * BYO-LLM prompt templates (REINIT). These used to be assembled server-side and
 * fetched via `promptOnly`; now they live in the app so inference runs fully
 * client-side (agent CLI → Ollama) with NO server dependency. Wording recovered
 * verbatim from the original career-ops api so output quality is unchanged.
 */

export interface BuiltPrompt {
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
}

// ── Profile: generate headline + bio ─────────────────────────────────────────
export const ABOUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", description: "One-line professional headline. Concise, specific, no buzzwords." },
    bio: { type: "string", description: "2-3 sentence professional bio written in third person." },
  },
  required: ["headline", "bio"],
} as const;

export function buildAboutPrompt(headline?: string, bio?: string, cvText?: string): BuiltPrompt {
  const systemPrompt = [
    "You are a professional copywriter crafting a developer's profile headline and bio. Be precise and concise — distill, don't enumerate.",
    "Return a JSON object with:",
    '- "headline": one sharp line, UNDER 70 characters. Format like "Role · core specialty" (e.g. "DevOps Engineer · CI/CD & multi-cloud reliability"). No buzzwords.',
    '- "bio": AT MOST 2 short sentences, ~40 words total. Lead with role + years + domain, then the single most distinctive strength. Third person.',
    "Rules:",
    "- Be ruthless about brevity: cut filler, adjectives, and exhaustive tool/environment lists. Pick what matters, drop the rest.",
    "- Ground it in real facts from the resume (years, domain, scale, impact) — but summarize, never copy the resume summary verbatim.",
    "- If the user gave a draft, tighten it; if it's long, compress hard.",
    "- ATS-safe plain text only: no markdown, no emojis, no lists.",
  ].join("\n");

  const parts: string[] = [];
  if (headline?.trim()) parts.push(`Current headline draft: ${headline.trim()}`);
  if (bio?.trim()) parts.push(`Current bio draft: ${bio.trim()}`);
  if (cvText?.trim()) parts.push(`\nResume (source of truth — use these facts):\n${cvText.trim().slice(0, 8000)}`);
  if (!parts.length) parts.push("No draft yet — generate a compelling headline and bio from scratch.");
  const userPrompt = parts.join("\n");

  return { systemPrompt, userPrompt, schema: ABOUT_SCHEMA as unknown as Record<string, unknown> };
}

// ── CV format: clean raw resume text into structured markdown ────────────────
export function buildCvMarkdownPrompt(rawText: string): BuiltPrompt {
  const systemPrompt = [
    "You are a resume formatter. Reformat messy extracted resume text into clean, well-structured Markdown.",
    "Use clear sections with `##` headings where the content exists: Summary, Experience, Education, Skills, Projects, Certifications, Contact.",
    "Under Experience, use a heading per role (company · title · dates) followed by bullet points.",
    "Rules:",
    "- PRESERVE every fact. Never invent, drop, or embellish information.",
    "- Fix broken line wraps, spacing, and bullet artifacts from PDF/DOCX extraction.",
    "- Keep it ATS-safe: plain Markdown only, no tables, no HTML, no emojis.",
    "- Output ONLY the Markdown document — no preamble, no commentary, no code fences.",
  ].join("\n");

  const userPrompt = "Reformat this extracted resume text into clean Markdown:\n\n" + rawText.trim().slice(0, 16000);

  return { systemPrompt, userPrompt, schema: {} };
}

// ── Job description: write/rewrite one role's description from the resume ─────
export function buildJobDescriptionPrompt(
  company: string,
  title: string,
  cvText: string,
  draft?: string,
): BuiltPrompt {
  const systemPrompt = [
    "You are an expert resume editor. Write a concise, professional description for ONE work role, grounded in the candidate's resume.",
    "Output 3–6 bullet points, one per line, each starting with '- '.",
    "Each bullet: past-tense action verb first, most impressive quantified result early, specific about impact.",
    "Rules:",
    "- Use ONLY facts present in the resume for THIS role. Never invent companies, numbers, or outcomes.",
    "- If a draft is provided, refine and tighten it — don't discard real detail.",
    "- ATS-safe plain text: no markdown headers, no preamble, no surrounding quotes. Bullets only.",
  ].join("\n");

  const userPrompt = [
    `Role: ${title || "(unknown title)"} at ${company || "(unknown company)"}`,
    draft?.trim() ? `\nCurrent draft to improve:\n${draft.trim()}` : "",
    "\nResume (source of truth):",
    cvText.trim().slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt, schema: {} };
}

// ── CV import: parse a resume into structured records ────────────────────────
export const CV_IMPORT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["experiences", "education", "certifications", "projects", "skills", "profileFields", "reviewFlags"],
  properties: {
    headline: { type: "string", description: "One-line professional headline derived from the resume." },
    summary: { type: "string", description: "2-3 sentence professional summary/about, third person, from the Summary section." },
    skills: {
      type: "array",
      description: "Flat list of individual skills/tools from the Skills section (e.g. Docker, Kubernetes, Terraform).",
      items: { type: "string" },
    },
    experiences: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["company", "title"],
        properties: {
          company: { type: "string" },
          title: { type: "string" },
          location: { type: "string" },
          employmentType: { type: "string", description: "permanent | contract | c2h | internship | freelance | empty" },
          startDate: { type: "string", description: "YYYY-MM-DD or YYYY-MM or YYYY or empty" },
          endDate: { type: "string", description: "YYYY-MM-DD or empty if current" },
          isCurrent: { type: "boolean" },
          bullets: { type: "array", items: { type: "string" } },
          skills: { type: "array", items: { type: "string" } },
        },
      },
    },
    education: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["institution"],
        properties: {
          institution: { type: "string" },
          degree: { type: "string" },
          field: { type: "string" },
          startYear: { type: "number" },
          endYear: { type: "number" },
          cgpa: { type: "number" },
          percentage: { type: "number" },
        },
      },
    },
    certifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string" },
          issuer: { type: "string" },
          issueDate: { type: "string" },
          expiryDate: { type: "string" },
          credentialId: { type: "string" },
          url: { type: "string" },
        },
      },
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          techStack: { type: "array", items: { type: "string" } },
          url: { type: "string" },
          metrics: { type: "string" },
        },
      },
    },
    profileFields: {
      type: "object",
      additionalProperties: false,
      description: "Derived profile-level fields, only if clearly present in the CV",
      properties: {
        fullName: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string", description: "City / current location" },
        currentCompany: { type: "string" },
        currentDesignation: { type: "string" },
        totalExperienceYears: { type: "number" },
        highestQualification: { type: "string" },
        graduationYear: { type: "number" },
      },
    },
    reviewFlags: {
      type: "array",
      items: { type: "string" },
      description: "Low-confidence extractions the user should review (e.g. ambiguous dates)",
    },
  },
} as const;

export function buildCvImportPrompt(cvText: string): BuiltPrompt {
  const systemPrompt = [
    "You are a CV parser. Extract structured data from a CV / LinkedIn export into a JSON object.",
    "Fields: headline, summary, skills, experiences, education, certifications, projects, profileFields, reviewFlags.",
    "Rules:",
    "- NEVER invent data. Only extract what is present.",
    "- experiences[].bullets: capture the role's responsibility/achievement lines verbatim-ish (these become the role description).",
    "- skills: a flat de-duplicated list of individual tools/technologies from the Skills section.",
    "- headline + summary: derive from the Summary/About section; summary in third person.",
    "- For dates, use YYYY-MM-DD; if only month/year or year is known, return what you have.",
    "- isCurrent=true for the present role (no endDate).",
    "- For anything ambiguous or low-confidence, add a short note to reviewFlags instead of guessing.",
    "- Only fill profileFields when clearly derivable.",
  ].join("\n");

  const userPrompt =
    "Parse this CV into structured headline, summary, skills, experiences, education, certifications, projects, and profile fields:\n\n" +
    cvText.trim().slice(0, 12000);

  return { systemPrompt, userPrompt, schema: CV_IMPORT_SCHEMA as unknown as Record<string, unknown> };
}

// ── Proof points: extract from resume ────────────────────────────────────────
export const EXTRACT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    points: {
      type: "array",
      description: "3–6 strongest achievements found in the resume.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "One-line achievement, action-verb led, metrics-first." },
          metric: {
            type: "string",
            description:
              "Short LABELED metric — say what it measures, e.g. '-90% infra cost', '2.1s → 380ms p95', '+40% conversion'. Never a bare number like '-90%'. Empty string if none.",
          },
        },
        required: ["title", "metric"],
      },
    },
  },
  required: ["points"],
} as const;

export function buildExtractPrompt(resumeText: string, targetRoles?: string[]): BuiltPrompt {
  const systemPrompt = [
    "You are an expert resume editor. Read the candidate's resume text and extract their strongest achievements as CV proof points.",
    'Respond with a JSON object: { "points": [ { "text" omitted — use "title", "metric" } ] }.',
    "Each point has:",
    '- "title": one polished line, past-tense action verb first, most impressive quantified result early.',
    '- "metric": a short LABELED metric — always say what the number measures, e.g. "-90% infra cost", "2.1s → 380ms p95", "+40% conversion". Never a bare number like "-90%". Use "" if there are no numbers.',
    "Rules:",
    "- Return between 3 and 6 of the most impressive, quantified achievements. Fewer if the resume is thin.",
    "- ONLY use facts present in the resume. Never invent numbers, employers, or outcomes.",
    "- Prefer achievements with measurable impact (%, time, money, scale) over responsibilities.",
    "- ATS-safe plain text, implied third person, no markdown, no bullets, no surrounding quotes.",
  ].join("\n");

  const userPrompt = [
    targetRoles?.length ? `Target roles: ${targetRoles.join(", ")}\n` : "",
    "Resume text:",
    resumeText.trim().slice(0, 12000),
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt, schema: EXTRACT_SCHEMA as unknown as Record<string, unknown> };
}

// ── Proof points: optimize a rough draft ─────────────────────────────────────
export const OPTIMIZE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    text: { type: "string", description: "The single rewritten achievement line." },
    metric: {
      type: "string",
      description:
        "Short LABELED metric — always say what the number measures, e.g. '-90% infra cost', '2.1s → 380ms p95', '+40% conversion'. Never a bare number like '-90%'. Empty string if there are no numbers.",
    },
  },
  required: ["text", "metric"],
} as const;

export function buildOptimizePrompt(draft: string, metric?: string, targetRoles?: string[]): BuiltPrompt {
  const systemPrompt = [
    "You are an expert resume editor. Rewrite a candidate's rough note into a polished proof-point line for a CV.",
    "Respond with a JSON object with two fields:",
    '- "text": the single rewritten achievement line.',
    '- "metric": a short LABELED metric — always say what the number measures, e.g. "-90% infra cost", "2.1s → 380ms p95", "+40% conversion". Never a bare number like "-90%". Use "" if there are no numbers.',
    'Rules for "text":',
    "- Exactly one line. No bullet markers, no surrounding quotes, no preamble.",
    "- Lead with a strong past-tense action verb.",
    "- Surface the most impressive quantified result early. Keep any real numbers the candidate gave; never invent metrics.",
    "- Be specific about the action and its impact. Remove filler and buzzwords.",
    "- Write in implied third person — no 'I', 'my', or 'we'.",
    "- ATS-safe plain text only: no markdown, no emojis.",
    "- Stay truthful to the input. If no metric is given, still make it concrete and outcome-focused.",
  ].join("\n");

  const userPrompt = [
    `Rough note:\n${draft.trim()}`,
    metric?.trim() ? `\nMetric the candidate flagged: ${metric.trim()}` : "",
    targetRoles?.length ? `\nTailor the tone for these target roles: ${targetRoles.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { systemPrompt, userPrompt, schema: OPTIMIZE_SCHEMA as unknown as Record<string, unknown> };
}
