import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/** Section block — bold title + tertiary description (daily.dev). */
export function PrefSection({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base font-bold text-foreground">{title}</p>
      {description && <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>}
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function PrefDivider() {
  return <span className="h-px w-full bg-border" />;
}

/** Compact pill-style radio (the "Auto / IC / Managerial" row). */
export function RadioPill({ label, checked, onSelect }: { label: string; checked: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "inline-flex select-none items-center gap-2 rounded-[10px] px-2 py-1 text-xs font-medium transition-colors",
        checked ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <span
        className={cn(
          "flex size-5 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-brand" : "border-border",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-brand" />}
      </span>
      {label}
    </button>
  );
}

/** Big radio card with icon + title + description (the "Actively looking" cards). */
export function RadioCard({
  icon,
  title,
  description,
  checked,
  onSelect,
}: {
  icon: IconSvgElement;
  title: string;
  description: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
        checked ? "border-brand bg-brand/5" : "border-border hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-brand" : "border-border",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-brand" />}
      </span>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground">
        <HugeiconsIcon icon={icon} size={28} className={checked ? "text-brand" : undefined} />
      </span>
      <span className="flex flex-1 flex-col">
        <span className="text-sm font-bold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

/** Checkbox + label chip (employment type / location modes). */
export function CheckChip({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-2 p-1 pr-3 text-xs font-medium text-foreground">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(!!v)} />
      {label}
    </label>
  );
}
