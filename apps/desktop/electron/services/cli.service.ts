import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { homedir } from "node:os";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { authedFetch } from "../core/http";
import { config } from "../core/config";
import { claudeWarmAgent } from "./agent-session.service";
import { ok, err, type Result, type CliDetection, type CliInstallResult } from "@compass/ipc-contract";

const pexec = promisify(execFile);

/**
 * Is a binary on the user's PATH? GUI apps on macOS inherit a stripped PATH, so we
 * probe through a login shell (`-lic`) to pick up the user's real profile PATH.
 */
async function hasBin(bin: string): Promise<boolean> {
  try {
    if (process.platform === "win32") {
      await pexec("where", [bin], { timeout: 4000, windowsHide: true });
    } else {
      const shell = process.env.SHELL || "/bin/zsh";
      await pexec(shell, ["-lic", `command -v ${bin}`], { timeout: 5000 });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a command through a login shell, feeding `input` on stdin and capturing
 * stdout/stderr. Used for headless agent runs where the prompt is too large /
 * sensitive to pass as a shell argument. Login shell (`-lic`) restores the real
 * PATH that Electron's GUI process strips, so `claude`/`node` resolve.
 */
function runShellCapture(
  cmd: string,
  input: string,
  timeoutMs: number,
  onChunk?: (chunk: string) => void,
  cwd?: string,
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : process.env.SHELL || "/bin/zsh";
    const args = isWin ? ["/c", cmd] : ["-lic", cmd];
    const child = spawn(shell, args, { windowsHide: true, cwd });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Agent timed out"));
    }, timeoutMs);
    child.stdout.on("data", (d) => {
      const s = d.toString();
      stdout += s;
      onChunk?.(s);
    });
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("error", (e) => {
      clearTimeout(timer);
      reject(e);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code });
    });
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

/** Strip a leading/trailing ```json … ``` fence the model may wrap JSON in. */
function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}

/** Turn a Claude stream-json event into a short human-readable progress line. */
function summarizeReinitEvent(evt: any): string | null {
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

/**
 * CLI service (REIN-319) — one-click "Configure REINIT CLI". Mints a long-lived
 * API token via the authed `/tokens` endpoint and writes it to the shared
 * ~/.reinit workspace the skill reads, so `/reinit` works with no manual setup.
 */
const CONFIG_PATH = resolve(homedir(), ".reinit", "config", "reinit.json");

function readConfig(): Record<string, unknown> {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

function writeConfig(token: string): void {
  mkdirSync(dirname(CONFIG_PATH), { recursive: true });
  // Preserve other fields (e.g. agentTrusted) when (re)writing the token.
  const next = { ...readConfig(), token, apiUrl: config.apiUrl };
  writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n");
}

/** Whether the user has granted the agent permanent permission to run unattended. */
function agentTrusted(): boolean {
  return readConfig().agentTrusted === true;
}

export interface CliStatus {
  configured: boolean;
  apiUrl: string;
  tokenPrefix?: string;
  configPath: string;
}
export interface CliConfigured {
  tokenPrefix: string;
  apiUrl: string;
  configPath: string;
}

export const cliService = {
  /** Auto: mint a fresh API token for the logged-in user and write the config. */
  async configure(): Promise<Result<CliConfigured>> {
    const res = await authedFetch("/tokens", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Compass desktop" }),
    });
    if (!res) return err("Could not reach the server", "NETWORK");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return err(j?.error || "Could not create API token", j?.code);
    }
    const j = await res.json();
    try {
      writeConfig(j.token);
    } catch {
      return err(`Token created, but could not write ${CONFIG_PATH}`, "FS_WRITE");
    }
    return ok({ tokenPrefix: j.tokenPrefix, apiUrl: config.apiUrl, configPath: CONFIG_PATH });
  },

  /** Manual fallback: write a token the user pasted (e.g. issued elsewhere). */
  async configureWithToken(token: string): Promise<Result<CliConfigured>> {
    const t = (token ?? "").trim();
    if (!t) return err("Token is empty", "EMPTY");
    try {
      writeConfig(t);
    } catch {
      return err(`Could not write ${CONFIG_PATH}`, "FS_WRITE");
    }
    return ok({ tokenPrefix: t.slice(0, 14), apiUrl: config.apiUrl, configPath: CONFIG_PATH });
  },

  /** Current state of ~/.reinit/config (for the UI to show connected/not). */
  async status(): Promise<Result<CliStatus>> {
    try {
      const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
      const token = typeof raw.token === "string" ? raw.token : "";
      return ok({
        configured: Boolean(token),
        apiUrl: raw.apiUrl || config.apiUrl,
        tokenPrefix: token ? token.slice(0, 14) : undefined,
        configPath: CONFIG_PATH,
      });
    } catch {
      return ok({ configured: false, apiUrl: config.apiUrl, configPath: CONFIG_PATH });
    }
  },

  /** Probe PATH for installed agent CLIs / tools (Claude → plugin, others → npx). */
  async detect(): Promise<Result<CliDetection>> {
    const [claude, codex, gemini, copilot, node, npx, ollama] = await Promise.all([
      hasBin("claude"),
      hasBin("codex"),
      hasBin("gemini"),
      hasBin("copilot"),
      hasBin("node"),
      hasBin("npx"),
      hasBin("ollama"),
    ]);
    return ok({ claude, codex, gemini, copilot, node, npx, ollama });
  },

  /** One-click install of the /reinit skill into non-Claude CLIs via npx. */
  async install(): Promise<Result<CliInstallResult>> {
    try {
      let stdout = "", stderr = "";
      if (process.platform === "win32") {
        ({ stdout, stderr } = await pexec("npx", ["-y", "@reinit-ai/cli", "install"], { timeout: 180000, windowsHide: true }));
      } else {
        const shell = process.env.SHELL || "/bin/zsh";
        ({ stdout, stderr } = await pexec(shell, ["-lic", "npx -y @reinit-ai/cli install"], { timeout: 180000 }));
      }
      return ok({ output: `${stdout}${stderr}`.trim() });
    } catch (e) {
      const m = e as { stderr?: string; message?: string };
      return err(m.stderr?.trim() || m.message || "Install failed", "INSTALL_FAILED");
    }
  },

  /**
   * BYO-agent inference: run a prompt headless on the user's detected agent CLI
   * (`claude -p`, reading the prompt from stdin) and return the model's text.
   * Uses the user's own Claude quota — no server, no API key from us. Callers
   * fall back to local Ollama if this returns an error.
   */
  async runAgent(prompt: string): Promise<Result<{ text: string }>> {
    if (!(await hasBin("claude"))) return err("No agent CLI detected", "NO_AGENT");
    try {
      const { stdout, stderr, code } = await runShellCapture(
        "claude -p --output-format json",
        prompt,
        120000,
      );
      if (code !== 0 && !stdout.trim()) {
        return err(stderr.trim() || "Agent run failed", "AGENT_FAILED");
      }
      // `--output-format json` wraps the reply: { type, subtype, result, ... }.
      // A login shell can prepend MOTD/profile noise to stdout, so isolate the
      // envelope object (first '{' … last '}') before parsing.
      let text = stdout;
      const s = stdout.indexOf("{");
      const e = stdout.lastIndexOf("}");
      const envelope = s !== -1 && e > s ? stdout.slice(s, e + 1) : stdout;
      try {
        const env = JSON.parse(envelope) as { result?: unknown };
        if (typeof env.result === "string") text = env.result;
      } catch {
        /* not the envelope — treat stdout as the raw reply */
      }
      text = stripFences(text);
      if (!text) return err("Agent returned nothing", "AGENT_EMPTY");
      return ok({ text });
    } catch (e) {
      return err(e instanceof Error ? e.message : "Agent run failed", "AGENT_FAILED");
    }
  },

  /**
   * Run the reinit SKILL headless via `claude -p` and return its result text.
   * Unattended but BOUNDED — auto-accepts edits and allowlists the tools the skill
   * needs (no permission prompts), without a blanket `--dangerously-skip-permissions`.
   * The prompt (slash command + any JD) is fed on stdin so large/quoted JD text is
   * safe. Long timeout — evaluations are web-grounded and multi-step.
   */
  async runReinit(
    prompt: string,
    opts: { timeoutMs?: number; onProgress?: (line: string) => void } = {},
  ): Promise<Result<{ result: string }>> {
    if (!(await hasBin("claude"))) return err("Claude Code not found — install it to run REINIT.", "NO_AGENT");

    // Fast path: reuse the warm session if it's up (MCP already booted → instant).
    // Falls through to the cold spawn below if the warm agent isn't ready or errors.
    if (claudeWarmAgent.isReady()) {
      try {
        const result = await claudeWarmAgent.sendTurn(prompt, {
          onProgress: opts.onProgress,
          timeoutMs: opts.timeoutMs,
        });
        return ok({ result: result.trim() });
      } catch (e) {
        console.warn("[reinit] warm session failed, falling back to cold run:", e);
        // fall through to cold path
      }
    }
    // Bounded allowlist: the skill reads/writes ~/.reinit, runs its scripts, and
    // web-grounds D/G. MCP tools from the reinit plugin are namespaced mcp__reinit__*.
    // Once the user grants permanent permission, run fully unattended (matches an
    // interactive terminal session). Until then, stay bounded with an allowlist.
    const perms = agentTrusted()
      ? "--dangerously-skip-permissions"
      : `--permission-mode acceptEdits --allowedTools ${JSON.stringify("Read Write Edit Bash Glob Grep WebFetch WebSearch mcp__reinit")}`;
    // stream-json emits one event per line as the agent works → we can log live
    // progress (visible in the dev terminal) and forward it to callers/UI later.
    const cmd = `claude -p --output-format stream-json --verbose ${perms}`;
    let buffer = "";
    let result = "";
    let isError = false;
    const onChunk = (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const evt = JSON.parse(line);
          const summary = summarizeReinitEvent(evt);
          if (summary) console.log("[reinit]", summary);
          if (evt?.type === "result") {
            if (typeof evt.result === "string") result = evt.result;
            isError = Boolean(evt.is_error);
          }
          opts.onProgress?.(summary ?? "");
        } catch {
          /* partial / non-JSON line — ignore */
        }
      }
    };
    // Run INSIDE the reinit workspace so the skill finds config/, cv.md, jds/,
    // reports/ in cwd instead of scanning the filesystem.
    const workspace = resolve(homedir(), ".reinit");
    try {
      console.log("[reinit] starting run… cwd:", workspace);
      const { stderr, code } = await runShellCapture(cmd, prompt, opts.timeoutMs ?? 600000, onChunk, workspace);
      if (isError) return err(result.slice(0, 400) || "Skill reported an error", "SKILL_ERROR");
      if (!result && code !== 0) return err(stderr.trim() || "Skill run failed", "SKILL_FAILED");
      return ok({ result: result.trim() });
    } catch (e) {
      return err(e instanceof Error ? e.message : "Skill run failed", "SKILL_FAILED");
    }
  },

  /** Has the user granted the agent permanent permission to run unattended? */
  async isAgentTrusted(): Promise<Result<{ trusted: boolean }>> {
    return ok({ trusted: agentTrusted() });
  },

  /** Grant permanent permission — future skill runs go fully unattended. */
  async trustAgent(): Promise<Result<void>> {
    try {
      mkdirSync(dirname(CONFIG_PATH), { recursive: true });
      writeFileSync(CONFIG_PATH, JSON.stringify({ ...readConfig(), agentTrusted: true }, null, 2) + "\n");
      return ok(undefined);
    } catch {
      return err(`Could not write ${CONFIG_PATH}`, "FS_WRITE");
    }
  },
};
