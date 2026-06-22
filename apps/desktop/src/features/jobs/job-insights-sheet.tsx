import { AnimatePresence, motion } from "framer-motion";
import { X, MapPin, Star, Clock, Bookmark, ExternalLink } from "lucide-react";
import { useState } from "react";
import type { FeedJob, JobRanking } from "@compass/ipc-contract";

// ─── STATIC PREVIEW DATA (port of dashoard JobDetailPanel) ────────────────────
const JOB = {
  title: "Senior DevOps Engineer",
  company: "Wipro",
  industry: "IT Services & Consulting",
  locations: ["Bengaluru", "Hyderabad"],
  rating: 3.6,
  reviews: 65988,
  salary: "₹18–28 LPA",
  postedRaw: "2 days ago",
  logoUrl: null as string | null,
  scorePct: 84,
  tags: ["Full Time", "Hybrid", "5–8 Yrs", "Senior"],
  skills: ["Kubernetes", "Terraform", "AWS", "CI/CD", "Docker", "Jenkins", "Prometheus", "Helm", "Python", "Ansible"],
  about:
    "Own the reliability, automation and delivery pipelines for a multi-cloud platform. You'll design CI/CD, infrastructure-as-code, observability and incident response across AKS/EKS, partnering with engineering to ship safely and fast.",
};

const BARS = [
  { label: "Skill matching", score: 9, color: "bg-amber-400", hex: "#F59E0B" },
  { label: "Keywords matching", score: 8, color: "bg-blue-500", hex: "#3B82F6" },
  { label: "Work Experience", score: 8, color: "bg-orange-400", hex: "#F97316" },
  { label: "Education", score: 9, color: "bg-violet-400", hex: "#A78BFA" },
  { label: "Culture Fit", score: 7, color: "bg-cyan-400", hex: "#22D3EE" },
  { label: "Location Match", score: 10, color: "bg-emerald-400", hex: "#34D399" },
];

// ─── Donut chart (pure SVG) ───────────────────────────────────────────────────
function DonutChart({ segments, pct }: { segments: { pct: number; color: string }[]; pct: number }) {
  const r = 60;
  const cx = 76;
  const cy = 76;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={152} height={152} viewBox="0 0 152 152">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={16} className="text-border" />
      {segments.map((seg, i) => {
        const dash = (seg.pct / 100) * circ;
        const gap = circ - dash;
        const rotation = -90 + (offset / 100) * 360;
        offset += seg.pct;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={16}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
        );
      })}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-white" style={{ fontSize: 22, fontWeight: 700 }}>{pct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>match</text>
    </svg>
  );
}

function CVMatchSection() {
  const pct = JOB.scorePct;
  const label = pct >= 80 ? "Strong Match" : pct >= 60 ? "Good Match" : "Partial Match";
  const badgeCls = pct >= 80 ? "bg-emerald-500/15 text-emerald-400" : pct >= 60 ? "bg-amber-500/15 text-amber-400" : "bg-accent text-muted-foreground";
  const total = BARS.reduce((a, b) => a + b.score, 0);
  const segments = [...BARS.map((b) => ({ pct: (b.score / total) * 90, color: b.hex })), { pct: 10, color: "rgba(150,150,150,0.12)" }];

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">CV Matching Result</h3>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${badgeCls}`}>{label}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <div>
            <p className="mb-0.5 text-xs text-muted-foreground">Percentage match</p>
            <p className="text-3xl font-bold leading-none text-foreground">
              {pct}%<span className="text-sm font-normal text-muted-foreground">/100%</span>
            </p>
          </div>
          {BARS.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{bar.label}</span>
                <span className="text-xs font-semibold text-foreground">{bar.score}/10</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.score * 10}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center">
          <DonutChart segments={segments} pct={pct} />
        </div>
      </div>
    </div>
  );
}

export function JobInsightsSheet({
  open, onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
  ranking?: JobRanking | null;
}) {
  const [saved, setSaved] = useState(false);

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
            className="fixed right-0 top-0 z-[201] flex h-full w-full max-w-xl flex-col border-l border-border bg-background"
          >
            {/* Gradient banner */}
            <div
              className="relative h-28 shrink-0"
              style={{ background: "linear-gradient(135deg, rgba(255,0,128,0.25) 0%, rgba(121,40,202,0.2) 50%, rgba(64,118,255,0.25) 100%)" }}
            >
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <span className="flex items-center gap-1 rounded-full bg-background/80 px-2.5 py-1 text-xs text-foreground/70 backdrop-blur-sm">
                  <Clock className="size-3 shrink-0" />{JOB.postedRaw}
                </span>
                <button
                  onClick={() => onOpenChange(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur-sm transition-colors hover:text-foreground"
                  aria-label="Close"
                >
                  <X className="size-4" />
                </button>
              </div>
              <div className="absolute -bottom-10 left-6">
                {JOB.logoUrl ? (
                  <img src={JOB.logoUrl} alt={JOB.company} className="h-20 w-20 rounded-2xl border-2 border-border bg-background object-cover" />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-border bg-background">
                    <span className="text-3xl font-bold text-brand">{JOB.company.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-8">
              <div className="flex items-start justify-between gap-4 pt-16">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold leading-tight text-foreground">{JOB.title}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm text-muted-foreground">{JOB.company}</span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />{JOB.locations.join(", ")}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-sm text-muted-foreground">{JOB.industry}</span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <Star className="size-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-sm font-medium text-foreground">{JOB.rating.toFixed(1)}</span>
                    <span className="text-xs text-muted-foreground">({JOB.reviews.toLocaleString()} reviews)</span>
                  </div>
                </div>
                <button
                  onClick={() => setSaved((s) => !s)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border transition-colors hover:bg-accent"
                >
                  <Bookmark className={`size-4 ${saved ? "fill-brand text-brand" : "text-muted-foreground"}`} />
                </button>
              </div>

              {/* Salary + Apply */}
              <div className="mt-5 flex items-center gap-3">
                <p className="flex-1 text-2xl font-bold text-foreground">{JOB.salary}</p>
                <button className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white px-5 text-sm font-semibold text-black transition-opacity hover:opacity-90">
                  Apply <ExternalLink className="size-3.5" />
                </button>
              </div>

              {/* Tags */}
              <div className="mt-4 flex flex-wrap gap-2">
                {JOB.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-md border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">{tag}</span>
                ))}
              </div>

              {/* CV Match */}
              <CVMatchSection />

              {/* Key Skills */}
              <div className="mt-5">
                <h3 className="mb-2.5 text-sm font-semibold text-foreground">Key Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {JOB.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center rounded-full bg-card px-2.5 py-0.5 text-xs font-medium text-foreground">{skill}</span>
                  ))}
                </div>
              </div>

              {/* About */}
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">About the Role</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{JOB.about}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
