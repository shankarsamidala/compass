import type { ReactNode } from "react";

/** Single-line setting: label left, control right (studio's Row). */
export function Row({ label, action }: { label: string; action: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-base text-foreground">{label}</span>
      <div className="shrink-0">{action}</div>
    </div>
  );
}

/** Two-line setting: title + description left, control right (studio's StackedRow). */
export function StackedRow({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-5">
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium text-foreground">{title}</div>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );
}
