import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { FeedJob, JobRanking } from "@compass/ipc-contract";
import { api } from "@/lib/ipc";
import { toAbsoluteJobUrl } from "@/lib/utils";
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
  // Drives the Fit Summary card (Location/Seniority/Experience)
  match_breakdown: { overall_pct: 84, skills_pct: 88, experience_pct: 80, seniority_pct: 82, location_pct: 90 },
  // Drives the Urgency card (Posted/Applicants/Openings)
  applicants: 142,
  openings: 3,
};

// Demo fallback so the scored sections render in preview; the real ofertas
// ranking overrides these per job once it's been ranked.
const DEMO_DIMENSIONS = {
  northStar: 5, cvMatch: 4, level: 4, comp: 3, growth: 4,
  remote: 3, reputation: 4, techStack: 5, speed: 3, culture: 4,
};
const DEMO_REASONING =
  "GCP DevOps + Terraform/K8s/CI-CD with GenAI as a bonus growth angle; strong fit, apply soon.";

export function JobInsightsSheet({
  open, onOpenChange, job, ranking,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
  ranking?: JobRanking | null;
}) {
  // Fetch the full job (the list omits the JD) so "About the Role" uses the real
  // scraped description.
  const { data: full } = useQuery({
    queryKey: ["job-detail", job?.id],
    queryFn: async () => {
      const r = await api.jobs.get(job!.id);
      return r.ok ? r.data.job : null;
    },
    enabled: open && !!job?.id,
  });
  const realJd = full?.jd ?? job?.jd ?? null;

  // ── Resume / CV actions (warm agent → pdf / cover modes) ──────────────────
  const [resumePending, setResumePending] = useState(false);
  const [cvPending, setCvPending] = useState(false);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Reset per-job artifacts when the sheet switches jobs or closes.
  useEffect(() => {
    setCoverLetter(null);
    setResumeNote(null);
    setActionError(null);
  }, [job?.id]);

  // Tailor the resume → store as PremiumResumeData JSON (PDF rendering is held for now,
  // so we surface a saved confirmation + ATS keyword coverage rather than opening a file).
  const handleResume = async () => {
    if (!job?.id || resumePending) return;
    setResumePending(true);
    setActionError(null);
    setResumeNote(null);
    try {
      const r = await api.jobs.tailorResume(job.id);
      if (!r.ok) setActionError(r.error);
      else
        setResumeNote(
          r.data.keywordCoverage != null
            ? `Resume tailored & saved — ${r.data.keywordCoverage}% JD keyword match`
            : "Resume tailored & saved",
        );
    } finally {
      setResumePending(false);
    }
  };

  const handleCv = async () => {
    if (!job?.id || cvPending) return;
    setCvPending(true);
    setActionError(null);
    try {
      const r = await api.jobs.coverLetter(job.id);
      if (r.ok) setCoverLetter(r.data.letter);
      else setActionError(r.error);
    } finally {
      setCvPending(false);
    }
  };

  // Real header fields (title / company / location / logo / apply link) + real
  // JD for About; the rest is still demo for now.
  const sheetJob: Job = {
    ...STATIC_JOB,
    title: job?.title ?? STATIC_JOB.title,
    company_name: job?.company ?? STATIC_JOB.company_name,
    location_cities: job?.location ? [job.location] : STATIC_JOB.location_cities,
    logo_url: job?.logoUrl ?? STATIC_JOB.logo_url,
    source_url: toAbsoluteJobUrl(job?.jobUrl, job?.source) ?? STATIC_JOB.source_url,
    description_summary: realJd ?? STATIC_JOB.description_summary,
    responsibilities: realJd ? undefined : STATIC_JOB.responsibilities,
    requirements: realJd ? undefined : STATIC_JOB.requirements,
    tech_stack: realJd ? undefined : STATIC_JOB.tech_stack,
    key_skills: realJd ? undefined : STATIC_JOB.key_skills,
    preferred_skills: realJd ? undefined : STATIC_JOB.preferred_skills,
  };

  return (
    <PolarInsightsSheet
      open={open}
      onOpenChange={onOpenChange}
      job={open ? sheetJob : null}
      dimensions={ranking?.dimensions ?? DEMO_DIMENSIONS}
      score={ranking?.score != null ? Number(ranking.score) : 4.2}
      recommendation={ranking?.recommendation ?? "Apply"}
      reasoning={ranking?.reasoning ?? DEMO_REASONING}
      legitimacy={ranking?.legitimacy ?? "High Confidence"}
      onResume={() => void handleResume()}
      onCv={() => void handleCv()}
      resumePending={resumePending}
      cvPending={cvPending}
      coverLetter={coverLetter}
      resumeNote={resumeNote}
      actionError={actionError}
    />
  );
}
