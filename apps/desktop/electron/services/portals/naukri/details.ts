/**
 * Naukri portal — DETAILS only (v4 job detail). Enriches a search row with the
 * full JD, salary, experience, key skills, and AmbitionBox (rating, CTC, benefits).
 */
import type { CanonicalJob } from "@compass/ipc-contract";
import { htmlToText, parseJdSections } from "../../jd-parse";
import { DETAIL_HEADERS, getWithRetry, toNum, parseNaukriDate, WORK_MODE } from "./client";

/** Fetch full v4 detail for a Naukri job id → canonical enrichment fields. */
export async function fetchNaukriDetail(jobId: string): Promise<Partial<CanonicalJob> | null> {
  const url = `https://www.naukri.com/jobapi/v4/job/${jobId}?src=qsbUsage&xp=1&px=1`;
  const data = await getWithRetry(url, jobId, DETAIL_HEADERS);
  if (!data || typeof data !== "object" || !("jobDetails" in data)) return null;

  const root = data as Record<string, unknown>;
  const jd = (root.jobDetails ?? {}) as Record<string, unknown>;
  const cd = (jd.companyDetail ?? {}) as Record<string, unknown>;
  const sal = (jd.salaryDetail ?? {}) as Record<string, unknown>;
  const skillsRaw = (jd.keySkills ?? {}) as Record<string, unknown>;
  const ab = (root.ambitionBoxDetails ?? {}) as Record<string, unknown>;
  const abInfo = (ab.companyInfo ?? {}) as Record<string, unknown>;
  const abSal = (ab.salaries ?? {}) as Record<string, unknown>;
  const abBen = (ab.benefits ?? {}) as Record<string, unknown>;

  const labels = (arr: unknown): string[] =>
    ((arr ?? []) as Array<Record<string, unknown>>).map((s) => String(s.label ?? "")).filter(Boolean);

  // Skills: preferred = mandatory, other = optional. Preferred wins on dup.
  const meta = new Map<string, boolean>();
  for (const l of labels(skillsRaw.other)) meta.set(l, false);
  for (const l of labels(skillsRaw.preferred)) meta.set(l, true);
  const skillsMeta = [...meta].map(([name, mandatory]) => ({ name, mandatory }));

  const description = String(jd.description ?? "");
  const disclosed = sal.hideSalary != null ? !sal.hideSalary : null;
  const benefits = ((abBen.List ?? []) as Array<Record<string, unknown>>)
    .filter((b) => String(b.Status) === "true")
    .map((b) => String(b.BenefitName ?? ""))
    .filter(Boolean);

  return {
    company: String(cd.name ?? "") || undefined,
    location: labels(jd.locations).join(", ") || undefined,
    logoUrl: (jd.clientLogo as string) ?? (jd.banner as string) ?? (jd.socialBanner as string) ?? null,
    workMode: WORK_MODE[String(jd.wfhType ?? "")] ?? null,
    employmentType: (jd.employmentType as string) ?? null,
    expMin: toNum(jd.minimumExperience),
    expMax: toNum(jd.maximumExperience),
    postedAt: parseNaukriDate(jd.createdDate),
    skills: [...meta.keys()],
    skillsMeta,
    jd: htmlToText(description),
    jdStructured: parseJdSections(description),
    salaryDisclosed: disclosed,
    salaryMin: disclosed ? toNum(sal.minimumSalary) || null : null,
    salaryMax: disclosed ? toNum(sal.maximumSalary) || null : null,
    ctcMin: toNum(abSal.MinCtc),
    ctcMax: toNum(abSal.MaxCtc),
    ctcAvg: toNum(abSal.AverageCtc),
    applicants: toNum(jd.applyCount),
    companyRating: toNum(abInfo.AggregateRating),
    companyReviewsCount: toNum(abInfo.ReviewsCount),
    industry: (jd.industry as string) ?? null,
    aboutCompany: htmlToText(String(cd.details ?? "")) || null,
    benefits: benefits.length ? benefits : null,
  };
}
