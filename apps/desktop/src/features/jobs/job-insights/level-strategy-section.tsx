import { TrendingUp } from "lucide-react";
import { CollapsibleSection } from "./collapsible-section";
import type { Job } from "./job-types";

export interface LevelData {
  alignment: "above" | "at" | "below";
  confidence: "high" | "medium" | "low";
  strategy: string;
}

export function LevelStrategySection({ job: _job, data }: { job: Job; data: LevelData }) {
  return (
    <CollapsibleSection icon={TrendingUp} title="Level Fit" iconClassName="text-white" iconBgClassName="bg-foreground">
      <div className="pt-1">
        {data.strategy && <p className="text-foreground/70 text-[13px] leading-[1.75]">{data.strategy}</p>}
      </div>
    </CollapsibleSection>
  );
}
