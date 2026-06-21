import { useEffect, useState } from "react";
import { Check, RefreshCw, Terminal, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/ipc";
import type { CliStatus } from "@compass/ipc-contract";

const INSTALL_CMDS = [
  "/plugin marketplace add reinit-ai/reinit",
  "/plugin install reinit@reinit",
  "/reload-plugins",
];

export function CliPanel() {
  const [status, setStatus] = useState<CliStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [manual, setManual] = useState(false);
  const [token, setToken] = useState("");

  const refresh = async () => {
    const r = await api.cli.status();
    if (r.ok) setStatus(r.data);
  };
  useEffect(() => { void refresh(); }, []);

  const configure = async () => {
    setBusy(true); setMsg(null);
    const r = await api.cli.configure();
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: `Connected — token ${r.data.tokenPrefix}… saved.` }); void refresh(); }
    else setMsg({ kind: "err", text: r.error });
  };

  const saveManual = async () => {
    setBusy(true); setMsg(null);
    const r = await api.cli.configureWithToken(token);
    setBusy(false);
    if (r.ok) { setMsg({ kind: "ok", text: "Token saved." }); setToken(""); setManual(false); void refresh(); }
    else setMsg({ kind: "err", text: r.error });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-md flex items-center gap-2 font-semibold text-foreground">
          <Terminal className="h-4 w-4" /> REINIT CLI
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect the <code>/reinit</code> skill in your terminal agent (Claude Code, Codex, Gemini…).
          This mints an API token and saves it to <code>~/.reinit</code> — no manual setup needed.
        </p>
      </div>

      {/* Status */}
      <div className="rounded-lg border border-border bg-card p-4">
        {status?.configured ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/15 text-green-600">
              <Check className="h-3.5 w-3.5" />
            </span>
            <span className="text-foreground">Connected</span>
            <span className="text-muted-foreground">· {status.apiUrl} · token {status.tokenPrefix}…</span>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Not configured yet.</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={configure} disabled={busy}>
          {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : null}
          {status?.configured ? "Re-generate token" : "Configure CLI"}
        </Button>
        <Button variant="outline" onClick={() => setManual((v) => !v)} disabled={busy}>
          Paste a token instead
        </Button>
      </div>

      {manual && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="reinit_…"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="max-w-md font-mono text-xs"
          />
          <Button onClick={saveManual} disabled={busy || !token.trim()}>Save</Button>
        </div>
      )}

      {msg && (
        <p className={`text-sm ${msg.kind === "ok" ? "text-green-600" : "text-destructive"}`}>{msg.text}</p>
      )}

      {/* Install instructions */}
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Then install the skill in your agent:</p>
        <div className="space-y-1 rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
          {INSTALL_CMDS.map((c) => (
            <div key={c} className="flex items-center justify-between gap-2">
              <span className="text-foreground">{c}</span>
              <button
                onClick={() => void navigator.clipboard.writeText(c)}
                className="text-muted-foreground hover:text-foreground"
                title="Copy"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          After installing, run <code>/reinit:reinit get-jobs</code> — the token from above is already set.
        </p>
      </div>
    </div>
  );
}
