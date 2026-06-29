/**
 * Naukri portal — public adapter. Combined-keyword search (./search) → per-job
 * v4 detail enrichment (./details), merged into the shared CanonicalJob schema.
 * Self-contained: changing Naukri here can't affect the other portals.
 */
import type { CanonicalJob } from "@compass/ipc-contract";
import { withConcurrency } from "./client";
import { searchNaukri, type NaukriSearchOpts } from "./search";
import { fetchNaukriDetail } from "./details";

const DETAIL_CONCURRENCY = 5;

export type { NaukriSearchOpts };

/** Search Naukri (combined keyword, ≤5 pages, no filtering) → enrich each with v4 detail. */
export async function searchJobsForRole(opts: NaukriSearchOpts): Promise<CanonicalJob[]> {
  const jobs = await searchNaukri(opts);
  console.log(`[scan][naukri] ${jobs.length} jobs from search → fetching details`);
  if (jobs.length === 0) return [];

  const tasks = jobs.map((job) => async (): Promise<CanonicalJob> => {
    const d = await fetchNaukriDetail(job.externalId).catch(() => null);
    if (!d) return job;
    // Prefer detail values; union skills so we keep the richest set.
    const skills = [...new Set([...(job.skills ?? []), ...(d.skills ?? [])])];
    const merged = { ...job } as CanonicalJob;
    for (const [k, v] of Object.entries(d)) {
      if (v != null) (merged as unknown as Record<string, unknown>)[k] = v;
    }
    merged.skills = skills;
    return merged;
  });

  return withConcurrency(tasks, DETAIL_CONCURRENCY);
}
