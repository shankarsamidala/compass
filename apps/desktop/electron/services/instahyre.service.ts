/**
 * Instahyre API client — runs in the Electron main process (user's IP, no server blocks).
 * Faceted search: skills (the query) + job_functions (from profile) + years + jobLocations.
 * Search → per-job detail + employer (Glassdoor) enrichment, concurrency capped at 5.
 *
 * Instahyre exposes NO salary, posting date, or applicant count — those canonical
 * fields stay null for this source.
 */

import type { CanonicalJob } from "@compass/ipc-contract";
import { htmlToText, parseJdSections } from "./jd-parse";
import type { AdapterSearchOpts } from "./jobs.service";

const BASE = "https://www.instahyre.com";

const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "x-requested-with": "XMLHttpRequest",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  referer: "https://www.instahyre.com/search-jobs",
};

async function instaFetch(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[instahyre] HTTP ${res.status} ${url.slice(0, 120)} :: ${body.slice(0, 200)}`);
      return null;
    }
    const json = await res.json();
    console.log(`[instahyre] OK ${url.slice(0, 140)} :: objects=${(json as { objects?: unknown[] })?.objects?.length ?? "?"}`);
    return json;
  } catch (e) {
    console.error(`[instahyre] fetch threw for ${url.slice(0, 120)} ::`, e);
    return null;
  }
}

async function withConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) { const i = idx++; results[i] = await tasks[i](); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

const EMPTY: Omit<CanonicalJob, "source" | "externalId" | "sourceUrl" | "title" | "company"> = {
  location: null, logoUrl: null, postedAt: null,
  expMin: null, expMax: null, workMode: null, employmentType: null, seniority: null,
  skills: [], skillsMeta: null, jd: null, jdStructured: null,
  salaryDisclosed: null, salaryMin: null, salaryMax: null, ctcMin: null, ctcMax: null, ctcAvg: null,
  applicants: null, companyRating: null, companyReviewsCount: null,
  companyType: null, companySize: null, industry: null, aboutCompany: null, benefits: null,
};

/** Per-job detail: `employer_public_jobs/{id}` → JD + experience + skills. */
async function fetchDetail(id: string): Promise<Partial<CanonicalJob> | null> {
  const data = await instaFetch(`${BASE}/api/v1/employer_public_jobs/${id}`);
  if (!data || typeof data !== "object") return null;
  const job = data as Record<string, unknown>;
  const description = String(job.description ?? "");
  const keywords = ((job.keywords ?? []) as unknown[]).map(String).filter(Boolean);

  return {
    title: (job.title as string) || undefined,
    company: (job.hiring_company_name as string) ?? undefined,
    sourceUrl: (job.opportunity_url as string) ?? undefined,
    location: Array.isArray(job.locations) ? (job.locations as unknown[]).map(String).join(", ") : undefined,
    expMin: toNum(job.workex_min),
    expMax: toNum(job.workex_max),
    skills: keywords,
    jd: htmlToText(description) || null,
    jdStructured: description ? parseJdSections(description) : null,
  };
}

/** Employer profile: `employer_misc/.../anon_employer/{employerId}` → Glassdoor + company. */
async function fetchEmployer(employerId: string): Promise<Partial<CanonicalJob> | null> {
  const data = await instaFetch(
    `${BASE}/api/v1/employer_misc/employer_profile/anon_employer/${employerId}?getVisibleJobs=true&limit=10`,
  );
  if (!data || typeof data !== "object") return null;
  const emp = data as Record<string, unknown>;
  const gd = (emp.glassdoor_data ?? {}) as Record<string, unknown>;
  const industries = ((emp.industries ?? emp.industry ?? []) as unknown[])
    .map((x) => (typeof x === "string" ? x : (x as Record<string, unknown>)?.name))
    .filter(Boolean)
    .map(String);
  const about = String(emp.about_company ?? emp.company_description ?? "");

  return {
    companyRating: toNum(gd.overall),
    companySize: emp.employee_count != null ? String(emp.employee_count) : null,
    industry: industries[0] ?? null,
    aboutCompany: htmlToText(about) || null,
  };
}

/** Parse one `job_search` object into a partial CanonicalJob (detail/employer enrich it). */
function parseSearchItem(raw: unknown): { job: CanonicalJob; employerId: string | null } | null {
  const item = raw as Record<string, unknown>;
  const id = String(item.id ?? "");
  if (!id) return null;
  const employer = (item.employer ?? {}) as Record<string, unknown>;
  const keywords = ((item.keywords ?? []) as unknown[]).map(String).filter(Boolean);

  const job: CanonicalJob = {
    ...EMPTY,
    source: "instahyre",
    externalId: id,
    sourceUrl: (item.public_url as string) ?? `${BASE}/api/v1/job_search/${id}`,
    title: String(item.title ?? item.candidate_title ?? ""),
    company: String(employer.company_name ?? ""),
    location: (item.locations as string) || null,
    logoUrl: (employer.profile_image_src as string) ?? null,
    skills: keywords,
    companySize: employer.employee_count != null ? String(employer.employee_count) : null,
    aboutCompany: (employer.instahyre_note as string)?.trim() || null,
  };
  return { job, employerId: employer.id != null ? String(employer.id) : null };
}

// Instahyre uses legacy city names and rejects state names / comma-joined values.
// Map the user's "City, State" preferences down to Instahyre's expected city tokens.
const INSTAHYRE_CITY: Record<string, string> = {
  bengaluru: "Bangalore", bangalore: "Bangalore",
  gurugram: "Gurgaon", gurgaon: "Gurgaon",
  mumbai: "Mumbai", "navi mumbai": "Mumbai", thane: "Mumbai",
  "new delhi": "Delhi", delhi: "Delhi",
  hyderabad: "Hyderabad", chennai: "Chennai", pune: "Pune",
  noida: "Noida", kolkata: "Kolkata", ahmedabad: "Ahmedabad",
  jaipur: "Jaipur", chandigarh: "Chandigarh", kochi: "Kochi",
  coimbatore: "Coimbatore", indore: "Indore",
};

/** Extract Instahyre-recognised cities from a free "City, State, …" string. */
function instahyreCities(location?: string): string[] {
  const out: string[] = [];
  for (const token of (location ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) {
    const city = INSTAHYRE_CITY[token];
    if (city && !out.includes(city)) out.push(city);
  }
  return out;
}

export async function searchJobsForRole(opts: AdapterSearchOpts): Promise<CanonicalJob[]> {
  const limit = 20;
  const pages = Math.min(Math.max(opts.pages ?? 1, 1), 10);
  const max = opts.max ?? 20;
  // Skills drive the query; without them Instahyre returns an unfiltered firehose.
  // Instahyre rejects >15 skills ("Maximum of 15 skills allowed"), so cap to the top 15.
  const skills = (opts.skills ?? []).filter(Boolean).slice(0, 15);
  if (skills.length === 0) return [];
  const years = opts.experience != null ? Math.round(opts.experience) : null;
  const cities = instahyreCities(opts.location);

  const byId = new Map<string, { job: CanonicalJob; employerId: string | null }>();
  for (let page = 0; page < pages; page++) {
    const params = new URLSearchParams();
    params.set("search", "true");
    // Instahyre wants repeated skills= params — comma-joined is rejected as invalid.
    for (const s of skills) params.append("skills", s);
    params.set("job_type", "0");
    params.set("company_size", "0");
    params.set("limit", String(limit));
    params.set("offset", String(page * limit));
    if (years != null) params.set("years", String(years));
    for (const c of cities) params.append("jobLocations", c);
    for (const fn of opts.jobFunctions ?? []) params.append("job_functions", String(fn));

    const data = await instaFetch(`${BASE}/api/v1/job_search?${params}`);
    if (!data || typeof data !== "object") break;
    const objects = ((data as { objects?: unknown[] }).objects) ?? [];
    if (!Array.isArray(objects) || objects.length === 0) break;
    for (const raw of objects) {
      const parsed = parseSearchItem(raw);
      if (parsed && !byId.has(parsed.job.externalId)) byId.set(parsed.job.externalId, parsed);
    }
    if (objects.length < limit) break;
  }

  // No posting date from Instahyre, so no freshness filter — just cap to max.
  const picked = [...byId.values()].slice(0, max);
  if (picked.length === 0) return [];

  // Cache employer enrichment so multiple jobs at one company hit the API once.
  const employerCache = new Map<string, Promise<Partial<CanonicalJob> | null>>();
  const employerFor = (eid: string) => {
    if (!employerCache.has(eid)) employerCache.set(eid, fetchEmployer(eid).catch(() => null));
    return employerCache.get(eid)!;
  };

  const tasks = picked.map(({ job, employerId }) => async (): Promise<CanonicalJob> => {
    const [d, e] = await Promise.all([
      fetchDetail(job.externalId).catch(() => null),
      employerId ? employerFor(employerId) : Promise.resolve(null),
    ]);
    const merged = { ...job } as CanonicalJob;
    for (const src of [d, e]) {
      if (!src) continue;
      for (const [k, v] of Object.entries(src)) {
        if (v != null) (merged as Record<string, unknown>)[k] = v;
      }
    }
    merged.skills = [...new Set([...(job.skills ?? []), ...(d?.skills ?? [])])];
    return merged;
  });

  return withConcurrency(tasks, 5);
}
