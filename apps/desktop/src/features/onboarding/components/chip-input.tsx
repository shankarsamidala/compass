import { useState } from "react";
import { X } from "lucide-react";
import type { SuggestKind } from "@compass/ipc-contract";
import { useSuggest } from "../use-suggest";

/**
 * Tag input — type + Enter/comma to add, Backspace to remove. Suggestions come
 * from either a static `suggestions` list (rendered as chips) or, when a
 * `suggestKind` is set, a provider-backed typeahead dropdown.
 */
export function ChipInput({
  value,
  onChange,
  placeholder,
  suggestions = [],
  suggestKind,
  center = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  suggestKind?: SuggestKind;
  center?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);

  // Typeahead is opt-in via suggestKind; pass an empty term otherwise (no-op).
  const { items } = useSuggest(suggestKind ?? "roles", suggestKind ? draft : "");
  const live = suggestKind ? items.filter((s) => !value.includes(s)) : [];

  const add = (t: string) => {
    const x = t.trim();
    if (x && !value.includes(x)) onChange([...value, x]);
    setDraft("");
    setOpen(false);
  };
  const remove = (t: string) => onChange(value.filter((v) => v !== t));
  const remaining = suggestions.filter((s) => !value.includes(s));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <div
          className={
            "flex min-h-11 flex-wrap items-center gap-1.5 rounded-4xl border border-input bg-input/30 px-3 py-2 " +
            (center ? "justify-center" : "")
          }
        >
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-transparent px-2.5 py-0.5 text-xs text-foreground"
            >
              {t}
              <button type="button" onClick={() => remove(t)} className="text-muted-foreground hover:text-foreground">
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 120)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
                e.preventDefault();
                add(draft);
              } else if (e.key === "Backspace" && !draft && value.length) {
                remove(value[value.length - 1]);
              }
            }}
            placeholder={value.length ? "" : placeholder}
            className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {suggestKind && open && live.length > 0 && (
          <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-2xl border border-input bg-popover p-1 shadow-md">
            {live.slice(0, 8).map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    add(s);
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

      {remaining.length > 0 && (
        <div className={"flex flex-wrap gap-1.5 " + (center ? "justify-center" : "")}>
          {remaining.slice(0, 8).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-foreground"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
