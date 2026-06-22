import type { FeedJob, JobRanking } from "@compass/ipc-contract";
import { JobInsightsSheet as PolarInsightsSheet } from "./job-insights";
import type { Job } from "./job-insights/job-types";

// Static demo job (exact dashoard demo content). Real wiring comes next.
const STATIC_JOB: Job = {
  id: "demo",
  title: "Senior DevOps Engineer",
  company_name: "Wipro",
  logo_url: null,
  location_cities: ["Bengaluru", "Hyderabad"],
  source: "naukri",
  source_url: "https://www.naukri.com",
  score: 0.84,
  match_breakdown: { overall_pct: 84, skills_pct: 88, experience_pct: 80, seniority_pct: 82, location_pct: 90 },
  skills_matched: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Docker", "Jenkins", "Prometheus", "Helm", "Python", "Ansible", "Linux", "Git"],
  skills_missing: ["ArgoCD", "Go"],
  work_mode: "hybrid",
  exp_min: 5,
  exp_max: 8,
  seniority_level: "senior",
  key_skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Docker"],
  tech_stack: ["Kubernetes", "Terraform", "AWS", "Docker", "Jenkins"],
  preferred_skills: ["ArgoCD", "Helm"],
  responsibilities: [
    "Design and operate CI/CD pipelines across services",
    "Manage multi-cloud infrastructure with Terraform (IaC)",
    "Drive SLOs, observability and incident response",
  ],
  requirements: [
    "5+ years in DevOps / SRE",
    "Strong Kubernetes + Terraform",
    "Cloud platform depth (AWS or Azure)",
  ],
  description_summary:
    "Own the reliability, automation and delivery pipelines for a multi-cloud platform. You'll design CI/CD, infrastructure-as-code, observability and incident response across AKS/EKS, partnering with engineering to ship safely and fast.",
  salary_disclosed: true,
  salary_min: 18,
  salary_max: 28,
  applicants: 142,
  openings: 3,
  posted_raw: "2 days ago",
};

// Demo ofertas dimensions (1–5) so the polar petals show in preview; the real
// ranking overrides this when the job has been ranked.
const DEMO_DIMENSIONS = {
  northStar: 5, cvMatch: 4, level: 4, comp: 3, growth: 4,
  remote: 3, reputation: 4, techStack: 5, speed: 3, culture: 4,
};

export function JobInsightsSheet({
  open, onOpenChange, ranking,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
  ranking?: JobRanking | null;
}) {
  const dimensions = ranking?.dimensions ?? DEMO_DIMENSIONS;
  return (
    <PolarInsightsSheet
      open={open}
      onOpenChange={onOpenChange}
      job={open ? STATIC_JOB : null}
      dimensions={dimensions}
    />
  );
}
