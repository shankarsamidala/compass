export function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card p-12 text-center text-sm text-muted-foreground">
      {label} settings will appear here.
    </div>
  );
}
