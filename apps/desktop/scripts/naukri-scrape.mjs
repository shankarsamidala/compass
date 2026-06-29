#!/usr/bin/env node
// Local Naukri scraper — prompts for inputs, runs the COMBINED keyword search
// (search_by_key_loc / adv_1, like the web), paginates, and prints company + title.
//
// Run:  node apps/desktop/scripts/naukri-scrape.mjs
//
import { createPublicKey, publicEncrypt, constants } from "node:crypto";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// ── Naukri auth (nkparam) — mirrors the app's adapter ────────────────────────
const RSA_PUB_KEY =
  "MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBALrlQ+djR0RjJwBF1xuisHmdFv334MImK6Lg" +
  "zJhmLhN7B5yuEyaKoasgXQk3+OQglsOaBxEJ0j5PcTL3nbOvt80CAwEAAQ==";
const nkparam = (id) => {
  const key = createPublicKey({ key: Buffer.from(RSA_PUB_KEY, "base64"), format: "der", type: "spki" });
  const enc = publicEncrypt({ key, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(`v0|${Date.now()}|121_${id}`));
  return enc.toString("base64");
};
const HEADERS = {
  appid: "109", systemid: "Naukri", clientid: "d3",
  "content-type": "application/json", accept: "application/json",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  referer: "https://www.naukri.com/",
};

const slug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CLUSTERS =
  "wfhType,citiesGid,experience,topGroupId,industryTypeGid,salaryRange,freshness,roleGid," +
  "employement,functionalAreaGid,ugCourseGid,jobType,sortBy,employmentType,stipend,internshipDuration";

function buildUrl({ keyword, location, experience, jobAge, page }) {
  const kw = encodeURIComponent(keyword);
  const loc = location ? encodeURIComponent(location) : "";
  const seoBase = `${slug(keyword)}-jobs${location ? `-in-${slug(location.split(",")[0])}` : ""}`;
  const seoKey = `${seoBase}${page > 1 ? `-${page}` : ""}`;
  const src = page > 1 ? "pagination-directSearch" : "directSearch";
  let u = `https://www.naukri.com/jobapi/v3/search?noOfResults=20&keyword=${kw}&k=${kw}`;
  if (loc) u += `&location=${loc}&l=${loc}`;
  u += `&urlType=search_by_key_loc&searchType=adv_1&pageNo=${page}&sort=r`;
  if (jobAge) u += `&jobAge=${jobAge}`;
  if (experience !== "") u += `&experience=${experience}`;
  u += `&seoKey=${seoKey}&src=${src}&clusters=${CLUSTERS}`;
  return u;
}

async function getJson(url) {
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const res = await fetch(url, { headers: { ...HEADERS, nkparam: nkparam("search") }, signal: AbortSignal.timeout(15000) });
      if (res.status === 200) return await res.json();
      if (res.status === 406 && attempt === 0) { await sleep(2500); continue; }
      console.error(`  ! HTTP ${res.status}`);
      return null;
    } catch (e) {
      if (attempt === 0) { await sleep(2500); continue; }
      console.error(`  ! ${e.message}`);
    }
  }
  return null;
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const ask = async (q, dflt = "") => {
    const a = (await rl.question(dflt ? `${q} [${dflt}]: ` : `${q}: `)).trim();
    return a || dflt;
  };

  const keyword = await ask("Role(s) (comma-separated, becomes one keyword)", "cloud engineer, devops engineer");
  const location = await ask("Location(s) (comma-separated, blank = all India)", "bengaluru");
  const experience = await ask("Experience (years, blank = any)", "");
  const jobAge = await ask("Job age (days, blank = any)", "");
  const pages = Math.max(1, parseInt(await ask("Pages to scan", "5"), 10) || 5);
  rl.close();

  console.log(`\n→ keyword="${keyword}"  location="${location}"  exp=${experience || "-"}  jobAge=${jobAge || "-"}  pages=${pages}\n`);

  const seen = new Map(); // jobId → { company, title }
  for (let page = 1; page <= pages; page++) {
    const url = buildUrl({ keyword, location, experience, jobAge, page });
    console.log(`[page ${page}] ${url}`);
    const data = await getJson(url);
    const items = data?.jobDetails ?? [];
    console.log(`  noOfJobs=${data?.noOfJobs ?? "?"}  thisPage=${items.length}`);
    for (const it of items) {
      const id = String(it.jobId ?? "");
      if (!id || seen.has(id)) continue;
      seen.set(id, { company: it.companyName ?? "", title: it.title ?? "" });
    }
    if (items.length < 20) break;                       // last page
    if (typeof data?.noOfJobs === "number" && seen.size >= data.noOfJobs) break;
  }

  const rows = [...seen.values()];
  console.log(`\n=== ${rows.length} unique jobs (company — title) ===`);
  rows.forEach((r, i) => console.log(`${String(i + 1).padStart(3)}. ${r.company}  —  ${r.title}`));
  console.log(`\nJSON:`);
  console.log(JSON.stringify(rows, null, 2));
}

main();
