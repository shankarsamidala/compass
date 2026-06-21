import { useState } from "react";
import type { SuggestKind } from "@compass/ipc-contract";
import { Input } from "@/components/ui/input";
import { useSuggest } from "../use-suggest";

/** Single-value text field with provider-backed autocomplete (free text allowed). */
export function SuggestCombobox({
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
  const [open, setOpen] = useState(false);
  const { items } = useSuggest(kind, value);
  const live = items.filter((s) => s.toLowerCase() !== value.trim().toLowerCase());

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
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
      />
      {open && live.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-input bg-popover p-1 shadow-md">
          {live.slice(0, 8).map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(s);
                  setOpen(false);
                }}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
