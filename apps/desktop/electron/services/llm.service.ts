import { authedFetch } from "../core/http";
import { ollamaChat, OllamaError } from "../core/ollama";
import { ok, err, type Result } from "@compass/ipc-contract";

/**
 * LLM service (BYO-LLM). Fetches the assembled prompt from career-ops (promptOnly)
 * and runs it on the user's local Ollama. Prompts are NEVER authored in the app.
 */
export const llmService = {
  /** Rewrite a rough proof-point draft into a polished line + extracted metric. */
  async optimizeProofPoint(draft: string, metric?: string): Promise<Result<{ text: string; metric: string }>> {
    if (!draft?.trim()) return err("Write something first", "EMPTY");

    // 1) Fetch the prompt + output schema from career-ops (server owns the wording).
    const res = await authedFetch("/proof-points/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draft, metric, promptOnly: true }),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok || !json?.systemPrompt || !json?.userPrompt) {
      return err(json?.error || "Could not prepare the rewrite", json?.code);
    }

    // 2) Run it locally on Ollama with structured (JSON) output.
    try {
      const out = await ollamaChat(json.systemPrompt, json.userPrompt, { format: json.schema });
      const clean = (s: unknown) => (typeof s === "string" ? s.replace(/^["'\s]+|["'\s]+$/g, "") : "");
      let text = "";
      let outMetric = "";
      try {
        const parsed = JSON.parse(out.text) as { text?: string; metric?: string };
        text = clean(parsed.text);
        outMetric = clean(parsed.metric);
      } catch {
        text = clean(out.text); // model ignored the schema — treat the whole reply as the line
      }
      if (!text) return err("The model returned nothing — try again.", "EMPTY_RESULT");
      return ok({ text, metric: outMetric });
    } catch (e) {
      if (e instanceof OllamaError) return err(e.message, e.code);
      return err(e instanceof Error ? e.message : "Local model failed", "OLLAMA_ERROR");
    }
  },

  /** Generate or refine a profile headline + bio via local Ollama. */
  async generateAbout(headline?: string, bio?: string): Promise<Result<{ headline: string; bio: string }>> {
    const res = await authedFetch("/profile/generate-about", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ headline, bio, promptOnly: true }),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok || !json?.systemPrompt || !json?.userPrompt) {
      return err(json?.error || "Could not prepare the rewrite", json?.code);
    }

    try {
      const out = await ollamaChat(json.systemPrompt, json.userPrompt, { format: json.schema });
      let outHeadline = "";
      let outBio = "";
      try {
        const parsed = JSON.parse(out.text) as { headline?: string; bio?: string };
        outHeadline = (parsed.headline ?? "").trim();
        outBio = (parsed.bio ?? "").trim();
      } catch {
        outHeadline = out.text.trim();
      }
      if (!outHeadline) return err("The model returned nothing — try again.", "EMPTY_RESULT");
      return ok({ headline: outHeadline, bio: outBio });
    } catch (e) {
      if (e instanceof OllamaError) return err(e.message, e.code);
      return err(e instanceof Error ? e.message : "Local model failed", "OLLAMA_ERROR");
    }
  },

  /** Extract candidate proof points from resume text via local Ollama. */
  async extractProofPoints(resumeText: string): Promise<Result<{ points: { title: string; metric: string }[] }>> {
    if (!resumeText?.trim()) return err("No resume text to read", "EMPTY");

    const res = await authedFetch("/proof-points/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText, promptOnly: true }),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok || !json?.systemPrompt || !json?.userPrompt) {
      return err(json?.error || "Could not prepare the extraction", json?.code);
    }

    try {
      const out = await ollamaChat(json.systemPrompt, json.userPrompt, { format: json.schema });
      let points: { title: string; metric: string }[] = [];
      try {
        const parsed = JSON.parse(out.text) as { points?: { title?: string; metric?: string }[] };
        points = (parsed.points ?? [])
          .map((p) => ({ title: (p.title ?? "").trim(), metric: (p.metric ?? "").trim() }))
          .filter((p) => p.title);
      } catch {
        return err("The model returned an unexpected format — try again.", "BAD_OUTPUT");
      }
      return ok({ points });
    } catch (e) {
      if (e instanceof OllamaError) return err(e.message, e.code);
      return err(e instanceof Error ? e.message : "Local model failed", "OLLAMA_ERROR");
    }
  },
};
