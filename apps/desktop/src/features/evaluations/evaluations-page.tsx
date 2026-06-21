import { useEffect, useState } from "react";
import { RefreshCw, FileText, ExternalLink } from "lucide-react";
import { api } from "@/lib/ipc";
import type { EvaluationSummary, EvaluationDetail } from "@compass/ipc-contract";

const scoreColor = (s: number | null) =>
  s == null ? "bg-muted text-muted-foreground"
  : s >= 4 ? "bg-green-500/15 text-green-600"
  : s >= 3 ? "bg-amber-500/15 text-amber-600"
  : "bg-red-500/15 text-red-600";

const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString(); } catch { return d; } };

export function EvaluationsPage() {
  const [rows, setRows] = useState<EvaluationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<EvaluationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async () => {
    setLoading(true); setError(null);
    const r = await api.evaluations.list();
    setLoading(false);
    if (r.ok) setRows(r.data.evaluations);
    else setError(r.error);
  };
  useEffect(() => { void load(); }, []);

  const open = async (id: string) => {
    setDetailLoading(true);
    const r = await api.evaluations.get(id);
    setDetailLoading(false);
    if (r.ok) setSelected(r.data.evaluation);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground">Evaluations pushed back from your agent.</p>
        </div>
        <button onClick={load} className="text-muted-foreground hover:text-foreground" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* List */}
        <div className="w-[360px] shrink-0 overflow-y-auto border-r border-border">
          {error && <p className="p-4 text-sm text-destructive">{error}</p>}
          {!error && !loading && rows.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">
              No reports yet. Run <code>/reinit:reinit push</code> in your agent to send evaluations here.
            </div>
          )}
          {rows.map((e) => (
            <button
              key={e.id}
              onClick={() => open(e.id)}
              className={`flex w-full flex-col gap-1 border-b border-border px-4 py-3 text-left hover:bg-muted/50 ${
                selected?.id === e.id ? "bg-muted" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium text-foreground">{e.companyName ?? "—"}</span>
                <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreColor(e.score)}`}>
                  {e.score != null ? e.score.toFixed(1) : "—"}
                </span>
              </div>
              <span className="truncate text-sm text-muted-foreground">{e.roleTitle ?? ""}</span>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {e.legitimacyTier && <span>{e.legitimacyTier}</span>}
                <span>· {fmtDate(e.createdAt)}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Detail */}
        <div className="min-w-0 flex-1 overflow-y-auto p-6">
          {detailLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : selected ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  {selected.companyName} — {selected.roleTitle}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  {selected.score != null && (
                    <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${scoreColor(selected.score)}`}>
                      {selected.score.toFixed(1)} / 5
                    </span>
                  )}
                  {selected.archetype && <span>{selected.archetype}</span>}
                  {selected.legitimacyTier && <span>· {selected.legitimacyTier}</span>}
                  {selected.jobUrl && (
                    <a href={selected.jobUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> posting
                    </a>
                  )}
                </div>
              </div>
              {selected.rawReport ? (
                <pre className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 text-xs leading-relaxed text-foreground">
                  {selected.rawReport}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No report body stored for this evaluation.</p>
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
