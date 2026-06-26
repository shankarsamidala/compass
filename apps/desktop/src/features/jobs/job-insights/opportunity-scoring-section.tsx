import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";
import type { Job } from "./job-types";

// Static demo data (the live version uses a server action / LLM).
const DEMO = {
  overall_score: 0.82,
  dimensions: [
    { name: "north_star_alignment", score: 0.9, reason: "Closely matches your DevOps/SRE target track." },
    { name: "cv_match", score: 0.84, reason: "Strong overlap on Kubernetes, Terraform, CI/CD." },
    { name: "level_fit", score: 0.8, reason: "Right seniority band for your experience." },
    { name: "growth_trajectory", score: 0.75, reason: "Clear path toward staff/platform lead." },
    { name: "remote_quality", score: 0.6, reason: "Hybrid — some in-office expectation." },
    { name: "tech_stack_modernity", score: 0.85, reason: "Modern cloud-native stack, IaC-first." },
    { name: "cultural_signals", score: 0.7, reason: "Engineering-led, reliability culture." },
  ],
};

const DIMENSION_LABELS: Record<string, string> = {
  north_star_alignment: "North Star Alignment",
  cv_match: "CV Match",
  level_fit: "Level Fit",
  growth_trajectory: "Growth Trajectory",
  remote_quality: "Remote Quality",
  tech_stack_modernity: "Tech Stack",
  cultural_signals: "Culture Signals",
};

function scoreColor(score: number) {
  if (score >= 0.7) return "bg-foreground";
  if (score >= 0.5) return "bg-foreground/55";
  return "bg-foreground/25";
}
function scoreTextColor(score: number) {
  if (score >= 0.7) return "text-foreground";
  if (score >= 0.5) return "text-foreground/70";
  return "text-muted-foreground";
}

function OverallBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const label = score >= 0.7 ? "Strong Opportunity" : score >= 0.5 ? "Moderate Opportunity" : "Weak Opportunity";
  return (
    <div className="border-surface-border bg-background flex items-center gap-3 rounded-xl border p-3">
      <div className="text-brand text-2xl leading-none font-bold tabular-nums">{pct}%</div>
      <div>
        <p className={cn("text-xs font-semibold", scoreTextColor(score))}>{label}</p>
        <p className="text-muted-foreground mt-0.5 text-[11px]">Across 7 career dimensions</p>
      </div>
    </div>
  );
}

function DimensionRow({ name, score, reason }: { name: string; score: number; reason?: string }) {
  const label = DIMENSION_LABELS[name] ?? name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const pct = Math.round(score * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-foreground/70 text-[11px] font-medium">{label}</span>
        <span className="text-brand text-[11px] font-semibold tabular-nums">{pct}%</span>
      </div>
      <div className="bg-surface-raised h-1.5 w-full overflow-hidden rounded-full">
        <div className={cn("h-full rounded-full transition-all duration-500", scoreColor(score))} style={{ width: `${pct}%` }} />
      </div>
      {reason && <p className="text-muted-foreground text-[10px] leading-relaxed">{reason}</p>}
    </div>
  );
}

export interface OpportunityData {
  overall_score: number;
  dimensions: { name: string; score: number; reason?: string }[];
}

export function OpportunityScoringSection({ job: _job, data: override }: { job: Job; data?: OpportunityData | null }) {
  const data = override ?? DEMO;
  return (
    <CollapsibleSection icon={Zap} title="Opportunity Score" iconClassName="text-bg-elevated" iconBgClassName="bg-foreground">
      <div className="pt-1">
        <div className="space-y-4">
          <OverallBadge score={data.overall_score} />
          <div className="space-y-3">
            {data.dimensions.map((dim) => (
              <DimensionRow key={dim.name} name={dim.name} score={dim.score} reason={dim.reason} />
            ))}
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
}
