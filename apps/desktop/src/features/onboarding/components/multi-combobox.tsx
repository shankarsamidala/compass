import * as React from "react";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";

/**
 * Multi-value picker with chips + live autocomplete (nova Combobox). Generic over
 * the data source via `fetcher`. Creatable: the typed term is offered as an option
 * so users can add values not in the suggestions (roles, skills, cities…).
 *
 * The search input lives INSIDE the popup so the dropdown stays open while picking
 * multiple items (Base UI closes an inline/outside input after a filtered select).
 */
export function MultiCombobox({
  value,
  onChange,
  fetcher,
  placeholder = "Type to search…",
  id,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  fetcher: (query: string) => Promise<string[]>;
  placeholder?: string;
  id?: string;
}) {
  const anchor = useComboboxAnchor();
  const [query, setQuery] = React.useState("");
  const [items, setItems] = React.useState<string[]>([]);

  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setItems([]);
      return;
    }
    let active = true;
    const t = setTimeout(async () => {
      const res = await fetcherRef.current(term).catch(() => []);
      if (active) setItems(res);
    }, 200);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query]);

  // Options = fetched results + the typed term (creatable), minus already-selected.
  const selected = new Set(value);
  const term = query.trim();
  const options = [...new Set([...(term && !selected.has(term) ? [term] : []), ...items])].filter(
    (s) => !selected.has(s),
  );

  return (
    <Combobox
      multiple
      autoHighlight
      items={options}
      value={value}
      onValueChange={(v) => onChange((v as string[]) ?? [])}
      filter={null}
      onInputValueChange={(t) => setQuery(t)}
    >
      <ComboboxChips ref={anchor} id={id} className="min-h-10 w-full">
        <ComboboxValue>
          {(values: string[]) =>
            values.length ? (
              values.map((v) => (
                <ComboboxChip key={v} className="h-5 gap-0.5 px-1.5 text-[11px]">
                  {v}
                </ComboboxChip>
              ))
            ) : (
              <span className="px-1 text-sm text-muted-foreground">{placeholder}</span>
            )
          }
        </ComboboxValue>
        <ComboboxTrigger className="ml-auto" />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxInput placeholder="Search…" showTrigger={false} className="h-9" />
        <ComboboxEmpty className="px-3 py-2 text-xs text-muted-foreground/60">
          Type at least 2 characters…
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
