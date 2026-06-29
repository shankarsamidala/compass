/**
 * Hirist API client — runs in the Electron main process (user's IP, no server blocks).
 * No auth required. Search → full detail fetch in parallel (concurrency capped at 5).
 */

import type { CanonicalJob } from "@compass/ipc-contract";
import { htmlToText, parseJdSections } from "./jd-parse";
import type { AdapterSearchOpts } from "./jobs.service";

const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const HEADERS = {
  accept: "application/json",
  "content-type": "application/json",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  referer: "https://www.hirist.tech/",
};

// City name → Hirist loc code (comma-separated in the `loc` param).
const CITY_LOC: Record<string, string> = {
  bangalore: "3", bengaluru: "3",
  hyderabad: "4",
  chennai: "6",
  pune: "7",
  karnataka: "31",
  mumbai: "2",
  delhi: "1", "new delhi": "1", "delhi ncr": "1", "delhi / ncr": "1",
  noida: "8", gurugram: "9", gurgaon: "9",
  kolkata: "5",
  ahmedabad: "12",
  kochi: "15",
};

function cityLoc(location?: string): string {
  if (!location) return "";
  const codes = location
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .map((t) => CITY_LOC[t])
    .filter(Boolean);
  return [...new Set(codes)].join(",");
}

async function hiristFetch(url: string): Promise<unknown> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return await res.json();
  } catch {
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

async function fetchDetail(jobcode: string): Promise<Partial<CanonicalJob> | null> {
  const data = await hiristFetch(
    `https://gladiator.hirist.tech/job/detail?jobcode=${jobcode}`,
  );
  if (!data || typeof data !== "object") return null;

  // Detail payload is wrapped under `data`.
  const root = data as Record<string, unknown>;
  const job = (root.data ?? root) as Record<string, unknown>;

  const tags = (job.tags ?? []) as Array<Record<string, unknown>>;
  const skillsMeta = tags
    .filter((t) => t.name)
    .map((t) => ({ name: String(t.name), mandatory: Boolean(t.isMandatory) }));

  const companyData = (job.companyData ?? {}) as Record<string, unknown>;
  const ab = (companyData.ambitionBoxInfo ?? {}) as Record<string, unknown>;
  const introText = String(job.introText ?? "");
  const aboutRaw = String(ab.aboutCompany ?? "");
  const benefits = ((ab.benefits ?? []) as Array<Record<string, unknown>>)
    .map((b) => String(b.name ?? ""))
    .filter(Boolean);

  return {
    skills: skillsMeta.map((s) => s.name),
    skillsMeta: skillsMeta.length ? skillsMeta : null,
    jd: htmlToText(introText) || null,
    jdStructured: introText ? parseJdSections(introText) : null,
    applicants: toNum(job.applyCount),
    companyRating: toNum(ab.aggregateRating ?? ab.aggregateRatingOneDecimal),
    companyReviewsCount: toNum(ab.reviewsCount),
    companyType: (ab.companyType as string) ?? null,
    companySize: (ab.totalEmployeesIndia as string) ?? null,
    aboutCompany: htmlToText(aboutRaw) || null,
    industry: (ab.primaryIndustry as string) ?? (job.industry as string) ?? null,
    workMode: Number(job.workFromHome) === 1 ? "remote" : null,
    benefits: benefits.length ? benefits : null,
  };
}

function parseSearchItem(raw: unknown): CanonicalJob | null {
  const item = raw as Record<string, unknown>;
  const jobcode = String(item.id ?? "");
  if (!jobcode) return null;

  const companyData = (item.companyData ?? {}) as Record<string, unknown>;
  const ab = (companyData.ambitionBoxInfo ?? {}) as Record<string, unknown>;
  const tags = (item.tags ?? []) as Array<Record<string, unknown>>;
  const skillsMeta = tags
    .filter((t) => t.name)
    .map((t) => ({ name: String(t.name), mandatory: Boolean(t.isMandatory) }));

  const createdMs = toNum(item.createdTimeMs ?? item.createdTime);
  const postedAt = createdMs ? new Date(createdMs).toISOString() : null;

  const location = ((item.locations ?? []) as Array<Record<string, unknown>>)
    .map((l) => String(l.name ?? ""))
    .filter(Boolean)
    .join(", ");

  return {
    ...EMPTY,
    source: "hirist",
    externalId: jobcode,
    sourceUrl: (item.jobDetailUrl as string) ?? `https://www.hirist.tech/j/${jobcode}`,
    title: String(item.title ?? ""),
    company: String(companyData.companyName ?? ""),
    location: location || null,
    expMin: toNum(item.min),
    expMax: toNum(item.max),
    workMode: Number(item.workFromHome) === 1 ? "remote" : null,
    skills: skillsMeta.map((s) => s.name),
    skillsMeta: skillsMeta.length ? skillsMeta : null,
    logoUrl: (companyData.logo as string) ?? null,
    postedAt,
    applicants: toNum(item.applyCount),
    companyRating: toNum(ab.aggregateRating ?? ab.aggregateRatingOneDecimal),
    companyReviewsCount: toNum(ab.reviewsCount),
    companyType: (ab.companyType as string) ?? null,
    companySize: (ab.totalEmployeesIndia as string) ?? null,
    industry: (ab.primaryIndustry as string) ?? null,
  };
}

export async function searchJobsForRole(opts: AdapterSearchOpts): Promise<CanonicalJob[]> {
  const size = 20;
  const pages = Math.min(Math.max(opts.pages ?? 1, 1), 10);
  const locCodes = cityLoc(opts.location);
  const exp = opts.experience != null ? Math.round(opts.experience) : null;
  // Hirist's `posting` is in days, but posting=1 ("today") is empty on this lower-volume
  // board — floor at 3 days so a fresh scan still returns results. Larger jobAge passes through.
  const postingDays = opts.jobAge && opts.jobAge > 0 ? Math.max(opts.jobAge, 3) : null;

  const byId = new Map<string, CanonicalJob>();
  for (let page = 0; page < pages; page++) {
    const params = new URLSearchParams({ query: opts.keyword, size: String(size), page: String(page) });
    if (locCodes) params.set("loc", locCodes);
    if (exp != null) { params.set("minexp", String(Math.max(0, exp - 2))); params.set("maxexp", String(exp + 2)); }
    if (postingDays != null) params.set("posting", String(postingDays));

    const hiristUrl = `https://gladiator.hirist.tech/job/search?${params}`;
    console.log(`[scan][hirist] search "${opts.keyword}": ${hiristUrl}`);
    const data = await hiristFetch(hiristUrl);
    if (!data || typeof data !== "object") break;
    const root = data as Record<string, unknown>;
    const items = (root.data ?? []) as unknown[];
    if (!Array.isArray(items) || items.length === 0) break;
    for (const raw of items) {
      const j = parseSearchItem(raw);
      if (j && !byId.has(j.externalId)) byId.set(j.externalId, j);
    }
    if (items.length < size) break;
  }

  let jobs = [...byId.values()];
  if (postingDays != null) {
    // Match the server `posting` window so we don't re-drop what Hirist just returned.
    const cutoff = Date.now() - (postingDays * 24 + 12) * 3_600_000;
    jobs = jobs.filter((j) => !j.postedAt || Date.parse(j.postedAt) >= cutoff);
  }
  jobs.sort((a, b) => (Date.parse(b.postedAt || "") || 0) - (Date.parse(a.postedAt || "") || 0));
  jobs = jobs.slice(0, opts.max ?? 20);
  if (jobs.length === 0) return [];

  const detailTasks = jobs.map((job) => async (): Promise<CanonicalJob> => {
    const d = await fetchDetail(job.externalId).catch(() => null);
    if (!d) return job;
    const skills = [...new Set([...(job.skills ?? []), ...(d.skills ?? [])])];
    const merged = { ...job } as CanonicalJob;
    for (const [k, v] of Object.entries(d)) {
      if (v != null) (merged as Record<string, unknown>)[k] = v;
    }
    merged.skills = skills;
    return merged;
  });

  return withConcurrency(detailTasks, 5);
}
