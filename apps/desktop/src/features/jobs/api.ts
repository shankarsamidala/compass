import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";
import { trackAction } from "@/lib/analytics";

/** The user's ranked job feed (career-ops GET /jobs via IPC), within a freshness
 *  window of `days` (1–90). Each window is cached separately; qk.jobs invalidates all. */
export function useJobsFeed(days: number) {
  return useQuery({
    queryKey: qk.jobsFeed(days),
    queryFn: async () => {
      const res = await api.jobs.list({ days });
      if (!res.ok) throw new Error(res.error);
      return res.data.jobs;
    },
  });
}

/** A single job for the detail view. */
export function useJob(id: string | null) {
  return useQuery({
    queryKey: id ? qk.job(id) : qk.job("none"),
    enabled: !!id,
    queryFn: async () => {
      const res = await api.jobs.get(id!);
      if (!res.ok) throw new Error(res.error);
      return res.data.job;
    },
  });
}

/** Fast triage pass for a pooled job (score + recommendation + Block A). */
export function useJobQuickEval() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.jobs.evaluateQuick(id);
      if (!res.ok) throw new Error(res.error);
      trackAction("evaluation_run", { kind: "quick" });
      return res.data;
    },
  });
}

/** Decision-view evaluation for a pooled job (per-block B/C/D/G, web-grounded D/G). */
export function useJobFullEval() {
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.jobs.evaluate(id);
      if (!res.ok) throw new Error(res.error);
      trackAction("evaluation_run", { kind: "full" });
      return res.data;
    },
  });
}
