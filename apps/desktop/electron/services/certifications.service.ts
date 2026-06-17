import { authedFetch } from "../core/http";
import { ok, err, type Result, type CertificationItem, type CertificationInput } from "@compass/ipc-contract";

export const certificationsService = {
  async list(): Promise<Result<{ data: CertificationItem[] }>> {
    const res = await authedFetch("/certifications", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load certifications", json?.code);
    return ok({ data: json?.data ?? [] });
  },

  async add(input: CertificationInput): Promise<Result<CertificationItem>> {
    const res = await authedFetch("/certifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not add certification", json?.code);
    return ok(json as CertificationItem);
  },

  async update(id: string, patch: Partial<CertificationInput>): Promise<Result<CertificationItem>> {
    const res = await authedFetch(`/certifications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Certification not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not update certification", json?.code);
    return ok(json as CertificationItem);
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/certifications/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not remove certification", json?.code);
    }
    return ok(undefined);
  },
};
