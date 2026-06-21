import { useEffect, useState, type ReactNode } from "react";
import { Loader2, Check, Copy, Terminal, Sparkles, User, Cpu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/auth-layout";
import { useSession } from "@/features/auth/api";
import { api } from "@/lib/ipc";
import type { CliDetection } from "@compass/ipc-contract";

/**
 * First-run environment setup. Same shell + components as auth/onboarding (nova).
 * Shows the account + detected agent CLIs with the right path — Claude → copy the
 * plugin commands, others → npx, plus local Ollama. Fully optional; Continue works.
 */
const CLAUDE_STEPS = [
  { label: "Add the marketplace", cmd: "/plugin marketplace add reinit-ai/reinit" },
  { label: "Install the plugin", cmd: "/plugin install reinit@reinit" },
];

function Row({
  icon,
  name,
  sub,
  chip,
  ok,
}: {
  icon: ReactNode;
  name: string;
  sub: string;
  chip: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium">
          {name}
          <span
            className={
              ok
                ? "rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-500"
                : "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            }
          >
            {chip}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

export function SetupScreen({ onComplete }: { onComplete: () => void }) {
  const { data } = useSession();
  const email = data?.ok ? data.data.user.email : "you@example.com";

  const [det, setDet] = useState<CliDetection | null>(null);
  const [copied, setCopied] = useState<number | null>(null);

  useEffect(() => {
    api.cli.detect().then((r) =>
      setDet(
        r.ok
          ? r.data
          : { claude: false, codex: false, gemini: false, copilot: false, node: false, npx: false, ollama: false },
      ),
    );
  }, []);

  const npxAgents = det
    ? (["Codex", "Gemini", "Copilot"] as const).filter((n) => det[n.toLowerCase() as keyof CliDetection])
    : [];

  const copyOne = (cmd: string, i: number) => {
    navigator.clipboard?.writeText(cmd);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <AuthLayout maxWidthClass="max-w-lg">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-xl font-bold">Set up your environment</h1>
        <p className="text-sm text-muted-foreground">
          Optional — connect REINIT to your terminal agent. You can skip and do this anytime in Settings.
        </p>
      </div>

      {!det ? (
        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your environment…
        </div>
      ) : (
        <>
          <div className="mt-6 divide-y divide-border overflow-hidden rounded-xl border border-border bg-card/40">
            <Row icon={<User className="h-4 w-4" />} name="Account" sub={email} chip="Signed in" ok />

            <Row
              icon={<Sparkles className="h-4 w-4" />}
              name="Claude Code"
              sub={det.claude ? "Install the /reinit plugin (below)" : "Not installed on this machine"}
              chip={det.claude ? "Detected" : "Not found"}
              ok={det.claude}
            />

            <Row
              icon={<Terminal className="h-4 w-4" />}
              name="Terminal CLI"
              sub={npxAgents.length ? `Detected: ${npxAgents.join(", ")} · npx @reinit-ai/cli install` : "Codex · Gemini · Copilot"}
              chip={npxAgents.length ? "Detected" : "Not found"}
              ok={npxAgents.length > 0}
            />

            <Row
              icon={<Cpu className="h-4 w-4" />}
              name="Ollama"
              sub={det.ollama ? "Local AI — ready for in-app suggestions" : "Not running — optional, for local AI"}
              chip={det.ollama ? "Detected" : "Not found"}
              ok={det.ollama}
            />
          </div>

          {/* Claude plugin commands — labelled, each copyable */}
          {det.claude && (
            <div className="mt-3 space-y-2 rounded-lg border border-border bg-muted/40 p-3">
              {CLAUDE_STEPS.map((s, i) => (
                <div key={s.cmd} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
                    <code className="block truncate font-mono text-xs text-foreground">{s.cmd}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyOne(s.cmd, i)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={`Copy: ${s.label}`}
                  >
                    {copied === i ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Action */}
      <div className="mt-5 flex justify-end">
        <Button onClick={onComplete} className="bg-brand font-semibold text-brand-foreground hover:bg-brand-hover">
          Continue →
        </Button>
      </div>
    </AuthLayout>
  );
}
