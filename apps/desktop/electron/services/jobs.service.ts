import { authedFetch } from "../core/http";
import { ok, err, type Result, type FeedJob, type ScanResult, type JobEvaluation } from "@compass/ipc-contract";
import { searchJobsForRole } from "./naukri.service";
import { cliService } from "./cli.service";

/** Normalize quick (blockA/evaluationId) and full (blocks/id) eval responses → JobEvaluation. */
function toEvaluation(j: any): JobEvaluation {
  return {
    id: j.id ?? j.evaluationId,
    jobId: j.jobId,
    status: j.status ?? (j.blocks ? "complete" : "partial"),
    score: Number(j.score),
    archetype: j.archetype,
    legitimacyTier: j.legitimacyTier ?? null,
    recommendation: j.recommendation ?? j.machineSummary?.recommendation,
    machineSummary: j.machineSummary ?? { recommendation: j.recommendation ?? "consider" },
    blocks: j.blocks ?? (j.blockA ? { a: j.blockA } : {}),
    rawReport: j.rawReport,
  };
}

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
    logoUrl: j.logoUrl ?? null,
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

    // Step 1b — read the user's experience to filter the search (mirrors the website's `experience=` param).
    let experience: number | null = null;
    const profRes = await authedFetch("/profile", { method: "GET" }).catch(() => null);
    if (profRes?.ok) {
      const prof = await profRes.json().catch(() => ({}));
      const yrs = prof?.totalExperienceYears;
      if (yrs != null && yrs !== "") experience = Number(yrs);
    }

    // Step 2 — ONE combined search across all roles (comma-separated keyword, like the
    // naukri.com page) on the user's IP → fewer requests, Naukri's own combined ranking.
    const combinedKeyword = roles.map((r) => r.name).join(", ");
    const scraped = await searchJobsForRole(
      combinedKeyword,
      Math.min(50, opts.maxPerRole * roles.length),
      opts.jobAge,
      experience,
    ).catch(() => []);

    // Attribute each result to the best-matching canonical role (combined search loses
    // per-role attribution; the pool requires a canonical role per job).
    const pickSlug = (title: string): { slug: string; name: string } => {
      const t = title.toLowerCase();
      for (const r of roles) {
        const words = r.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
        if (words.some((w) => t.includes(w))) return r;
      }
      return roles[0];
    };

    const counts = new Map<string, number>();
    const allJobs: Array<{
      source: string; canonicalRoleSlug: string; title: string; company: string;
      location?: string; jobUrl?: string; externalId?: string; jobDescription?: string;
      postedAt?: string; logoUrl?: string; skills?: string[];
    }> = [];

    for (const j of scraped) {
      const role = pickSlug(j.title);
      counts.set(role.name, (counts.get(role.name) ?? 0) + 1);
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
        logoUrl: j.logoUrl ?? undefined,
        skills: j.skills.length ? j.skills : undefined,
      });
    }

    const perRole = roles.map((r) => ({ role: r.name, found: counts.get(r.name) ?? 0 }));

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

  async evaluateQuick(id: string): Promise<Result<JobEvaluation>> {
    const res = await authedFetch(`/jobs/${encodeURIComponent(id)}/evaluate/quick`, { method: "POST" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Job not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not evaluate this job", json?.code);
    return ok(toEvaluation(json));
  },

  async evaluate(id: string): Promise<Result<JobEvaluation>> {
    // Decision view: CLI-parity per-block fan-out (web-grounded D/G), default B/C/D/G.
    // E (tailor CV) + F (interview prep) are fetched lazily via evaluateBlock.
    const res = await authedFetch(`/jobs/${encodeURIComponent(id)}/evaluate/blocks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks: ["b", "c", "d", "g"] }),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Job not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not evaluate this job", json?.code);
    return ok(toEvaluation(json));
  },

  /**
   * Evaluate a job by driving the reinit SKILL headless (claude -p). The agent
   * syncs the profile, evaluates A–G against it, and pushes the report to the
   * dashboard (Atlas /evaluations) tagged to this jobId. Result lands in the feed
   * (card flips to Insights) — no server LLM endpoint involved.
   */
  async evaluateViaAgent(id: string): Promise<Result<{ result: string }>> {
    // Pull the job so we can hand the agent the full JD + identity.
    const jr = await authedFetch(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
    if (!jr) return err("Could not reach the server", "NETWORK");
    if (jr.status === 401) return err("Session expired", "INVALID_TOKEN");
    const jj = await jr.json().catch(() => ({}));
    const job = jj?.job;
    if (!jr.ok || !job) return err(jj?.error || "Job not found", "NOT_FOUND");

    const prompt = [
      "Use the reinit skill to evaluate ONE job end to end and push the result to the dashboard. Steps:",
      "1. Run get-profile to sync the latest profile (cv.md / profile.yml).",
      "2. Evaluate this job (A–G) against my profile.",
      `3. Push the evaluation report to the dashboard so it appears in the app, tagged to jobId ${id}.`,
      "",
      `Company: ${job.company ?? ""}`,
      `Role: ${job.title ?? ""}`,
      `Job ID: ${id}`,
      job.jobUrl ? `Job URL: ${job.jobUrl}` : "",
      "",
      "Job description:",
      (job.jd ?? job.jobDescription ?? "").slice(0, 14000),
    ]
      .filter(Boolean)
      .join("\n");

    return cliService.runReinit(prompt);
  },
};
