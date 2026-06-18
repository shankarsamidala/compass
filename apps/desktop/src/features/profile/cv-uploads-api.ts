import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import { trackAction } from "@/lib/analytics";

const KEY = ["cv-uploads"] as const;

export function useCvUploads() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.cv.listUploads();
      return res.ok ? res.data : [];
    },
  });
}

export function useDeleteCvUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.cv.deleteUpload(id),
    onSuccess: () => {
      trackAction("cv_deleted");
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useInvalidateCvUploads() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: KEY });
}
