import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** A repeatable record entry (one role / degree / project / proof point). */
export function EntryCard({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-input p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="text-muted-foreground transition-colors hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Dashed "add another" affordance shared across record steps. */
export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-2xl border border-dashed border-input text-sm font-medium text-muted-foreground",
        "transition-colors hover:border-brand hover:text-foreground",
      )}
    >
      <Plus className="size-4" />
      {label}
    </button>
  );
}

/** Lightweight YYYY-MM month field (native, no calendar dep). */
export function MonthField({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <input
      type="month"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-input bg-[var(--bg-subtle)] px-3.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
    />
  );
}
