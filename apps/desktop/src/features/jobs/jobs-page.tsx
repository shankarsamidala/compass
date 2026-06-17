import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useJobsFeed } from "./api";
import { JobFeedCard } from "./job-feed-card";
import { JobDetail } from "./job-detail";
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

      {scan.isSuccess && (
        <p className="mb-4 text-sm text-muted-foreground">
          Scan complete — {scan.data.inserted} new role{scan.data.inserted !== 1 ? "s" : ""} added across {scan.data.scannedRoles} target role{scan.data.scannedRoles !== 1 ? "s" : ""}.
        </p>
      )}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 min-[1920px]:grid-cols-5">
          {filtered.map((job) => (
            <JobFeedCard key={job.id} job={job} onClick={() => setOpenId(job.id)} />
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

      <JobDetail jobId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
