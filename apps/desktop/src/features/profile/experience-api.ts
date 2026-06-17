import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { ExperienceInput } from "@compass/ipc-contract";

const KEY = ["experiences"] as const;

export function useExperiences() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.experience.list();
      if (!res.ok) throw new Error(res.error);
      return res.data.data;
    },
  });
}

export function useAddExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ExperienceInput) => {
      const res = await api.experience.add(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ExperienceInput> }) => {
      const res = await api.experience.update(id, patch);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveExperience() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.experience.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
