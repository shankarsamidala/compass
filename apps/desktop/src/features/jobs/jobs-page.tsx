import { useState, useEffect } from "react";
import { Loader2, LayoutGrid, Table2, RefreshCw } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJobsFeed } from "./api";
import { JobFeedCard } from "./job-feed-card";
import { JobsDataTable } from "./jobs-data-table";
import { JobInsightsSheet } from "./job-insights-sheet";
import { useSettings } from "@/features/settings/api";
import { Button } from "@/components/ui/button";
import { MultiStepLoader } from "@/components/ui/multi-step-loader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";
import type { EvaluationSummary, JobRanking, MatchFloor } from "@compass/ipc-contract";

const MATCH_THRESHOLDS: Record<MatchFloor, number> = { all: 0, fair: 40, strong: 70 };

const PIPELINE_LOADING_STATES = [
  { text: "Connecting to job boards" },
  { text: "Scanning job boards" },
  { text: "Filtering duplicates" },
  { text: "Saving to feed" },
];

const WINDOW_KEY = "jobs.windowDays";
const WINDOW_OPTIONS: { label: string; days: number }[] = [
  { label: "Today", days: 1 },
  { label: "3 days", days: 3 },
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export function JobsPage() {
  // Freshness window the user picks (scraped-within N days, 1–90). Persisted locally.
  const [windowDays, setWindowDays] = useState<number>(() => {
    const v = Number(localStorage.getItem(WINDOW_KEY));
    return v >= 1 && v <= 90 ? v : 1;
  });
  useEffect(() => { localStorage.setItem(WINDOW_KEY, String(windowDays)); }, [windowDays]);

  const { data: jobs, isLoading, error, refetch: refetchJobs } = useJobsFeed(windowDays);
  const { data: settings } = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  const [step, setStep] = useState(0);

  const scan = useMutation({
    mutationFn: async () => {
      const res = await api.jobs.scan({
        maxPerRole: settings?.scan.maxPerRole ?? 20,
        jobAge: settings?.scan.jobAge ?? 1,
        sources: settings?.scan.sources ?? ["naukri"],
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.jobs });
    },
  });

  const busy = scan.isPending;

  useEffect(() => {
    if (!busy) { setStep(0); return; }
    const id = setInterval(() => {
      setStep((s) => Math.min(s + 1, PIPELINE_LOADING_STATES.length - 1));
    }, 1800);
    return () => clearInterval(id);
  }, [busy]);

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
  const [pending, setPending] = useState<
    | { type: "single"; id: string }
    | { type: "many"; ids: string[] }
    | { type: "rank"; ids: string[] }
    | null
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

  // Rank selected jobs via ofertas (claude -p) → saves to /rankings → table re-sorts.
  const [rankingMany, setRankingMany] = useState(false);
  const [rankingIds, setRankingIds] = useState<Set<string>>(new Set());
  const [rankError, setRankError] = useState<string | null>(null);
  const runRankSelected = async (ids: string[]) => {
    if (!ids.length) return;
    setRankError(null);
    setRankingMany(true);
    setRankingIds(new Set(ids)); // so each row in flight shows a spinner
    const res = await api.jobs.rankSelected(ids);
    setRankingMany(false);
    setRankingIds(new Set());
    if (!res.ok) { setRankError(res.error); return; }
    qc.invalidateQueries({ queryKey: ["rankings"] });
  };

  // Gate behind one-time consent (single, bulk evaluate, or rank).
  const handleEvaluate = (jobId: string) => {
    if (trusted) void runEvaluations([jobId]);
    else setPending({ type: "single", id: jobId });
  };
  const handleEvaluateMany = (ids: string[]) => {
    if (!ids.length) return;
    if (trusted) void runEvaluations(ids);
    else setPending({ type: "many", ids });
  };
  const handleRankMany = (ids: string[]) => {
    if (!ids.length) return;
    if (trusted) void runRankSelected(ids);
    else setPending({ type: "rank", ids });
  };
  // "Not interested" — hide from the feed. Optimistically drops the row, then persists.
  const handleNotInterested = async (jobId: string) => {
    qc.setQueryData<typeof jobs>(qk.jobsFeed(windowDays), (cur) => cur?.filter((j) => j.id !== jobId));
    const res = await api.jobs.notInterested([jobId]);
    if (!res.ok) qc.invalidateQueries({ queryKey: qk.jobs }); // restore on failure
  };
  const grantAndEvaluate = async () => {
    const p = pending;
    setPending(null);
    await api.cli.trustAgent();
    await refetchTrust();
    if (!p) return;
    if (p.type === "rank") void runRankSelected(p.ids);
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

  return (
    <div className="relative w-full px-6 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Jobs</h1>
          <p className="text-sm text-foreground">Roles matched to your target profile.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(windowDays)} onValueChange={(v) => setWindowDays(Number(v))}>
            <SelectTrigger aria-label="Freshness window" className="h-9 w-[110px] rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WINDOW_OPTIONS.map((o) => (
                <SelectItem key={o.days} value={String(o.days)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex h-9 items-center rounded-lg border border-border px-0.5">
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
          <button
            type="button"
            aria-label="Refresh jobs"
            onClick={() => void refetchJobs()}
            disabled={busy || isLoading}
            className="flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <RefreshCw className="size-4" />
          </button>
          <Button
            onClick={() => scan.mutate()}
            disabled={busy}
            className="h-9 rounded-lg bg-brand text-brand-foreground hover:bg-brand-hover"
          >
            {busy ? (
              <><Loader2 className="mr-2 size-4 animate-spin" />Scanning…</>
            ) : "Scan Jobs"}
          </Button>
        </div>
      </header>

      {scan.isError && (
        <p className="mb-4 text-sm text-destructive">{(scan.error as Error).message}</p>
      )}
      {evalError && <p className="mb-4 text-sm text-destructive">Evaluation failed: {evalError}</p>}
      {rankError && <p className="mb-4 text-sm text-destructive">Ranking failed: {rankError}</p>}
      {rankingMany && (
        <p className="mb-4 text-sm text-muted-foreground">
          Ranking selected jobs with REINIT… the agent is scoring them against your profile.
        </p>
      )}
      {evaluatingId && (
        <p className="mb-4 text-sm text-muted-foreground">
          Evaluating with REINIT… this runs the skill in the background and can take a minute.
        </p>
      )}
      {scan.isSuccess && !busy && (
        <p className="mb-4 text-sm text-muted-foreground">
          Scan complete — {scan.data.inserted} new role{scan.data.inserted !== 1 ? "s" : ""} added across {scan.data.scannedRoles} target role{scan.data.scannedRoles !== 1 ? "s" : ""}.
        </p>
      )}


      <MultiStepLoader
        loadingStates={PIPELINE_LOADING_STATES}
        loading={busy}
        value={step}
        subLabel={undefined}
      />

      {isLoading ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="size-7 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">Loading…</p>
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
            onRankMany={handleRankMany}
            onNotInterested={handleNotInterested}
            ranking={rankingMany}
            busyIds={rankingIds}
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
        ranking={openId ? (rankByJob?.get(openId) ?? null) : null}
      />

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <h2 className="text-lg font-bold text-foreground">Allow REINIT to evaluate jobs?</h2>
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
                className="bg-brand text-brand-foreground hover:bg-brand-hover"
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
