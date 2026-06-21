import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useJobsFeed } from "./api";
import { JobFeedCard } from "./job-feed-card";
import { JobInsightsSheet } from "./job-insights-sheet";
import { useSettings } from "@/features/settings/api";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";
import type { MatchFloor } from "@compass/ipc-contract";

const MATCH_THRESHOLDS: Record<MatchFloor, number> = { all: 0, fair: 40, strong: 70 };

export function JobsPage() {
  const { data: jobs, isLoading, error } = useJobsFeed();
  const { data: settings } = useSettings();
  const [openId, setOpenId] = useState<string | null>(null);
  const qc = useQueryClient();

  const scan = useMutation({
    mutationFn: async () => {
      const res = await api.jobs.scan({
        maxPerRole: settings?.scan.maxPerRole ?? 20,
        jobAge: settings?.scan.jobAge ?? 1,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.jobs }),
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
  const [consentJobId, setConsentJobId] = useState<string | null>(null);

  const evaluate = useMutation({
    mutationFn: async (jobId: string) => {
      setEvaluatingId(jobId);
      setEvalError(null);
      const res = await api.jobs.evaluateAgent(jobId);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onError: (e) => setEvalError((e as Error).message),
    onSettled: () => {
      setEvaluatingId(null);
      qc.invalidateQueries({ queryKey: ["evaluations"] });
    },
  });

  // Gate evaluate behind one-time consent.
  const handleEvaluate = (jobId: string) => {
    if (trusted) evaluate.mutate(jobId);
    else setConsentJobId(jobId);
  };
  const grantAndEvaluate = async () => {
    const jobId = consentJobId;
    setConsentJobId(null);
    await api.cli.trustAgent();
    await refetchTrust();
    if (jobId) evaluate.mutate(jobId);
  };

  // Which jobs already have a stored evaluation → card shows "Insights" vs "Evaluate".
  const { data: evaluatedIds } = useQuery({
    queryKey: ["evaluations"],
    queryFn: async () => {
      const r = await api.evaluations.list();
      return new Set((r.ok ? r.data.evaluations : []).map((e) => e.jobId).filter(Boolean) as string[]);
    },
  });

  const minMatch = settings?.scan.minMatch ?? "all";
  const threshold = MATCH_THRESHOLDS[minMatch];
  const filtered = jobs?.filter((j) => j.score === null || j.score >= threshold) ?? [];

  return (
    <div className="relative w-full px-6 pb-16 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Jobs</h1>
          <p className="text-sm text-foreground">Roles matched to your target profile.</p>
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

      {scan.isSuccess && (
        <p className="mb-4 text-sm text-muted-foreground">
          Scan complete — {scan.data.inserted} new role{scan.data.inserted !== 1 ? "s" : ""} added across {scan.data.scannedRoles} target role{scan.data.scannedRoles !== 1 ? "s" : ""}.
        </p>
      )}

      {isLoading || scan.isPending ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
          <Loader2 className="size-7 animate-spin text-brand" />
          <p className="text-sm text-muted-foreground">
            {scan.isPending ? "Scanning jobs for your roles…" : "Loading…"}
          </p>
        </div>
      ) : filtered.length > 0 ? (
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
      ) : (
        <div className="mt-16 text-center text-sm text-muted-foreground">
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

      {consentJobId && (
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
              <Button variant="outline" size="sm" onClick={() => setConsentJobId(null)}>
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
