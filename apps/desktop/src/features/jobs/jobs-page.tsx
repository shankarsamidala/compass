import { useState, useRef, useEffect } from "react";
import { Loader2, LayoutGrid, Table2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJobsFeed } from "./api";
import { JobFeedCard } from "./job-feed-card";
import { JobsDataTable } from "./jobs-data-table";
import { Donut } from "./charts";
import { JobInsightsSheet } from "./job-insights-sheet";
import { useSettings } from "@/features/settings/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";
import type { EvaluationSummary, JobRanking, MatchFloor } from "@compass/ipc-contract";

const MATCH_THRESHOLDS: Record<MatchFloor, number> = { all: 0, fair: 40, strong: 70 };

export function JobsPage() {
  const { data: jobs, isLoading, error } = useJobsFeed();
  const { data: settings } = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  // Ranking (ofertas) state — runs the agent after a scan.
  const [ranking, setRanking] = useState(false);
  const trustedRef = useRef(false);

  const runRankScan = async () => {
    setRanking(true);
    setEvalError(null);
    const r = await api.jobs.rankScan();
    setRanking(false);
    if (r.ok) qc.invalidateQueries({ queryKey: ["rankings"] });
    else setEvalError(`Ranking failed: ${r.error}`);
  };

  const scan = useMutation({
    mutationFn: async () => {
      const res = await api.jobs.scan({
        maxPerRole: settings?.scan.maxPerRole ?? 20,
        jobAge: settings?.scan.jobAge ?? 1,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
      // Scan → rank the fresh pool (ofertas). Gated by the one-time agent consent.
      if (trustedRef.current) void runRankScan();
      else setPending({ type: "rank" });
    },
  });

  // Run the reinit skill (claude -p) to evaluate one job → pushes to /evaluations.
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // One-time permission: the first Evaluate asks the user to allow the agent to
  // run unattended; after that it runs fully (--dangerously-skip-permissions).
  const { data: trusted, refetch: refetchTrust } = useQuery({
    queryKey: ["agent-trusted"],
    queryFn: async () => {
      const r = await api.cli.isAgentTrusted();
      return r.ok ? r.data.trusted : false;
    },
  });
  useEffect(() => { trustedRef.current = !!trusted; }, [trusted]);
  const [pending, setPending] = useState<
    { type: "single"; id: string } | { type: "many"; ids: string[] } | { type: "rank" } | null
  >(null);

  // Per-user ofertas rankings → drives the table's Rank/Score/Legit/Recommend.
  const { data: rankByJob } = useQuery({
    queryKey: ["rankings"],
    queryFn: async () => {
      const r = await api.jobs.rankings();
      const m = new Map<string, JobRanking>();
      for (const x of r.ok ? r.data.rankings : []) m.set(x.jobId, x);
      return m;
    },
  });

  // Evaluate jobs sequentially (one agent run at a time — never spawn concurrent
  // claude processes). Used for both single and bulk.
  const runEvaluations = async (ids: string[]) => {
    setEvalError(null);
    for (const id of ids) {
      setEvaluatingId(id);
      const res = await api.jobs.evaluateAgent(id);
      if (!res.ok) { setEvalError(res.error); break; }
    }
    setEvaluatingId(null);
    qc.invalidateQueries({ queryKey: ["evaluations"] });
  };

  // Gate behind one-time consent (single or bulk).
  const handleEvaluate = (jobId: string) => {
    if (trusted) void runEvaluations([jobId]);
    else setPending({ type: "single", id: jobId });
  };
  const handleEvaluateMany = (ids: string[]) => {
    if (!ids.length) return;
    if (trusted) void runEvaluations(ids);
    else setPending({ type: "many", ids });
  };
  const grantAndEvaluate = async () => {
    const p = pending;
    setPending(null);
    await api.cli.trustAgent();
    await refetchTrust();
    if (!p) return;
    if (p.type === "rank") void runRankScan();
    else void runEvaluations(p.type === "single" ? [p.id] : p.ids);
  };

  // Stored evaluations → drives "Insights vs Evaluate" + the table's score/legit columns.
  const { data: evalByJob } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const r = await api.evaluations.list();
      const m = new Map<string, EvaluationSummary>();
      for (const e of r.ok ? r.data.evaluations : []) if (e.jobId) m.set(e.jobId, e);
      return m;
    },
  });
  const evaluatedIds = evalByJob; // Map has .has(id)

  // Cards (discovery) vs Table (ranked decision board). Persisted.
  const [view, setView] = useState<"cards" | "table">(
    () => (localStorage.getItem("reinit:jobs-view") as "cards" | "table") || "cards",
  );
  const setViewPersist = (v: "cards" | "table") => {
    localStorage.setItem("reinit:jobs-view", v);
    setView(v);
  };

  const minMatch = settings?.scan.minMatch ?? "all";
  const threshold = MATCH_THRESHOLDS[minMatch];
  const filtered = jobs?.filter((j) => j.score === null || j.score >= threshold) ?? [];

  // Board-level recommendation mix (from ofertas rankings) → donut summary.
  const recCounts = { Apply: 0, Consider: 0, Skip: 0 };
  for (const r of rankByJob?.values() ?? []) {
    if (r.recommendation && r.recommendation in recCounts) recCounts[r.recommendation as keyof typeof recCounts]++;
  }
  const totalRanked = recCounts.Apply + recCounts.Consider + recCounts.Skip;
  const donutData = [
    { label: "Apply", value: recCounts.Apply, color: "#22c55e" },
    { label: "Consider", value: recCounts.Consider, color: "#eab308" },
    { label: "Skip", value: recCounts.Skip, color: "#6b7280" },
  ];

  return (
    <div className="relative w-full px-6 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Jobs</h1>
          <p className="text-sm text-foreground">Roles matched to your target profile.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <button
              type="button"
              aria-label="Card view"
              onClick={() => setViewPersist("cards")}
              className={cn("rounded-md p-1.5", view === "cards" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Table view"
              onClick={() => setViewPersist("table")}
              className={cn("rounded-md p-1.5", view === "table" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground")}
            >
              <Table2 className="size-4" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={() => scan.mutate()}
            disabled={scan.isPending}
            className="bg-brand text-white hover:bg-brand-hover"
          >
            {scan.isPending ? (
              <><Loader2 className="mr-2 size-4 animate-spin" />Scanning…</>
            ) : "Scan Jobs"}
          </Button>
        </div>
      </header>

      {scan.isError && (
        <p className="mb-4 text-sm text-destructive">{(scan.error as Error).message}</p>
      )}
      {evalError && <p className="mb-4 text-sm text-destructive">Evaluation failed: {evalError}</p>}
      {evaluatingId && (
        <p className="mb-4 text-sm text-muted-foreground">
          Evaluating with REINIT… this runs the skill in the background and can take a minute.
        </p>
      )}
      {ranking && (
        <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Ranking your jobs with REINIT (ofertas)… scores will appear when it finishes.
        </p>
      )}

      {scan.isSuccess && (
        <p className="mb-4 text-sm text-muted-foreground">
          Scan complete — {scan.data.inserted} new role{scan.data.inserted !== 1 ? "s" : ""} added across {scan.data.scannedRoles} target role{scan.data.scannedRoles !== 1 ? "s" : ""}.
        </p>
      )}

      {totalRanked > 0 && (
        <div className="mb-6 inline-flex items-center gap-5 rounded-xl border border-border bg-card px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Scan results</p>
            <p className="text-sm text-foreground/70">{totalRanked} job{totalRanked !== 1 ? "s" : ""} ranked</p>
          </div>
          <Donut data={donutData} />
        </div>
      )}

      {isLoading || scan.isPending ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="size-7 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">
            {scan.isPending ? "Scanning jobs for your roles…" : "Loading…"}
          </p>
        </div>
      ) : filtered.length > 0 ? (
        view === "table" ? (
          <JobsDataTable
            jobs={filtered}
            evalByJob={evalByJob ?? new Map()}
            rankByJob={rankByJob ?? new Map()}
            evaluatingId={evaluatingId}
            onEvaluate={handleEvaluate}
            onInsights={setOpenId}
            onEvaluateMany={handleEvaluateMany}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
            {filtered.map((job) => (
              <JobFeedCard
                key={job.id}
                job={job}
                evaluated={evaluatedIds?.has(job.id) ?? false}
                evaluating={evaluatingId === job.id}
                onEvaluate={() => handleEvaluate(job.id)}
                onClick={() => setOpenId(job.id)}
              />
            ))}
          </div>
        )
      ) : (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center text-sm text-muted-foreground">
          {error
            ? "Couldn't load jobs. Try again."
            : jobs && jobs.length > 0
              ? `No roles meet the "${minMatch}" match threshold. Lower the minimum match in Job Preferences.`
              : "No jobs yet — click Scan Jobs to discover roles."}
        </div>
      )}

      <JobInsightsSheet
        open={openId !== null}
        onOpenChange={(v) => !v && setOpenId(null)}
        job={filtered.find((j) => j.id === openId) ?? null}
      />

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white">Allow REINIT to evaluate jobs?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Evaluation runs the REINIT agent (Claude) on your machine — it reads your profile,
              researches the role on the web, scores the fit (A–G), and saves the report to your
              dashboard. It runs in the background using your own Claude.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Granting permission lets it run automatically from now on, without asking each time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setPending(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="bg-brand text-white hover:bg-brand-hover"
                onClick={grantAndEvaluate}
              >
                Allow &amp; evaluate
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
