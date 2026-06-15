import { authedFetch } from "../core/http";
import { ollamaChat, OllamaError } from "../core/ollama";
import { ok, err, type Result, type SkillItem, type SkillInput } from "@compass/ipc-contract";

export const skillsService = {
  async list(): Promise<Result<{ data: SkillItem[] }>> {
    const res = await authedFetch("/skills", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load skills", json?.code);
    return ok({ data: json?.data ?? [] });
  },

  async add(input: SkillInput): Promise<Result<SkillItem>> {
    const res = await authedFetch("/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not add skill", json?.code);
    return ok(json as SkillItem);
  },

  async update(id: string, patch: Partial<SkillInput>): Promise<Result<SkillItem>> {
    const res = await authedFetch(`/skills/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Skill not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not update skill", json?.code);
    return ok(json as SkillItem);
  },

  async importFromExperiences(): Promise<Result<{ imported: number }>> {
    // 1. Fetch experience skills
    const fullRes = await authedFetch("/profile/full", { method: "GET" });
    if (!fullRes) return err("Could not reach the server", "NETWORK");
    if (fullRes.status === 401) return err("Session expired", "INVALID_TOKEN");
    const full = await fullRes.json().catch(() => ({}));
    const experiences: { skills?: string[] }[] = Array.isArray(full?.experiences) ? full.experiences : [];
    const raw = [...new Set(experiences.flatMap((e) => e.skills ?? []).map((s) => s.trim()).filter(Boolean))];
    if (!raw.length) return ok({ imported: 0 });

    // 2. Normalize via Ollama (fix casing, typos, dedupe)
    const normRes = await authedFetch("/skills/normalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skills: raw, promptOnly: true }),
    });
    if (!normRes) return err("Could not reach the server", "NETWORK");
    const normJson = await normRes.json().catch(() => ({}));
    if (!normRes.ok || !normJson?.systemPrompt) return err("Could not prepare normalization", normJson?.code);

    let normalized: string[] = raw;
    try {
      const out = await ollamaChat(normJson.systemPrompt, normJson.userPrompt, { format: normJson.schema });
      const parsed = JSON.parse(out.text) as { skills?: string[] };
      if (Array.isArray(parsed.skills) && parsed.skills.length) {
        normalized = parsed.skills.map((s: string) => s.trim()).filter(Boolean);
      }
    } catch (e) {
      if (e instanceof OllamaError) return err(e.message, e.code);
      // Fallback to raw if parsing fails
    }

    // 3. Delete existing skills and re-insert normalized ones
    const existing = Array.isArray(full?.skills) ? full.skills as { id: string }[] : [];
    await Promise.all(existing.map((s) => authedFetch(`/skills/${s.id}`, { method: "DELETE" })));

    const results = await Promise.all(
      normalized.map((skill, i) =>
        authedFetch("/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skill, section: "Primary", sortOrder: i }),
        }),
      ),
    );
    const imported = results.filter((r) => r && r.ok).length;
    return ok({ imported });
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/skills/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not remove skill", json?.code);
    }
    return ok(undefined);
  },
};
