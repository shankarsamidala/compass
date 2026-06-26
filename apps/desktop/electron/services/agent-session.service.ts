import { spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { homedir } from "node:os";

/**
 * Warm Claude session.
 *
 * The expensive part of `claude -p` is COLD START: every invocation spawns a
 * process, loads config/auth, BOOTS the reinit MCP plugin, and discovers the
 * skill — several seconds before any work happens. An interactive terminal
 * feels fast because it pays that once and keeps the session warm.
 *
 * This service replicates that warmth WITHOUT node-pty: it runs ONE long-lived
 * `claude` process in stream-json input mode, so MCP boots once and every turn
 * after that is instant. Turns are serialized (one session = one turn at a time)
 * and parsed from the stream-json event log, same shape `runReinit` already uses.
 */

const WORKSPACE = resolve(homedir(), ".reinit");
const CONFIG_PATH = resolve(WORKSPACE, "config", "reinit.json");

/** Mirror cli.service: has the user granted unattended permission? */
function agentTrusted(): boolean {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8")).agentTrusted === true;
  } catch {
    return false;
  }
}

/** Turn a stream-json event into a short progress line (mirrors cli.service). */
function summarize(evt: any): string | null {
  if (evt?.type === "system" && evt?.subtype === "init") return "session started";
  if (evt?.type === "assistant") {
    const out: string[] = [];
    for (const p of evt.message?.content ?? []) {
      if (p.type === "text" && p.text?.trim()) out.push(p.text.trim().slice(0, 240));
      else if (p.type === "tool_use") {
        const detail = p.input?.command || p.input?.description || p.input?.file_path || "";
        out.push(`▸ ${p.name}${detail ? `: ${String(detail).slice(0, 160)}` : ""}`);
      }
    }
    return out.join("\n") || null;
  }
  if (evt?.type === "result") return `✓ finished (${evt.subtype ?? "done"})`;
  return null;
}

interface PendingTurn {
  resolve: (result: string) => void;
  reject: (err: Error) => void;
  onProgress?: (line: string) => void;
  result: string;
  isError: boolean;
  timer: NodeJS.Timeout;
}

type State = "idle" | "starting" | "ready" | "dead";

class ClaudeWarmAgent {
  private child: ChildProcess | null = null;
  private state: State = "idle";
  private startPromise: Promise<void> | null = null;
  private lineBuf = "";
  /** Serialize turns: each sendTurn waits for the previous to settle. */
  private chain: Promise<unknown> = Promise.resolve();
  private current: PendingTurn | null = null;

  isReady(): boolean {
    return this.state === "ready" && !!this.child && !this.child.killed;
  }

  /** Spawn the long-lived session and resolve once MCP/skill are booted. */
  start(): Promise<void> {
    if (this.isReady()) return Promise.resolve();
    if (this.startPromise) return this.startPromise;

    this.state = "starting";
    this.startPromise = new Promise<void>((resolveStart, rejectStart) => {
      const perms = agentTrusted()
        ? "--dangerously-skip-permissions"
        : `--permission-mode acceptEdits --allowedTools ${JSON.stringify("Read Write Edit Bash Glob Grep WebFetch WebSearch mcp__reinit")}`;
      // Print + streaming I/O = persistent multi-turn session over stdin.
      const cmd = `claude -p --input-format stream-json --output-format stream-json --verbose ${perms}`;

      const isWin = process.platform === "win32";
      const shell = isWin ? "cmd.exe" : process.env.SHELL || "/bin/zsh";
      const args = isWin ? ["/c", cmd] : ["-lic", cmd];

      console.log("[warm-agent] starting…");
      const child = spawn(shell, args, { cwd: WORKSPACE, windowsHide: true });
      this.child = child;

      let settled = false;
      // Safety net only — the process should spawn near-instantly. If it can't
      // even spawn (binary missing / shell error) within this window, bail.
      const spawnTimer = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.kill();
          rejectStart(new Error("Warm agent failed to spawn in time"));
        }
      }, 15000);

      // Ready = process is up and stdin is writable. We DON'T wait for a
      // `system/init` event: in stream-json input mode claude stays silent until
      // it receives the first message, so waiting for init here would deadlock.
      // MCP boots on the first real turn and stays warm for every turn after.
      child.once("spawn", () => {
        if (settled) return;
        settled = true;
        clearTimeout(spawnTimer);
        this.state = "ready";
        console.log("[warm-agent] ready (process up — MCP warms on first turn)");
        resolveStart();
      });

      child.stdout?.on("data", (d: Buffer) => {
        this.lineBuf += d.toString();
        let nl: number;
        while ((nl = this.lineBuf.indexOf("\n")) !== -1) {
          const line = this.lineBuf.slice(0, nl).trim();
          this.lineBuf = this.lineBuf.slice(nl + 1);
          if (!line) continue;
          let evt: any;
          try {
            evt = JSON.parse(line);
          } catch {
            continue; // login-shell noise / partial line
          }
          this.handleEvent(evt);
        }
      });

      child.stderr?.on("data", (d: Buffer) => {
        const s = d.toString().trim();
        if (s) console.error("[warm-agent:stderr]", s.slice(0, 300));
      });

      child.on("error", (e) => {
        clearTimeout(spawnTimer);
        this.state = "dead";
        if (!settled) { settled = true; rejectStart(e); }
        this.failCurrent(e);
      });

      child.on("close", (code) => {
        clearTimeout(spawnTimer);
        this.state = "dead";
        this.child = null;
        console.log("[warm-agent] closed", code);
        if (!settled) { settled = true; rejectStart(new Error(`Warm agent exited before ready (code ${code})`)); }
        this.failCurrent(new Error(`Warm agent exited (code ${code})`));
      });
    }).finally(() => {
      this.startPromise = null;
    });

    return this.startPromise;
  }

  /** Route a single stream-json event to the in-flight turn. */
  private handleEvent(evt: any): void {
    const turn = this.current;
    const summary = summarize(evt);
    if (summary) console.log("[warm-agent]", summary);
    if (!turn) return;
    if (summary) turn.onProgress?.(summary);
    if (evt?.type === "result") {
      if (typeof evt.result === "string") turn.result = evt.result;
      turn.isError = Boolean(evt.is_error);
      // Settle this turn — the session stays alive for the next one.
      clearTimeout(turn.timer);
      this.current = null;
      if (turn.isError) turn.reject(new Error(turn.result.slice(0, 400) || "Skill reported an error"));
      else turn.resolve(turn.result.trim());
    }
  }

  private failCurrent(e: Error): void {
    const turn = this.current;
    if (turn) {
      clearTimeout(turn.timer);
      this.current = null;
      turn.reject(e);
    }
  }

  /**
   * Send one user turn into the warm session and resolve with its result text.
   * Turns are queued so the session only ever processes one at a time.
   */
  sendTurn(prompt: string, opts: { onProgress?: (line: string) => void; timeoutMs?: number } = {}): Promise<string> {
    const run = async (): Promise<string> => {
      if (!this.isReady()) await this.start();
      if (!this.child?.stdin) throw new Error("Warm agent not available");

      return new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.current = null;
          reject(new Error("Turn timed out"));
        }, opts.timeoutMs ?? 600000);

        this.current = { resolve, reject, onProgress: opts.onProgress, result: "", isError: false, timer };

        // stream-json user message envelope.
        const msg = {
          type: "user",
          message: { role: "user", content: [{ type: "text", text: prompt }] },
        };
        this.child!.stdin!.write(JSON.stringify(msg) + "\n");
      });
    };

    // Chain so turns never overlap; swallow prior errors so one bad turn
    // doesn't poison the queue.
    const next = this.chain.then(run, run);
    this.chain = next.catch(() => undefined);
    return next;
  }

  kill(): void {
    this.state = "dead";
    if (this.child) {
      try {
        this.child.kill("SIGKILL");
      } catch {
        /* already dead */
      }
      this.child = null;
    }
  }
}

export const claudeWarmAgent = new ClaudeWarmAgent();
