import { SettingHeader } from "../components/cards";

export function PlaceholderPanel({ label }: { label: string }) {
  return (
    <div className="space-y-6">
      <SettingHeader title={label} subtitle="Coming soon" />
      <div className="rounded-xl border border-border bg-card p-12 text-center text-sm text-muted-foreground">
        {label} settings will appear here.
      </div>
    </div>
  );
}
