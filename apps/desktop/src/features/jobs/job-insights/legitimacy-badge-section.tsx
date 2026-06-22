import { Shield, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";
import type { Job } from "./job-types";

function parsePostingAgeDays(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.toLowerCase().trim();
  if (s === "today" || s === "just now" || s === "a few seconds ago") return 0;
  const num = (pattern: RegExp) => {
    const m = s.match(pattern);
    return m ? parseInt(m[1], 10) : null;
  };
  const hours = num(/(\d+)\s*h(?:ou?r?s?)?\s*ago/);
  if (hours !== null) return Math.floor(hours / 24);
  const days = num(/(\d+)\+?\s*days?\s*ago/);
  if (days !== null) return days;
  const weeks = num(/(\d+)\s*weeks?\s*ago/);
  if (weeks !== null) return weeks * 7;
  if (s.includes("month")) {
    const months = num(/(\d+)\s*months?\s*ago/) ?? 1;
    return months * 30;
  }
  if (s.includes("year")) {
    const years = num(/(\d+)\s*years?\s*ago/) ?? 1;
    return years * 365;
  }
  return null;
}

type SignalResult = { label: string; detail: string; weight: "high" | "medium" | "low"; score: number };

function computeSignals(job: Job): SignalResult[] {
  const signals: SignalResult[] = [];

  const ageDays = parsePostingAgeDays(job.posted_raw);
  if (ageDays === null) {
    signals.push({ label: "Posting date", detail: "Date not available", weight: "high", score: 0 });
  } else if (ageDays <= 1) {
    signals.push({ label: "Posting age", detail: "Posted today", weight: "high", score: 3 });
  } else if (ageDays <= 14) {
    signals.push({ label: "Posting age", detail: `Posted ${ageDays} days ago`, weight: "high", score: 3 });
  } else if (ageDays <= 30) {
    signals.push({ label: "Posting age", detail: `Posted ${ageDays} days ago`, weight: "high", score: 2 });
  } else if (ageDays <= 60) {
    signals.push({ label: "Posting age", detail: `Posted ${ageDays} days ago - getting old`, weight: "high", score: 0 });
  } else {
    signals.push({ label: "Posting age", detail: `Posted ${ageDays}+ days ago - may be filled`, weight: "high", score: -2 });
  }

  const skillCount = (job.key_skills?.length ?? 0) + (job.tech_stack?.length ?? 0);
  if (skillCount >= 5) {
    signals.push({ label: "JD specificity", detail: `${skillCount} skills/tools listed - specific JD`, weight: "medium", score: 2 });
  } else if (skillCount >= 2) {
    signals.push({ label: "JD specificity", detail: `${skillCount} skills listed - partially specific`, weight: "medium", score: 1 });
  } else {
    signals.push({ label: "JD specificity", detail: "No skills listed - vague JD", weight: "medium", score: -1 });
  }

  const hasReqs = (job.requirements?.length ?? 0) > 0 || (job.responsibilities?.length ?? 0) > 0;
  const expSpan = job.exp_min != null && job.exp_max != null ? job.exp_max - job.exp_min : null;
  const contradictory = expSpan !== null && expSpan > 10;
  if (contradictory) {
    signals.push({ label: "Requirements", detail: `Exp range ${job.exp_min}–${job.exp_max} yrs is unrealistic`, weight: "medium", score: -1 });
  } else if (hasReqs) {
    signals.push({ label: "Requirements", detail: "Responsibilities and requirements listed", weight: "medium", score: 1 });
  } else {
    signals.push({ label: "Requirements", detail: "No responsibilities or requirements listed", weight: "medium", score: 0 });
  }

  const src = job.source?.toLowerCase() ?? "";
  signals.push({ label: "Source", detail: src ? `Scraped from ${job.source}` : "Source unknown", weight: "low", score: 0 });

  if (job.salary_disclosed && job.salary_min != null) {
    signals.push({ label: "Salary", detail: "Salary range disclosed", weight: "low", score: 1 });
  } else {
    signals.push({ label: "Salary", detail: "Salary not disclosed", weight: "low", score: 0 });
  }

  return signals;
}

type Tier = "high_confidence" | "caution" | "suspicious";

function classifyTier(signals: SignalResult[]): Tier {
  const total = signals.reduce((sum, s) => sum + s.score, 0);
  const negativeCount = signals.filter((s) => s.score < 0).length;
  if (total >= 4) return "high_confidence";
  if (negativeCount >= 2) return "suspicious";
  if (total >= 1) return "caution";
  return "suspicious";
}

const tierConfig = {
  high_confidence: { label: "Active Posting", description: "Signals suggest this is a real, active opening.", icon: ShieldCheck, color: "text-brand", bg: "border-surface-border bg-background", iconColor: "text-brand" },
  caution: { label: "Check Before Applying", description: "Mixed signals - verify the posting is still active.", icon: ShieldAlert, color: "text-amber-600 dark:text-amber-400", bg: "border-surface-border bg-background", iconColor: "text-amber-500" },
  suspicious: { label: "Possible Ghost Job", description: "Multiple signals point to an inactive or ghost posting.", icon: ShieldX, color: "text-destructive", bg: "border-surface-border bg-background", iconColor: "text-destructive" },
} as const;

const signalDotColor = (score: number) => {
  if (score > 0) return "bg-brand";
  if (score < 0) return "bg-destructive";
  return "bg-muted-foreground/40";
};

// Map an ofertas legitimacy string → tier.
export function legitimacyToTier(s?: string | null): Tier | null {
  if (!s) return null;
  const t = s.toLowerCase();
  if (t.includes("high")) return "high_confidence";
  if (t.includes("caution")) return "caution";
  if (t.includes("suspicious")) return "suspicious";
  return null;
}

export function LegitimacyBadgeSection({ job, tier: tierOverride }: { job: Job; tier?: Tier | null }) {
  const signals = computeSignals(job);
  const tier = tierOverride ?? classifyTier(signals);
  const config = tierConfig[tier];
  const Icon = config.icon;

  return (
    <CollapsibleSection icon={Shield} title="Posting Legitimacy" iconClassName="text-white" iconBgClassName="bg-foreground" defaultOpen={tier !== "high_confidence"}>
      <div className="space-y-3 pt-1">
        <div className={cn("flex items-start gap-2.5 rounded-xl border p-3", config.bg)}>
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", config.iconColor)} />
          <div>
            <p className={cn("text-xs font-semibold", config.color)}>{config.label}</p>
            <p className="text-muted-foreground mt-0.5 text-[11px] leading-relaxed">{config.description}</p>
          </div>
        </div>
        <div className="space-y-2">
          {signals.map((signal) => (
            <div key={signal.label} className="flex items-start gap-2.5">
              <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", signalDotColor(signal.score))} />
              <div className="min-w-0">
                <span className="text-foreground/60 text-[11px] font-medium">{signal.label}: </span>
                <span className="text-muted-foreground text-[11px]">{signal.detail}</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground text-[10px] leading-relaxed">
          Based on posting age, JD quality, source, and requirements. Apply button liveness check coming soon.
        </p>
      </div>
    </CollapsibleSection>
  );
}
