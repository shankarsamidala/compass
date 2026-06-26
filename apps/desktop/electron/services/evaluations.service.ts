import { authedFetch } from "../core/http";
import { ok, err, type Result, type EvaluationSummary, type EvaluationDetail } from "@compass/ipc-contract";

/** Atlas stores score as a numeric string; normalize to number|null. */
const num = (v: unknown): number | null =>
  v == null || v === "" ? null : Number.isNaN(Number(v)) ? null : Number(v);

function toSummary(e: any): EvaluationSummary {
  return {
    id: e.id,
    jobId: e.jobId ?? null,
    companyName: e.companyName ?? null,
    roleTitle: e.roleTitle ?? null,
    jobUrl: e.jobUrl ?? null,
    archetype: e.archetype ?? null,
    score: num(e.score),
    legitimacyTier: e.legitimacyTier ?? null,
    status: e.status ?? "complete",
    createdAt: e.createdAt,
    jobDescription: e.jobDescription ?? null,
    logoUrl: e.logoUrl ?? null,
    location: e.location ?? null,
  };
}

/**
 * Evaluations service — reads reports the skill pushed back (Atlas /evaluations).
 */
export const evaluationsService = {
  async list(): Promise<Result<{ evaluations: EvaluationSummary[] }>> {
    const res = await authedFetch("/evaluations?limit=100", { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (!res.ok) return err(json?.error || "Could not load evaluations", json?.code);
    const evaluations = Array.isArray(json?.evaluations) ? json.evaluations.map(toSummary) : [];
    return ok({ evaluations });
  },

  async get(id: string): Promise<Result<{ evaluation: EvaluationDetail }>> {
    const res = await authedFetch(`/evaluations/${encodeURIComponent(id)}`, { method: "GET" });
    if (!res) return err("Could not reach the server", "NETWORK");
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Evaluation not found", "NOT_FOUND");
    if (!res.ok || !json?.evaluation) return err(json?.error || "Could not load evaluation", json?.code);
    const e = json.evaluation;
    return ok({
      evaluation: {
        ...toSummary(e),
        rawReport: e.rawReport ?? null,
        machineSummary: e.machineSummary ?? null,
      },
    });
  },

  async remove(id: string): Promise<Result<void>> {
    const res = await authedFetch(`/evaluations/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (res.status === 401) return err("Session expired", "INVALID_TOKEN");
    if (res.status === 404) return err("Evaluation not found", "NOT_FOUND");
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      return err(json?.error || "Could not delete evaluation", json?.code);
    }
    return ok(undefined);
  },
};
