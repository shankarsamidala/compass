import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

/**
 * Select-style picker over a fixed value/label list, using the nova Combobox.
 * Labels are the combobox items (so display + filtering work without an
 * itemToStringLabel hook); we map label ↔ value at the boundary so the form keeps
 * the code (e.g. "c2h") while the user sees the label ("Contract-to-hire").
 */
export function OptionCombobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  id,
}: {
  options: readonly (string | { value: string; label: string })[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const norm = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const toValue = new Map(norm.map((o) => [o.label, o.value]));
  const toLabel = new Map(norm.map((o) => [o.value, o.label]));

  return (
    <Combobox
      items={norm.map((o) => o.label)}
      value={toLabel.get(value) ?? null}
      onValueChange={(label) => onChange(toValue.get(label as string) ?? "")}
    >
      <ComboboxInput id={id} placeholder={placeholder} className="h-10" />
      <ComboboxContent>
        <ComboboxEmpty className="px-3 py-2 text-xs text-muted-foreground/60">No match</ComboboxEmpty>
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
