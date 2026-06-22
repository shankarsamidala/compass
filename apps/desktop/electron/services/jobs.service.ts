import { rm, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { authedFetch } from "../core/http";
import { ok, err, type Result, type FeedJob, type ScanResult, type JobEvaluation, type JobRanking } from "@compass/ipc-contract";
import { searchJobsForRole } from "./naukri.service";
import { cliService } from "./cli.service";

/** Slice the first JSON array out of an agent's text reply (tolerates prose/fences). */
function extractJsonArray(text: string): unknown[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end <= start) return null;
  try {
    const v = JSON.parse(text.slice(start, end + 1));
    return Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

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

    // Step 1b — read the user's experience + preferred cities to filter the search
    // (mirror the website's `experience=` and `cityTypeGid=` params).
    let experience: number | null = null;
    let preferredLocations: string[] = [];
    const profRes = await authedFetch("/profile", { method: "GET" }).catch(() => null);
    if (profRes?.ok) {
      const prof = await profRes.json().catch(() => ({}));
      const yrs = prof?.totalExperienceYears;
      if (yrs != null && yrs !== "") experience = Number(yrs);
      if (Array.isArray(prof?.preferredLocations)) {
        preferredLocations = prof.preferredLocations.filter((s: unknown) => typeof s === "string" && s.trim());
      }
    }

    // Step 2 — USER-SIDE scrape (Naukri on the user's IP, never the server). One
    // combined search across roles, jobAge=1, capped to 20, paginated, location-filtered.
    const combinedKeyword = roles.map((r) => r.name).join(", ");
    const scraped = await searchJobsForRole({
      keyword: combinedKeyword,
      max: 20,
      jobAge: 1,
      experience,
      location: preferredLocations.length > 0 ? preferredLocations.join(",") : undefined,
      pages: 10,
    }).catch(() => []);

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
      // Build a JD from the cleaned search fields (skills + experience + salary blocks).
      const skillsBlock = j.skills?.length ? `\n\nKey Skills: ${j.skills.join(", ")}` : "";
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

    // Step 3 — ship to user-ingest in chunks (a full 10-page scan can exceed the
    // server body limit if sent as one payload).
    let inserted = 0;
    let refreshed = 0;
    let embedded = 0;
    const CHUNK = 100;
    for (let i = 0; i < allJobs.length; i += CHUNK) {
      const batch = allJobs.slice(i, i + CHUNK);
      const ingestRes = await authedFetch("/jobs/user-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: batch }),
      });
      if (!ingestRes) return err("Could not reach the server", "NETWORK");
      if (ingestRes.status === 401) return err("Session expired", "INVALID_TOKEN");
      const ingestJson = await ingestRes.json().catch(() => ({}));
      if (!ingestRes.ok) return err(ingestJson?.error || "Ingest failed", ingestJson?.code);
      inserted += ingestJson.inserted ?? 0;
      refreshed += ingestJson.refreshed ?? 0;
      embedded += ingestJson.embedded ?? 0;
    }

    return ok({ scannedRoles: roles.length, inserted, refreshed, embedded, perRole });
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

  /**
   * Scan ranking (`ofertas`): clear stale JDs → agent pulls this user's pooled jobs
   * (get-jobs) → ranks them against the profile → returns JSON → POST /rankings.
   * Runs the agent (claude -p), so it needs the one-time consent like evaluate.
   */
  async rankScanViaAgent(): Promise<Result<{ saved: number }>> {
    // Fresh slate so ofertas ranks only the current batch, not old JD files.
    const jdsDir = resolve(homedir(), ".reinit", "jds");
    try {
      await rm(jdsDir, { recursive: true, force: true });
      await mkdir(jdsDir, { recursive: true });
    } catch {
      /* best-effort */
    }

    const prompt = [
      "Use the reinit skill to rank my pooled jobs and return JSON. Steps:",
      "1. Run get-profile to sync my latest profile (cv.md / config/profile.yml).",
      "2. Run get-jobs 20 to pull my latest jobs into jds/.",
      "3. Run ofertas to rank ALL job descriptions in jds/ against my profile.",
      "",
      "Then output ONLY a JSON array (no prose, no markdown fences). One object per job:",
      '{"jobId": "<the **Job ID** value from that JD file>", "score": <number 1-5>, "rank": <integer, 1=best>, "legitimacy": "<High Confidence|Proceed with Caution|Suspicious>", "recommendation": "<Apply|Consider|Skip>", "reasoning": "<one short line>"}',
      "Use the exact Job ID from each JD file — do not invent ids.",
    ].join("\n");

    const res = await cliService.runReinit(prompt);
    if (!res.ok) return err(res.error, res.code);

    const arr = extractJsonArray(res.data.result);
    if (!arr) return err("The agent didn't return a ranking", "NO_RANKINGS");
    // Keep only well-formed rows with a job id.
    const rankings = arr
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof (r as any).jobId === "string")
      .slice(0, 100);
    if (rankings.length === 0) return ok({ saved: 0 });

    const post = await authedFetch("/rankings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rankings }),
    });
    if (!post) return err("Could not reach the server", "NETWORK");
    if (post.status === 401) return err("Session expired", "INVALID_TOKEN");
    const pj = await post.json().catch(() => ({}));
    if (!post.ok) return err(pj?.error || "Saving rankings failed", pj?.code);
    return ok({ saved: pj.saved ?? 0 });
  },

  /** The caller's stored ofertas rankings (for merging into the feed/table). */
  async listRankings(): Promise<Result<{ rankings: JobRanking[] }>> {
    const res = await authedFetch("/rankings", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    const json = await res.json().catch(() => ({}));
    if (!res.ok) return err(json?.error || "Could not load rankings", json?.code);
    return ok({ rankings: json.rankings ?? [] });
  },
};
