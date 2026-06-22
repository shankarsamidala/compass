import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Bookmark, X, ShieldCheck, ShieldAlert, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedJob, JobRanking } from "@compass/ipc-contract";
import { ScorePie, DimensionBars } from "./charts";

// Recommendation verdict styles.
const REC: Record<string, { label: string; cls: string; dot: string }> = {
  apply: { label: "Apply", cls: "bg-brand text-white", dot: "bg-white" },
  consider: { label: "Consider", cls: "border border-border bg-card text-foreground/75", dot: "bg-foreground/40" },
  skip: { label: "Skip", cls: "border border-destructive/30 bg-destructive/10 text-destructive", dot: "bg-destructive" },
};

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

function fmtPosted(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

export function JobInsightsSheet({
  open, onOpenChange, job, ranking,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  job?: FeedJob | null;
  ranking?: JobRanking | null;
}) {
  const company = job?.company ?? "";
  const title = job?.title ?? "";
  const city = job?.location ?? "";
  const sourceUrl = job?.jobUrl ?? "";

  const score = ranking?.score != null ? Number(ranking.score) : null;
  const rec = REC[(ranking?.recommendation ?? "").toLowerCase()] ?? null;
  const trust = ranking?.legitimacy ?? null;
  const trustOk = trust === "High Confidence";
  const dimensions = ranking?.dimensions ?? null;

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
            {/* Sticky Header — job details */}
            <div className="relative sticky top-0 z-10 border-b border-border bg-background px-5 pb-4 pt-5">
              <div className="absolute right-4 top-4 flex items-center gap-1.5">
                <button className={iconBtn}><Bookmark className="h-4 w-4 text-foreground/75" /></button>
                <button className={iconBtn} onClick={() => onOpenChange(false)}>
                  <X className="h-4 w-4 text-foreground/75" />
                </button>
              </div>
              <div className="flex gap-3 pr-24">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand/20 bg-brand/10">
                  {job?.logoUrl
                    ? <img src={job.logoUrl} alt={company} className="h-full w-full object-cover" />
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
              {!ranking ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                  <Sparkles className="h-7 w-7 text-brand" />
                  <p className="text-sm font-medium text-foreground/75">Not ranked yet</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Run a Scan to rank this job (REINIT ofertas) — its score and breakdown will show here.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-6 px-5 pb-8 pt-5">
                  {/* Verdict — score pie + recommendation + trust */}
                  <AnimatedSection delay={0}>
                    <div className="rounded-2xl border border-border bg-card/40 p-4">
                      <div className="flex items-center gap-4">
                        {score != null && <ScorePie value={score} />}
                        <div className="flex flex-1 flex-col items-start gap-2">
                          {rec && (
                            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", rec.cls)}>
                              <span className={cn("h-1.5 w-1.5 rounded-full", rec.dot)} />{rec.label}
                            </span>
                          )}
                          {trust && (
                            <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium", trustOk ? "text-brand" : "text-amber-500")}>
                              {trustOk ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                              {trust}
                            </span>
                          )}
                        </div>
                      </div>
                      {ranking.reasoning && (
                        <p className="mt-3 border-t border-dashed border-border pt-3 text-[13px] leading-[1.7] text-foreground/70">
                          {ranking.reasoning}
                        </p>
                      )}
                    </div>
                  </AnimatedSection>

                  {/* Fit Breakdown — 10 dimension bars */}
                  {dimensions && (
                    <AnimatedSection delay={60}>
                      <section className="space-y-3">
                        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-foreground/75">Fit breakdown</h4>
                        <DimensionBars dimensions={dimensions} />
                      </section>
                    </AnimatedSection>
                  )}

                  {/* Job details */}
                  <AnimatedSection delay={120}>
                    <section className="space-y-3">
                      <h4 className="text-[13px] font-semibold uppercase tracking-wider text-foreground/75">Job details</h4>
                      <div className="space-y-2 text-[12px]">
                        {city && <Detail label="Location" value={city} />}
                        {job?.postedAt && <Detail label="Posted" value={fmtPosted(job.postedAt)} />}
                        {job?.source && <Detail label="Source" value={job.source} />}
                      </div>
                      {(job?.skills ?? []).length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {job!.skills!.slice(0, 16).map((s) => (
                            <span key={s} className="rounded-md border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground">{s}</span>
                          ))}
                        </div>
                      )}
                    </section>
                  </AnimatedSection>
                </div>
              )}
            </div>

            {/* Sticky Footer */}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right text-foreground/80">{value}</span>
    </div>
  );
}
