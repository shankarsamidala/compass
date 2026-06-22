import { useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, MapPin, Briefcase, TrendingUp,
  ExternalLink, Bookmark, IndianRupee, Shield, X, FileText, MessageSquare, ClipboardList,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { Job } from "./job-types";
import { AnimatedSection } from "./animated-section";
import { CollapsibleSection } from "./collapsible-section";
import { verdictConfig } from "./types";
import { locationVerdict, seniorityVerdict, experienceVerdict, computeUrgency } from "./helpers";
import { LevelStrategySection } from "./level-strategy-section";
import { LegitimacyBadgeSection, legitimacyToTier } from "./legitimacy-badge-section";
import { OpportunityScoringSection } from "./opportunity-scoring-section";
import { SVGPolarChart } from "./svg-polar-chart";

const MATCH_CHART_PALETTE = ["#D97757", "#3B82F6", "#10B981", "#8B5CF6"] as const;

// ofertas dimensions → polar petals (score 1–5 → 2–10 for the chart radius).
const DIM_META: { key: string; label: string; hex: string }[] = [
  { key: "northStar", label: "North Star", hex: "#D97757" },
  { key: "cvMatch", label: "CV Match", hex: "#3B82F6" },
  { key: "level", label: "Level", hex: "#10B981" },
  { key: "comp", label: "Comp", hex: "#8B5CF6" },
  { key: "growth", label: "Growth", hex: "#F59E0B" },
  { key: "remote", label: "Remote", hex: "#22D3EE" },
  { key: "reputation", label: "Reputation", hex: "#EC4899" },
  { key: "techStack", label: "Tech Stack", hex: "#84CC16" },
  { key: "speed", label: "Speed", hex: "#F97316" },
  { key: "culture", label: "Culture", hex: "#A78BFA" },
];

function petalsFromDimensions(dimensions: Record<string, number>): { label: string; score: number; hex: string }[] {
  return DIM_META.filter((d) => dimensions[d.key] != null)
    .slice(0, 5) // top dimensions by weight — keeps the bars/chart balanced
    .map((d) => ({
      label: d.label,
      score: Math.max(1, Math.min(10, Math.round(Number(dimensions[d.key]) * 2))),
      hex: d.hex,
    }));
}

// Scope the dashoard LIGHT theme tokens to the sheet only.
const LIGHT_TOKENS = {
  "--background": "#FFFFFF",
  "--foreground": "#1A1A1A",
  "--card": "#FFFFFF",
  "--card-foreground": "#1A1A1A",
  "--popover": "#FFFFFF",
  "--popover-foreground": "#1A1A1A",
  "--primary": "#D97757",
  "--primary-foreground": "#FFFFFF",
  "--muted": "rgba(0,0,0,0.06)",
  "--muted-foreground": "#484844",
  "--accent": "rgba(0,0,0,0.06)",
  "--accent-foreground": "#1A1A1A",
  "--border": "rgba(0,0,0,0.13)",
  "--destructive": "#ef4444",
} as CSSProperties;

interface JobInsightsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  // ofertas ranking data (1–5 scores). When present, drives the scored sections.
  dimensions?: Record<string, number> | null;
  score?: number | null; // 1–5 ofertas fit score
  recommendation?: string | null; // Apply | Consider | Skip
  reasoning?: string | null;
  legitimacy?: string | null; // High Confidence | Proceed with Caution | Suspicious
}

// ofertas dimension key → dashoard Opportunity dimension name.
const OPP_MAP: [string, string][] = [
  ["northStar", "north_star_alignment"],
  ["cvMatch", "cv_match"],
  ["level", "level_fit"],
  ["growth", "growth_trajectory"],
  ["remote", "remote_quality"],
  ["techStack", "tech_stack_modernity"],
  ["culture", "cultural_signals"],
];

export function JobInsightsSheet({ open, onOpenChange, job, dimensions, score, recommendation, reasoning, legitimacy }: JobInsightsSheetProps) {
  const [imgError, setImgError] = useState(false);

  const realBreakdown = job?.match_breakdown ?? null;
  const overallPercent = score != null
    ? Math.round(score * 20)
    : realBreakdown
      ? Math.round(realBreakdown.overall_pct)
      : job?.score != null && job.score > 0
        ? Math.round(job.score * 100)
        : null;

  // ── ofertas-driven section data ──────────────────────────────────────────
  const hasDims = !!dimensions && Object.keys(dimensions).length > 0;
  const opportunityData = hasDims
    ? {
        overall_score: score != null ? score / 5 : OPP_MAP.reduce((s, [k]) => s + (Number(dimensions![k]) || 0), 0) / (OPP_MAP.length * 5),
        dimensions: OPP_MAP.filter(([k]) => dimensions![k] != null).map(([k, name]) => ({ name, score: Number(dimensions![k]) / 5 })),
      }
    : null;
  const lvl = dimensions?.level;
  // Level Fit shows the reasoning text (no alignment badge). Gated on reasoning.
  const levelData = reasoning
    ? { alignment: (lvl != null ? (lvl >= 4 ? "at" : lvl <= 2 ? "below" : "at") : "at") as "above" | "at" | "below", confidence: "high" as const, strategy: reasoning }
    : null;
  const legitTier = legitimacyToTier(legitimacy);
  const urgency = job ? computeUrgency(job) : null;

  return (
    <AnimatePresence>
      {open && job && (
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
            className="bg-background fixed right-0 top-0 z-[201] flex h-full w-full flex-col gap-0 border-l border-border sm:max-w-lg"
          >
            {/* Sticky Header */}
            <div className="border-surface-border bg-background relative sticky top-0 z-10 space-y-0 border-b px-5 pt-5 pb-4">
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                <button className="border-surface-border hover:bg-surface-hover inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[0.75rem] border transition-colors">
                  <Bookmark className="text-foreground/75 h-4 w-4" />
                  <span className="sr-only">Save</span>
                </button>
                <button
                  onClick={() => { if (job.source_url) window.open(job.source_url, "_blank", "noopener,noreferrer"); }}
                  className="border-surface-border hover:bg-surface-hover inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[0.75rem] border transition-colors"
                >
                  <ExternalLink className="text-foreground/75 h-4 w-4" />
                  <span className="sr-only">Apply Now</span>
                </button>
                <button
                  onClick={() => onOpenChange(false)}
                  className="border-surface-border hover:bg-surface-hover inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[0.75rem] border transition-colors"
                >
                  <X className="text-foreground/75 h-4 w-4" />
                  <span className="sr-only">Close</span>
                </button>
              </div>
              <div className="flex gap-3 pr-36">
                <div className="shrink-0">
                  {imgError || !job.logo_url ? (
                    <div className="border-coral-200 bg-coral-100 flex h-11 w-11 items-center justify-center rounded-xl border">
                      <span className="text-brand text-base font-bold">{job.company_name?.charAt(0)?.toUpperCase() || "?"}</span>
                    </div>
                  ) : (
                    <img
                      src={job.logo_url}
                      alt={`${job.company_name} logo`}
                      className="border-ink-200 bg-surface-raised h-11 w-11 rounded-xl border object-cover"
                      onError={() => setImgError(true)}
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-foreground/75 truncate text-base font-bold tracking-tight">{job.title}</h2>
                  <p className="text-muted-foreground mt-0.5 truncate text-sm">
                    {job.company_name}
                    {job.location_cities?.[0] && ` · ${job.location_cities[0]}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="flex flex-col gap-6 px-5 pt-5 pb-28">
                {/* Match Score */}
                {overallPercent != null && (
                  <AnimatedSection delay={0}>
                    <div>
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-foreground/75 text-[13px] font-semibold tracking-wider uppercase">CV Matching Result</h4>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                            overallPercent >= 80 ? "bg-foreground text-brand" : overallPercent >= 60 ? "border-border bg-muted text-foreground/75 border" : "border-border bg-muted text-muted-foreground border",
                          )}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full", overallPercent >= 80 ? "bg-brand" : overallPercent >= 60 ? "bg-foreground/40" : "bg-muted-foreground/40")} />
                          {overallPercent >= 80 ? "Strong Fit" : overallPercent >= 60 ? "Good Fit" : "Partial Fit"}
                        </span>
                      </div>

                      {hasDims && (
                        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                          <div className="flex flex-col gap-2.5">
                            <div>
                              <p className="text-muted-foreground mb-0.5 text-[10px]">Percentage match</p>
                              <p className="text-brand text-2xl leading-none font-bold">
                                {overallPercent}<span className="text-muted-foreground text-xs font-normal">/100</span>
                              </p>
                            </div>
                            {petalsFromDimensions(dimensions!).map((p) => (
                              <div key={p.label}>
                                <div className="mb-1 flex items-center justify-between">
                                  <span className="text-muted-foreground text-[11px]">{p.label}</span>
                                  <span className="text-brand text-[11px] font-semibold">{p.score * 10}%</span>
                                </div>
                                <div className="bg-surface-raised h-1.5 overflow-hidden rounded-full">
                                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${p.score * 10}%`, backgroundColor: p.hex }} />
                                </div>
                              </div>
                            ))}
                          </div>

                          <div className="-mr-2 flex flex-col items-center gap-1">
                            <SVGPolarChart bars={petalsFromDimensions(dimensions!)} centerLabel={`${overallPercent}%`} />
                            <p className="text-foreground text-center text-xs font-medium">Score Breakdown</p>
                          </div>
                        </div>
                      )}


                    </div>
                  </AnimatedSection>
                )}

                {/* Urgency */}
                {urgency && (
                  <AnimatedSection delay={40}>
                    <div className="bg-background border-surface-border overflow-hidden rounded-xl border">
                      <div className="border-surface-border flex items-center justify-between border-b px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="relative flex h-4 w-4 items-center justify-center">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-40" />
                            <span className="relative h-2 w-2 rounded-full bg-red-500" />
                          </div>
                          <span className="text-foreground/75 text-xs font-semibold tracking-wider uppercase">High Competition</span>
                        </div>
                        <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                          <AlertTriangle className="h-3 w-3 shrink-0 text-red-500" />Apply quickly
                        </span>
                      </div>
                      <div className={cn("divide-border grid divide-x", urgency.ageHours != null ? "grid-cols-3" : "grid-cols-2")}>
                        {urgency.ageHours != null && (
                          <div className="flex flex-col items-center px-2 py-3">
                            <p className="text-foreground/75 mb-1 text-base leading-none font-bold tabular-nums">{urgency.ageHours}h</p>
                            <p className="text-muted-foreground text-[10px] tracking-wider uppercase">Posted</p>
                          </div>
                        )}
                        <div className="flex flex-col items-center px-2 py-3">
                          <p className="text-muted-foreground mb-1 text-base leading-none font-bold tabular-nums">{urgency.applicantCount}</p>
                          <p className="text-muted-foreground text-[10px] tracking-wider uppercase">Applicants</p>
                        </div>
                        <div className="flex flex-col items-center px-2 py-3">
                          <p className="text-foreground/75 mb-1 text-base leading-none font-bold tabular-nums">{urgency.openings ?? "—"}</p>
                          <p className="text-muted-foreground text-[10px] tracking-wider uppercase">{urgency.openings === 1 ? "Opening" : "Openings"}</p>
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                )}

                {/* Fit Summary */}
                {realBreakdown && (
                  <AnimatedSection delay={80}>
                    <div className="flex gap-2">
                      {[
                        { label: "Location", value: locationVerdict(job), icon: MapPin },
                        { label: "Seniority", value: seniorityVerdict(job), icon: Briefcase },
                        { label: "Experience", value: experienceVerdict(job), icon: TrendingUp },
                      ].map((item) => {
                        const v = verdictConfig[item.value] ?? verdictConfig.unknown;
                        return (
                          <div key={item.label} className="bg-background border-surface-border flex flex-1 flex-col items-center gap-1.5 rounded-xl border p-3">
                            <item.icon className="text-foreground h-4 w-4" />
                            <span className="text-muted-foreground text-[10px] font-medium">{item.label}</span>
                            <span className={cn("text-xs font-bold", v.color)}>{v.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </AnimatedSection>
                )}

                {levelData && <AnimatedSection delay={120}><LevelStrategySection job={job} data={levelData} /></AnimatedSection>}
                {legitTier && <AnimatedSection delay={140}><LegitimacyBadgeSection job={job} tier={legitTier} /></AnimatedSection>}
                {opportunityData && <AnimatedSection delay={155}><OpportunityScoringSection job={job} data={opportunityData} /></AnimatedSection>}

                {/* About the Role */}
                {(job.description_summary || job.tech_stack?.length || job.key_skills?.length || job.preferred_skills?.length || job.responsibilities?.length || job.requirements?.length) && (
                  <AnimatedSection delay={340}>
                    <CollapsibleSection icon={ClipboardList} title="About the Role" defaultOpen={true} iconClassName="text-white" iconBgClassName="bg-foreground">
                      <div className="space-y-5 pt-2">
                        {job.description_summary && <p className="text-foreground/70 text-[13px] leading-[1.75]">{job.description_summary}</p>}
                        {(() => {
                          const stack = job.tech_stack?.length ? job.tech_stack : (job.key_skills ?? []);
                          const preferred = job.preferred_skills ?? [];
                          if (!stack.length && !preferred.length) return null;
                          return (
                            <div className="space-y-3">
                              <div className="border-surface-border flex items-center gap-2 border-b pb-1">
                                <p className="text-foreground/75 text-[10px] font-semibold tracking-wider uppercase">Stack &amp; Tools</p>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {[...stack, ...preferred].map((s, i, arr) => (
                                  <span key={i} className="text-foreground/70 flex items-center gap-3 text-[13px]">
                                    {s}
                                    {i < arr.length - 1 && <span className="text-foreground/50 text-base leading-none select-none">·</span>}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        {job.responsibilities && job.responsibilities.length > 0 && (
                          <div className="space-y-3">
                            <div className="border-surface-border flex items-center gap-2 border-b pb-1">
                              <p className="text-foreground/75 text-[10px] font-semibold tracking-wider uppercase">Responsibilities</p>
                            </div>
                            <ul className="space-y-2.5">
                              {job.responsibilities.map((r, i) => (
                                <li key={i} className="text-foreground/70 flex gap-3 text-[13px] leading-[1.65]">
                                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} className="text-foreground mt-[3px] shrink-0" />{r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {job.requirements && job.requirements.length > 0 && (
                          <div className="space-y-3">
                            <div className="border-surface-border flex items-center gap-2 border-b pb-1">
                              <p className="text-foreground/75 text-[10px] font-semibold tracking-wider uppercase">Requirements</p>
                            </div>
                            <ul className="space-y-2.5">
                              {job.requirements.map((r, i) => (
                                <li key={i} className="text-foreground/70 flex gap-3 text-[13px] leading-[1.65]">
                                  <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} className="text-foreground mt-[3px] shrink-0" />{r}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  </AnimatedSection>
                )}

                {/* Compensation */}
                {(job.salary_disclosed || job.salary_min != null || job.salary_max != null) && (
                  <AnimatedSection delay={520}>
                    <CollapsibleSection icon={IndianRupee} title="Compensation" defaultOpen={false} iconClassName="text-white" iconBgClassName="bg-foreground">
                      <div className="bg-background border-surface-border mt-1 space-y-3 rounded-lg border p-3 pt-3">
                        {job.salary_disclosed && job.salary_min != null && job.salary_max != null ? (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Range</span>
                            <span className="text-foreground/75 font-semibold">{job.salary_min} – {job.salary_max} LPA</span>
                          </div>
                        ) : (
                          <div className="flex items-start gap-2.5">
                            <Shield className="text-muted-foreground mt-0.5 h-4 w-4 shrink-0" />
                            <p className="text-foreground/75 text-[13px] font-medium">Salary not disclosed</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  </AnimatedSection>
                )}
              </div>
            </div>

            {/* Sticky Footer */}
            <div className="border-surface-border bg-background sticky bottom-0 flex flex-col gap-2 border-t px-5 py-3">
              <div className="flex gap-2.5">
                <button className="flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-black text-sm font-medium text-white transition-opacity hover:opacity-90">
                  <FileText className="h-4 w-4" /> Build Kit
                </button>
                <button className="bg-background text-foreground/75 hover:bg-surface-hover border-surface-border flex h-10 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-medium transition-colors">
                  <MessageSquare className="h-4 w-4" /> Ask Sage
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
