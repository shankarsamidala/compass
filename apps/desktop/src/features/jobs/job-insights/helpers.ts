import type { Job } from "./job-types";

export function locationVerdict(job: Job): string {
  if (!job.match_breakdown) return "no_data";
  if (job.work_mode === "remote" || job.work_mode === "Remote") return "remote_ok";
  const pct = job.match_breakdown.location_pct;
  if (pct >= 80) return "good_fit";
  if (pct >= 50) return "relocation_possible";
  return "relocation_needed";
}

export function seniorityVerdict(job: Job): string {
  if (!job.match_breakdown) return "no_data";
  const pct = job.match_breakdown.seniority_pct;
  if (pct >= 85) return "exact_match";
  if (pct >= 65) return "good_fit";
  return "stretch_up";
}

export function experienceVerdict(job: Job): string {
  if (!job.match_breakdown) return "no_data";
  const pct = job.match_breakdown.experience_pct;
  if (pct >= 75) return "in_range";
  if (pct >= 55) return "good_fit";
  return "stretch_up";
}

export function parsePostedHours(posted_raw?: string | null): number | null {
  if (!posted_raw) return null;
  const s = posted_raw.toLowerCase().trim();
  if (s.includes("just") || s.includes("now")) return 1;
  const hours = s.match(/(\d+)\s*h/);
  if (hours) return parseInt(hours[1], 10);
  const days = s.match(/(\d+)\s*d/);
  if (days) return parseInt(days[1], 10) * 24;
  const weeks = s.match(/(\d+)\s*w/);
  if (weeks) return parseInt(weeks[1], 10) * 168;
  return null;
}

export interface UrgencyData {
  ageHours: number | null;
  applicantCount: number;
  openings: number | null;
}

export function computeUrgency(job: Job): UrgencyData | null {
  const applicants =
    typeof job.applicants === "string" ? parseInt(job.applicants, 10) : (job.applicants ?? 0);
  if (!applicants || isNaN(applicants)) return null;
  const openings = job.openings ?? 99;
  const isHighComp = applicants > 50 && openings <= 5;
  if (!isHighComp) return null;
  return {
    ageHours: parsePostedHours(job.posted_raw),
    applicantCount: applicants,
    openings: job.openings ?? null,
  };
}
