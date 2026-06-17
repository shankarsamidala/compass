import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { EducationInput } from "@compass/ipc-contract";

const KEY = ["education"] as const;

export function useEducation() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.education.list();
      if (!res.ok) throw new Error(res.error);
      return res.data.data;
    },
  });
}

export function useAddEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EducationInput) => {
      const res = await api.education.add(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<EducationInput> }) => {
      const res = await api.education.update(id, patch);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveEducation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.education.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
