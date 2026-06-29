/**
 * Naukri portal — SEARCH only (v3 search_by_key_loc, combined keyword, paginated).
 * Returns search-only partial CanonicalJobs; ./details enriches them.
 *
 * Behaviour (intentional, Naukri-specific):
 *  - up to MAX_PAGES pages at 20/page (hard cap = 5),
 *  - NO freshness cutoff and NO result cap — every scraped row is returned,
 *  - `jobAge`/`experience`/`location` are SEARCH params (sent to Naukri), not filters.
 */
import type { CanonicalJob } from "@compass/ipc-contract";
import { htmlToText } from "../../jd-parse";
import { SEARCH_HEADERS, getWithRetry, toNum, absUrl, parseNaukriDate, slug, EMPTY } from "./client";

const PAGE_SIZE = 20;
const MAX_PAGES = 5;

export interface NaukriSearchOpts {
  keyword: string;          // combined keyword (all roles in one)
  jobAge?: number;          // freshness (days) — search param
  experience?: number | null;
  location?: string;        // comma-separated city NAMES
}

/** Parse one v3 search item into a partial CanonicalJob (detail fetch enriches it). */
function parseSearchItem(raw: unknown): CanonicalJob | null {
  const item = raw as Record<string, unknown>;
  const jobId = String(item.jobId ?? "");
  if (!jobId) return null;
  const placeholders = (item.placeholders ?? []) as Array<{ type?: string; label?: string }>;
  const ph = (type: string) => placeholders.find((p) => p.type === type)?.label ?? "";
  const jdUrl = (item.jdURL as string) ?? (item.staticUrl as string) ?? "";

  // Skills come as a `keySkills` object (mandatory/other/ner); union all,
  // mandatory first; keep the legacy `tagsAndSkills` string as a fallback.
  const ks = (item.keySkills ?? {}) as Record<string, unknown>;
  const skillArr = (k: string) => (Array.isArray(ks[k]) ? (ks[k] as unknown[]) : []);
  const skills = [
    ...new Set(
      [
        ...skillArr("mandatorySkills"),
        ...skillArr("otherSkills"),
        ...skillArr("nerSkills"),
        ...String(item.tagsAndSkills || "").split(","),
      ]
        .map((s) => String(s).trim())
        .filter(Boolean),
    ),
  ];

  // Inline salary + AmbitionBox ship in the search response — used as a fallback
  // (the v4 detail overrides when it succeeds).
  const sal = (item.salaryDetail ?? {}) as Record<string, unknown>;
  const disclosed = sal.hideSalary != null ? !sal.hideSalary : null;
  const ab = (item.ambitionBoxData ?? {}) as Record<string, unknown>;

  // Work mode is the location-label prefix ("Hybrid - …" / "Remote - …").
  const locLabel = ph("location");
  let workMode: CanonicalJob["workMode"] = "onsite";
  let location = locLabel;
  const m = locLabel.match(/^\s*(Hybrid|Remote)\s*-\s*(.*)$/i);
  if (m) { workMode = m[1].toLowerCase() as CanonicalJob["workMode"]; location = m[2].trim(); }

  return {
    ...EMPTY,
    source: "naukri",
    externalId: jobId,
    sourceUrl: absUrl(jdUrl),
    title: String(item.title ?? ""),
    company: String(item.companyName ?? ""),
    location: location || null,
    workMode,
    expMin: toNum(item.minimumExperience),
    expMax: toNum(item.maximumExperience),
    skills,
    jd: htmlToText(String(item.jobDescription ?? "")) || null, // fallback if detail fails
    postedAt: parseNaukriDate(item.createdDate),
    logoUrl: (item.logoPathV3 as string) ?? (item.logoPath as string) ?? null,
    salaryDisclosed: disclosed,
    salaryMin: disclosed ? toNum(sal.minimumSalary) || null : null,
    salaryMax: disclosed ? toNum(sal.maximumSalary) || null : null,
    companyRating: toNum(ab.AggregateRating),
    companyReviewsCount: toNum(ab.ReviewsCount),
  };
}

/**
 * Run the combined-keyword search across up to MAX_PAGES, deduped by jobId.
 * Returns every scraped row (no freshness/count filtering).
 */
export async function searchNaukri(opts: NaukriSearchOpts): Promise<CanonicalJob[]> {
  const age = opts.jobAge && opts.jobAge > 0 ? `&jobAge=${opts.jobAge}` : "";
  const exp = opts.experience != null && opts.experience >= 0 ? `&experience=${Math.round(opts.experience)}` : "";

  const loc = (opts.location ?? "").split(",").map((s) => s.trim()).filter(Boolean).join(", ");
  const kwEnc = encodeURIComponent(opts.keyword);
  const urlType = loc ? "search_by_key_loc" : "search_by_keyword";
  const locParam = loc ? `&location=${encodeURIComponent(loc)}&l=${encodeURIComponent(loc)}` : "";
  const seoBase = `${slug(opts.keyword)}-jobs${loc ? `-in-${slug(loc.split(",")[0])}` : ""}`;

  const byId = new Map<string, CanonicalJob>();
  for (let p = 1; p <= MAX_PAGES; p++) {
    const seoKey = `${seoBase}${p > 1 ? `-${p}` : ""}`;
    const src = p > 1 ? "pagination-directSearch" : "directSearch";
    const url =
      `https://www.naukri.com/jobapi/v3/search?noOfResults=${PAGE_SIZE}` +
      `&keyword=${kwEnc}&k=${kwEnc}${locParam}` +
      `&urlType=${urlType}&searchType=adv_1&pageNo=${p}&sort=r${age}${exp}` +
      `&seoKey=${seoKey}&src=${src}`;
    console.log(`[scan][naukri] search p${p}: ${url}`);
    const data = await getWithRetry(url, "search", SEARCH_HEADERS);
    if (!data || typeof data !== "object") break;
    const root = data as { jobDetails?: unknown[]; noOfJobs?: number };
    const items = root.jobDetails ?? [];
    if (items.length === 0) break;
    for (const raw of items) {
      const sj = parseSearchItem(raw);
      if (sj && !byId.has(sj.externalId)) byId.set(sj.externalId, sj);
    }
    if (items.length < PAGE_SIZE) break; // last page
    if (typeof root.noOfJobs === "number" && byId.size >= root.noOfJobs) break;
  }

  return [...byId.values()];
}
