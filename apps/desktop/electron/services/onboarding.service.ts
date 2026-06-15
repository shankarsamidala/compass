import { authedFetch } from "../core/http";
import { ok, err, type Result, type OnboardingSubmit } from "@compass/ipc-contract";

async function postJson(path: string, body: unknown) {
  return authedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Onboarding service (REIN-312/313). Reads/sets the onboarding flag via career-ops
 * `/onboarding/{status,complete}`. The profile-data submit (experiences/education/…)
 * is added with the step screens.
 */
export const onboardingService = {
  async status(): Promise<Result<{ onboardingCompleted: boolean }>> {
    const res = await authedFetch("/onboarding/status", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.ok) return ok({ onboardingCompleted: Boolean(json?.onboardingCompleted) });
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    return err(json?.error || "Failed to read onboarding status", json?.code);
  },

  async complete(): Promise<Result<{ onboardingCompleted: boolean }>> {
    const res = await authedFetch("/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.ok) return ok({ onboardingCompleted: Boolean(json?.onboardingCompleted) });
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    return err(json?.error || "Could not complete onboarding", json?.code);
  },

  /**
   * Idempotent onboarding submit (REIN-313), mirroring studio:
   *   PUT /profile → load /profile/full → DELETE existing records → POST records → complete.
   * Replace (not append) so a retry after a partial submit doesn't duplicate rows.
   */
  async submit(data: OnboardingSubmit): Promise<Result<{ onboardingCompleted: boolean }>> {
    // 1. Profile (must succeed first).
    const p = await authedFetch("/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data.profile),
    });
    if (!p) return err("Could not reach the server", "NETWORK");
    if (!p.ok) {
      const j = await p.json().catch(() => ({}));
      if (p.status === 401) return err("Session expired", "INVALID_TOKEN");
      return err(j?.error || "Could not save your profile", j?.code);
    }

    // 1b. Idempotency — wipe existing structured rows.
    const fullRes = await authedFetch("/profile/full", { method: "GET" });
    const full = fullRes && fullRes.ok ? await fullRes.json().catch(() => ({})) : {};
    const delIds = (rows: { id: string }[] | undefined, path: string) =>
      (rows ?? []).map((r) => authedFetch(`${path}/${r.id}`, { method: "DELETE" }));
    await Promise.all([
      ...delIds(full.experiences, "/experiences"),
      ...delIds(full.education, "/education"),
      ...delIds(full.projects, "/projects"),
      ...delIds(full.proofPoints, "/proof-points"),
      ...delIds(full.skills, "/skills"),
    ]);

    // 2. Re-create records.
    const uniqueSkills = [
      ...new Set(data.experiences.flatMap((e) => e.skills ?? []).map((s) => s.trim()).filter(Boolean)),
    ];
    await Promise.all([
      ...data.experiences.map((e) => postJson("/experiences", e)),
      ...data.education.map((e) => postJson("/education", e)),
      ...data.projects.map((e) => postJson("/projects", e)),
      ...data.proofPoints.map((e) => postJson("/proof-points", e)),
      ...uniqueSkills.map((skill, i) => postJson("/skills", { skill, section: "Primary", sortOrder: i })),
    ]);

    // 3. Flip the gate (single source of truth).
    return this.complete();
  },
};
