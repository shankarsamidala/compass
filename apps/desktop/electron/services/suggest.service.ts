import { ok, err, type Result, type SuggestKind } from "@compass/ipc-contract";

/**
 * Autocomplete suggestions (ported from studio's lib/server/indeed.ts). Runs in
 * the MAIN process so the request goes out over the user's own IP (no CORS, fits
 * the local-first model). Provider config lives here — channels/kinds are not
 * hardcoded at call sites.
 */
const SUGGEST = {
  base: "https://autocomplete.indeed.com/api/v0/suggestions",
  /** Static query params sent on every request. */
  query: { country: "IN", language: "en", count: "10", formatted: "1", rich: "true" },
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  timeoutMs: 5000,
  minChars: 2,
  /** Our domain kind → the provider's path segment. */
  kind: { locations: "location", roles: "what" } as Record<SuggestKind, string>,
} as const;

interface ProviderSuggestion {
  suggestion?: string;
}

export const suggestService = {
  async query(kind: SuggestKind, q: string): Promise<Result<string[]>> {
    const term = (q ?? "").trim();
    if (term.length < SUGGEST.minChars) return ok([]);

    const segment = SUGGEST.kind[kind];
    if (!segment) return err(`Unknown suggestion kind: ${kind}`, "BAD_KIND");

    const params = new URLSearchParams({ ...SUGGEST.query, query: term });
    const url = `${SUGGEST.base}/${segment}?${params.toString()}`;

    try {
      const res = await fetch(url, {
        headers: { "User-Agent": SUGGEST.userAgent, Accept: "application/json" },
        signal: AbortSignal.timeout(SUGGEST.timeoutMs),
      });
      if (!res.ok) return ok([]);
      const data = (await res.json()) as ProviderSuggestion[];
      const seen = new Set<string>();
      const out = (Array.isArray(data) ? data : [])
        .map((d) => d?.suggestion)
        .filter((s): s is string => typeof s === "string" && s.length > 0)
        .filter((s) => (seen.has(s) ? false : (seen.add(s), true)));
      return ok(out);
    } catch {
      // Network/timeout — degrade silently to free text.
      return ok([]);
    }
  },
};
