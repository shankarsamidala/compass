import { authedFetch } from "../core/http";
import { ok, err, type Result, type EducationItem, type EducationInput } from "@compass/ipc-contract";

export const educationService = {
  async list(): Promise<Result<{ data: EducationItem[] }>> {
    const res = await authedFetch("/education", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load education", json?.code);
    return ok({ data: json?.data ?? [] });
  },

  async add(input: EducationInput): Promise<Result<EducationItem>> {
    const res = await authedFetch("/education", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not add education", json?.code);
    return ok(json as EducationItem);
  },

  async update(id: string, patch: Partial<EducationInput>): Promise<Result<EducationItem>> {
    const res = await authedFetch(`/education/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Education not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not update education", json?.code);
    return ok(json as EducationItem);
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/education/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not remove education", json?.code);
    }
    return ok(undefined);
  },
};
