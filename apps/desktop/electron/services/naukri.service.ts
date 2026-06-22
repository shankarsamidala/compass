/**
 * Naukri v4 API client — runs in the Electron main process (user's IP, no server blocks).
 * Search → full detail fetch in parallel (concurrency capped at 5).
 */

import { createPublicKey, publicEncrypt, constants } from "crypto";

const RSA_PUB_KEY =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALrlQ+djR0RjJwBF1xuisHmdFv334MImK6Lg" +
  "zJhmLhN7B5yuEyaKoasgXQk3+OQglsOaBxEJ0j5PcTL3nbOvt80CAwEAAQ==";

const SEARCH_HEADERS: Record<string, string> = {
  appid: "109",
  systemid: "Naukri",
  clientid: "d3",
  "content-type": "application/json",
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  referer: "https://www.naukri.com/",
};

const DETAIL_HEADERS: Record<string, string> = {
  appid: "135",
  systemid: "135",
  clientid: "m0b5",
  gid: "LOCATION,INDUSTRY,EDUCATION,FAREA_ROLE",
  "content-type": "application/json",
  accept: "application/json",
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15",
  referer: "https://www.naukri.com/",
};

function generateNkparam(identifier: string): string {
  const key = createPublicKey({ key: Buffer.from(RSA_PUB_KEY, "base64"), format: "der", type: "spki" });
  const plain = `v0|${Date.now()}|121_${identifier}`;
  const enc = publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(plain));
  return enc.toString("base64");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getWithRetry(
  url: string,
  identifier: string,
  headers: Record<string, string>,
): Promise<unknown | null> {
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { ...headers, nkparam: generateNkparam(identifier) },
        signal: AbortSignal.timeout(12_000),
      });
      if (res.status === 200) return await res.json();
      if (res.status === 406 && attempt === 0) { await sleep(3000); continue; }
      return null;
    } catch {
      if (attempt === 0) await sleep(3000);
    }
  }
  return null;
}

const stripHtml = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const absUrl = (u?: string) =>
  !u ? "" : u.startsWith("http") ? u : `https://www.naukri.com${u}`;

/**
 * Parse Naukri's `createdDate`, which is epoch-ms in the v3 search response
 * (e.g. 1781604273895) but a datetime STRING in the v4 detail response
 * (e.g. "2026-06-16 15:34:33"). Returns an ISO string, or null if unparseable.
 */
function parseNaukriDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const d = /^\d+$/.test(s) ? new Date(Number(s)) : new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ScrapedJob {
  source: "naukri";
  sourceJobId: string;
  sourceUrl: string;
  title: string;
  company: string;
  location: string;
  workMode: string;          // Office | Remote | Hybrid
  salaryRaw: string;
  experienceMin: number | null;
  experienceMax: number | null;
  shortDescription: string;
  fullDescription: string;   // stripped full JD text from v4 detail
  skills: string[];
  employmentType: string | null;
  postedAt: string | null;   // ISO date string
  logoUrl: string | null;    // company logo (from search/detail)
}

/** Fetch full detail for a single Naukri job id. Returns null on failure. */
async function fetchDetail(jobId: string): Promise<Partial<ScrapedJob> | null> {
  const url = `https://www.naukri.com/jobapi/v4/job/${jobId}?src=qsbUsage&xp=1&px=1`;
  const data = await getWithRetry(url, jobId, DETAIL_HEADERS);
  if (!data || typeof data !== "object" || !("jobDetails" in data)) return null;

  const jd = ((data as Record<string, unknown>).jobDetails ?? {}) as Record<string, unknown>;
  const cd = (jd.companyDetail ?? {}) as Record<string, unknown>;
  const sal = (jd.salaryDetail ?? {}) as Record<string, unknown>;
  const skillsRaw = (jd.keySkills ?? {}) as Record<string, unknown>;

  const labels = (arr: unknown): string[] =>
    ((arr ?? []) as Array<Record<string, unknown>>)
      .map((s) => String(s.label ?? ""))
      .filter(Boolean);

  const locations = labels(jd.locations);
  const wfhType = String(jd.wfhType ?? "");
  const workModeMap: Record<string, string> = { "0": "Office", "2": "Remote", "3": "Hybrid" };
  const workMode = workModeMap[wfhType] ?? "";
  let location = locations.join(", ");
  if (workMode && workMode !== "Office") location = location ? `${workMode} - ${location}` : workMode;

  const skills = [...new Set([...labels(skillsRaw.preferred), ...labels(skillsRaw.other)])];
  const fullDescription = stripHtml(String(jd.description ?? ""));

  const expMin = jd.minimumExperience != null ? Number(jd.minimumExperience) : null;
  const expMax = jd.maximumExperience != null ? Number(jd.maximumExperience) : null;

  // Company logo: detail's clientLogo / banner (v4) — falls back to the v3 search logo on merge.
  const logoUrl = (jd.clientLogo as string) ?? (jd.banner as string) ?? (jd.socialBanner as string) ?? null;

  return {
    company: String(cd.name ?? ""),
    location,
    workMode,
    salaryRaw: String(sal.label ?? ""),
    experienceMin: expMin,
    experienceMax: expMax,
    fullDescription,
    skills,
    employmentType: (jd.employmentType as string) ?? null,
    postedAt: parseNaukriDate(jd.createdDate),
    logoUrl,
  };
}

/** Run tasks with a max concurrency of `limit`. */
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  limit: number,
): Promise<T[]> {
  const results: T[] = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}

// Naukri city → GID map (filtering uses repeated `cityTypeGid=<gid>` params).
const CITY_GID: Record<string, string> = {
  bengaluru: "97", bangalore: "97", "bangalore rural": "6108",
  hyderabad: "17", chennai: "183", pune: "139",
  "delhi / ncr": "9508", "delhi ncr": "9508", delhi: "9508", "new delhi": "6",
  noida: "220", gurugram: "73", gurgaon: "73",
  mumbai: "134", "mumbai (all areas)": "9509",
  kolkata: "232", ahmedabad: "51", kochi: "110", coimbatore: "184",
  indore: "125", thiruvananthapuram: "120", trivandrum: "120",
  remote: "9513", india: "9011",
};

function cityQuery(location?: string): string {
  if (!location) return "";
  const gids = location
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (/^\d+$/.test(t) ? t : CITY_GID[t.toLowerCase()]))
    .filter(Boolean);
  return [...new Set(gids)].map((g) => `&cityTypeGid=${g}`).join("");
}

/** Parse one v3 search item into a minimal ScrapedJob (detail fetch enriches it). */
function parseSearchItem(raw: unknown): ScrapedJob | null {
  const item = raw as Record<string, unknown>;
  const jobId = String(item.jobId ?? "");
  if (!jobId) return null;
  const placeholders = (item.placeholders ?? []) as Array<{ type?: string; label?: string }>;
  const ph = (type: string) => placeholders.find((p) => p.type === type)?.label ?? "";
  const sal = (item.salaryDetail ?? {}) as Record<string, unknown>;
  const jdUrl = (item.jdURL as string) ?? (item.staticUrl as string) ?? "";
  // Skills from `tagsAndSkills` (v3 search). Detail fetch unions richer v4 skills.
  const skills = String(item.tagsAndSkills || "").split(",").map((s) => s.trim()).filter(Boolean);
  // Work mode is the location-label prefix ("Hybrid - …" / "Remote - …").
  const locLabel = ph("location");
  let workMode = "Office";
  let location = locLabel;
  const m = locLabel.match(/^\s*(Hybrid|Remote)\s*-\s*(.*)$/i);
  if (m) { workMode = m[1]; location = m[2].trim(); }
  return {
    source: "naukri",
    sourceJobId: jobId,
    sourceUrl: absUrl(jdUrl),
    title: String(item.title ?? ""),
    company: String(item.companyName ?? ""),
    location,
    workMode,
    salaryRaw: ph("salary"),
    experienceMin: item.minimumExperience != null ? Number(item.minimumExperience) : null,
    experienceMax: item.maximumExperience != null ? Number(item.maximumExperience) : null,
    shortDescription: stripHtml(String(item.jobDescription ?? "")),
    fullDescription: "",
    skills,
    employmentType: null,
    postedAt: parseNaukriDate(item.createdDate),
    logoUrl: (item.logoPathV3 as string) ?? (item.logoPath as string) ?? null,
  };
}

export interface SearchOpts {
  keyword: string;
  max?: number;          // final cap (default 20)
  jobAge?: number;       // freshness (days)
  experience?: number | null;
  location?: string;     // comma-separated city names or GIDs
  pages?: number;        // search pages to scan (max 10)
}

/**
 * Search Naukri (user's IP) → freshness-filter → cap to `max` → fetch full v4
 * details for the capped set (concurrency 5). Paginated; deduped by jobId.
 */
export async function searchJobsForRole(opts: SearchOpts): Promise<ScrapedJob[]> {
  const max = opts.max ?? 20;
  const pages = Math.min(Math.max(opts.pages ?? 1, 1), 10);
  const limit = 50;
  const age = opts.jobAge && opts.jobAge > 0 ? `&jobAge=${opts.jobAge}` : "";
  const exp = opts.experience != null && opts.experience >= 0 ? `&experience=${Math.round(opts.experience)}` : "";
  const qs = `&keyword=${encodeURIComponent(opts.keyword)}${age}${exp}${cityQuery(opts.location)}`;

  const byId = new Map<string, ScrapedJob>();
  for (let p = 1; p <= pages; p++) {
    const url =
      `https://www.naukri.com/jobapi/v3/search?noOfResults=${limit}` +
      `&urlType=search_by_keyword&searchType=adv&pageNo=${p}${qs}`;
    const data = await getWithRetry(url, "search", SEARCH_HEADERS);
    if (!data || typeof data !== "object") break;
    const items = ((data as { jobDetails?: unknown[] }).jobDetails) ?? [];
    if (items.length === 0) break;
    for (const raw of items) {
      const sj = parseSearchItem(raw);
      if (sj && !byId.has(sj.sourceJobId)) byId.set(sj.sourceJobId, sj);
    }
    if (items.length < limit) break;
  }

  let jobs = [...byId.values()];
  // Hard freshness cutoff (Naukri's jobAge is fuzzy): drop older than jobAge + 12h.
  if (opts.jobAge && opts.jobAge > 0) {
    const cutoff = Date.now() - (opts.jobAge * 24 + 12) * 3_600_000;
    jobs = jobs.filter((j) => !j.postedAt || Date.parse(j.postedAt) >= cutoff);
  }
  // Newest first, cap to max — then only detail-fetch that capped set.
  jobs.sort((a, b) => (Date.parse(b.postedAt || "") || 0) - (Date.parse(a.postedAt || "") || 0));
  jobs = jobs.slice(0, max);
  if (jobs.length === 0) return [];

  const detailTasks = jobs.map((job) => async () => {
    const detail = await fetchDetail(job.sourceJobId).catch(() => null);
    if (!detail) return job;
    return {
      ...job,
      company: detail.company || job.company,
      location: detail.location || job.location,
      workMode: detail.workMode || job.workMode,
      salaryRaw: detail.salaryRaw || job.salaryRaw,
      experienceMin: detail.experienceMin ?? job.experienceMin,
      experienceMax: detail.experienceMax ?? job.experienceMax,
      fullDescription: detail.fullDescription || "",
      // Union v3 (keySkills) + v4 (preferred/other) so we keep the richest skill set.
      skills: [...new Set([...(job.skills ?? []), ...(detail.skills ?? [])])],
      employmentType: detail.employmentType ?? null,
      postedAt: detail.postedAt ?? job.postedAt ?? null,
      logoUrl: detail.logoUrl || job.logoUrl,
    };
  });

  return withConcurrency(detailTasks, 5);
}
