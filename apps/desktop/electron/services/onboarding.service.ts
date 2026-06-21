import { authedFetch } from "../core/http";
import { fetchCompanyLogo, fetchSkillFavicon } from "../core/logos";
import { llmService, type ParsedCv } from "./llm.service";
import { ok, err, type Result, type OnboardingSubmit, type CvImportResult } from "@compass/ipc-contract";

async function postJson(path: string, body: unknown) {
  return authedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/** Normalize a partial date to YYYY-MM-DD (DB DATE) or null. */
function normDate(d?: string): string | null {
  if (!d) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  if (/^\d{4}-\d{2}$/.test(d)) return `${d}-01`;
  if (/^\d{4}$/.test(d)) return `${d}-01-01`;
  return null;
}

/**
 * Wipe existing structured rows for the given record types (one /profile/full read
 * → delete each row). Shared by onboarding submit and resume import so a re-run
 * replaces instead of duplicating.
 */
async function wipeRecords(keys: Array<{ key: string; path: string }>): Promise<void> {
  const fullRes = await authedFetch("/profile/full", { method: "GET" });
  const full = fullRes && fullRes.ok ? await fullRes.json().catch(() => ({})) : {};
  await Promise.all(
    keys.flatMap(({ key, path }) =>
      ((full[key] as { id: string }[] | undefined) ?? []).map((r) =>
        authedFetch(`${path}/${r.id}`, { method: "DELETE" }),
      ),
    ),
  );
}

/** Upsert the CV dump (markdown) + optional parsed profile JSON to co_cvs. */
async function putCv(contentMd: string, parsedJson?: ParsedCv): Promise<void> {
  await authedFetch("/cv", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentMd, ...(parsedJson ? { parsedJson } : {}) }),
  }).catch(() => undefined);
}

/** Read the stored CV (markdown dump + parsed JSON), if any. */
async function fetchStoredCv(): Promise<{ contentMd: string; parsedJson: ParsedCv | null }> {
  const res = await authedFetch("/cv", { method: "GET" }).catch(() => null);
  const j = res && res.ok ? await res.json().catch(() => ({})) : {};
  return {
    contentMd: typeof j?.contentMd === "string" ? j.contentMd : "",
    parsedJson: (j?.parsedJson as ParsedCv) ?? null,
  };
}

/**
 * Process a freshly uploaded resume end to end, in the BACKGROUND (never blocks the
 * user): save the raw dump instantly, then clean it to markdown AND parse it to our
 * profile JSON via the local LLM (claude → Ollama), and store both. The parsed JSON
 * is what the profile-page "Load from resume" reuses — so it never calls Claude again.
 */
async function processCv(rawText: string): Promise<void> {
  const trimmed = rawText.trim();
  if (!trimmed) return;
  await putCv(trimmed); // 1. raw immediately so the dump always exists
  const fmt = await llmService.formatCvMarkdown(trimmed).catch(() => null);
  const markdown = fmt && fmt.ok && fmt.data.markdown ? fmt.data.markdown : trimmed;
  const parsed = await llmService.importCv(markdown).catch(() => null);
  await putCv(markdown, parsed && parsed.ok ? parsed.data : undefined); // 2. markdown + JSON
}

/**
 * Back-fill company + skill logos for records that have none yet (resume import and
 * onboarding save names only). Best-effort, runs in the BACKGROUND: resolves logos
 * via daily.dev (same source as the UI autocompletes) and PATCHes them in. Covers
 * both flows uniformly. Never throws.
 */
async function enrichLogos(): Promise<void> {
  const [expRes, skillRes] = await Promise.all([
    authedFetch("/experiences", { method: "GET" }).catch(() => null),
    authedFetch("/skills", { method: "GET" }).catch(() => null),
  ]);
  const exp: Array<{ id: string; company?: string; companyImage?: string; domain?: string }> =
    expRes && expRes.ok ? (await expRes.json().catch(() => ({})))?.data ?? [] : [];
  const skills: Array<{ id: string; skill?: string; faviconUrl?: string }> =
    skillRes && skillRes.ok ? (await skillRes.json().catch(() => ({})))?.data ?? [] : [];

  const patch = (path: string, body: unknown) =>
    authedFetch(path, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(
      () => undefined,
    );

  await Promise.all([
    ...exp
      .filter((e) => e.company && !e.companyImage && !e.domain)
      .map(async (e) => {
        const image = await fetchCompanyLogo(e.company!);
        if (image) await patch(`/experiences/${e.id}`, { companyImage: image });
      }),
    ...skills
      .filter((s) => s.skill && !s.faviconUrl)
      .map(async (s) => {
        const fav = await fetchSkillFavicon(s.skill!);
        if (fav) await patch(`/skills/${s.id}`, { faviconUrl: fav });
      }),
  ]);
}

/** Loose key for dedupe — lowercase alphanumerics only. */
const dkey = (...parts: Array<string | null | undefined>) =>
  parts.map((s) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()).join("|");

/**
 * Write parsed CV records to the structured CRUD endpoints. APPENDS — it never
 * deletes existing rows (a resume import must not wipe data the user entered in
 * onboarding or edited by hand). Records that already exist (matched loosely) are
 * skipped so re-importing doesn't create duplicates.
 */
async function writeParsedCv(parsed: ParsedCv): Promise<CvImportResult["imported"]> {
  // Load what's already there so we add only genuinely new records.
  const fullRes = await authedFetch("/profile/full", { method: "GET" });
  const full = fullRes && fullRes.ok ? await fullRes.json().catch(() => ({})) : {};
  const has = <T>(rows: T[] | undefined, key: (r: T) => string) =>
    new Set((rows ?? []).map(key));

  const expSeen = has(full.experiences as { company?: string; title?: string }[], (e) => dkey(e.company, e.title));
  const eduSeen = has(full.education as { institution?: string; degree?: string }[], (e) => dkey(e.institution, e.degree));
  const projSeen = has(full.projects as { title?: string }[], (p) => dkey(p.title));
  const certSeen = has(full.certifications as { name?: string }[], (c) => dkey(c.name));
  const skillSeen = has(full.skills as { skill?: string }[], (s) => dkey(s.skill));

  const newExp = parsed.experiences.filter((e) => !expSeen.has(dkey(e.company, e.title)));
  const newEdu = parsed.education.filter((e) => !eduSeen.has(dkey(e.institution, e.degree)));
  const newProj = parsed.projects.filter((p) => !projSeen.has(dkey(p.title)));
  const newCert = parsed.certifications.filter((c) => !certSeen.has(dkey(c.name)));
  const existingSkills = ((full.skills as unknown[]) ?? []).length;
  const newSkills = [...new Set((parsed.skills ?? []).map((s) => s.trim()).filter(Boolean))]
    .filter((s) => !skillSeen.has(dkey(s)));

  // Profile-level fields — fill ONLY what's currently empty (never overwrite what
  // the user entered in onboarding or by hand; an old resume can't downgrade it).
  const prof = (full.profile ?? {}) as Record<string, unknown>;
  const pf = parsed.profileFields ?? {};
  const isEmpty = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
  const profilePatch: Record<string, unknown> = {};
  const fill = (key: string, val: unknown) => {
    if (val != null && val !== "" && isEmpty(prof[key])) profilePatch[key] = val;
  };
  fill("headline", parsed.headline);
  fill("narrative", parsed.summary); // bio ↔ narrative
  fill("fullName", pf.fullName);
  fill("location", pf.location);
  fill("phone", pf.phone);
  fill("currentCompany", pf.currentCompany);
  fill("currentDesignation", pf.currentDesignation);
  fill("totalExperienceYears", typeof pf.totalExperienceYears === "number" ? pf.totalExperienceYears : undefined);

  await Promise.all([
    ...newSkills.map((skill, i) =>
      postJson("/skills", { skill, section: "Primary", sortOrder: existingSkills + i }),
    ),
    ...(Object.keys(profilePatch).length
      ? [
          authedFetch("/profile", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(profilePatch),
          }).catch(() => undefined),
        ]
      : []),
    ...newExp.map((e) =>
      postJson("/experiences", {
        company: e.company || "Unknown",
        title: e.title || "Unknown",
        location: e.location || null,
        employmentType: e.employmentType || null,
        startDate: normDate(e.startDate),
        endDate: e.isCurrent ? null : normDate(e.endDate),
        isCurrent: Boolean(e.isCurrent),
        skills: e.skills ?? null,
        // co_experiences has `description`, not bullets — fold bullets in.
        description: e.bullets?.length ? e.bullets.join("\n") : null,
      }),
    ),
    ...newEdu.map((e) =>
      postJson("/education", {
        institution: e.institution || "Unknown",
        degree: e.degree || null,
        field: e.field || null,
        startYear: typeof e.startYear === "number" ? e.startYear : null,
        endYear: typeof e.endYear === "number" ? e.endYear : null,
        cgpa: typeof e.cgpa === "number" ? e.cgpa : null,
        percentage: typeof e.percentage === "number" ? e.percentage : null,
      }),
    ),
    ...newProj.map((p) =>
      postJson("/projects", {
        title: p.title || "Untitled",
        // co_projects has no metrics column — append it to the description.
        description: [p.description, p.metrics].filter(Boolean).join("\n\n") || null,
        techStack: p.techStack ?? null,
        url: p.url || null,
      }),
    ),
    ...newCert.map((c) =>
      postJson("/certifications", {
        name: c.name || "Unknown",
        issuer: c.issuer || null,
        issueDate: normDate(c.issueDate),
        expiryDate: normDate(c.expiryDate),
        credentialId: c.credentialId || null,
        url: c.url || null,
      }),
    ),
  ]);

  return {
    experiences: newExp.length,
    education: newEdu.length,
    certifications: newCert.length,
    projects: newProj.length,
  };
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
    await wipeRecords([
      { key: "experiences", path: "/experiences" },
      { key: "education", path: "/education" },
      { key: "projects", path: "/projects" },
      { key: "proofPoints", path: "/proof-points" },
      { key: "skills", path: "/skills" },
    ]);

    // 2. Re-create records. Profile skills aggregate from each role's skills.
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

    // 3. Flip the gate (single source of truth) so the user lands in the app now.
    const result = await this.complete();

    // 3b. Resume — processed in the BACKGROUND so it never blocks "Finish" (no
    // user-facing loading): raw dump saved instantly, then Claude cleans it to
    // markdown AND parses it to our profile JSON, both stored on co_cvs. The
    // profile-page "Load from resume" later reuses that JSON — no second Claude call.
    if (data.resumeText?.trim()) void processCv(data.resumeText).catch(() => undefined);

    // 3c. Back-fill company + skill logos in the background (best-effort).
    void enrichLogos().catch(() => undefined);

    return result;
  },

  /**
   * Apply a resume to the profile (append + fill-empty, never destructive).
   *  • Fresh upload (cvText): parse locally (claude → Ollama), apply, and store the
   *    dump + parsed JSON in the background for next time.
   *  • No cvText ("Load from resume"): reuse the parsed JSON already stored at
   *    onboarding — INSTANT, no Claude. Falls back to parsing the stored dump if the
   *    JSON isn't there yet (e.g. an older resume).
   */
  async importResume(cvText?: string): Promise<Result<CvImportResult>> {
    const fresh = cvText?.trim() ?? "";

    if (fresh) {
      const parsed = await llmService.importCv(fresh);
      if (!parsed.ok) return parsed;
      void processCv(fresh).catch(() => undefined); // store dump + JSON for reuse
      const imported = await writeParsedCv(parsed.data);
      await enrichLogos().catch(() => undefined); // logos ready before the page refetches
      return ok({ imported, reviewFlags: parsed.data.reviewFlags });
    }

    // "Load from resume" → use the pre-parsed JSON (instant); else parse the dump.
    const stored = await fetchStoredCv();
    let parsed: ParsedCv;
    if (stored.parsedJson && Array.isArray(stored.parsedJson.experiences)) {
      parsed = stored.parsedJson;
    } else if (stored.contentMd) {
      const live = await llmService.importCv(stored.contentMd);
      if (!live.ok) return live;
      parsed = live.data;
      void putCv(stored.contentMd, parsed).catch(() => undefined); // cache for next time
    } else {
      return err("No resume on file — upload one first.", "INVALID_INPUT");
    }

    const imported = await writeParsedCv(parsed);
    await enrichLogos().catch(() => undefined); // logos ready before the page refetches
    return ok({ imported, reviewFlags: parsed.reviewFlags ?? [] });
  },
};
