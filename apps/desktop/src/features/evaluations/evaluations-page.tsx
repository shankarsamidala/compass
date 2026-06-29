import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LayoutGrid, Table2, ChevronLeft } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Bookmark03Icon,
  GitCompareArrowsIcon,
  Delete03Icon,
  CalendarDaysIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { api } from "@/lib/ipc";
import { EvaluationsDataTable } from "./evaluations-data-table";
import { ReportView } from "./report/report-view";
import { parseReport, isEmptyReport } from "./report/parse-report";
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

const VIEW_KEY = "reinit:reports-view";

// Slim header (back nav + breadcrumb) for the report loading / error screens.
function ReportBackBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-border bg-background px-4 py-3">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="size-4" /> Reports
      </button>
      <span className="text-muted-foreground/40">/</span>
      <span className="truncate text-sm font-medium text-foreground">{title}</span>
    </header>
  );
}

export function EvaluationsPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<EvaluationSummary | null>(null);

  // Cards (browse) vs Table (decision board). Persisted, matching the Jobs page.
  const [view, setView] = useState<"cards" | "table">(
    () => (localStorage.getItem(VIEW_KEY) as "cards" | "table") || "cards",
  );
  const setViewPersist = (v: "cards" | "table") => {
    localStorage.setItem(VIEW_KEY, v);
    setView(v);
  };

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
    data,
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

  // Coerce to an array defensively — guards render against a transient
  // non-array value (e.g. a stale module during dev hot-reload).
  const rows = Array.isArray(data) ? data : [];
  const selected = rows.find((r) => r.id === selectedId) ?? null;

  // Full report (raw_report markdown) for the open evaluation — parsed into the Report model.
  const {
    data: detail,
    isLoading: detailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ["evaluation", selectedId],
    enabled: selectedId != null,
    queryFn: async () => {
      const r = await api.evaluations.get(selectedId!);
      if (!r.ok) throw new Error(r.error);
      return r.data.evaluation;
    },
  });

  // Bulk delete (table floating bar) — fire sequentially, then refresh.
  const deleteMany = async (ids: string[]) => {
    for (const id of ids) {
      const r = await api.evaluations.remove(id);
      if (!r.ok) break;
      if (selectedId === id) setSelectedId(null);
    }
    qc.invalidateQueries({ queryKey: ["evaluations"] });
  };

  // Selecting a report pushes to its own full-screen page, fetched + parsed from real data.
  if (selectedId) {
    const back = () => setSelectedId(null);
    if (detailLoading || (!detail && !detailError)) {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <ReportBackBar onBack={back} title={selected ? `${selected.companyName ?? ""} — ${selected.roleTitle ?? ""}` : "Report"} />
          <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading report…
          </div>
        </div>
      );
    }
    if (detailError || !detail) {
      return (
        <div className="flex h-full min-h-0 flex-col">
          <ReportBackBar onBack={back} title="Report" />
          <div className="flex flex-1 items-center justify-center text-sm text-negative">Couldn't load this report.</div>
        </div>
      );
    }
    return <ReportView report={parseReport(detail)} incomplete={isEmptyReport(detail)} onBack={back} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading reports…"
              : `Showing ${rows.length} report${rows.length === 1 ? "" : "s"} pushed back from your agent.`}
          </p>
        </div>
        <div className="flex h-9 shrink-0 items-center rounded-lg border border-border px-0.5">
          <button
            type="button"
            aria-label="Card view"
            onClick={() => setViewPersist("cards")}
            className={cn("flex h-7 w-7 items-center justify-center rounded-md", view === "cards" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Table view"
            onClick={() => setViewPersist("table")}
            className={cn("flex h-7 w-7 items-center justify-center rounded-md", view === "table" ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Table2 className="size-4" />
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex-1 px-16 py-10 text-center text-sm text-negative">{(error as Error).message}</div>
      ) : rows.length === 0 ? (
        <div className="flex-1 px-16 py-10 text-center text-sm text-muted-foreground">
          No reports yet. Run an evaluation from the Jobs page.
        </div>
      ) : view === "table" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <EvaluationsDataTable
            rows={rows}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDeleteMany={deleteMany}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {rows.map((e) => (
              <ReportCard
                key={e.id}
                e={e}
                active={selectedId === e.id}
                onClick={() => setSelectedId(e.id)}
                onDelete={() => setPendingDelete(e)}
              />
            ))}
          </div>
        </div>
      )}

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
