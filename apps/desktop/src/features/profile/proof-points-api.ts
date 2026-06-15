import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { ProofPointInput } from "@compass/ipc-contract";

const KEY = ["proof-points"] as const;

export function useProofPoints() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.proofPoints.list();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

export function useHotTakes() {
  return useProofPoints();
}

export function useAddProofPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProofPointInput) => {
      const res = await api.proofPoints.add(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveProofPoint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.proofPoints.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
