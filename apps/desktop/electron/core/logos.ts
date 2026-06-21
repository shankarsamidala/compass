/**
 * Logo resolution via daily.dev's public GraphQL — the same source the company /
 * skill autocompletes use in the UI. Used to back-fill logos for records created
 * by resume import or onboarding (which save names only). All best-effort: any
 * failure resolves to null so callers can skip the logo and move on.
 */
const DAILY_GQL = "https://api.daily.dev/graphql";

const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

const TOOLS_GQL = `query AutocompleteTools($query: String!) {
  autocompleteTools(query: $query) { id title faviconUrl }
}`;

async function dailyFetch<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(DAILY_GQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as { data?: T } | null;
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/** Resolve a company logo URL by name (top autocomplete match). */
export async function fetchCompanyLogo(name: string): Promise<string | null> {
  const q = name.trim();
  if (!q) return null;
  const data = await dailyFetch<{ autocompleteCompany?: { name: string; image?: string }[] }>(
    COMPANY_GQL,
    { query: q, limit: 5, type: "company" },
  );
  const hit = data?.autocompleteCompany?.find((c) => c.image)?.image;
  return hit ?? null;
}

/** Resolve a skill/tool favicon URL by name (top autocomplete match). */
export async function fetchSkillFavicon(name: string): Promise<string | null> {
  const q = name.trim();
  if (!q) return null;
  const data = await dailyFetch<{ autocompleteTools?: { title: string; faviconUrl?: string }[] }>(
    TOOLS_GQL,
    { query: q },
  );
  const hit = data?.autocompleteTools?.find((t) => t.faviconUrl)?.faviconUrl;
  return hit ?? null;
}
