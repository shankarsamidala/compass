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
import { ArrowDown, ArrowUp, ChevronsUpDown, ListFilter, Settings2, X, Check } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Bookmark03Icon, GitCompareArrowsIcon, Delete03Icon, DocumentValidationIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { FloatingNav } from "@/components/ui/floating-navbar";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
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
import { cn } from "@/lib/utils";
import type { EvaluationSummary } from "@compass/ipc-contract";

type EvalRow = {
  id: string;
  company: string;
  role: string;
  jobUrl: string | null;
  logoUrl: string | null;
  created: string;
  score: number | null;
  recommendation: string;
  // Report-derived analysis (parsed server-side from the A–G report).
  domain: string;
  comp: string;
  decision: string;
  risk: string;
};

const DASH = "—";
// Columns whose header + cells are centered (the evaluation-derived chips/score).
const CENTERED = new Set(["score", "recommendation"]);

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
  if (t.includes("high") || t.includes("apply") || t.includes("strong") || t.includes("solid"))
    return "text-positive bg-positive-soft";
  if (
    t.includes("med") || t.includes("consider") || t.includes("maybe") ||
    t.includes("caution") || t.includes("mixed") || t.includes("fair")
  )
    return "text-caution bg-caution-soft";
  if (
    t.includes("low") || t.includes("skip") || t.includes("avoid") ||
    t.includes("susp") || t.includes("ghost")
  )
    return "text-negative bg-negative-soft";
  return "bg-muted text-muted-foreground";
}
function chipCell(v: string) {
  if (v === DASH) return <span className="text-muted-foreground/40">{DASH}</span>;
  return <span className={cn("inline-flex min-w-[60px] justify-center rounded-full px-2 py-0.5 text-[11px] font-medium", chip(v))}>{v}</span>;
}
// Same vocab as the report cards (co_job_rankings): Apply | Consider | Skip.
function recommendationOf(s: number | null): string {
  if (s == null) return DASH;
  return s >= 4 ? "Apply" : s >= 3 ? "Consider" : "Skip";
}
function fmtDate(iso: string | null): string {
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
// Truncating free-text cell (report-derived analysis fields) with a hover title.
function textCell(v: string, width = "max-w-[180px]") {
  if (v === DASH) return <span className="text-muted-foreground/40">{DASH}</span>;
  return <span className={cn("block truncate text-xs text-foreground", width)} title={v}>{v}</span>;
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

/** Dual-handle min–max score filter (0–5). Undefined value = no filter (full range). */
const SCORE_MIN = 0;
const SCORE_MAX = 5;
function ScoreRangeFilter({
  value,
  onChange,
}: {
  value: [number, number] | undefined;
  onChange: (next: [number, number] | undefined) => void;
}) {
  const range = value ?? [SCORE_MIN, SCORE_MAX];
  const active = !!value && (value[0] > SCORE_MIN || value[1] < SCORE_MAX);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 border-dashed">
          <ListFilter className="size-3.5" />
          Score
          {active && (
            <span className="ml-1 rounded bg-brand/20 px-1.5 text-[11px] font-semibold tabular-nums text-brand">
              {range[0].toFixed(1)}–{range[1].toFixed(1)}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-3">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Score range</span>
          <span className="font-semibold tabular-nums text-foreground">
            {range[0].toFixed(1)} – {range[1].toFixed(1)}
          </span>
        </div>
        <Slider
          min={SCORE_MIN}
          max={SCORE_MAX}
          step={0.1}
          value={range}
          onValueChange={([lo, hi]) =>
            onChange(lo <= SCORE_MIN && hi >= SCORE_MAX ? undefined : [lo, hi])
          }
        />
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground">
          <span>{SCORE_MIN.toFixed(1)}</span>
          <span>{SCORE_MAX.toFixed(1)}</span>
        </div>
        {active && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="mt-3 w-full rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent"
          >
            Clear
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export function EvaluationsDataTable({
  rows,
  selectedId,
  onSelect,
  onDeleteMany,
  onSave,
  onCompare,
}: {
  rows: EvaluationSummary[];
  /** The report currently open in the detail pane — highlighted in the table. */
  selectedId: string | null;
  /** Open a report in the detail pane. */
  onSelect: (id: string) => void;
  /** Delete one or more reports (floating-bar action). */
  onDeleteMany: (ids: string[]) => void;
  /** Bookmark/save one or more reports (floating-bar action). */
  onSave?: (ids: string[]) => void;
  /** Compare a selection of reports side by side (floating-bar action). */
  onCompare?: (ids: string[]) => void;
}) {
  const data: EvalRow[] = useMemo(
    () =>
      rows.map((e) => ({
        id: e.id,
        company: e.companyName ?? DASH,
        role: e.roleTitle ?? DASH,
        jobUrl: e.jobUrl ?? null,
        logoUrl: e.logoUrl ?? null,
        created: e.createdAt,
        score: e.score,
        recommendation: recommendationOf(e.score),
        domain: e.domain || DASH,
        comp: e.comp ? `${e.comp}` : DASH,
        decision: e.decision || DASH,
        risk: e.riskLevel || DASH,
      })),
    [rows],
  );

  const columns = useMemo<ColumnDef<EvalRow>[]>(
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
        // Range filter [min, max]; rows with no score are excluded when a range is set.
        filterFn: (row, _id, val) => {
          const [lo, hi] = val as [number, number];
          const s = row.original.score;
          return s != null && s >= lo && s <= hi;
        },
        cell: ({ row }) => {
          const s = row.original.score;
          if (s != null)
            return <span className={cn("inline-flex min-w-[52px] justify-center rounded-full border border-dotted px-2 py-0.5 text-[11px] font-bold tabular-nums", scoreClass(s))}>{s.toFixed(1)}</span>;
          return <span className="text-muted-foreground/40">{DASH}</span>;
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
      {
        accessorKey: "decision",
        header: "Decision",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => textCell(getValue<string>(), "max-w-[160px]"),
      },
      {
        accessorKey: "comp",
        header: "Comp",
        cell: ({ getValue }) => textCell(getValue<string>(), "max-w-[110px]"),
      },
      {
        accessorKey: "domain",
        header: "Domain",
        cell: ({ getValue }) => textCell(getValue<string>(), "max-w-[200px]"),
      },
      {
        accessorKey: "risk",
        header: "Risk",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => textCell(getValue<string>(), "max-w-[100px]"),
      },
      {
        accessorKey: "recommendation",
        header: "Recommend",
        filterFn: "arrIncludesSome",
        cell: ({ getValue }) => chipCell(getValue<string>()),
      },
      {
        accessorKey: "created",
        header: "Date",
        sortingFn: (a, b) => new Date(a.original.created ?? 0).getTime() - new Date(b.original.created ?? 0).getTime(),
        cell: ({ getValue }) => <span className="text-xs text-muted-foreground">{fmtDate(getValue<string>())}</span>,
      },
    ],
    [],
  );

  const [sorting, setSorting] = useState<SortingState>([{ id: "created", desc: true }]);
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
  const rec = facet("recommendation");
  const scoreCol = table.getColumn("score");
  const scoreRange = scoreCol?.getFilterValue() as [number, number] | undefined;
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
        <ScoreRangeFilter value={scoreRange} onChange={(v) => scoreCol?.setFilterValue(v)} />
        <FacetFilter title="Recommend" options={rec.options} selected={rec.selected} onChange={rec.set} />
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
                data-active={selectedId === row.original.id}
                onClick={() => onSelect(row.original.id)}
                className="cursor-pointer border-b border-border/60 transition-colors hover:bg-accent/30 data-[selected=true]:bg-muted data-[active=true]:bg-muted"
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    onClick={cell.column.id === "select" ? (e) => e.stopPropagation() : undefined}
                    className="whitespace-nowrap px-3 py-2"
                  >
                    {CENTERED.has(cell.column.id) ? (
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
              <tr><td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-muted-foreground">No reports match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-4 pt-1">
        <Field orientation="horizontal" className="w-fit">
          <FieldLabel htmlFor="reports-rows-per-page" className="text-xs text-muted-foreground">
            Rows per page
          </FieldLabel>
          <Select
            value={String(table.getState().pagination.pageSize)}
            onValueChange={(v) => table.setPageSize(Number(v))}
          >
            <SelectTrigger className="h-8 w-20" id="reports-rows-per-page">
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

      {/* Floating action bar — View a single report, or bulk-delete a selection. */}
      {(() => {
        const bulk = selectedRows.length > 1;
        const singleId = selectedRows.length === 1 ? selectedRows[0].original.id : null;
        const close = () => table.resetRowSelection();
        return (
          <FloatingNav
            visible={selectedRows.length > 0}
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
                      name: `Compare (${selectedRows.length})`,
                      icon: <HugeiconsIcon icon={GitCompareArrowsIcon} size={16} />,
                      onClick: () => {
                        onCompare?.(selectedRows.map((r) => r.original.id));
                        close();
                      },
                    },
                    {
                      name: `Save (${selectedRows.length})`,
                      icon: <HugeiconsIcon icon={Bookmark03Icon} size={16} />,
                      onClick: () => {
                        onSave?.(selectedRows.map((r) => r.original.id));
                        close();
                      },
                    },
                    {
                      name: `Delete (${selectedRows.length})`,
                      icon: <HugeiconsIcon icon={Delete03Icon} size={16} />,
                      variant: "danger" as const,
                      onClick: () => {
                        onDeleteMany(selectedRows.map((r) => r.original.id));
                        close();
                      },
                    },
                  ]
                : singleId == null
                  ? []
                  : [
                      {
                        name: "Report",
                        icon: <HugeiconsIcon icon={DocumentValidationIcon} size={16} />,
                        variant: "brand" as const,
                        onClick: () => { onSelect(singleId); close(); },
                      },
                      {
                        name: "Compare",
                        icon: <HugeiconsIcon icon={GitCompareArrowsIcon} size={16} />,
                        onClick: () => { onCompare?.([singleId]); close(); },
                      },
                      {
                        name: "Save",
                        icon: <HugeiconsIcon icon={Bookmark03Icon} size={16} />,
                        onClick: () => { onSave?.([singleId]); close(); },
                      },
                      {
                        name: "Delete",
                        icon: <HugeiconsIcon icon={Delete03Icon} size={16} />,
                        variant: "danger" as const,
                        onClick: () => { onDeleteMany([singleId]); close(); },
                      },
                    ]
            }
          />
        );
      })()}
    </div>
  );
}
