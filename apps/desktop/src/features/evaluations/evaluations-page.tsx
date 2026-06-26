import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  FileText,
  Loader2,
  Building2Icon,
  BadgeCheckIcon,
  OctagonAlertIcon,
} from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark03Icon,
  GitCompareArrowsIcon,
  Delete03Icon,
  CalendarDaysIcon,
  ShareLocation01Icon,
  Briefcase01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/ipc";
import { SVGPolarChart } from "@/features/jobs/job-insights/svg-polar-chart";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { EvaluationSummary } from "@compass/ipc-contract";

// Score tier → tonal text color (matches the jobs table chips/tokens).
const scoreTone = (s: number | null) =>
  s == null ? "text-muted-foreground" : s >= 4 ? "text-positive" : s >= 3 ? "text-caution" : "text-negative";

// Score tier → soft-tint badge (recommendation chip + detail header).
const scoreBadge = (s: number | null) =>
  s == null
    ? "bg-muted text-muted-foreground"
    : s >= 4
      ? "bg-positive-soft text-positive"
      : s >= 3
        ? "bg-caution-soft text-caution"
        : "bg-negative-soft text-negative";

// --- Static demo fallbacks (used until real data is wired) -------------------
const DEMO_LOGO =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/2/25/Microsoft_icon.svg/250px-Microsoft_icon.svg.png";
const DEMO_COMPANY = "Microsoft";
const DEMO_LOCATION = "Hyderabad";
const DEMO_TIER = "Trusted";
// ofertas dimensions for the match visualization (score 1–10 → bar/petal radius).
const DEMO_PETALS: { label: string; score: number; hex: string }[] = [
  { label: "CV Match", score: 8, hex: "#3B82F6" },
  { label: "Level", score: 7, hex: "#10B981" },
  { label: "Comp", score: 8, hex: "#8B5CF6" },
  { label: "Growth", score: 9, hex: "#F59E0B" },
];
// Static demo report (the raw markdown shape the API returns) — preamble +
// Machine Summary get stripped by reportBody() since the header covers them.
const DEMO_REPORT = `# Evaluation: Virtusa — GCP Agentic AI with DevOps

**Date:** 2026-06-22
**Score:** 4.3/5
**Legitimacy:** High Confidence

---

## A) Role Summary

| Field | Value |
|-------|-------|
| Archetype | DevOps/Platform core, with an AI Platform/LLMOps + Agentic overlay (GenAI listed as "added advantage") |
| Domain | Cloud DevOps / Platform engineering on GCP |
| Function | Build (design, implement, maintain infra + CI/CD) |
| Seniority | Mid-to-senior IC (5–9 yrs) |
| Remote | Onsite/hybrid — Hyderabad, Chennai, Bengaluru |
| TL;DR | A GCP-centric DevOps role where GenAI/Agentic AI is a bonus, not a gate — a near-direct fit for the candidate's core profile. |

## B) Match with CV

| JD Requirement | CV Evidence | Verdict |
|----------------|-------------|---------|
| 5–9 yrs DevOps engineering | "5+ years building CI/CD pipelines and IaC" | ✅ Strong |
| GCP expertise | "Lead Cloud Engineer (AWS & GCP)" | ✅ Strong |
| Terraform / IaC | "Built and maintained CI/CD pipelines with Jenkins, Terraform, and Helm" | ✅ Strong |
| Kubernetes | "Implemented Kubernetes orchestration with Ingress-based load balancing" | ✅ Strong |
| Python / Bash automation | "Developed shell and Python automation scripts" | ✅ Strong |
| GenAI / Agentic AI (added advantage) | No direct evidence on CV | ⚠️ Gap (non-blocking) |

**Gaps & mitigation:**
1. **GenAI / Agentic AI** — *Nice-to-have, not a blocker.* Frame the agentic angle as "automating ops workflows"; a small LLM-assisted runbook/triage agent would neutralize this.
2. **GitHub Actions** — *Soft gap.* CV leads with Jenkins/GitLab; surface a GitHub Actions example in the cover letter; the CI/CD concepts transfer 1:1.

## C) Level and Strategy

- **JD level:** 5–9 yrs, mid-to-senior IC. Candidate sits at ~5+ yrs with two team-lead stints — comfortably in band.
- **Sell senior without lying:** Lead with outcomes — "cut deploy times 70%", "90% infra cost reduction", "led a team of 4".
- **If they downlevel:** Accept only if comp is fair (≥14–16 LPA); negotiate a 6-month review with explicit criteria.

## D) Comp and Demand

| Metric | Finding |
|--------|---------|
| 6–9 yrs band (Lead/Sr Consultant) | ₹12–20 LPA typical |
| Hyderabad experienced cloud | ₹11–21 LPA |
| Candidate target | 35 LPA |

**Read:** Realistic band ~**12–20 LPA**, likely **14–18 LPA**. This sits **below the 35 LPA target** — the single biggest drag. Comp score: **3/5**.

## E) Customization Plan

| # | Section | Proposed change | Why |
|---|---------|-----------------|-----|
| 1 | Summary | Lead with **GCP** first | Mirror JD's GCP-first framing |
| 2 | Skills | Pull GCP, Terraform, Kubernetes, GitHub Actions to front | Exact JD key-skill match |
| 3 | Experience | Add a line on ops automation / LLM-assisted tooling | Captures the "added advantage" |

## F) Interview Plan

- **Recommended case study:** The 70%-deploy-time + 90%-cost microservices/CI-CD overhaul — covers Terraform, K8s, CI/CD, Python automation, and leadership in one narrative.
- **Red-flag questions:** "No direct GenAI experience?" → "Right — it's the added-advantage line. Here's the ops-automation foundation I bring."

## G) Posting Legitimacy

**Assessment: High Confidence**

All substantive signals are positive; an independent Virtusa careers listing for the same role family raises confidence that this is a real, active opening.

## Keywords extracted

GCP, Terraform, Kubernetes, DevOps, CI/CD, GitHub Actions, Python, Bash, IaC, automated testing frameworks, microservices

## Machine Summary

\`\`\`yaml
company: Virtusa
score: 4.3
\`\`\`
`;

// Legitimacy tier → soft-tint pill (same look as the recommendation/Apply pill).
const legitBadge = (tier: string | null) => {
  const t = (tier ?? "").toLowerCase();
  if (/trust|high|legit/.test(t)) return "bg-positive-soft text-positive";
  if (/caution|proceed|review/.test(t)) return "bg-caution-soft text-caution";
  if (/suspicious|scam|risk/.test(t)) return "bg-negative-soft text-negative";
  return "bg-muted text-muted-foreground";
};

// Evaluations don't store a recommendation — derive it from the fit score
// (same vocab as co_job_rankings: Apply | Consider | Skip).
const recommendationOf = (s: number | null) =>
  s == null ? "—" : s >= 4 ? "Apply" : s >= 3 ? "Consider" : "Skip";

// Score → CV-match label for the ranking-result header.
const matchLabel = (s: number | null) =>
  s == null ? "Strong match" : s >= 4 ? "Strong match" : s >= 3 ? "Partial match" : "Weak match";

const fmtDate = (d: string) => {
  try {
    return new Date(d).toLocaleDateString();
  } catch {
    return d;
  }
};

// "3 hours ago" style relative time.
function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return fmtDate(iso);
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.35, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let val = s;
  let i = 0;
  while (i < units.length - 1 && val >= units[i][0]) {
    val = Math.floor(val / units[i][0]);
    i++;
  }
  return `${val} ${units[i][1]}${val === 1 ? "" : "s"} ago`;
}

// First city, with the rest collapsed into "+N" (same as the jobs feed/table).
function locationText(raw: string | null): string | null {
  if (!raw) return null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts.length > 1 ? `${parts[0]} +${parts.length - 1}` : parts[0];
}

const initials = (name: string | null) =>
  (name ?? "—")
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// The header already shows title/score/legitimacy/match — strip the markdown
// preamble (everything before "## A)") and the redundant Machine Summary block,
// leaving the A–G sections + keywords for the body.
function reportBody(md: string): string {
  let s = md;
  const start = s.search(/^##\s*A\)/m);
  if (start >= 0) s = s.slice(start);
  const machine = s.search(/^##\s*Machine Summary/m);
  if (machine >= 0) s = s.slice(0, machine);
  return s.trim();
}

// Logo tile — real company logo when linked to a pooled job, else initials.
function CompanyLogo({
  url,
  name,
  className,
}: {
  url: string | null;
  name: string | null;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background text-sm font-bold text-foreground",
        className,
      )}
    >
      {url && !broken ? (
        <img src={url} alt={name ?? ""} className="size-full object-contain" onError={() => setBroken(true)} />
      ) : (
        initials(name)
      )}
    </div>
  );
}

function ReportCard({
  e,
  active,
  onClick,
  onDelete,
}: {
  e: EvaluationSummary;
  active: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const secondary = locationText(e.location) ?? DEMO_LOCATION;
  return (
    <article
      onClick={onClick}
      className={cn(
        "group flex cursor-pointer flex-col rounded-xl border-[1.5px] bg-card transition-colors",
        active ? "border-brand" : "border-border hover:border-brand",
      )}
    >
      <div className="flex flex-1 flex-col gap-3.5 px-5 pb-3 pt-4">
        {/* Logo + title + company + recommendation chip */}
        <div className="flex items-start gap-3">
          <CompanyLogo url={e.logoUrl ?? DEMO_LOGO} name={e.companyName ?? DEMO_COMPANY} className="mt-0.5" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-lg font-semibold leading-snug text-foreground">{e.roleTitle ?? "—"}</p>
            <p className="text-xs leading-normal text-foreground">
              {e.companyName ?? DEMO_COMPANY}
              {secondary ? <span> · {secondary}</span> : null}
            </p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", scoreBadge(e.score))}>
            {recommendationOf(e.score)}
          </span>
        </div>

        {/* Score + description (grouped tightly) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline gap-0.5">
            <span className={cn("text-3xl font-bold tabular-nums", scoreTone(e.score))}>
              {e.score != null ? e.score.toFixed(1) : "—"}
            </span>
            <span className="text-base text-muted-foreground">/ 5</span>
          </div>
          {e.jobDescription ? (
            <p className="line-clamp-2 w-full text-sm leading-relaxed text-foreground">{e.jobDescription}</p>
          ) : null}
        </div>
      </div>

      {/* Footer: time on the left, actions on the right */}
      <footer className="flex items-center justify-between border-t border-border px-3 py-1">
        <span className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
          <HugeiconsIcon icon={CalendarDaysIcon} size={18} className="shrink-0" />
          {timeAgo(e.createdAt)}
        </span>
        <div className="flex items-center gap-2">
          <CardAction icon={Bookmark03Icon} label="Save" />
          <CardAction icon={GitCompareArrowsIcon} label="Compare" />
          <CardAction icon={Delete03Icon} label="Delete" danger onAction={onDelete} />
        </div>
      </footer>
    </article>
  );
}

function CardAction({
  icon,
  label,
  danger = false,
  onAction,
}: {
  icon: typeof Bookmark03Icon;
  label: string;
  danger?: boolean;
  onAction?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onAction?.();
      }}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors",
        danger ? "hover:bg-negative-soft hover:text-negative" : "hover:bg-accent hover:text-foreground",
      )}
    >
      <HugeiconsIcon icon={icon} size={18} />
    </button>
  );
}

export function EvaluationsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EvaluationSummary | null>(null);

  const del = useMutation({
    mutationFn: async (id: string) => {
      const r = await api.evaluations.remove(id);
      if (!r.ok) throw new Error(r.error);
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["evaluations"] });
      if (selectedId === id) setSelectedId(null);
      setPendingDelete(null);
    },
  });

  const {
    data: rows = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const r = await api.evaluations.list();
      if (!r.ok) throw new Error(r.error);
      return r.data.evaluations;
    },
  });

  const { data: detail, isFetching: detailLoading } = useQuery({
    queryKey: ["evaluation", selectedId],
    enabled: selectedId != null,
    queryFn: async () => {
      const r = await api.evaluations.get(selectedId!);
      if (!r.ok) throw new Error(r.error);
      return r.data.evaluation;
    },
  });

  const selected = rows.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-b border-border px-6 py-4">
        <h1 className="text-lg font-semibold text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading reports…"
            : `Showing ${rows.length} report${rows.length === 1 ? "" : "s"} pushed back from your agent.`}
        </p>
      </header>

      <div className="flex min-h-0 flex-1 px-16">
        {/* Card list */}
        <div className="w-[400px] shrink-0 space-y-3 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : error ? (
            <div className="px-2 py-10 text-center text-sm text-negative">{(error as Error).message}</div>
          ) : rows.length === 0 ? (
            <div className="px-2 py-10 text-center text-sm text-muted-foreground">
              No reports yet. Run an evaluation from the Jobs page.
            </div>
          ) : (
            rows.map((e) => (
              <ReportCard
                key={e.id}
                e={e}
                active={selectedId === e.id}
                onClick={() => setSelectedId(e.id)}
                onDelete={() => setPendingDelete(e)}
              />
            ))
          )}
        </div>

        {/* Detail */}
        <div className="min-w-0 flex-1 overflow-y-auto p-4">
          {selected ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div
                className="h-28 w-full"
                style={{ background: "linear-gradient(to right, #904e95, #e96443)" }}
              />
              <div className="space-y-4 p-5">
                <div className="flex items-end justify-between">
                  <CompanyLogo
                    url={selected.logoUrl ?? DEMO_LOGO}
                    name={selected.companyName ?? DEMO_COMPANY}
                    className="-mt-12 size-16 rounded-md border-0 bg-white p-2 text-lg shadow-none ring-0"
                  />
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <HugeiconsIcon icon={CalendarDaysIcon} size={16} className="shrink-0" />
                    {timeAgo(selected.createdAt)}
                  </span>
                </div>
                <div className="pt-3">
                  <h2 className="text-2xl font-bold text-foreground">{selected.roleTitle}</h2>
                  <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Building2Icon className="size-4 shrink-0" />
                      {selected.companyName ?? DEMO_COMPANY}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <HugeiconsIcon icon={ShareLocation01Icon} size={16} className="shrink-0" />
                      {locationText(selected.location) ?? DEMO_LOCATION}
                    </span>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        legitBadge(selected.legitimacyTier ?? DEMO_TIER),
                      )}
                    >
                      <BadgeCheckIcon className="size-3.5 shrink-0" />
                      {selected.legitimacyTier ?? DEMO_TIER}
                    </span>
                    <div className="ml-auto flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        aria-label="Bookmark"
                        className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <HugeiconsIcon icon={Bookmark03Icon} size={22} />
                      </button>
                      <button
                        type="button"
                        aria-label="Report posting"
                        className="grid size-10 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <OctagonAlertIcon className="size-[22px]" />
                      </button>
                    </div>
                  </div>

                  {/* Score + openings/exp tags + apply action */}
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
                      <span className="flex shrink-0 items-baseline gap-0.5">
                        <span className={cn("text-3xl font-bold tabular-nums", scoreTone(selected.score ?? 4.4))}>
                          {(selected.score ?? 4.4).toFixed(1)}
                        </span>
                        <span className="text-base text-muted-foreground">/5</span>
                      </span>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[0.7rem] font-medium text-muted-foreground">
                        <HugeiconsIcon icon={Briefcase01Icon} size={12} className="shrink-0" />
                        3 openings
                      </span>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[0.7rem] font-medium text-muted-foreground">
                        5–9 yrs exp
                      </span>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[0.7rem] font-medium text-muted-foreground">
                        1.5k visited
                      </span>
                      <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[0.7rem] font-medium text-muted-foreground">
                        120 applied
                      </span>
                      </div>
                    </div>
                    <Button className="h-10 shrink-0 bg-foreground px-5 text-background hover:bg-foreground/90">
                      Apply Job
                    </Button>
                  </div>
                </div>
                <div className="-mx-5 mt-1 border-t border-border" />
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold text-foreground">CV Ranking Result</h3>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold",
                      scoreBadge(selected.score),
                    )}
                  >
                    {matchLabel(selected.score)}
                  </span>
                </div>

                {/* Match visualization — per-dimension bars + polar breakdown */}
                {(() => {
                  const overallPercent = Math.round(((selected.score ?? 4.4) / 5) * 100);
                  return (
                    <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2.5">
                        <div>
                          <p className="mb-1 text-sm text-muted-foreground">Percentage match</p>
                          <p className="text-4xl font-bold leading-none text-brand">
                            {overallPercent}
                            <span className="text-lg font-normal text-muted-foreground">/100</span>
                          </p>
                        </div>
                        {DEMO_PETALS.map((p) => (
                          <div key={p.label}>
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-[11px] text-muted-foreground">{p.label}</span>
                              <span className="text-[11px] font-semibold text-brand">{p.score * 10}%</span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-surface-raised">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${p.score * 10}%`, backgroundColor: p.hex }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex flex-col items-center gap-1 [&_svg]:size-56">
                        <SVGPolarChart bars={DEMO_PETALS} centerLabel={`${overallPercent}%`} />
                        <p className="text-center text-xs font-medium text-foreground">Score Breakdown</p>
                      </div>
                    </div>
                  );
                })()}

                {detailLoading && !detail ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
                  </div>
                ) : (
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
                    {reportBody(detail?.rawReport ?? DEMO_REPORT)}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Select a report to view it.</p>
            </div>
          )}
        </div>
      </div>

      <AlertDialog
        open={pendingDelete != null}
        onOpenChange={(open) => {
          if (!open && !del.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this report?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `“${pendingDelete.roleTitle ?? "Untitled"}${
                    pendingDelete.companyName ? ` at ${pendingDelete.companyName}` : ""
                  }” will be permanently removed. This can’t be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={del.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) del.mutate(pendingDelete.id);
              }}
              className="bg-negative text-white hover:bg-negative/90"
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
