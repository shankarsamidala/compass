import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import { qk } from "@/lib/query";

/** Mark onboarding complete → invalidate session so the gate enters the app. */
export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.onboarding.complete(),
    onSuccess: (res) => {
      if (res.ok) qc.invalidateQueries({ queryKey: qk.session });
    },
  });
}
