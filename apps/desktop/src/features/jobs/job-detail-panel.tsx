// Verbatim port of dashoard/src/features/jobs/components/job-detail-panel.tsx.
// Only framework-specific bits adapted for Compass (Vite, not Next): next/image →
// <img>, useJobInteractions → local state, StatusBadge inlined. Classes unchanged.
import { useState } from "react";
import { X, MapPin, Star, Clock, Bookmark, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PanelJob {
  id: string;
  title: string;
  company_name: string;
  logo_url?: string | null;
  salary_disclosed: boolean;
  salary_min?: number | null;
  salary_max?: number | null;
  employment_type?: string | null;
  work_mode?: string | null;
  exp_min?: number | null;
  exp_max?: number | null;
  seniority_level?: string | null;
  location_cities?: string[];
  company_industry?: string | null;
  company_rating?: number | null;
  company_reviews?: number | null;
  source_url?: string | null;
  score?: number | null;
  key_skills?: string[];
  description_summary?: string | null;
  description_snippet?: string | null;
  posted_raw?: string | null;
  user_state?: { is_saved?: boolean };
}

// ─── StatusBadge (inlined from dashoard) ──────────────────────────────────────
type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";
const variantStyles: Record<StatusVariant, string> = {
  success: "bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]",
  warning: "bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]",
  danger: "bg-[var(--color-danger-bg)]  text-[var(--color-danger)]  border-[var(--color-danger-border)]",
  info: "bg-[var(--color-info-bg)]    text-[var(--color-info)]    border-[var(--color-info-border)]",
  neutral: "bg-surface-raised text-muted-foreground border-surface-border",
};
function StatusBadge({ variant = "neutral", children, className }: { variant?: StatusVariant; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", variantStyles[variant], className)}>
      {children}
    </span>
  );
}

function formatSalary(disclosed: boolean, min?: number | null, max?: number | null): string {
  if (!disclosed || (min == null && max == null)) return "Not Disclosed";
  if (min != null && max != null) return `₹${min}–${max} LPA`;
  if (min != null) return `₹${min}+ LPA`;
  return `Up to ₹${max} LPA`;
}

function fmt(type?: string | null): string {
  if (!type) return "Full Time";
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Donut chart (pure SVG, no lib) ──────────────────────────────────────────
function DonutChart({ segments, pct }: { segments: { pct: number; color: string }[]; pct: number }) {
  const r = 60;
  const cx = 76;
  const cy = 76;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <svg width={152} height={152} viewBox="0 0 152 152">
      {/* Track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth={16} className="text-muted/30" />
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
            strokeDashoffset={0}
            strokeLinecap="round"
            style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${cx}px ${cy}px` }}
          />
        );
      })}
      {/* Center label */}
      <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground" style={{ fontSize: 22, fontWeight: 700 }}>{pct}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground" style={{ fontSize: 11 }}>match</text>
    </svg>
  );
}

// ─── CV Match Section ─────────────────────────────────────────────────────────
function CVMatchSection({ score }: { score?: number | null }) {
  const pct = score != null ? (score > 1 ? Math.round(score) : Math.round(score * 100)) : null;
  if (pct == null) return null;

  const label = pct >= 80 ? "Strong Match" : pct >= 60 ? "Good Match" : "Partial Match";
  const labelVariant = pct >= 80 ? "success" : pct >= 60 ? ("warning" as const) : ("neutral" as const);

  const bars = [
    { label: "Skill matching", score: Math.min(10, Math.round(pct / 10)), color: "bg-amber-400", hex: "#F59E0B" },
    { label: "Keywords matching", score: Math.min(10, Math.round((pct + 5) / 10)), color: "bg-blue-500", hex: "#3B82F6" },
    { label: "Work Experience", score: Math.min(10, Math.round((pct - 3) / 10)), color: "bg-orange-400", hex: "#F97316" },
    { label: "Education", score: Math.min(10, Math.round((pct + 2) / 10)), color: "bg-violet-400", hex: "#A78BFA" },
    { label: "Culture Fit", score: Math.min(10, Math.round((pct - 6) / 10)), color: "bg-cyan-400", hex: "#22D3EE" },
    { label: "Location Match", score: Math.min(10, Math.round((pct + 8) / 10)), color: "bg-emerald-400", hex: "#34D399" },
  ];

  const total = bars.reduce((a, b) => a + b.score, 0);
  const segments = [...bars.map((b) => ({ pct: (b.score / total) * 90, color: b.hex })), { pct: 10, color: "rgba(150,150,150,0.1)" }];

  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-sm font-semibold">CV Matching Result</h3>
        <StatusBadge variant={labelVariant} className="py-1 font-semibold">{label}</StatusBadge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-6">
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-muted-foreground mb-0.5 text-xs">Percentage match</p>
            <p className="text-foreground text-3xl leading-none font-bold">
              {pct}%<span className="text-muted-foreground text-sm font-normal">/100%</span>
            </p>
          </div>
          {bars.map((bar) => (
            <div key={bar.label}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-muted-foreground text-xs">{bar.label}</span>
                <span className="text-foreground text-xs font-semibold">{bar.score}/10</span>
              </div>
              <div className="bg-muted h-1.5 overflow-hidden rounded-full">
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

// ─── Detail Panel ─────────────────────────────────────────────────────────────
export function JobDetailPanel({ job, onClose }: { job: PanelJob; onClose: () => void }) {
  const [saved, setSaved] = useState(!!job.user_state?.is_saved);
  const [imgError, setImgError] = useState(false);

  const salary = formatSalary(job.salary_disclosed, job.salary_min, job.salary_max);

  const tags: string[] = [
    fmt(job.employment_type),
    job.work_mode && job.work_mode !== "not_specified" ? job.work_mode.charAt(0).toUpperCase() + job.work_mode.slice(1) : null,
    job.exp_min != null && job.exp_max != null ? `${job.exp_min}–${job.exp_max} Yrs` : job.exp_min != null ? `${job.exp_min}+ Yrs` : null,
    job.seniority_level ? job.seniority_level.charAt(0).toUpperCase() + job.seniority_level.slice(1) : null,
  ].filter(Boolean) as string[];

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Gradient banner */}
      <div
        className="relative h-28 shrink-0"
        style={{ background: "linear-gradient(135deg, rgba(255,0,128,0.25) 0%, rgba(121,40,202,0.2) 50%, rgba(64,118,255,0.25) 100%)" }}
      >
        <div className="absolute top-3 right-3 flex items-center gap-2">
          {job.posted_raw && (
            <span className="text-foreground/70 bg-background/80 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs backdrop-blur-sm">
              <Clock className="size-3 shrink-0" />
              {job.posted_raw}
            </span>
          )}
          <button
            onClick={onClose}
            className="bg-background/80 text-muted-foreground hover:text-foreground flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors"
            aria-label="Close"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Logo floats over banner bottom */}
        <div className="absolute -bottom-10 left-6">
          {imgError || !job.logo_url ? (
            <div className="bg-background border-border flex h-20 w-20 items-center justify-center rounded-2xl border-2">
              <span className="text-primary text-3xl font-bold">{job.company_name?.charAt(0)?.toUpperCase() || "?"}</span>
            </div>
          ) : (
            <img
              src={job.logo_url}
              alt={`${job.company_name} logo`}
              className="bg-background border-border h-20 w-20 rounded-2xl border-2 object-cover"
              onError={() => setImgError(true)}
            />
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        {/* Title + save */}
        <div className="flex items-start justify-between gap-4 pt-16">
          <div className="min-w-0 flex-1">
            <h2 className="text-foreground text-xl leading-tight font-bold">{job.title}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-muted-foreground text-sm">{job.company_name}</span>
              {job.location_cities?.[0] && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-muted-foreground flex items-center gap-1 text-sm">
                    <MapPin className="size-3 shrink-0" />
                    {job.location_cities.join(", ")}
                  </span>
                </>
              )}
              {job.company_industry && (
                <>
                  <span className="text-muted-foreground text-xs">·</span>
                  <span className="text-muted-foreground text-sm">{job.company_industry}</span>
                </>
              )}
            </div>
            {job.company_rating != null && (
              <div className="mt-1.5 flex items-center gap-1.5">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium">{job.company_rating.toFixed(1)}</span>
                {(job.company_reviews ?? 0) > 0 && (
                  <span className="text-muted-foreground text-xs">({job.company_reviews!.toLocaleString()} reviews)</span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setSaved((s) => !s)}
            className="border-border hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
          >
            <Bookmark className={`size-4 ${saved ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
        </div>

        {/* Salary + Apply */}
        <div className="mt-5 flex items-center gap-3">
          <p className="text-foreground flex-1 text-2xl font-bold">{salary}</p>
          {job.source_url && (
            <a
              href={job.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background hover:bg-foreground/90 flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-5 text-sm font-semibold transition-colors"
            >
              Apply
              <ExternalLink className="size-3.5" />
            </a>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag} className="border-border text-muted-foreground inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium">{tag}</span>
            ))}
          </div>
        )}

        {/* CV Match */}
        <CVMatchSection score={job.score} />

        {/* Key Skills */}
        {(job.key_skills?.length ?? 0) > 0 && (
          <div className="mt-5">
            <h3 className="text-foreground mb-2.5 text-sm font-semibold">Key Skills</h3>
            <div className="flex flex-wrap gap-1.5">
              {job.key_skills!.map((skill) => (
                <span key={skill} className="bg-muted text-foreground inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium">{skill}</span>
              ))}
            </div>
          </div>
        )}

        {/* Description */}
        {(job.description_summary || job.description_snippet) && (
          <div className="mt-5">
            <h3 className="text-foreground mb-2 text-sm font-semibold">About the Role</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">{job.description_summary || job.description_snippet}</p>
          </div>
        )}
      </div>
    </div>
  );
}
