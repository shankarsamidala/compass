import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";
import type { Job } from "./job-types";

// Static demo data (the live version uses a server action / LLM).
const DEMO = {
  alignment: "at" as "above" | "at" | "below",
  confidence: "high" as "high" | "medium" | "low",
  strategy:
    "You're right at the target level for this role. Lead with platform ownership and reliability wins (SLOs, incident reduction, CI/CD throughput). Frame your cloud + IaC depth as the differentiator versus generalist applicants.",
};

const alignmentConfig = {
  above: { label: "Above Level", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800", dot: "bg-amber-500" },
  at: { label: "Right Level", color: "text-brand", bg: "bg-coral-50 border-coral-200 dark:bg-coral-950/30 dark:border-coral-800", dot: "bg-brand" },
  below: { label: "Stretch Role", color: "text-muted-foreground", bg: "bg-surface-raised border-surface-border", dot: "bg-muted-foreground" },
} as const;

export function LevelStrategySection({ job: _job }: { job: Job }) {
  const data = DEMO;
  const config = alignmentConfig[data.alignment] ?? alignmentConfig.at;

  return (
    <CollapsibleSection icon={TrendingUp} title="Level Fit" iconClassName="text-white" iconBgClassName="bg-foreground">
      <div className="pt-1">
        <div className="space-y-3">
          <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-1.5", config.bg)}>
            <span className={cn("h-2 w-2 shrink-0 rounded-full", config.dot)} />
            <span className={cn("text-xs font-semibold", config.color)}>{config.label}</span>
            {data.confidence !== "high" && (
              <span className="text-muted-foreground text-[10px]">({data.confidence} confidence)</span>
            )}
          </div>
          <p className="text-foreground/70 text-[13px] leading-[1.75]">{data.strategy}</p>
        </div>
      </div>
    </CollapsibleSection>
  );
}
