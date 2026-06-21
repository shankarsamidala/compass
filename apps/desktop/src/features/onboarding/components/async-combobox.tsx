import { useState } from "react";
import type { SuggestKind } from "@compass/ipc-contract";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { useSuggest } from "../use-suggest";

/**
 * Single-value picker with live, provider-backed autocomplete (roles / locations),
 * using the nova Combobox. Server already filters, so built-in filtering is off;
 * free text is allowed (a value not in the suggestions is still kept).
 */
export function AsyncCombobox({
  value,
  onChange,
  kind,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  kind: SuggestKind;
  placeholder?: string;
  id?: string;
}) {
  const [query, setQuery] = useState(value ?? "");
  const { items } = useSuggest(kind, query);

  return (
    <Combobox
      items={items}
      value={value || null}
      onValueChange={(v) => onChange((v as string) ?? "")}
      inputValue={value}
      onInputValueChange={(text) => {
        onChange(text); // keep free text
        setQuery(text); // drive the live search
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
