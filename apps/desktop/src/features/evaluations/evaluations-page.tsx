import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, ExternalLink, Loader2 } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark03Icon, GitCompareArrowsIcon, Delete03Icon, CalendarDaysIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { api } from "@/lib/ipc";
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

// Evaluations don't store a recommendation — derive it from the fit score
// (same vocab as co_job_rankings: Apply | Consider | Skip).
const recommendationOf = (s: number | null) =>
  s == null ? "—" : s >= 4 ? "Apply" : s >= 3 ? "Consider" : "Skip";

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

// Logo tile — real company logo when linked to a pooled job, else initials.
function CompanyLogo({ url, name }: { url: string | null; name: string | null }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="mt-0.5 grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-background text-sm font-bold text-foreground">
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
}: {
  e: EvaluationSummary;
  active: boolean;
  onClick: () => void;
}) {
  const secondary = locationText(e.location);
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
          <CompanyLogo url={e.logoUrl} name={e.companyName} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="truncate text-lg font-semibold leading-snug text-foreground">{e.roleTitle ?? "—"}</p>
            <p className="text-xs leading-normal text-foreground">
              {e.companyName ?? "—"}
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
          <CardAction icon={Delete03Icon} label="Delete" danger />
        </div>
      </footer>
    </article>
  );
}

function CardAction({ icon, label, danger = false }: { icon: typeof Bookmark03Icon; label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => e.stopPropagation()}
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

      <div className="flex min-h-0 flex-1">
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
              <ReportCard key={e.id} e={e} active={selectedId === e.id} onClick={() => setSelectedId(e.id)} />
            ))
          )}
        </div>

        {/* Detail */}
        <div className="min-w-0 flex-1 overflow-y-auto border-l border-border p-6">
          {selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selected.companyName} — {selected.roleTitle}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {selected.score != null && (
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", scoreBadge(selected.score))}>
                      {selected.score.toFixed(1)} / 5
                    </span>
                  )}
                  {locationText(selected.location) && <span>{locationText(selected.location)}</span>}
                  {selected.legitimacyTier && <span>· {selected.legitimacyTier}</span>}
                  {selected.jobUrl && (
                    <a
                      href={selected.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-brand hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> posting
                    </a>
                  )}
                </div>
              </div>
              {detailLoading && !detail ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
                </div>
              ) : detail?.rawReport ? (
                <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
                  {detail.rawReport}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No report body was stored for this evaluation.</p>
              )}
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <FileText className="mb-2 h-8 w-8 opacity-40" />
              <p className="text-sm">Select a report to view it.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
