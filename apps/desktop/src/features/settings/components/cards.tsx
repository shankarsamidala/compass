import type { ReactNode } from "react";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react";
import { cn } from "@/lib/utils";

/** Section heading — title + subtitle (natively's "General settings" header). */
export function SettingHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-1">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

/** Hero toggle card — large bordered card with icon + title + description + action. */
export function HeroCard({
  icon,
  title,
  description,
  action,
  active,
}: {
  icon: IconSvgElement;
  title: string;
  description: ReactNode;
  action: ReactNode;
  active?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 transition-all",
        active && "shadow-lg shadow-brand/10",
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={icon} size={18} className={active ? "text-brand" : "text-foreground"} />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Bordered list container (natively's grouped settings list). */
export function SettingList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border rounded-xl border border-border">{children}</div>;
}

/** A single row inside SettingList — icon box + title + description + action. */
export function SettingListRow({
  icon,
  title,
  description,
  action,
  active,
}: {
  icon: IconSvgElement;
  title: string;
  description?: ReactNode;
  action: ReactNode;
  active?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border transition-all",
            active ? "border-brand/40 bg-brand/5 text-brand" : "border-border text-foreground",
          )}
        >
          <HugeiconsIcon icon={icon} size={20} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="mt-0.5 text-sm leading-normal text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="shrink-0 self-center">{action}</div>
    </div>
  );
}
