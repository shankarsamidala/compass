import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";

// Company autocomplete via daily.dev (same source as the settings work-experience
// editor). Runs client-side; degrades to free text on any failure.
const COMPANY_GQL = `query AutocompleteCompany($query: String!, $limit: Int, $type: CompanyType) {
  autocompleteCompany(query: $query, limit: $limit, type: $type) { id name image }
}`;

type Item = { id: string; name: string; image: string };

/** Single-value company field with daily.dev autocomplete (logos). Free text allowed. */
export function CompanyCombobox({
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const [results, setResults] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: COMPANY_GQL, variables: { query: q, limit: 10, type: "company" } }),
        });
        const json = await res.json();
        const items: Item[] = json?.data?.autocompleteCompany ?? [];
        setResults(items);
        setOpen(items.length > 0);
      } catch {
        /* network/timeout — degrade to free text */
      }
    }, 300);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        className="h-10"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          search(e.target.value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-input bg-popover p-1 shadow-md">
          {results.slice(0, 8).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(r.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {r.image && <img src={r.image} alt={r.name} className="h-5 w-5 shrink-0 rounded object-contain" />}
                <span className="truncate">{r.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
