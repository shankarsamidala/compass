import type { CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { FeedJob, JobRanking } from "@compass/ipc-contract";
import { JobDetailPanel, type PanelJob } from "./job-detail-panel";

// Scope the dashoard's LIGHT theme tokens to the sheet only — so the component
// renders pixel-identical to the dashoard without touching Compass's dark theme.
const LIGHT_TOKENS = {
  "--background": "#FFFFFF",
  "--foreground": "#1A1A1A",
  "--card": "#FFFFFF",
  "--card-foreground": "#1A1A1A",
  "--primary": "#D97757",
  "--primary-foreground": "#FFFFFF",
  "--muted": "rgba(0,0,0,0.06)",
  "--muted-foreground": "#484844",
  "--accent": "rgba(0,0,0,0.06)",
  "--accent-foreground": "#1A1A1A",
  "--border": "rgba(0,0,0,0.13)",
  "--destructive": "#ef4444",
  "--color-success": "#16a34a",
  "--color-success-bg": "#f0fdf4",
  "--color-success-border": "#bbf7d0",
  "--color-warning": "#d97706",
  "--color-warning-bg": "#fffbeb",
  "--color-warning-border": "#fde68a",
} as CSSProperties;

// Static preview data (matches the dashoard PanelJob shape).
const STATIC_JOB: PanelJob = {
  id: "static",
  title: "Senior DevOps Engineer",
  company_name: "Wipro",
  logo_url: null,
  salary_disclosed: true,
  salary_min: 18,
  salary_max: 28,
  employment_type: "full_time",
  work_mode: "hybrid",
  exp_min: 5,
  exp_max: 8,
  seniority_level: "senior",
  location_cities: ["Bengaluru", "Hyderabad"],
  company_industry: "IT Services & Consulting",
  company_rating: 3.6,
  company_reviews: 65988,
  source_url: "https://www.naukri.com",
  score: 84,
  key_skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Docker", "Jenkins", "Prometheus", "Helm", "Python", "Ansible"],
  description_summary:
    "Own the reliability, automation and delivery pipelines for a multi-cloud platform. You'll design CI/CD, infrastructure-as-code, observability and incident response across AKS/EKS, partnering with engineering to ship safely and fast.",
  posted_raw: "2 days ago",
  user_state: { is_saved: false },
};

export function JobInsightsSheet({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
  ranking?: JobRanking | null;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/50"
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            style={LIGHT_TOKENS}
            className="fixed right-0 top-0 z-[201] h-full w-full max-w-xl border-l border-border"
          >
            <JobDetailPanel job={STATIC_JOB} onClose={() => onOpenChange(false)} />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
