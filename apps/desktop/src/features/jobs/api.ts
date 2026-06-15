import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";

/** The user's ranked job feed (career-ops GET /jobs via IPC). */
export function useJobsFeed() {
  return useQuery({
    queryKey: qk.jobs,
    queryFn: async () => {
      const res = await api.jobs.list();
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
