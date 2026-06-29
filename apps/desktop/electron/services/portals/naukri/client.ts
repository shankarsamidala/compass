/**
 * Naukri portal — shared client internals (auth + http + small parse utils).
 * Used by ./search and ./details so neither depends on the other. All portals
 * normalize to the shared `CanonicalJob` schema; nothing here is portal-generic.
 */
import { createPublicKey, publicEncrypt, constants } from "crypto";
import type { CanonicalJob } from "@compass/ipc-contract";

const RSA_PUB_KEY =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALrlQ+djR0RjJwBF1xuisHmdFv334MImK6Lg" +
  "zJhmLhN7B5yuEyaKoasgXQk3+OQglsOaBxEJ0j5PcTL3nbOvt80CAwEAAQ==";

function generateNkparam(identifier: string): string {
  const key = createPublicKey({ key: Buffer.from(RSA_PUB_KEY, "base64"), format: "der", type: "spki" });
  const plain = `v0|${Date.now()}|121_${identifier}`;
  const enc = publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(plain));
  return enc.toString("base64");
}

export const SEARCH_HEADERS: Record<string, string> = {
  appid: "109",
  systemid: "Naukri",
  clientid: "d3",
  "content-type": "application/json",
  accept: "application/json",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  referer: "https://www.naukri.com/",
};

export const DETAIL_HEADERS: Record<string, string> = {
  appid: "135",
  systemid: "135",
  clientid: "m0b5",
  gid: "LOCATION,INDUSTRY,EDUCATION,FAREA_ROLE",
  "content-type": "application/json",
  accept: "application/json",
  "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15",
  referer: "https://www.naukri.com/",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** GET a Naukri JSON endpoint with a signed nkparam header; one retry on 406. */
export async function getWithRetry(
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

/** Parse a numeric-ish value (number or string) → number, or null. */
export const toNum = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export const absUrl = (u?: string) =>
  !u ? "" : u.startsWith("http") ? u : `https://www.naukri.com${u}`;

/**
 * Parse Naukri's `createdDate` — epoch-ms in the v3 search response, a datetime
 * STRING ("2026-06-16 15:34:33") in the v4 detail. Returns ISO, or null.
 */
export function parseNaukriDate(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const d = /^\d+$/.test(s) ? new Date(Number(s)) : new Date(s.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** wfhType → canonical work mode. */
export const WORK_MODE: Record<string, CanonicalJob["workMode"]> = { "0": "onsite", "2": "remote", "3": "hybrid" };

/** SEO slug for the search URL's `seoKey`. */
export const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** A search-only canonical job template — enrichment fields default to null. */
export const EMPTY: Omit<CanonicalJob, "source" | "externalId" | "sourceUrl" | "title" | "company"> = {
  location: null, logoUrl: null, postedAt: null,
  expMin: null, expMax: null, workMode: null, employmentType: null, seniority: null,
  skills: [], skillsMeta: null, jd: null, jdStructured: null,
  salaryDisclosed: null, salaryMin: null, salaryMax: null, ctcMin: null, ctcMax: null, ctcAvg: null,
  applicants: null, companyRating: null, companyReviewsCount: null,
  companyType: null, companySize: null, industry: null, aboutCompany: null, benefits: null,
};

/** Run tasks with a max concurrency of `limit`. */
export async function withConcurrency<T>(tasks: Array<() => Promise<T>>, limit: number): Promise<T[]> {
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
