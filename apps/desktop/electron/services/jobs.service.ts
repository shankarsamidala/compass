import { authedFetch } from "../core/http";
import { ok, err, type Result, type FeedJob, type ScanResult } from "@compass/ipc-contract";
import { searchJobsForRole } from "./naukri.service";

/** Map a raw career-ops job row to the lean FeedJob the renderer needs. */
function toFeedJob(j: any): FeedJob {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    location: j.location ?? null,
    source: j.source,
    jobUrl: j.jobUrl ?? null,
    jd: j.jd ?? null,
    postedAt: j.postedAt ?? null,
    score: typeof j.score === "number" ? j.score : null,
    quickScore: typeof j.quickScore === "number" ? j.quickScore : null,
    recommendation: j.recommendation ?? null,
  };
}

/**
 * Jobs service — reads the user's ranked feed + single jobs from career-ops.
 * (Scraping → POST /jobs/ingest lands in Phase B.)
 */
export const jobsService = {
  async list(): Promise<Result<{ jobs: FeedJob[] }>> {
    const res = await authedFetch("/jobs", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load jobs", json?.code);
    const jobs = Array.isArray(json?.jobs) ? json.jobs.map(toFeedJob) : [];
    return ok({ jobs });
  },

  async get(id: string): Promise<Result<{ job: FeedJob }>> {
    const res = await authedFetch(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Job not found", "NOT_FOUND");
    if (!res.ok || !json?.job) return err(json?.error || "Could not load job", json?.code);
    return ok({ job: toFeedJob(json.job) });
  },

  async scan(opts: { maxPerRole: number; jobAge: number }): Promise<Result<ScanResult>> {
    // Step 1 — fetch the user's canonical target roles (with slugs needed for ingest).
    const rolesRes = await authedFetch("/jobs/target-roles", { method: "GET" });
    if (!rolesRes) return err("Could not reach the server", "NETWORK");
    if (rolesRes.status === 401) return err("Session expired", "INVALID_TOKEN");
    const rolesJson = await rolesRes.json().catch(() => ({}));
    const roles: Array<{ name: string; slug: string }> = rolesJson?.roles ?? [];
    if (roles.length === 0) return err("No target roles set — add target roles in Job Preferences first.", "NO_ROLES");

    // Step 2 — scrape Naukri locally (user's IP → no server-side blocks).
    const perRole: Array<{ role: string; found: number }> = [];
    const allJobs: Array<{
      source: string; canonicalRoleSlug: string; title: string; company: string;
      location?: string; jobUrl?: string; externalId?: string; jobDescription?: string;
    }> = [];

    for (const role of roles) {
      const scraped = await searchJobsForRole(role.name, opts.maxPerRole, opts.jobAge).catch(() => []);
      perRole.push({ role: role.name, found: scraped.length });
      for (const j of scraped) {
        // Build a rich JD: full description + skills block so the feed card and
        // detail view have real content, and the embedding has more signal.
        const skillsBlock = j.skills.length > 0 ? `\n\nKey Skills: ${j.skills.join(", ")}` : "";
        const expBlock = j.experienceMin != null
          ? `\n\nExperience: ${j.experienceMin}${j.experienceMax != null ? `–${j.experienceMax}` : "+"} years`
          : "";
        const salBlock = j.salaryRaw ? `\nSalary: ${j.salaryRaw}` : "";
        const jd = (j.fullDescription || j.shortDescription) + skillsBlock + expBlock + salBlock;

        allJobs.push({
          source: j.source,
          canonicalRoleSlug: role.slug,
          title: j.title,
          company: j.company,
          location: j.location || j.workMode || undefined,
          jobUrl: j.sourceUrl || undefined,
          externalId: j.sourceJobId,
          jobDescription: jd || undefined,
          postedAt: j.postedAt ?? undefined,
        });
      }
    }

    if (allJobs.length === 0) {
      return ok({ scannedRoles: roles.length, inserted: 0, refreshed: 0, embedded: 0, perRole });
    }

    // Step 3 — ship scraped jobs to career-ops via user-ingest (central DB + embedding).
    const ingestRes = await authedFetch("/jobs/user-ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobs: allJobs }),
    });
    if (!ingestRes) return err("Could not reach the server", "NETWORK");
    if (ingestRes.status === 401) return err("Session expired", "INVALID_TOKEN");
    const ingestJson = await ingestRes.json().catch(() => ({}));
    if (!ingestRes.ok) return err(ingestJson?.error || "Ingest failed", ingestJson?.code);

    return ok({
      scannedRoles: roles.length,
      inserted: ingestJson.inserted ?? 0,
      refreshed: ingestJson.refreshed ?? 0,
      embedded: ingestJson.embedded ?? 0,
      perRole,
    });
  },
};
