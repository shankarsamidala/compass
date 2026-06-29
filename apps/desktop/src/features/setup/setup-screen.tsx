import { useEffect, useState } from "react";
import { CornerDownLeft, ArrowUpRight } from "lucide-react";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileSyncIcon, CheckmarkBadge01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthLayout, openExternal } from "@/features/auth/auth-layout";
import { GrowthChart } from "./growth-chart";
import { api } from "@/lib/ipc";
import { cn } from "@/lib/utils";
import type { CliDetection } from "@compass/ipc-contract";

/**
 * First-run environment setup — a multi-step wizard on the shared AuthLayout.
 *   1. Environment — detected agent CLIs + the reinit-cli install.
 *   2. Agent mode — how autonomously the agent runs (maps to the agentTrusted flag).
 *   3. Security notice + data-use consents.
 * Optional; the last Next finishes setup.
 */
type AgentKey = "claude" | "codex" | "gemini" | "opencode" | "qwen";

/** Agent CLIs, each with an official install page and an optional recommended flag. */
const AGENTS: { key: AgentKey; label: string; url: string; recommended?: boolean }[] = [
  { key: "claude", label: "Claude Code", url: "https://docs.claude.com/en/docs/claude-code" },
  { key: "codex", label: "Codex", url: "https://github.com/openai/codex", recommended: true },
  { key: "gemini", label: "Gemini", url: "https://github.com/google-gemini/gemini-cli" },
  { key: "opencode", label: "OpenCode", url: "https://opencode.ai/docs" },
  { key: "qwen", label: "Qwen", url: "https://github.com/QwenLM/qwen-code" },
];
const RECOMMENDED_AGENT = AGENTS.find((a) => a.recommended)!;

const STEP_COUNT = 3;
const SECURITY_STEP = 2;

const NO_AGENTS: CliDetection = {
  claude: false, codex: false, gemini: false, opencode: false, qwen: false,
  copilot: false, node: false, npx: false, ollama: false,
};

/** Green accent overrides for the shadcn primitives (kept at their default size). */
const greenTab =
  "data-active:bg-teal-700 data-active:text-white! dark:data-active:bg-teal-700 dark:data-active:text-white! dark:data-active:border-teal-700";
const greenCheckbox =
  "data-checked:border-teal-700 data-checked:bg-teal-700 data-checked:text-white dark:data-checked:bg-teal-700";

function Row({
  title,
  description,
  control,
}: {
  title: string;
  description: React.ReactNode;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

/** Link out to an agent's official install page (we don't auto-install agents). */
function InstallGuide({ url }: { url: string }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(url)}
      className="inline-flex items-center gap-0.5 rounded-md bg-caution-soft px-2 py-1 text-xs font-medium text-caution transition-opacity hover:opacity-80"
    >
      Install guide
      <ArrowUpRight className="size-3" />
    </button>
  );
}

/** Step 1 — detected agent CLIs + the reinit-cli install. */
function EnvironmentStep() {
  const [extMode, setExtMode] = useState<"Recommended" | "Configure">("Recommended");
  const [det, setDet] = useState<CliDetection | null>(null);
  const [agents, setAgents] = useState<Record<AgentKey, boolean>>({
    claude: false, codex: false, gemini: false, opencode: false, qwen: false,
  });
  const [installCli, setInstallCli] = useState(true);

  useEffect(() => {
    api.cli.detect().then((r) => {
      const d = r.ok ? r.data : NO_AGENTS;
      setDet(d);
      // Pre-check every detected agent; missing ones stay off.
      setAgents(Object.fromEntries(AGENTS.map((a) => [a.key, d[a.key]])) as Record<AgentKey, boolean>);
    });
  }, []);

  const toggleAgent = (key: AgentKey) =>
    setAgents((prev) => ({ ...prev, [key]: !prev[key] }));

  // Check → kick off `npm i -g @reinit-ai/cli` in the background (never blocks).
  const onToggleCli = (checked: boolean) => {
    setInstallCli(checked);
    if (!checked) return;
    const id = toast.loading("Installing reinit-cli…");
    api.cli.installCli().then((r) => {
      if (r.ok) toast.success("reinit-cli installed", { id });
      else toast.error(r.error || "Couldn't install reinit-cli", { id });
    });
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Configure Your Environment</h1>
        <p className="text-sm text-muted-foreground">Connect REINIT to your terminal agents below.</p>
      </div>

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        <Row
          title="Agent CLIs"
          description="Pick the terminal agents REINIT can run. Detected ones are ready to connect."
          control={
            <Tabs value={extMode} onValueChange={(v) => setExtMode(v as "Recommended" | "Configure")}>
              <TabsList>
                <TabsTrigger value="Recommended" className={greenTab}>Recommended</TabsTrigger>
                <TabsTrigger value="Configure" className={greenTab}>Configure</TabsTrigger>
              </TabsList>
            </Tabs>
          }
        />

        {extMode === "Recommended" ? (
          // Recommended → just the recommended agent: ready if detected, else install help.
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{RECOMMENDED_AGENT.label}</span>
              <span className="rounded-md bg-teal-700 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-white">
                RECOMMENDED
              </span>
            </div>
            {!det ? (
              <span className="text-xs text-muted-foreground">Checking…</span>
            ) : det[RECOMMENDED_AGENT.key] ? (
              <HugeiconsIcon icon={CheckmarkBadge01Icon} size={22} className="text-teal-700" />
) : (
              <InstallGuide url={RECOMMENDED_AGENT.url} />
            )}
          </div>
        ) : (
          // Configure → all agents: detected ones are checkable, missing ones link to install.
          <div className="px-5 py-4">
            {det && !AGENTS.some((a) => det[a.key]) && (
              <p className="mb-3 text-xs text-muted-foreground">
                No agent CLI found yet — install one below so REINIT can run.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              {AGENTS.map(({ key, label, url }) => {
                const missing = !!det && !det[key];
                return missing ? (
                  <div key={key} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={false} disabled className={greenCheckbox} />
                    {label}
                    <button
                      type="button"
                      onClick={() => openExternal(url)}
                      title={`Install ${label}`}
                      className="text-caution transition-opacity hover:opacity-80"
                    >
                      <HugeiconsIcon icon={FileSyncIcon} size={16} />
                    </button>
                  </div>
                ) : (
                  <label key={key} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={agents[key]}
                      disabled={!det}
                      onCheckedChange={() => toggleAgent(key)}
                      className={greenCheckbox}
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <Row
          title="Command Line"
          description={
            <>
              Install the REINIT command line tool to run REINIT from your terminal with{" "}
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                reinit-cli
              </code>
              .
            </>
          }
          control={
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              Install
              <Checkbox
                checked={installCli}
                onCheckedChange={(v) => onToggleCli(v === true)}
                className={greenCheckbox}
              />
            </label>
          }
        />
      </div>
    </>
  );
}

/** What the user is here to do. Single-select; local-only for now (not persisted). */
const GOALS: { key: string; label: string }[] = [
  { key: "job", label: "Find a job" },
  { key: "recommend", label: "Get recommendations" },
  { key: "track", label: "Track applications" },
  { key: "profile", label: "Improve my CV" },
];

/** Step 2 — what the user wants out of REINIT, with the journey visual. */
function GoalStep() {
  const [goals, setGoals] = useState<string[]>([GOALS[0].key]);

  // Multi-select: toggle a goal and persist the new set (best-effort).
  const toggle = (key: string) =>
    setGoals((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      void api.onboarding.saveGoals(next); // step 2 → co-atlas
      return next;
    });

  return (
    <>
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">What brings you to REINIT?</h1>
        <p className="text-sm text-muted-foreground">Pick all that apply — we'll tailor your job search.</p>
      </div>

      <div className="mt-6 grid grid-cols-[1fr_1.05fr] items-stretch gap-6">
        <div className="space-y-3">
          {GOALS.map((g) => {
            const selected = goals.includes(g.key);
            return (
              <button
                key={g.key}
                type="button"
                onClick={() => toggle(g.key)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border bg-card px-4 py-4 text-left transition-colors",
                  selected
                    ? "border-teal-600 ring-1 ring-teal-600/40"
                    : "border-border hover:border-muted-foreground/40",
                )}
              >
                <Checkbox checked={selected} className={cn(greenCheckbox, "pointer-events-none")} />
                <span className="flex-1 text-sm font-semibold">{g.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex h-full flex-col">
          <div className="min-h-0 flex-1">
            <GrowthChart />
          </div>
          <p className="mt-2 text-center text-sm font-semibold text-foreground">Where you'll be in 45 days</p>
        </div>
      </div>
    </>
  );
}

/** A policy / external link rendered inline in the consent copy. */
function PolicyLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => openExternal(href)}
      className="text-blue-500 underline-offset-2 hover:underline"
    >
      {children}
    </button>
  );
}

/** Step 3 — security notice + data-use consents. State is lifted so the wizard
 * shell can gate Next on the Terms/Privacy agreement. */
function SecurityStep({
  agreeData,
  setAgreeData,
  agreeEmail,
  setAgreeEmail,
}: {
  agreeData: boolean;
  setAgreeData: (v: boolean) => void;
  agreeEmail: boolean;
  setAgreeEmail: (v: boolean) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Security Notice &amp; Data Use</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          AI coding agents are known to have certain security limitations. Be aware of potential
          risks, including data exfiltration and possible code execution. Avoid processing highly
          sensitive data and verify all the actions taken by the agent.
        </p>
      </div>

      <div className="mt-6 space-y-5 border-t border-border pt-6">
        <label className="flex cursor-pointer gap-3 text-sm leading-relaxed">
          <Checkbox
            checked={agreeData}
            onCheckedChange={(v) => setAgreeData(v === true)}
            className={cn(greenCheckbox, "mt-0.5")}
          />
          <span>
            Yes, I agree to help improve REINIT by allowing us to collect and use my interaction
            data, subject to the <PolicyLink href="https://reinit.in/terms">Terms of Service</PolicyLink>{" "}
            and <PolicyLink href="https://reinit.in/privacy">Privacy Policy</PolicyLink>. I understand
            I can opt out later anytime in my settings.
          </span>
        </label>

        <label className="flex cursor-pointer gap-3 text-sm leading-relaxed">
          <Checkbox
            checked={agreeEmail}
            onCheckedChange={(v) => setAgreeEmail(v === true)}
            className={cn(greenCheckbox, "mt-0.5")}
          />
          <span>Yes, I'd like to receive product updates, tips, and promotions from REINIT via email.</span>
        </label>
      </div>
    </>
  );
}

export function SetupScreen({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [agreeData, setAgreeData] = useState(true);
  const [agreeEmail, setAgreeEmail] = useState(false);
  const isLast = step === STEP_COUNT - 1;

  // Gate Next on the security step until Terms/Privacy is agreed to.
  const nextBlocked = step === SECURITY_STEP && !agreeData;

  const back = () => setStep((s) => Math.max(0, s - 1));
  const next = () => {
    if (!isLast) return setStep((s) => s + 1);
    // Step 3 → persist consents to co-atlas (best-effort) before finishing.
    void api.onboarding.saveConsent({ dataUse: agreeData, marketingEmail: agreeEmail });
    onComplete();
  };

  return (
    <AuthLayout maxWidthClass="max-w-2xl">
      {/* Fixed minimum height so every step reserves the same space — the footer
          and dots don't jump between a tall step and a short one. */}
      <div className="flex min-h-[360px] flex-col">
        <div className={cn(step !== 0 && "hidden")}>
          <EnvironmentStep />
        </div>
        <div className={cn(step !== 1 && "hidden")}>
          <GoalStep />
        </div>
        <div className={cn(step !== 2 && "hidden")}>
          <SecurityStep
            agreeData={agreeData}
            setAgreeData={setAgreeData}
            agreeEmail={agreeEmail}
            setAgreeEmail={setAgreeEmail}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 disabled:hover:text-muted-foreground"
        >
          Back
        </button>
        <Button
          onClick={next}
          disabled={nextBlocked}
          className="bg-teal-700 font-semibold text-white hover:bg-teal-600"
        >
          {isLast ? "Save & Continue" : "Next"}
          <CornerDownLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-10 flex justify-center gap-2">
        {Array.from({ length: STEP_COUNT }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-2 rounded-full transition-colors",
              i === step ? "bg-blue-500" : "bg-muted-foreground/30",
            )}
          />
        ))}
      </div>
    </AuthLayout>
  );
}
