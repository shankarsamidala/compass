import { authedFetch } from "../core/http";
import { ok, err, type Result, type ProfilePrefs, type ProfilePatch } from "@compass/ipc-contract";

function num(v: unknown): number | null {
  return v == null || v === "" ? null : Number(v);
}

function toPrefs(p: any): ProfilePrefs {
  return {
    targetRoles: Array.isArray(p?.targetRoles) ? p.targetRoles : [],
    location: p?.location ?? null,
    totalExperienceYears: num(p?.totalExperienceYears),
    preferredLocations: Array.isArray(p?.preferredLocations) ? p.preferredLocations : [],
    openToRemote: !!p?.openToRemote,
    openToRelocate: !!p?.openToRelocate,
    employmentType: p?.employmentType ?? null,
    expectedCtc: num(p?.expectedCtc),
  };
}

async function putProfile(body: Record<string, unknown>): Promise<Result<ProfilePrefs>> {
  const res = await authedFetch("/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res) return err("Could not reach the server", "NETWORK");
  const json = await res.json().catch(() => ({}));
  if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
  if (!res.ok) return err(json?.error || "Could not save your preferences", json?.code);
  return ok(toPrefs(json));
}

/** Profile service — reads/updates the feed-shaping preferences via career-ops. */
export const profileService = {
  async getPrefs(): Promise<Result<ProfilePrefs>> {
    const res = await authedFetch("/profile", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load profile", json?.code);
    return ok(toPrefs(json));
  },

  setTargetRoles(roles: string[]): Promise<Result<ProfilePrefs>> {
    return putProfile({ targetRoles: roles });
  },

  update(patch: ProfilePatch): Promise<Result<ProfilePrefs>> {
    return putProfile(patch as Record<string, unknown>);
  },
};
