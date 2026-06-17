import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { CertificationInput } from "@compass/ipc-contract";

const KEY = ["certifications"] as const;

export function useCertifications() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.certifications.list();
      if (!res.ok) throw new Error(res.error);
      return res.data.data;
    },
  });
}

export function useAddCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CertificationInput) => {
      const res = await api.certifications.add(input);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CertificationInput> }) => {
      const res = await api.certifications.update(id, patch);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveCertification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await api.certifications.remove(id);
      if (!res.ok) throw new Error(res.error);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
