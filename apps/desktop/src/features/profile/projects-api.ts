import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { ProjectInput } from "@compass/ipc-contract";

const KEY = ["projects"] as const;

export function useProjects() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.projects.list();
      if (!res.ok) throw new Error(res.error);
      return res.data.data;
    },
  });
}

export function useAddProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProjectInput) => {
      const res = await api.projects.add(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ProjectInput> }) => {
      const res = await api.projects.update(id, patch);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.projects.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
