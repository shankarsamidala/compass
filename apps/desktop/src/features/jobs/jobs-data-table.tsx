import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter, Settings2, X, Check, ListOrdered, Sparkles, Eye, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, toAbsoluteJobUrl } from "@/lib/utils";
import type { EvaluationSummary, FeedJob, JobRanking } from "@compass/ipc-contract";

export type JobRow = {
  id: string;
  company: string;
  role: string;
  jobUrl: string | null;
  location: string;
  logoUrl: string | null;
  posted: string | null;
  score: number | null;
  rank: number | null;
  legit: string;
  recommendation: string;
  evaluated: boolean;
};

const DASH = "—";
// Columns whose header + cells are centered (the evaluation-derived chips/score).
const CENTERED = new Set(["score", "legit", "recommendation"]);

const ELLIPSIS = "…";
// Windowed page numbers around the current page: 1 … 4 5 [6] 7 8 … 20
function pageRange(current: number, total: number): (number | string)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | string)[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push(ELLIPSIS);
  for (let p = start; p <= end; p++) pages.push(p);
  if (end < total - 1) pages.push(ELLIPSIS);
  pages.push(total);
  return pages;
}

// Score tier → tonal text + border (status tokens), for a dotted-border pill.
function scoreClass(s: number): string {
  if (s >= 4) return "text-positive border-positive";
  if (s >= 3) return "text-caution border-caution";
  return "text-negative border-negative";
}
function chip(label: string): string {
  const t = label.toLowerCase();
  // Tonal chips from status tokens (theme-aware, adapt on light & dark).
  // positive — high confidence / apply / strong / solid
  if (t.includes("high") || t.includes("apply") || t.includes("strong") || t.includes("solid"))
    return "text-positive bg-positive-soft";
  // caution — medium / consider / maybe / proceed with caution / mixed / fair
  if (
    t.includes("med") || t.includes("consider") || t.includes("maybe") ||
    t.includes("caution") || t.includes("mixed") || t.includes("fair")
  )
    return "text-caution bg-caution-soft";
  // negative — low / skip / avoid / suspicious / ghost
  if (
    t.includes("low") || t.includes("skip") || t.includes("avoid") ||
    t.includes("susp") || t.includes("ghost")
  )
    return "text-negative bg-negative-soft";
  return "bg-muted text-muted-foreground";
}
// Empty state for the evaluation-derived columns (Score / Trust / Recommend). A faint
// Evaluate (Sparkles) icon hints "run Evaluate to fill this" — and reads lighter than a
// stray dash or a wall of dashed pills when most rows are still unranked.
function emptyCell() {
  return <Sparkles className="size-3.5 text-muted-foreground/40" aria-label="Not evaluated yet" />;
}
function chipCell(v: string, busy = false) {
  if (v === DASH) return busy ? <Spinner className="size-3.5 text-brand" /> : emptyCell();
  return <span className={cn("inline-flex min-w-[60px] justify-center rounded-full px-2 py-0.5 text-[11px] font-medium", chip(v))}>{v}</span>;
}
// Fixed-width location: show the first city, collapse the rest into a "+N" badge so
// every row stays the same width (e.g. "Bengaluru +2" instead of a long truncated list).
function locationCell(raw: string) {
  const parts = (raw ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const first = parts[0] ?? DASH;
  const extra = parts.length - 1;
  return (
    <span className="flex w-[150px] items-center gap-1.5 text-muted-foreground" title={parts.join(", ")}>
      <span className="truncate">{first}</span>
      {extra > 0 && (
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium tabular-nums">+{extra}</span>
      )}
    </span>
  );
}
// Uniform 5-letter labels so the column reads as an even stack of equal-width chips.
function recommendationOf(s: number | null): string {
  if (s == null) return DASH;
  return s >= 4 ? "Apply" : s >= 3 ? "Maybe" : "Avoid";
}
function legitOf(tier: string | null): string {
  if (!tier) return DASH;
  const t = tier.toLowerCase();
  if (t.includes("high")) return "Solid";
  if (t.includes("caution") || t.includes("med")) return "Mixed"; // "Proceed with Caution" → short
  if (t.includes("susp") || t.includes("low")) return "Ghost";
  return tier;
}
function fmtPosted(iso: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DASH;
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function initials(n: string): string {
  return n.replace(/[^A-Za-z ]/g, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Faceted multi-select filter (Popover + checkboxes) over a column's unique values. */
function FacetFilter({ title, options, selected, onChange }: {
  title: string;
  options: { value: string; count: number }[];
  selected: Set<string>;
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    const next = new Set(selected);
    next.has(v) ? next.delete(v) : next.add(v);
    onChange([...next]);
  };
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 border-dashed">
          <ListFilter className="size-3.5" />
          {title}
          {selected.size > 0 && (
            <span className="ml-1 rounded bg-brand/20 px-1.5 text-[11px] font-semibold text-brand">{selected.size}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-52 p-1">
        {options.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">No values</p>}
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => toggle(o.value)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
          >
            <Checkbox checked={selected.has(o.value)} className="pointer-events-none" />
            <span className="flex-1 text-left">{o.value}</span>
            <span className="text-xs text-muted-foreground">{o.count}</span>
          </button>
        ))}
        {selected.size > 0 && (
          <button type="button" onClick={() => onChange([])} className="mt-1 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function JobsDataTable({
  jobs,
  evalByJob,
  rankByJob,
  evaluatingId,
  onEvaluate,
  onInsights,
  onRankMany,
  onRank,
  onNotInterested,
  ranking,
  busyIds,
}: {
  jobs: FeedJob[];
  evalByJob: Map<string, EvaluationSummary>;
  rankByJob: Map<string, JobRanking>;
  evaluatingId: string | null;
  onEvaluate: (id: string) => void;
  onInsights: (id: string) => void;
  onEvaluateMany?: (ids: string[]) => void;
  onRankMany?: (ids: string[]) => void;
  /** Single-row rank; falls back to onRankMany([id]) if omitted. */
  onRank?: (id: string) => void;
  /** Dismiss a job from the feed. If omitted, the bar action just closes. */
  onNotInterested?: (id: string) => void;
  ranking?: boolean;
  /** Job ids currently being ranked — their empty cells show a spinner. */
  busyIds?: Set<string>;
}) {
  const data: JobRow[] = useMemo(
    () =>
      jobs.map((j) => {
        const ev = evalByJob.get(j.id);        // deep oferta (richer)
        const rk = rankByJob.get(j.id);        // ofertas triage
        const triageScore = rk?.score != null ? Number(rk.score) : null;
        // Priority: deep eval → triage ranking → raw feed score.
        const score = ev?.score != null ? ev.score : triageScore != null ? triageScore : j.score != null ? (j.score / 100) * 5 : null;
        return {
          id: j.id,
          company: j.company,
          role: j.title,
          jobUrl: toAbsoluteJobUrl(j.jobUrl, j.source),
          location: j.location || DASH,
          logoUrl: j.logoUrl ?? null,
          posted: j.postedAt ?? null,
          score,
          rank: rk?.rank ?? null,
          legit: legitOf(ev?.legitimacyTier ?? rk?.legitimacy ?? null),
          // Derive from the score (deep eval → triage) so the label uses our uniform
          // vocabulary, instead of the raw server string (which could say "Skip" etc.).
          recommendation:
            ev?.score != null ? recommendationOf(ev.score) : triageScore != null ? recommendationOf(triageScore) : DASH,
          evaluated: !!ev,
        };
      }),
    [jobs, evalByJob, rankByJob],
  );

  // Rows with an in-flight rank/evaluate — their empty cells show a spinner.
  const busy = useMemo(() => {
    const s = new Set(busyIds ?? []);
    if (evaluatingId) s.add(evaluatingId);
    return s;
  }, [busyIds, evaluatingId]);

  const columns = useMemo<ColumnDef<JobRow>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        enableHiding: false,
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
          />
        ),
      },
      {
        id: "sNo",
        header: "sNo",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row, table }) => {
          const { pageIndex, pageSize } = table.getState().pagination;
          const posInPage = table.getRowModel().rows.findIndex((r) => r.id === row.id);
          const sNo = pageIndex * pageSize + posInPage + 1;
          return <span className="tabular-nums text-muted-foreground">{sNo}</span>;
        },
      },
      {
        accessorKey: "score",
        header: "Score",
        sortingFn: (a, b) => (a.original.score ?? -1) - (b.original.score ?? -1),
        cell: ({ row }) => {
          const s = row.original.score;
          if (s != null)
            return <span className={cn("inline-flex min-w-[52px] justify-center rounded-full border border-dotted px-2 py-0.5 text-[11px] font-bold tabular-nums", scoreClass(s))}>{s.toFixed(1)}</span>;
          return busy.has(row.original.id) ? <Spinner className="size-3.5 text-brand" /> : emptyCell();
        },
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <div className="flex max-w-[160px] items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-[10px] font-bold text-muted-foreground">
              {row.original.logoUrl ? <img src={row.original.logoUrl} alt="" className="size-full object-contain" /> : initials(row.original.company)}
            </span>
            <span className="truncate text-xs font-medium text-foreground">{row.original.company}</span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) =>
          row.original.jobUrl ? (
            <a href={row.original.jobUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="block w-[220px] truncate text-foreground hover:text-brand hover:underline" title={row.original.role}>
              {row.original.role}
            </a>
          ) : (
            <span className="block w-[220px] truncate text-foreground" title={row.original.role}>{row.original.role}</span>
          ),
      },
      { accessorKey: "location", header: "Location", cell: ({ getValue }) => locationCell(getValue<string>()) },
      {
        accessorKey: "legit",
        header: "Trust",
        filterFn: "arrIncludesSome",
        cell: ({ row, getValue }) => chipCell(getValue<string>(), busy.has(row.original.id)),
      },
      {
        accessorKey: "recommendation",
        header: "Recommend",
        filterFn: "arrIncludesSome",
        cell: ({ row, getValue }) => chipCell(getValue<string>(), busy.has(row.original.id)),
      },
      {
        accessorKey: "posted",
        header: "Posted",
        sortingFn: (a, b) => new Date(a.original.posted ?? 0).getTime() - new Date(b.original.posted ?? 0).getTime(),
        cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{fmtPosted(getValue<string>())}</span>,
      },
    ],
    [evaluatingId, onEvaluate, onInsights, busy],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  // Row whose floating action bar is open (set on cell click).
  const [activeId, setActiveId] = useState<string | null>(null);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    getRowId: (r) => r.id,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, value) => {
      const q = String(value).toLowerCase();
      return row.original.company.toLowerCase().includes(q) || row.original.role.toLowerCase().includes(q);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  const facet = (id: string) => {
    const col = table.getColumn(id);
    const counts = col?.getFacetedUniqueValues() ?? new Map();
    const options = [...counts.entries()]
      .filter(([v]) => v && v !== DASH)
      .map(([value, count]) => ({ value: String(value), count: Number(count) }))
      .sort((a, b) => a.value.localeCompare(b.value));
    const selected = new Set((col?.getFilterValue() as string[] | undefined) ?? []);
    return { options, selected, set: (next: string[]) => col?.setFilterValue(next.length ? next : undefined) };
  };
  const legit = facet("legit");
  const rec = facet("recommendation");
  const filtered = columnFilters.length > 0 || globalFilter.length > 0;
  const selectedRows = table.getSelectedRowModel().rows;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search company or role…"
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="h-9 w-56"
        />
        <FacetFilter title="Recommend" options={rec.options} selected={rec.selected} onChange={rec.set} />
        <FacetFilter title="Trust" options={legit.options} selected={legit.selected} onChange={legit.set} />
        {filtered && (
          <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={() => { setColumnFilters([]); setGlobalFilter(""); }}>
            Reset <X className="size-3.5" />
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          {/* Column visibility */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5"><Settings2 className="size-3.5" /> Columns</Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              {table.getAllColumns().filter((c) => c.getCanHide()).map((c) => (
                <button key={c.id} type="button" onClick={() => c.toggleVisibility(!c.getIsVisible())} className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm capitalize hover:bg-accent">
                  <span className="flex size-4 items-center justify-center">{c.getIsVisible() && <Check className="size-3.5 text-brand" />}</span>
                  {c.id}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-card/60">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-border">
                {hg.headers.map((h) => {
                  const canSort = h.column.getCanSort();
                  const sorted = h.column.getIsSorted();
                  return (
                    <th
                      key={h.id}
                      onClick={canSort ? h.column.getToggleSortingHandler() : undefined}
                      className={cn(
                        "whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
                        canSort && "cursor-pointer select-none hover:text-foreground",
                        h.column.id === "action" && "text-right",
                        CENTERED.has(h.column.id) && "text-center",
                      )}
                    >
                      <span className={cn("flex items-center gap-1", CENTERED.has(h.column.id) ? "justify-center" : "inline-flex")}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {canSort && (sorted === "asc" ? <ArrowUp className="size-3" /> : sorted === "desc" ? <ArrowDown className="size-3" /> : <ChevronsUpDown className="size-3 opacity-40" />)}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-selected={row.getIsSelected()}
                data-active={activeId === row.original.id}
                onClick={() => {
                  row.toggleSelected(); // tick the checkbox too, so row-click == select
                  setActiveId((cur) => (cur === row.original.id ? null : row.original.id));
                }}
                className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/30 data-[selected=true]:bg-muted data-[active=true]:bg-muted"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    // Don't open the bar when interacting with the checkbox or the inline action.
                    onClick={cell.column.id === "select" || cell.column.id === "action" ? (e) => e.stopPropagation() : undefined}
                    className={cn("whitespace-nowrap px-3 py-2", cell.column.id === "action" && "text-right")}
                  >
                    {CENTERED.has(cell.column.id) ? (
                      // Flex-center: text-align can't center the block-level <svg> empty state.
                      <div className="flex items-center justify-center">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">No jobs match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <Field orientation="horizontal" className="w-fit">
          <FieldLabel htmlFor="rows-per-page" className="text-xs text-muted-foreground">
            Rows per page
          </FieldLabel>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-20" id="rows-per-page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="start">
              <SelectGroup>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => table.previousPage()}
                className={!table.getCanPreviousPage() ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
            {pageRange(table.getState().pagination.pageIndex + 1, table.getPageCount() || 1).map((p, i) =>
              p === ELLIPSIS ? (
                <PaginationItem key={`e${i}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={p}>
                  <PaginationLink
                    isActive={p === table.getState().pagination.pageIndex + 1}
                    onClick={() => table.setPageIndex((p as number) - 1)}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => table.nextPage()}
                className={!table.getCanNextPage() ? "pointer-events-none opacity-50" : undefined}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {/* Floating action bar — one centered bottom bar.
          • 2+ checkboxes ticked → bulk Rank only (max 10). Evaluate & Insights are
            single-job actions, so they're hidden in bulk mode.
          • exactly one target (one checkbox OR a clicked row) → Rank, Evaluate,
            Insights, Not interested. */}
      {(() => {
        const bulk = selectedRows.length > 1;
        const singleId = selectedRows.length === 1 ? selectedRows[0].original.id : activeId;
        const close = () => { table.resetRowSelection(); setActiveId(null); };
        return (
          <FloatingNav
            visible={bulk || singleId != null}
            label={
              bulk
                ? `${selectedRows.length} selected`
                : singleId == null
                  ? undefined
                  : data.find((r) => r.id === singleId)?.company
            }
            onClose={close}
            navItems={
              bulk
                ? [
                    {
                      name: ranking ? "Ranking…" : `Rank (${Math.min(selectedRows.length, 10)})`,
                      icon: ranking ? <Spinner className="size-4" /> : <ListOrdered className="size-4" />,
                      disabled: ranking || !onRankMany,
                      onClick: () => {
                        onRankMany?.(selectedRows.slice(0, 10).map((r) => r.original.id));
                        close();
                      },
                    },
                    {
                      name: `Not interested (${selectedRows.length})`,
                      icon: <Ban className="size-4" />,
                      variant: "danger" as const,
                      onClick: () => {
                        selectedRows.forEach((r) => onNotInterested?.(r.original.id));
                        close();
                      },
                    },
                  ]
                : singleId == null
                  ? []
                  : [
                      {
                        name: ranking ? "Ranking…" : "Rank",
                        icon: ranking ? <Spinner className="size-4" /> : <ListOrdered className="size-4" />,
                        disabled: ranking,
                        onClick: () => (onRank ? onRank(singleId) : onRankMany?.([singleId])),
                      },
                      {
                        name: evaluatingId === singleId ? "Evaluating…" : "Evaluate",
                        icon: evaluatingId === singleId ? <Spinner className="size-4" /> : <Sparkles className="size-4" />,
                        variant: "brand",
                        disabled: evaluatingId === singleId,
                        onClick: () => onEvaluate(singleId),
                      },
                      {
                        name: "Insights",
                        icon: <Eye className="size-4" />,
                        onClick: () => { onInsights(singleId); close(); },
                      },
                      {
                        name: "Not interested",
                        icon: <Ban className="size-4" />,
                        variant: "danger",
                        onClick: () => { onNotInterested?.(singleId); close(); },
                      },
                    ]
            }
          />
        );
      })()}
    </div>
  );
}
