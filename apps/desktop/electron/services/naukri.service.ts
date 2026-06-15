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

  const createdDate = jd.createdDate ? new Date(Number(jd.createdDate)).toISOString() : null;

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
    postedAt: createdDate,
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

/**
 * Search Naukri by role keyword and fetch full details for each result.
 * Concurrency capped at 5 detail requests in parallel.
 */
export async function searchJobsForRole(
  keyword: string,
  max = 20,
  jobAge = 1,
): Promise<ScrapedJob[]> {
  const limit = Math.min(max, 50);
  const age = jobAge > 0 ? `&jobAge=${jobAge}` : "";
  const url =
    `https://www.naukri.com/jobapi/v3/search?noOfResults=${limit}` +
    `&urlType=search_by_keyword&searchType=adv&keyword=${encodeURIComponent(keyword)}&pageNo=1${age}`;

  const data = await getWithRetry(url, "search", SEARCH_HEADERS);
  if (!data || typeof data !== "object") return [];

  const items = ((data as { jobDetails?: unknown[] }).jobDetails) ?? [];
  const WFH_MAP: Record<string, string> = { "0": "Office", "2": "Remote", "3": "Hybrid" };

  // Parse search results.
  const searchResults: ScrapedJob[] = [];
  for (const raw of items) {
    const item = raw as Record<string, unknown>;
    const jobId = String(item.jobId ?? "");
    if (!jobId) continue;
    const placeholders = (item.placeholders ?? []) as Array<{ type?: string; label?: string }>;
    const ph = (type: string) => placeholders.find((p) => p.type === type)?.label ?? "";
    const sal = (item.salaryDetail ?? {}) as Record<string, unknown>;
    const jdUrl = (item.jdURL as string) ?? (item.staticUrl as string) ?? "";
    searchResults.push({
      source: "naukri",
      sourceJobId: jobId,
      sourceUrl: absUrl(jdUrl),
      title: String(item.title ?? ""),
      company: String(item.companyName ?? ""),
      location: ph("location"),
      workMode: WFH_MAP[String(item.wfhType ?? "")] ?? "",
      salaryRaw: String(sal.label ?? ph("salary") ?? ""),
      experienceMin: item.minimumExperience != null ? Number(item.minimumExperience) : null,
      experienceMax: item.maximumExperience != null ? Number(item.maximumExperience) : null,
      shortDescription: String(item.jobDescription ?? ""),
      fullDescription: "",  // filled by detail fetch below
      skills: [],
      employmentType: null,
      postedAt: null,
    });
  }

  if (searchResults.length === 0) return [];

  // Fetch full details in parallel (concurrency 5).
  const detailTasks = searchResults.map((job) => async () => {
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
      skills: detail.skills ?? [],
      employmentType: detail.employmentType ?? null,
      postedAt: detail.postedAt ?? null,
    };
  });

  return withConcurrency(detailTasks, 5);
}
