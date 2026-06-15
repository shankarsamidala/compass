import { authedFetch } from "../core/http";
import { ok, err, type Result, type ProofPointItem, type ProofPointInput } from "@compass/ipc-contract";

export const proofPointsService = {
  async list(): Promise<Result<ProofPointItem[]>> {
    const res = await authedFetch("/proof-points", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load proof points", json?.code);
    return ok(Array.isArray(json) ? json : []);
  },

  async add(input: ProofPointInput): Promise<Result<ProofPointItem>> {
    const res = await authedFetch("/proof-points", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not add proof point", json?.code);
    return ok(json as ProofPointItem);
  },

  async update(id: string, patch: Partial<ProofPointInput>): Promise<Result<ProofPointItem>> {
    const res = await authedFetch(`/proof-points/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Proof point not found", "NOT_FOUND");
    if (!res.ok) return err(json?.error || "Could not update proof point", json?.code);
    return ok(json as ProofPointItem);
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/proof-points/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not remove proof point", json?.code);
    }
    return ok(undefined);
  },
};
