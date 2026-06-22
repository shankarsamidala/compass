import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, XCircle, TrendingUp, IndianRupee, Shield, ShieldCheck, ShieldAlert,
  ExternalLink, Bookmark, X, ChevronDown, Loader2, Lightbulb, AlertTriangle, ListChecks,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import type { FeedJob } from "@compass/ipc-contract";
import { useJobFullEval } from "./api";
import { ScoreRing } from "./charts";

// ── Recommendation verdict ───────────────────────────────────────────────────────
const REC: Record<string, { label: string; cls: string; dot: string }> = {
  apply: { label: "Apply", cls: "bg-brand text-white", dot: "bg-white" },
  consider: { label: "Consider", cls: "border border-border bg-card text-foreground/75", dot: "bg-foreground/40" },
  skip: { label: "Skip", cls: "border border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

// ── Animated wrapper ─────────────────────────────────────────────────────────────
function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${delay}ms`, animationDuration: "400ms" }}
    >
      {children}
    </div>
  );
}

// ── Collapsible ──────────────────────────────────────────────────────────────────
function CollapsibleSection({
  icon: Icon, title, defaultOpen = true, badge, children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string; defaultOpen?: boolean; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="space-y-3">
      <button onClick={() => setOpen(!open)} className="group flex w-full cursor-pointer items-center justify-between">
        <h4 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider text-foreground/75">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
            <Icon className="h-3.5 w-3.5 text-background" />
          </span>
          {title}
          {badge}
        </h4>
        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-all duration-300 ease-in-out", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

// ── Match-state pill for a JD requirement ─────────────────────────────────────────
function MatchPill({ state }: { state: "exact" | "adjacent" | "none" }) {
  const map = {
    exact: { label: "Have it", cls: "text-brand", Icon: CheckCircle2 },
    adjacent: { label: "Adjacent", cls: "text-amber-500", Icon: AlertTriangle },
    none: { label: "Gap", cls: "text-destructive", Icon: XCircle },
  }[state];
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 text-[10px] font-semibold", map.cls)}>
      <map.Icon className="h-3 w-3" />{map.label}
    </span>
  );
}

// ── Main sheet — the `oferta` decision view (A–G evaluation) ───────────────────────
export function JobInsightsSheet({
  open, onOpenChange, job: jobProp,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
}) {
  const full = useJobFullEval();
  const ev = full.data ?? null;

  // Run the evaluation (B/C/D/G, web-grounded D/G) when the sheet opens for a job.
  useEffect(() => {
    if (!open || !jobProp) return;
    full.mutate(jobProp.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobProp?.id]);

  const blockA = ev?.blocks?.a;
  const blockB = ev?.blocks?.b;
  const blockC = ev?.blocks?.c;
  const blockD = ev?.blocks?.d;
  const blockG = ev?.blocks?.g;
  const ms = ev?.machineSummary;

  const company = jobProp?.company ?? "";
  const title = jobProp?.title ?? "";
  const city = jobProp?.location ?? "";
  const sourceUrl = jobProp?.jobUrl ?? "";

  const score = ev?.score ?? 0;
  const rec = REC[ev?.recommendation ?? "consider"] ?? REC.consider;
  const chips = [blockA?.domain, blockA?.seniority, blockA?.remote].filter(Boolean) as string[];

  const legitTier = blockG?.assessment_tier;
  const legitOk = legitTier === "High Confidence";

  const iconBtn = "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-[0.75rem] border border-border transition-colors hover:bg-accent";

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
            className="fixed right-0 top-0 z-[201] flex h-full w-full max-w-lg flex-col border-l border-border bg-background"
          >
            {/* Sticky Header */}
            <div className="relative sticky top-0 z-10 border-b border-border bg-background px-5 pb-4 pt-5">
              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                <button className={iconBtn}><Bookmark className="h-4 w-4 text-foreground/75" /></button>
                <button className={iconBtn} onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 text-foreground/75" />
                </button>
              </div>
              <div className="flex gap-3 pr-24">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand/20 bg-brand/10">
                  {jobProp?.logoUrl
                    ? <img src={jobProp.logoUrl} alt={company} className="h-full w-full object-cover" />
                    : <span className="text-base font-bold text-brand">{company.charAt(0)}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold tracking-tight text-foreground/75">{title}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{company}{city ? ` · ${city}` : ""}</p>
                </div>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto">
              {!ev ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  {full.isError ? (
                    <>
                      <p className="text-sm font-medium text-foreground/75">Couldn't analyze this role</p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        {(full.error as Error)?.message ?? "Something went wrong."}
                      </p>
                      {jobProp && (
                        <button
                          onClick={() => full.mutate(jobProp.id)}
                          className="mt-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground/75 transition-colors hover:bg-accent"
                        >
                          Try again
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <Loader2 className="h-7 w-7 animate-spin text-brand" />
                      <p className="text-sm text-muted-foreground">Analyzing this role…</p>
                      <p className="max-w-xs text-xs text-muted-foreground/70">Matching your profile against the job — this can take a moment.</p>
                    </>
                  )}
                </div>
              ) : (
              <div className="flex flex-col gap-6 px-5 pb-8 pt-5">

                {/* Verdict */}
                <AnimatedSection delay={0}>
                  <div className="rounded-2xl border border-border bg-card/40 p-4">
                    <div className="flex items-center justify-between">
                      <ScoreRing value={score} />
                      <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", rec.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", rec.dot)} />{rec.label}
                      </span>
                    </div>
                    {chips.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {ev?.archetype && (
                          <span className="rounded-md bg-brand/10 px-2 py-0.5 text-[10px] font-medium text-brand">{ev.archetype}</span>
                        )}
                        {chips.map((c) => (
                          <span key={c} className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{c}</span>
                        ))}
                      </div>
                    )}
                    {blockA?.tldr && <p className="mt-3 text-[13px] leading-[1.7] text-foreground/70">{blockA.tldr}</p>}
                    {ms?.next_action && (
                      <p className="mt-3 flex gap-2 border-t border-dashed border-border pt-3 text-[12px] leading-relaxed text-foreground/80">
                        <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />{ms.next_action}
                      </p>
                    )}
                  </div>
                </AnimatedSection>

                {/* Fit & Gaps (Block B) — the single source of truth for fit */}
                {blockB && (
                  <AnimatedSection delay={60}>
                    <CollapsibleSection icon={ListChecks} title="Fit & Gaps"
                      badge={blockB.overall_match_pct != null
                        ? <span className="ml-1 rounded-md bg-card px-1.5 py-0.5 text-[10px] font-semibold text-brand">{blockB.overall_match_pct}%</span>
                        : undefined}>
                      <div className="space-y-4 pt-1">
                        {(blockB.requirements_map ?? []).length > 0 && (
                          <div className="space-y-2.5">
                            {blockB.requirements_map.map((r, i) => (
                              <div key={i} className="space-y-1 border-b border-dashed border-border pb-2.5 last:border-0">
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-[12px] leading-snug text-foreground/80">{r.jd_requirement}</span>
                                  <MatchPill state={r.match} />
                                </div>
                                {r.evidence && r.match !== "none" && (
                                  <p className="text-[10px] italic leading-relaxed text-muted-foreground">{r.evidence}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {(blockB.gaps ?? []).length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground/75">Gaps to bridge</p>
                            {blockB.gaps.map((g, i) => (
                              <div key={i} className="space-y-1 rounded-xl border border-border bg-card/40 p-3">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold text-foreground/80">{g.requirement}</span>
                                  <span className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-medium",
                                    g.hard_blocker ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-500")}>
                                    {g.hard_blocker ? "hard blocker" : g.learnable ? `learnable · ${g.learning_curve ?? "weeks"}` : "soft gap"}
                                  </span>
                                </div>
                                <p className="text-[11px] leading-relaxed text-muted-foreground">{g.mitigation}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CollapsibleSection>
                  </AnimatedSection>
                )}

                {/* Level Strategy (Block C) */}
                {blockC && (
                  <AnimatedSection delay={120}>
                    <CollapsibleSection icon={TrendingUp} title="Level Strategy" defaultOpen={false}>
                      <div className="space-y-3 pt-1">
                        <div className="inline-flex items-center gap-2 rounded-lg border border-brand/20 bg-brand/10 px-3 py-1.5">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                          <span className="text-xs font-semibold text-brand">
                            {blockC.level_candidate?.toLowerCase() === blockC.level_detected?.toLowerCase()
                              ? `Right level · ${blockC.level_detected}`
                              : `Role: ${blockC.level_detected} · You: ${blockC.level_candidate}`}
                          </span>
                        </div>
                        {(blockC.sell_senior_plan ?? []).length > 0 && (
                          <ul className="space-y-2">
                            {blockC.sell_senior_plan.map((p, i) => (
                              <li key={i} className="flex gap-2.5 text-[12px] leading-[1.6] text-foreground/75">
                                <HugeiconsIcon icon={ArrowRight01Icon} size={13} strokeWidth={2} className="mt-[3px] shrink-0 text-foreground" />{p}
                              </li>
                            ))}
                          </ul>
                        )}
                        {blockC.downlevel_plan && (
                          <p className="rounded-lg border border-border bg-card/40 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
                            <span className="font-semibold text-foreground/70">If downleveled: </span>{blockC.downlevel_plan}
                          </p>
                        )}
                      </div>
                    </CollapsibleSection>
                  </AnimatedSection>
                )}

                {/* Comp & Demand (Block D, web-grounded) */}
                {blockD && (
                  <AnimatedSection delay={160}>
                    <CollapsibleSection icon={IndianRupee} title="Comp & Demand" defaultOpen={false}>
                      <div className="space-y-3 pt-1">
                        {(blockD.salary_data ?? []).length > 0 && (
                          <div className="space-y-2 rounded-xl border border-border bg-card/40 p-3">
                            {blockD.salary_data.map((s, i) => (
                              <div key={i} className="flex items-center justify-between gap-2 text-sm">
                                <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                  {s.source}{s.level ? <span className="text-muted-foreground/60">· {s.level}</span> : null}
                                </span>
                                <span className="text-xs font-semibold text-foreground/80">{s.range}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {blockD.demand_trend && (
                          <p className="text-[12px] leading-relaxed text-foreground/75">
                            <span className="font-semibold text-foreground/60">Demand: </span>{blockD.demand_trend}
                          </p>
                        )}
                        {blockD.company_comp_reputation && (
                          <p className="text-[12px] leading-relaxed text-foreground/75">
                            <span className="font-semibold text-foreground/60">Reputation: </span>{blockD.company_comp_reputation}
                          </p>
                        )}
                      </div>
                    </CollapsibleSection>
                  </AnimatedSection>
                )}

                {/* Posting Legitimacy (Block G) */}
                {blockG && (
                  <AnimatedSection delay={200}>
                    <CollapsibleSection icon={Shield} title="Posting Legitimacy" defaultOpen={false}>
                      <div className="space-y-3 pt-1">
                        <div className="flex items-start gap-2.5 rounded-xl border border-border bg-background p-3">
                          {legitOk
                            ? <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                            : <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
                          <div>
                            <p className={cn("text-xs font-semibold", legitOk ? "text-brand" : "text-amber-500")}>{legitTier}</p>
                            {blockG.context_notes && <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{blockG.context_notes}</p>}
                          </div>
                        </div>
                        <div className="space-y-2">
                          {(blockG.signals ?? []).map((s, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                s.weight === "Positive" ? "bg-brand" : s.weight === "Concerning" ? "bg-destructive" : "bg-muted-foreground/40")} />
                              <div className="min-w-0">
                                <span className="text-[11px] font-medium text-foreground/60">{s.signal}: </span>
                                <span className="text-[11px] text-muted-foreground">{s.finding}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CollapsibleSection>
                  </AnimatedSection>
                )}
              </div>
              )}
            </div>

            {/* Sticky Footer — single real action */}
            {sourceUrl && (
              <div className="sticky bottom-0 border-t border-border bg-background px-5 py-3">
                <button
                  onClick={() => window.open(sourceUrl, "_blank")}
                  className="flex h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-white text-sm font-medium text-black transition-opacity hover:opacity-90"
                >
                  <ExternalLink className="h-4 w-4" /> Open posting
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
