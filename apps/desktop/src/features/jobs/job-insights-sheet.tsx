import type { FeedJob, JobRanking } from "@compass/ipc-contract";
import { JobInsightsSheet as PolarInsightsSheet } from "./job-insights";
import type { Job } from "./job-insights/job-types";

// Static demo job — descriptive fields only (header / about / salary). The SCORED
// sections are driven by the real ofertas ranking and hidden until one exists.
const STATIC_JOB: Job = {
  id: "demo",
  title: "Senior DevOps Engineer",
  company_name: "Wipro",
  logo_url: null,
  location_cities: ["Bengaluru", "Hyderabad"],
  source: "naukri",
  source_url: "https://www.naukri.com",
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
  requirements: ["5+ years in DevOps / SRE", "Strong Kubernetes + Terraform", "Cloud platform depth (AWS or Azure)"],
  description_summary:
    "Own the reliability, automation and delivery pipelines for a multi-cloud platform. You'll design CI/CD, infrastructure-as-code, observability and incident response across AKS/EKS, partnering with engineering to ship safely and fast.",
  salary_disclosed: true,
  salary_min: 18,
  salary_max: 28,
  posted_raw: "2 days ago",
};

export function JobInsightsSheet({
  open, onOpenChange, ranking,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
  ranking?: JobRanking | null;
}) {
  return (
    <PolarInsightsSheet
      open={open}
      onOpenChange={onOpenChange}
      job={open ? STATIC_JOB : null}
      dimensions={ranking?.dimensions ?? null}
      score={ranking?.score != null ? Number(ranking.score) : null}
      recommendation={ranking?.recommendation ?? null}
      reasoning={ranking?.reasoning ?? null}
      legitimacy={ranking?.legitimacy ?? null}
    />
  );
}
