import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon, Search01Icon } from "@hugeicons/core-free-icons";

// ── Skill / tech autocomplete (daily.dev keywords) ─────────────────────────────

const KEYWORDS_GQL = `query AutocompleteKeywords($query: String!, $limit: Int) {
  autocompleteKeywords(query: $query, limit: $limit) { keyword title }
}`;

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
    <path d="M16.804 6.147a.75.75 0 011.049 1.05l-.073.083L13.061 12l4.72 4.72a.75.75 0 01-.977 1.133l-.084-.073L12 13.061l-4.72 4.72-.084.072a.75.75 0 01-1.049-1.05l.073-.083L10.939 12l-4.72-4.72a.75.75 0 01.977-1.133l.084.073L12 10.939l4.72-4.72.084-.072z" />
  </svg>
);

/**
 * Tag picker with a floating daily.dev keyword autocomplete (used for skills and
 * tech stacks). The suggestion popover renders in a portal so it can't be clipped
 * by the form's overflow. Selected tags render below as white `keyword ✕` chips.
 */
export function SkillPicker({
  skills,
  input,
  onInput,
  onAdd,
  onRemove,
  placeholder = "Search skills",
}: {
  skills: string[];
  input: string;
  onInput: (v: string) => void;
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
  placeholder?: string;
}) {
  const [results, setResults] = useState<{ keyword: string; title: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  const place = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 4, width: r.width });
  }, []);

  // Suggestions from the provider that aren't already selected.
  const suggestions = results.map((r) => r.keyword).filter((k) => !skills.includes(k));
  const showPopover = open && suggestions.length > 0;

  // Keep the portal popover aligned to the input while it's open.
  useEffect(() => {
    if (!showPopover) return;
    place();
    const onMove = () => place();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [showPopover, place]);

  const search = (q: string) => {
    if (timer.current) clearTimeout(timer.current);
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch("https://api.daily.dev/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: KEYWORDS_GQL, variables: { query: q, limit: 10 } }),
        });
        const json = await res.json();
        const items: { keyword: string; title: string }[] = json?.data?.autocompleteKeywords ?? [];
        setResults(items);
        setOpen(items.length > 0);
      } catch { /* silent */ }
    }, 250);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Search input */}
      <div ref={anchorRef} className="relative">
        <HugeiconsIcon icon={Search01Icon} size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground pointer-events-none" />
        <input
          className="h-9 w-full rounded-4xl border border-input bg-input/30 pl-9 pr-3 text-sm text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          placeholder={placeholder}
          value={input}
          autoComplete="off"
          onChange={(e) => { onInput(e.target.value); search(e.target.value); }}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              if (input.trim()) { onAdd(input); setResults([]); setOpen(false); }
            }
          }}
        />
      </div>

      {/* Floating suggestion popover — portaled so it can't be clipped. */}
      {showPopover && pos && createPortal(
        <div
          style={{ position: "fixed", left: pos.left, top: pos.top, width: pos.width, zIndex: 60 }}
          className="rounded-xl border border-border bg-background p-3 shadow-lg"
        >
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onAdd(s); }}
                className="flex h-8 items-center gap-1 rounded-[10px] border border-border bg-card pl-3 pr-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
              >
                <span className="min-w-0 truncate">{s}</span>
                <HugeiconsIcon icon={Add01Icon} size={16} className="shrink-0" />
              </button>
            ))}
          </div>
        </div>,
        document.body,
      )}

      {/* Selected tags — below, white chip with remove */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onRemove(s)}
              className="flex h-8 items-center gap-1 rounded-[10px] bg-white pl-3 pr-1.5 text-xs font-semibold text-black hover:bg-white/90"
            >
              <span className="min-w-0 truncate">{s}</span>
              <CloseIcon />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
