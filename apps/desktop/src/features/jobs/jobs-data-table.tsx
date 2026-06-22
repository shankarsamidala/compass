import { useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Loader2, ListFilter, Settings2, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { EvaluationSummary, FeedJob } from "@compass/ipc-contract";

export type JobRow = {
  id: string;
  company: string;
  role: string;
  jobUrl: string | null;
  location: string;
  logoUrl: string | null;
  posted: string | null;
  score: number | null;
  legit: string;
  recommendation: string;
  evaluated: boolean;
};

const DASH = "—";

function scoreClass(s: number): string {
  return s >= 4 ? "text-emerald-400" : s >= 3 ? "text-amber-400" : "text-red-400";
}
function chip(label: string): string {
  if (["High", "Apply"].includes(label)) return "bg-emerald-500/15 text-emerald-400";
  if (["Med", "Consider"].includes(label)) return "bg-amber-500/15 text-amber-400";
  if (["Low", "Skip"].includes(label)) return "bg-red-500/15 text-red-400";
  return "bg-muted text-muted-foreground";
}
function recommendationOf(s: number | null): string {
  if (s == null) return DASH;
  return s >= 4 ? "Apply" : s >= 3 ? "Consider" : "Skip";
}
function legitOf(tier: string | null): string {
  if (!tier) return DASH;
  const t = tier.toLowerCase();
  if (t.includes("high")) return "High";
  if (t.includes("med")) return "Med";
  if (t.includes("low")) return "Low";
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
        <Button variant="outline" size="sm" className="gap-1.5 border-dashed">
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
  evaluatingId,
  onEvaluate,
  onInsights,
  onEvaluateMany,
}: {
  jobs: FeedJob[];
  evalByJob: Map<string, EvaluationSummary>;
  evaluatingId: string | null;
  onEvaluate: (id: string) => void;
  onInsights: (id: string) => void;
  onEvaluateMany?: (ids: string[]) => void;
}) {
  const data: JobRow[] = useMemo(
    () =>
      jobs.map((j) => {
        const ev = evalByJob.get(j.id);
        const score = ev?.score != null ? ev.score : j.score != null ? (j.score / 100) * 5 : null;
        return {
          id: j.id,
          company: j.company,
          role: j.title,
          jobUrl: j.jobUrl ?? null,
          location: j.location || DASH,
          logoUrl: j.logoUrl ?? null,
          posted: j.postedAt ?? null,
          score,
          legit: legitOf(ev?.legitimacyTier ?? null),
          recommendation: recommendationOf(ev?.score != null ? ev.score : null),
          evaluated: !!ev,
        };
      }),
    [jobs, evalByJob],
  );

  // Stable fit-rank by score (independent of the table's current sort).
  const rankById = useMemo(() => {
    const m = new Map<string, number>();
    [...data]
      .filter((d) => d.score != null)
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .forEach((d, i) => m.set(d.id, i + 1));
    return m;
  }, [data]);

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
        id: "rank",
        header: "#",
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const r = rankById.get(row.original.id);
          return r ? <span className="font-semibold tabular-nums text-muted-foreground">#{r}</span> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "score",
        header: "Score",
        sortingFn: (a, b) => (a.original.score ?? -1) - (b.original.score ?? -1),
        cell: ({ row }) => {
          const s = row.original.score;
          return s != null ? <span className={cn("font-bold tabular-nums", scoreClass(s))}>{s.toFixed(1)}</span> : <span className="text-muted-foreground">{DASH}</span>;
        },
      },
      {
        accessorKey: "company",
        header: "Company",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-[10px] font-bold text-muted-foreground">
              {row.original.logoUrl ? <img src={row.original.logoUrl} alt="" className="size-full object-contain" /> : initials(row.original.company)}
            </span>
            <span className="font-medium text-white">{row.original.company}</span>
          </div>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) =>
          row.original.jobUrl ? (
            <a href={row.original.jobUrl} target="_blank" rel="noreferrer" className="text-foreground hover:text-brand hover:underline" title={row.original.role}>
              {row.original.role}
            </a>
          ) : (
            <span className="text-foreground">{row.original.role}</span>
          ),
      },
      { accessorKey: "location", header: "Location", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span> },
      {
        accessorKey: "legit",
        header: "Legit",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return v === DASH ? <span className="text-muted-foreground">{DASH}</span> : <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip(v))}>{v}</span>;
        },
      },
      {
        accessorKey: "recommendation",
        header: "Recommend",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => {
          const v = getValue<string>();
          return v === DASH ? <span className="text-muted-foreground">{DASH}</span> : <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", chip(v))}>{v}</span>;
        },
      },
      {
        accessorKey: "posted",
        header: "Posted",
        sortingFn: (a, b) => new Date(a.original.posted ?? 0).getTime() - new Date(b.original.posted ?? 0).getTime(),
        cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{fmtPosted(getValue<string>())}</span>,
      },
      {
        id: "action",
        header: () => <span className="sr-only">Action</span>,
        enableSorting: false,
        enableHiding: false,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <button
              type="button"
              disabled={evaluatingId === r.id}
              onClick={() => (r.evaluated ? onInsights(r.id) : onEvaluate(r.id))}
              className={cn(
                "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-60",
                r.evaluated ? "bg-brand text-white hover:bg-brand-hover" : "border border-brand/40 text-brand hover:bg-brand/10",
              )}
            >
              {evaluatingId === r.id ? <><Loader2 className="size-3 animate-spin" /> Evaluating…</> : r.evaluated ? "Insights" : "Evaluate"}
            </button>
          );
        },
      },
    ],
    [evaluatingId, onEvaluate, onInsights, rankById],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: "score", desc: true }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = useState("");

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
  const selectedUneval = selectedRows.filter((r) => !r.original.evaluated).map((r) => r.original.id);

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
        <FacetFilter title="Legit" options={legit.options} selected={legit.selected} onChange={legit.set} />
        {filtered && (
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => { setColumnFilters([]); setGlobalFilter(""); }}>
            Reset <X className="size-3.5" />
          </Button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{table.getFilteredRowModel().rows.length} jobs</span>
          {/* Column visibility */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5"><Settings2 className="size-3.5" /> Columns</Button>
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

      {/* Selection action bar */}
      {selectedRows.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-brand/30 bg-brand/5 px-3 py-2 text-sm">
          <span className="font-medium text-white">{selectedRows.length} selected</span>
          {onEvaluateMany && selectedUneval.length > 0 && (
            <Button
              size="sm"
              className="bg-brand text-white hover:bg-brand-hover"
              onClick={() => { onEvaluateMany(selectedUneval); table.resetRowSelection(); }}
            >
              Evaluate selected ({selectedUneval.length})
            </Button>
          )}
          <button type="button" onClick={() => table.resetRowSelection()} className="ml-auto text-xs text-muted-foreground hover:text-foreground">
            Clear
          </button>
        </div>
      )}

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
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
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
              <tr key={row.id} data-selected={row.getIsSelected()} className="border-b border-border/60 transition-colors hover:bg-accent/30 data-[selected=true]:bg-brand/5">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={cn("px-3 py-2", cell.column.id === "action" && "text-right")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
    </div>
  );
}
