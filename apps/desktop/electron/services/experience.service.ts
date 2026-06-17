import { authedFetch } from "../core/http";
import { ok, err, type Result, type ExperienceItem, type ExperienceInput } from "@compass/ipc-contract";

export const experienceService = {
  async list(): Promise<Result<{ data: ExperienceItem[] }>> {
    const res = await authedFetch("/experiences", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load experiences", json?.code);
    return ok({ data: json?.data ?? [] });
  },

  async add(input: ExperienceInput): Promise<Result<ExperienceItem>> {
    const res = await authedFetch("/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not add experience", json?.code);
    return ok(json as ExperienceItem);
  },

  async update(id: string, patch: Partial<ExperienceInput>): Promise<Result<ExperienceItem>> {
    const res = await authedFetch(`/experiences/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Experience not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not update experience", json?.code);
    return ok(json as ExperienceItem);
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/experiences/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not remove experience", json?.code);
    }
    return ok(undefined);
  },
};
