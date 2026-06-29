import { rm, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { homedir } from "node:os";
import { authedFetch } from "../core/http";
import { dismissed } from "../core/dismissed";
import { ok, err, type Result, type FeedJob, type ScanResult, type JobEvaluation, type JobRanking, type ScanSource, type CanonicalJob } from "@compass/ipc-contract";
import { searchJobsForRole } from "./portals/naukri";
import { searchJobsForRole as hiristSearch } from "./hirist.service";
import { searchJobsForRole as instahyreSearch } from "./instahyre.service";
import { cliService } from "./cli.service";
import { profileSync } from "./profile-sync-state";
import { settings } from "../core/settings";
import type { TailoringIntensity } from "@compass/ipc-contract";

/**
 * Resume-tailoring intensity blocks. These tune HOW BOLDLY the `pdf` mode's steps 1–11
 * reframe the candidate's REAL experience — they never change the mode itself, and the
 * profile (cv.md / config/profile.yml) is always the hard ceiling: nothing is invented.
 * Higher intensity = surface more real-but-unlisted adjacent skills + denser JD keywords.
 */
const INTENSITY_BLOCKS: Record<TailoringIntensity, string> = {
  conservative:
    "TAILORING INTENSITY = CONSERVATIVE. Reword lightly. Use only keywords that EXACTLY match the profile's existing wording. Stay close to cv.md phrasing; do not infer adjacent skills. The competency grid lists only directly-stated experience.",
  balanced:
    "TAILORING INTENSITY = BALANCED (default). Reframe each bullet in the JD's vocabulary where the underlying work is real. Build the competency grid from clearly-supported experience. Reorder by relevance. Use only skills present in the profile.",
  aggressive:
    "TAILORING INTENSITY = AGGRESSIVE. Lead EVERY bullet with the JD's language. Surface adjacent skills that are GENUINELY IMPLIED BY work already in the profile (e.g. if the profile shows AWS ECS/RDS, IAM/VPC/S3/CloudWatch are defensible; if it shows Grafana, Prometheus may be). Maximise JD keyword density and expand the competency grid to every defensible match. HARD LIMIT: the profile is the ceiling — never add a skill, tool, employer, title, date, or metric that is not real and present in (or directly implied by) cv.md / config/profile.yml. If it is not in the profile and not genuinely implied by it, do NOT add it.",
};

/** Per-role search opts every portal adapter accepts (user-side scrape). */
export interface AdapterSearchOpts {
  keyword: string;
  max: number;
  jobAge: number;
  experience: number | null;
  location?: string;
  pages: number;
  /** User's skills — Instahyre queries by `skills=` (comma-separated), not free text. */
  skills?: string[];
  /** Instahyre job-function codes from the user's profile (e.g. 8 = DevOps/Cloud). */
  jobFunctions?: number[];
}

// Portal registry — each entry is a user-side adapter that maps its raw response →
// CanonicalJob[]. Add hirist/instahyre here once their adapters land; the scan()
// fan-out below picks up any source listed here that the user has enabled.
const ADAPTERS: Partial<Record<ScanSource, (opts: AdapterSearchOpts) => Promise<CanonicalJob[]>>> = {
  naukri: searchJobsForRole,
  hirist: hiristSearch,
  instahyre: instahyreSearch,
};

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

/** Pull the first balanced top-level JSON object out of the agent's text reply. */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          const v = JSON.parse(text.slice(start, i + 1));
          return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
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
  async list(opts?: { limit?: number; offset?: number; days?: number }): Promise<Result<{ jobs: FeedJob[] }>> {
    // The per-user feed cap is enforced SERVER-SIDE (co-atlas FEED_MAX_PER_USER), so
    // the client just requests a page; the server clamps it down to the policy cap.
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;
    // Feed window: the page can pass an explicit `days` (the user's freshness picker,
    // 1–90); otherwise fall back to the scan freshness (jobAge, default 1 = today).
    // freshBy=scraped filters on when WE scraped the posting (firstSeen), not the
    // portal's posted date — so "today" means "scraped today" and a job posted days
    // ago but freshly scraped still shows.
    const days = Math.min(90, Math.max(1, opts?.days ?? settings.get().scan.jobAge ?? 1));
    const res = await authedFetch(`/jobs?limit=${limit}&offset=${offset}&days=${days}&freshBy=scraped`, { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load jobs", json?.code);
    const all: FeedJob[] = Array.isArray(json?.jobs) ? json.jobs.map(toFeedJob) : [];
    // Hide jobs the user marked "not interested".
    const jobs = all.filter((j) => !dismissed.has(j.id));
    return ok({ jobs });
  },

  /** Mark jobs "not interested" — hides them from the feed. Returns how many were newly dismissed. */
  async notInterested(jobIds: string[]): Promise<Result<{ dismissed: number }>> {
    const added = dismissed.add(jobIds.filter(Boolean));
    return ok({ dismissed: added });
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

  async scan(opts: { maxPerRole: number; maxPages: number; jobAge: number; sources: ScanSource[] }): Promise<Result<ScanResult>> {
    // Resolve enabled sources → adapters we actually ship. Unknown / not-yet-built
    // portals are silently dropped so the UI can list them as "coming soon".
    const enabled = (opts.sources ?? [])
      .filter((s, i, a) => a.indexOf(s) === i)
      .filter((s): s is ScanSource => Boolean(ADAPTERS[s]));
    if (enabled.length === 0) return err("No scrapeable job boards enabled — turn one on in Job Preferences.", "NO_SOURCES");

    // Step 1 — fetch the user's canonical target roles (with slugs needed for ingest).
    const rolesRes = await authedFetch("/jobs/target-roles", { method: "GET" });
    if (!rolesRes) return err("Could not reach the server", "NETWORK");
    if (rolesRes.status === 401) return err("Session expired", "INVALID_TOKEN");
    const rolesJson = await rolesRes.json().catch(() => ({}));
    const roles: Array<{ name: string; slug: string }> = rolesJson?.roles ?? [];
    if (roles.length === 0) return err("No target roles set — add target roles in Job Preferences first.", "NO_ROLES");

    // Step 1b — read the user's experience + preferred cities to filter the search
    // (mirror the website's `experience=` and `cityTypeGid=` params), plus the
    // Instahyre job-function codes the user picked in onboarding.
    let experience: number | null = null;
    let preferredLocations: string[] = [];
    let jobFunctions: number[] = [];
    const profRes = await authedFetch("/profile", { method: "GET" }).catch(() => null);
    if (profRes?.ok) {
      const prof = await profRes.json().catch(() => ({}));
      const yrs = prof?.totalExperienceYears;
      if (yrs != null && yrs !== "") experience = Number(yrs);
      if (Array.isArray(prof?.preferredLocations)) {
        preferredLocations = prof.preferredLocations.filter((s: unknown) => typeof s === "string" && s.trim());
      }
      if (Array.isArray(prof?.instahyreJobFunctions)) {
        jobFunctions = prof.instahyreJobFunctions.map(Number).filter((n: number) => Number.isFinite(n));
      }
    }

    // Step 1c — Instahyre searches by `skills=`, not free text. Pull the user's
    // Primary skills from the full profile only when Instahyre is in the mix.
    let skills: string[] = [];
    if (enabled.includes("instahyre")) {
      const fullRes = await authedFetch("/profile/full", { method: "GET" }).catch(() => null);
      if (fullRes?.ok) {
        const full = await fullRes.json().catch(() => ({}));
        const rows: Array<{ skill?: string; section?: string }> = Array.isArray(full?.skills) ? full.skills : [];
        skills = rows
          .filter((r) => (r.section ?? "Primary") === "Primary" && r.skill)
          .map((r) => String(r.skill));
      }
    }

    // Step 2 — USER-SIDE scrape (every adapter runs on the user's IP, never the
    // server). One search PER ROLE with a single clean keyword — combining roles
    // into one comma-joined keyword diluted precision (e.g. "DevOps" surfaced Full
    // Stack roles via the generic "engineer" token). Per-role search also gives
    // exact role attribution for free (no fuzzy title matching). Merged + deduped
    // across roles & portals.
    // preferredLocations are stored as "City, State" (e.g. "Hyderabad, Telangana").
    // Portals match on city NAME, so keep only the city (before the first comma)
    // and fix common spelling variants — otherwise state tokens become noise.
    const CITY_FIX: Record<string, string> = {
      bengalore: "Bengaluru", bangalore: "Bengaluru", bangaluru: "Bengaluru",
    };
    const cities = [
      ...new Set(
        preferredLocations
          .map((l) => l.split(",")[0].trim())
          .filter(Boolean)
          .map((c) => CITY_FIX[c.toLowerCase()] ?? c),
      ),
    ];
    const baseOpts: Omit<AdapterSearchOpts, "keyword"> = {
      max: 20,
      jobAge: opts.jobAge > 0 ? opts.jobAge : 1,
      experience,
      location: cities.length > 0 ? cities.join(",") : undefined,
      pages: opts.maxPages > 0 ? opts.maxPages : 5,
      skills,
      jobFunctions,
    };
    // Naukri uses ONE combined-keyword search (all roles in a single query) — its
    // relevance is far tighter combined than per-role (per-role drifts into adjacent
    // "…Engineer" roles). Other portals keep their per-role search, untouched.
    const combinedKeyword = roles.map((r) => r.name).join(", ");
    // Fuzzy role attribution for the combined Naukri results (the search no longer
    // tells us which role a job is; the DB ingest needs a canonical role per job).
    const pickRole = (title: string): { name: string; slug: string } => {
      const t = title.toLowerCase();
      for (const r of roles) {
        const words = r.name.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
        if (words.some((w) => t.includes(w))) return r;
      }
      return roles[0];
    };

    // Portals in parallel; roles sequential within a portal (keeps the per-portal
    // request rate steady — avoids 406 throttling).
    const results = await Promise.all(
      enabled.map(async (s) => {
        const out: Array<{ job: CanonicalJob; role: { name: string; slug: string } }> = [];
        if (s === "naukri") {
          try {
            const list = await ADAPTERS[s]!({ ...baseOpts, keyword: combinedKeyword });
            console.log(`[scan] naukri (combined): ${list.length} jobs`);
            for (const job of list) out.push({ job, role: pickRole(job.title) });
          } catch (e) {
            console.error(`[scan] naukri (combined) FAILED:`, e);
          }
          return out;
        }
        for (const r of roles) {
          try {
            const list = await ADAPTERS[s]!({ ...baseOpts, keyword: r.name });
            console.log(`[scan] ${s} "${r.name}": ${list.length} jobs`);
            for (const job of list) out.push({ job, role: r });
          } catch (e) {
            console.error(`[scan] ${s} "${r.name}" FAILED:`, e);
          }
        }
        return out;
      }),
    );
    console.log(`[scan] searchOpts:`, { roles: roles.length, experience, location: baseOpts.location, skills: skills.length, jobFunctions });

    // Dedupe across portals & roles by source + externalId (same job can surface
    // under multiple roles / portals). First occurrence wins → keeps the role it
    // first matched, and that role attribution is exact (the role we searched).
    const seen = new Set<string>();
    const scraped: CanonicalJob[] = [];
    const roleByKey = new Map<string, { name: string; slug: string }>();
    for (const { job, role } of results.flat()) {
      const key = `${job.source}:${job.externalId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      roleByKey.set(key, role);
      scraped.push(job);
    }

    // null → undefined (the ingest zod schema uses optional, not nullable).
    const u = <T>(v: T | null | undefined): T | undefined => v ?? undefined;
    const counts = new Map<string, number>();
    const allJobs: Array<Record<string, unknown>> = [];

    for (const j of scraped) {
      const role = roleByKey.get(`${j.source}:${j.externalId}`) ?? roles[0];
      counts.set(role.name, (counts.get(role.name) ?? 0) + 1);
      allJobs.push({
        source: j.source,
        canonicalRoleSlug: role.slug,
        title: j.title,
        company: j.company,
        location: u(j.location) ?? u(j.workMode),
        jobUrl: u(j.sourceUrl),
        externalId: u(j.externalId),
        jobDescription: u(j.jd),
        jdStructured: j.jdStructured ?? undefined,
        postedAt: u(j.postedAt),
        logoUrl: u(j.logoUrl),
        skills: j.skills.length ? j.skills : undefined,
        skillsMeta: j.skillsMeta ?? undefined,
        expMin: u(j.expMin),
        expMax: u(j.expMax),
        workMode: u(j.workMode),
        employmentType: u(j.employmentType),
        seniority: u(j.seniority),
        salaryDisclosed: u(j.salaryDisclosed),
        salaryMin: u(j.salaryMin),
        salaryMax: u(j.salaryMax),
        ctcMin: u(j.ctcMin),
        ctcMax: u(j.ctcMax),
        ctcAvg: u(j.ctcAvg),
        applicants: u(j.applicants),
        companyRating: u(j.companyRating),
        companyReviewsCount: u(j.companyReviewsCount),
        companyType: u(j.companyType),
        companySize: u(j.companySize),
        industry: u(j.industry),
        aboutCompany: u(j.aboutCompany),
        benefits: j.benefits ?? undefined,
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

    // Verified prompt — kept identical to the career-ops eval flow. Only the
    // get-profile step is conditional (skipped when the profile is already synced).
    const syncProfile = profileSync.isDirty();
    const steps: string[] = [];
    if (syncProfile) {
      steps.push(
        "1. Run get-profile to sync the latest profile (cv.md / profile.yml).",
        "2. Evaluate this job (A–G) against my profile.",
        `3. Push the evaluation report to the dashboard so it appears in the app, tagged to jobId ${id}.`,
      );
    } else {
      steps.push(
        "1. Evaluate this job (A–G) against my profile.",
        `2. Push the evaluation report to the dashboard so it appears in the app, tagged to jobId ${id}.`,
        "(Profile already synced this session — use the existing cv.md / config/profile.yml; do NOT run get-profile.)",
      );
    }

    const prompt = [
      "Use the reinit skill to evaluate ONE job end to end and push the result to the dashboard. Steps:",
      ...steps,
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

    const res = await cliService.runReinit(prompt);
    if (res.ok && syncProfile) profileSync.markSynced();
    return res;
  },

  /**
   * Tailor a resume for ONE job by running the reinit `pdf` mode's TAILORING steps
   * (summary rewrite, bullet reorder, competency grid, ethical keyword injection)
   * via claude -p — but instead of rendering HTML/PDF, the agent returns the tailored
   * content as PremiumResumeData JSON, which we persist (POST /tailored-cv). The
   * structured CV can then be re-rendered or edited later with no LLM call.
   *
   * NOTE: PDF rendering is intentionally HELD here (the `pdf` mode's steps 12–16).
   * We do NOT touch the mode's tailoring logic — only its output format (JSON, not
   * HTML) — so resume quality is unchanged. Re-enable rendering by un-commenting the
   * render block below once the shared template is wired into generate-pdf.mjs.
   */
  async tailorResumeViaAgent(id: string): Promise<Result<{ saved: boolean; keywordCoverage: number | null }>> {
    const jr = await authedFetch(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
    if (!jr) return err("Could not reach the server", "NETWORK");
    if (jr.status === 401) return err("Session expired", "INVALID_TOKEN");
    const jj = await jr.json().catch(() => ({}));
    const job = jj?.job;
    if (!jr.ok || !job) return err(jj?.error || "Job not found", "NOT_FOUND");

    const syncProfile = profileSync.isDirty();
    const steps: string[] = [];
    if (syncProfile) {
      steps.push(
        "1. Run get-profile to sync the latest profile (cv.md / config/profile.yml).",
        "2. Run the `pdf` mode's TAILORING steps (1–11) for the job below.",
      );
    } else {
      steps.push(
        "1. Run the `pdf` mode's TAILORING steps (1–11) for the job below.",
        "(Profile already synced this session — use the existing cv.md / config/profile.yml; do NOT run get-profile.)",
      );
    }

    const intensity = settings.get().tailoring.intensity;

    const prompt = [
      "Use the reinit skill's `pdf` mode to tailor a resume for ONE job. Steps:",
      ...steps,
      "",
      INTENSITY_BLOCKS[intensity],
      "",
      `Company: ${job.company ?? ""}`,
      `Role: ${job.title ?? ""}`,
      `Job ID: ${id}`,
      job.jobUrl ? `Job URL: ${job.jobUrl}` : "",
      "",
      "Job description:",
      (job.jd ?? job.jobDescription ?? "").slice(0, 14000),
      "",
      "IMPORTANT — output format only (do NOT change the tailoring logic): run the `pdf` mode's tailoring steps 1–11 exactly as written (rewrite the summary with JD keywords, reorder bullets by relevance, build the competency grid, inject keywords ONLY from real experience — never invent). But STOP before step 12: do NOT build HTML, do NOT run generate-pdf.mjs, do NOT write any file. Instead, emit the tailored result as a SINGLE JSON object on the final line, matching this shape exactly:",
      '{"name": "", "title": "", "phone": "", "email": "", "location": "", "linkedin": "", "github": "", "summary": "<tailored summary>", "skills": [{"category": "", "items": [""]}], "experience": [{"role": "", "company": "", "location": "", "period": "", "points": [""]}], "projects": [{"name": "", "tech": "", "description": "", "github": "", "live": ""}], "education": [{"degree": "", "field": "", "institution": "", "year": "", "score": ""}], "certifications": [{"name": "", "issuer": "", "year": ""}], "languages": [{"name": "", "level": ""}], "competencyGrid": [{"keyword": "", "evidence": ""}], "_meta": {"lang": "en", "paper": "a4", "keywordCoverage": 0}}',
      "Fill every field from cv.md / config/profile.yml + the tailoring. `competencyGrid` = the 6–8 keyword phrases from step 10. `_meta.lang`/`_meta.paper` from steps 4–5; `_meta.keywordCoverage` = the % of JD keywords covered. Output ONLY the JSON object on the final line — no prose, no markdown fences.",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await cliService.runReinit(prompt);
    if (!res.ok) return err(res.error, res.code);
    if (syncProfile) profileSync.markSynced();

    const obj = extractJsonObject(res.data.result);
    if (!obj || typeof obj.name !== "string") {
      return err("The agent didn't return a tailored resume JSON", "NO_RESUME");
    }
    // Split the rendering hints off the resume payload before persisting.
    const meta = (obj._meta ?? {}) as Record<string, unknown>;
    delete (obj as Record<string, unknown>)._meta;
    const lang = typeof meta.lang === "string" ? meta.lang : null;
    const paper = meta.paper === "letter" ? "letter" : "a4";
    const kc = Number(meta.keywordCoverage);
    const keywordCoverage = Number.isFinite(kc) ? Math.round(kc) : null;

    const post = await authedFetch("/tailored-cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId: id,
        resumeJson: obj,
        ...(lang ? { lang } : {}),
        paper,
        ...(keywordCoverage != null ? { keywordCoverage } : {}),
      }),
    });
    if (!post) return err("Could not reach the server", "NETWORK");
    if (post.status === 401) return err("Session expired", "INVALID_TOKEN");
    const pj = await post.json().catch(() => ({}));
    if (!post.ok) return err(pj?.error || "Saving the tailored resume failed", pj?.code);

    // ── PDF rendering HELD (pdf mode steps 12–16) ─────────────────────────────
    // Re-enable once the shared dashboard template (resume-html.ts) is wired into a
    // local renderer, then update co_tailored_cvs.pdf_path:
    //   const html = buildResumeHTMLForPDF(obj);
    //   const path = await renderPdfLocally(html, `cv-${slug}.pdf`, paper);
    //   await api.artifact.open(path);
    // ──────────────────────────────────────────────────────────────────────────

    return ok({ saved: true, keywordCoverage });
  },

  /**
   * Draft a cover letter for ONE job via the reinit `cover` mode (claude -p) and
   * return the letter text so the app can render it inline (below Opportunity
   * Score). Runs non-interactively for the GUI: it drafts straight from cv.md +
   * the JD + the evaluation report rather than walking the mode's chat gates.
   */
  async coverLetterViaAgent(id: string): Promise<Result<{ letter: string }>> {
    const jr = await authedFetch(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
    if (!jr) return err("Could not reach the server", "NETWORK");
    if (jr.status === 401) return err("Session expired", "INVALID_TOKEN");
    const jj = await jr.json().catch(() => ({}));
    const job = jj?.job;
    if (!jr.ok || !job) return err(jj?.error || "Job not found", "NOT_FOUND");

    const syncProfile = profileSync.isDirty();
    const steps: string[] = [];
    if (syncProfile) {
      steps.push(
        "1. Run get-profile to sync the latest profile (cv.md / config/profile.yml).",
        "2. Run the `cover` mode to draft a tailored cover letter for the job below.",
      );
    } else {
      steps.push(
        "1. Run the `cover` mode to draft a tailored cover letter for the job below.",
        "(Profile already synced this session — use the existing cv.md / config/profile.yml; do NOT run get-profile.)",
      );
    }

    const prompt = [
      "Use the reinit skill to draft a tailored cover letter for ONE job. Steps:",
      ...steps,
      "",
      `Company: ${job.company ?? ""}`,
      `Role: ${job.title ?? ""}`,
      `Job ID: ${id}`,
      job.jobUrl ? `Job URL: ${job.jobUrl}` : "",
      "",
      "Job description:",
      (job.jd ?? job.jobDescription ?? "").slice(0, 14000),
      "",
      "Draft the full letter directly from cv.md, config/profile.yml and the JD above (and any matching evaluation report). This is a non-interactive GUI request — do NOT ask questions or wait for confirmation; make reasonable choices and proceed. Output ONLY the finished letter as plain text (no preamble, no questions, no markdown fences).",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await cliService.runReinit(prompt);
    if (!res.ok) return err(res.error, res.code);
    if (syncProfile) profileSync.markSynced();
    return ok({ letter: res.data.result.trim() });
  },

  /**
   * Scan ranking (`ofertas`): clear stale JDs → agent pulls this user's pooled jobs
   * (get-jobs) → ranks them against the profile → returns JSON → POST /rankings.
   * Runs the agent (claude -p), so it needs the one-time consent like evaluate.
   */
  async rankScanViaAgent(onProgress?: (line: string) => void): Promise<Result<{ saved: number }>> {
    // Fresh slate so ofertas ranks only the current batch, not old JD files.
    const jdsDir = resolve(homedir(), ".reinit", "jds");
    try {
      await rm(jdsDir, { recursive: true, force: true });
      await mkdir(jdsDir, { recursive: true });
    } catch {
      /* best-effort */
    }

    // Verified prompt — kept byte-identical to the career-ops/ofertas flow. The
    // ONLY conditional bit is the get-profile step: skip it (and renumber) when the
    // local profile is already in sync, otherwise the wording is unchanged.
    const syncProfile = profileSync.isDirty();
    const lines = ["Use the reinit skill to rank my pooled jobs and return JSON. Steps:"];
    if (syncProfile) {
      lines.push(
        "1. Run get-profile to sync my latest profile (cv.md / config/profile.yml).",
        "2. Run get-jobs 20 to pull my latest jobs into jds/.",
        "3. Run ofertas to rank ALL job descriptions in jds/ against my profile.",
      );
    } else {
      lines.push(
        "1. Run get-jobs 20 to pull my latest jobs into jds/.",
        "2. Run ofertas to rank ALL job descriptions in jds/ against my profile.",
        "(Profile already synced this session — use the existing cv.md / config/profile.yml; do NOT run get-profile.)",
      );
    }
    lines.push(
      "",
      "Then output ONLY a JSON array (no prose, no markdown fences). One object per job:",
      '{"jobId": "<the **Job ID** value from that JD file>", "score": <the EXACT weighted ofertas total you computed for this job in your ranking — a decimal such as 4.35; copy it verbatim, do NOT round to a whole number>, "rank": <integer, 1=best>, "legitimacy": "<High Confidence|Proceed with Caution|Suspicious>", "recommendation": "<Apply|Consider|Skip>", "reasoning": "<one short line>", "dimensions": {"northStar": <1-5, half-points ok e.g. 4.5>, "cvMatch": <1-5, half-points ok>, "level": <1-5, half-points ok>, "comp": <1-5, half-points ok>, "growth": <1-5, half-points ok>, "remote": <1-5, half-points ok>, "reputation": <1-5, half-points ok>, "techStack": <1-5, half-points ok>, "speed": <1-5, half-points ok>, "culture": <1-5, half-points ok>}}',
      "dimensions are the 10 weighted ofertas matrix scores (each 1-5). Use the exact Job ID from each JD file — do not invent ids.",
    );
    const prompt = lines.join("\n");

    const res = await cliService.runReinit(prompt, { onProgress });
    if (!res.ok) return err(res.error, res.code);
    if (syncProfile) profileSync.markSynced();

    const arr = extractJsonArray(res.data.result);
    if (!arr) return err("The agent didn't return a ranking", "NO_RANKINGS");
    // Keep only well-formed rows with a job id. Use the score the ofertas skill
    // computed verbatim — do NOT recompute or round it on our side.
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

  /**
   * Rank a specific set of jobs (up to 25) via ofertas. Writes the JD files
   * directly (same format as reinit-get-jobs.mjs) then runs ofertas — no get-jobs call.
   */
  async rankSelectedViaAgent(jobIds: string[], onProgress?: (line: string) => void): Promise<Result<{ saved: number }>> {
    const jdsDir = resolve(homedir(), ".reinit", "jds");
    try {
      await rm(jdsDir, { recursive: true, force: true });
      await mkdir(jdsDir, { recursive: true });
    } catch { /* best-effort */ }

    const slugify = (s: string) =>
      String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "untitled";
    const snippet = (s: string, len = 400) =>
      String(s ?? "").replace(/\s+/g, " ").trim().slice(0, len);

    const index: string[] = [];
    const seen = new Set<string>();
    let n = 0;

    for (const id of jobIds.slice(0, 25)) {
      const res = await authedFetch(`/jobs/${encodeURIComponent(id)}`, { method: "GET" });
      if (!res) continue;
      const json = await res.json().catch(() => ({}));
      const job = json?.job;
      if (!job) continue;

      const skills = Array.isArray(job.skills) ? job.skills.filter(Boolean).join(", ") : "";
      const exp = job.expMin != null || job.expMax != null ? `${job.expMin ?? "?"}-${job.expMax ?? "?"} yrs` : "";
      const md =
        `# ${job.title} @ ${job.company}\n\n` +
        `**Job ID:** ${job.id}\n` +
        `**URL:** ${job.jobUrl ?? ""}\n` +
        `**Location:** ${job.location ?? ""}\n` +
        `**Source:** ${job.source ?? ""}\n\n` +
        `---\n\n` +
        `${job.jd ?? "(no description provided)"}\n\n` +
        (skills ? `Key Skills: ${skills}\n` : "");

      let base = `${slugify(job.company)}-${slugify(job.title)}`;
      let name = `${base}.md`;
      if (seen.has(name)) name = `${base}-${String(job.id).slice(0, 8)}.md`;
      seen.add(name);
      await writeFile(resolve(jdsDir, name), md);

      index.push(
        `## ${job.title} @ ${job.company}\n` +
        `- Job ID: ${job.id}\n` +
        `- File: jds/${name}\n` +
        `- Location: ${job.location ?? ""}${exp ? ` | Exp: ${exp}` : ""}\n` +
        (skills ? `- Skills: ${skills}\n` : "") +
        `- Snippet: ${snippet(job.jd ?? "")}\n`,
      );
      n++;
    }

    if (n === 0) return err("Could not load any of the selected jobs", "NOT_FOUND");

    const indexMd =
      `# Ranking index — ${n} job(s)\n\n` +
      `Compact summaries for first-pass triage. Read full \`jds/<file>.md\` only for shortlisted jobs.\n\n` +
      index.join("\n");
    await writeFile(resolve(jdsDir, "_ranking-index.md"), indexMd);

    // Only sync the profile when it's actually stale — a warm session already has
    // cv.md / profile.yml on disk, so skipping get-profile saves several seconds.
    const syncProfile = profileSync.isDirty();
    const lines = [`Use the reinit skill to rank ${n} job${n !== 1 ? "s" : ""} and return JSON. Steps:`];
    if (syncProfile) {
      lines.push(
        "1. Run get-profile to sync my latest profile (cv.md / config/profile.yml).",
        "2. The JD files are already written to jds/ — do NOT run get-jobs.",
        "3. Run ofertas to rank ALL job descriptions in jds/ against my profile.",
      );
    } else {
      lines.push(
        "1. The JD files are already written to jds/ — do NOT run get-jobs.",
        "2. Run ofertas to rank ALL job descriptions in jds/ against my profile.",
        "(Profile already synced this session — use the existing cv.md / config/profile.yml; do NOT run get-profile.)",
      );
    }
    lines.push(
      "",
      "Then output ONLY a JSON array (no prose, no markdown fences). One object per job:",
      '{"jobId": "<the **Job ID** value from that JD file>", "score": <the EXACT weighted ofertas total you computed for this job in your ranking — a decimal such as 4.35; copy it verbatim, do NOT round to a whole number>, "rank": <integer, 1=best>, "legitimacy": "<High Confidence|Proceed with Caution|Suspicious>", "recommendation": "<Apply|Consider|Skip>", "reasoning": "<one short line>", "dimensions": {"northStar": <1-5, half-points ok e.g. 4.5>, "cvMatch": <1-5, half-points ok>, "level": <1-5, half-points ok>, "comp": <1-5, half-points ok>, "growth": <1-5, half-points ok>, "remote": <1-5, half-points ok>, "reputation": <1-5, half-points ok>, "techStack": <1-5, half-points ok>, "speed": <1-5, half-points ok>, "culture": <1-5, half-points ok>}}',
      "Use the exact Job ID from each JD file — do not invent ids.",
    );
    const prompt = lines.join("\n");

    const res = await cliService.runReinit(prompt, { onProgress });
    if (!res.ok) return err(res.error, res.code);
    if (syncProfile) profileSync.markSynced();

    const arr = extractJsonArray(res.data.result);
    if (!arr) return err("The agent didn't return a ranking", "NO_RANKINGS");
    // Use the ofertas skill's score verbatim — no recompute, no rounding.
    const rankings = arr
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof (r as any).jobId === "string")
      .slice(0, 25);
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
