import { useEffect, useState } from "react";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

/** Debounced company-name search via daily.dev (same source as the logo enrichment). */
function useCompanySuggest(q: string) {
  const [items, setItems] = useState<string[]>([]);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: COMPANY_GQL, variables: { query: term, limit: 8, type: "company" } }),
        });
        const json = await res.json();
        const names: string[] = (json?.data?.autocompleteCompany ?? [])
          .map((c: { name?: string }) => c.name)
          .filter(Boolean);
        if (active) setItems([...new Set(names)]);
      } catch {
        if (active) setItems([]);
      }
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [q]);
  return items;
}

/** Single-value company picker (nova Combobox) with daily.dev autocomplete + free text. */
export function CompanyComboboxNova({
  value,
  onChange,
  placeholder = "Search your company…",
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState(value ?? "");
  const items = useCompanySuggest(query);

  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onChange((v as string) ?? "")}
      inputValue={value}
      onInputValueChange={(text) => {
        onChange(text);
        setQuery(text);
      }}
      filter={null}
    >
      <ComboboxInput id={id} placeholder={placeholder} className="h-10" />
      <ComboboxContent>
        <ComboboxEmpty className="px-3 py-2 text-xs text-muted-foreground/60">
          No matches — keep typing to use it as-is.
        </ComboboxEmpty>
        <ComboboxList>
          {(item: string) => (
            <ComboboxItem key={item} value={item}>
              {item}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
