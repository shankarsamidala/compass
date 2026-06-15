import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { SkillInput } from "@compass/ipc-contract";

const KEY = ["skills"] as const;

export function useSkills() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.skills.list();
      if (!res.ok) throw new Error(res.error);
      return res.data.data;
    },
  });
}

export function useAddSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SkillInput) => {
      const res = await api.skills.add(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveSkill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.skills.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useImportSkillsFromExperiences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await api.skills.importFromExperiences();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
