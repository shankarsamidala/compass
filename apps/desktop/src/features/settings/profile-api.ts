import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/ipc";
import type { ProfilePatch } from "@compass/ipc-contract";

const KEY = ["profile", "prefs"] as const;

/** The user's feed-shaping profile prefs. */
export function useProfilePrefs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const res = await api.profile.getPrefs();
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });
}

/** Replace target roles (PUT /profile) and refresh the feed + prefs. */
export function useSetTargetRoles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (roles: string[]) => {
      const res = await api.profile.setTargetRoles(roles);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

/** Patch any feed-shaping profile field (PUT /profile). */
export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const res = await api.profile.update(patch);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      qc.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
