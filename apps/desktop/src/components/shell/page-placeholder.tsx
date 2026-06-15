import { Icon } from "./sidebar/icon";
import type { NavEntry } from "./nav";

/** Generic placeholder page rendered for any not-yet-built nav item. */
export function PagePlaceholder({ entry }: { entry: NavEntry }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-16 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card">
        <Icon icon={entry.icon} size={28} className="text-sidebar-primary" />
      </div>
      <h1 className="text-2xl font-bold tracking-tight">{entry.label}</h1>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{entry.description}</p>
      <span className="mt-1 rounded-full border px-3 py-1 text-xs text-muted-foreground">Coming soon</span>
    </div>
  );
}
