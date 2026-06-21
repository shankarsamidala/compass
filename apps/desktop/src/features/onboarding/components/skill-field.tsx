import { MultiCombobox } from "./multi-combobox";

// Skills field — nova multi-combobox with daily.dev keyword autocomplete (same
// source as the settings SkillPicker). Single place for skills/tech across the app.
const KEYWORDS_GQL = `query AutocompleteKeywords($query: String!, $limit: Int) {
  autocompleteKeywords(query: $query, limit: $limit) { keyword title }
}`;

async function dailyKeywords(q: string): Promise<string[]> {
  try {
    const res = await fetch("https://api.daily.dev/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: KEYWORDS_GQL, variables: { query: q, limit: 10 } }),
    });
    const json = await res.json();
    return (json?.data?.autocompleteKeywords ?? [])
      .map((r: { keyword?: string }) => r?.keyword)
      .filter((k: unknown): k is string => typeof k === "string" && k.length > 0);
  } catch {
    return [];
  }
}

export function SkillField({
  value,
  onChange,
  placeholder = "Search skills, e.g. Kubernetes…",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return <MultiCombobox value={value} onChange={onChange} placeholder={placeholder} fetcher={dailyKeywords} />;
}
