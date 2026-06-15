import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { AppSettings } from "@compass/ipc-contract";

const KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.settings.get();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<AppSettings>) => {
      const res = await api.settings.update(patch);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => qc.setQueryData(KEY, data),
  });
}
