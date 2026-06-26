import * as pty from "node-pty";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";

const execFileAsync = promisify(execFile);

export type AgentId = "claude" | "gemini" | "copilot";

interface AgentMeta {
  id: AgentId;
  label: string;
  bin: string;
  args: string[];
}

const AGENTS: AgentMeta[] = [
  { id: "claude",  label: "Claude",  bin: "claude",  args: [] },
  { id: "gemini",  label: "Gemini",  bin: "gemini",  args: [] },
  { id: "copilot", label: "Copilot", bin: "gh",      args: ["copilot", "suggest"] },
];

export interface AgentStatus {
  id: AgentId;
  label: string;
  available: boolean;
  path?: string;
}

async function which(bin: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("which", [bin], { env: process.env });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

class PtyService {
  private instance: pty.IPty | null = null;
  private dataListeners: Array<(data: string) => void> = [];
  private exitListeners: Array<(code: number) => void> = [];

  async detectAgents(): Promise<AgentStatus[]> {
    return Promise.all(
      AGENTS.map(async (a) => {
        const p = await which(a.bin);
        return { id: a.id, label: a.label, available: !!p, path: p ?? undefined };
      }),
    );
  }

  spawn(_agentId: AgentId, cols: number, rows: number): void {
    this.kill();

    const shell = os.platform() === "win32" ? "cmd.exe" : (process.env.SHELL ?? "/bin/zsh");

    this.instance = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd: os.homedir(),
      env: process.env as Record<string, string>,
    });

    this.instance.onData((data) => {
      for (const fn of this.dataListeners) fn(data);
    });

    this.instance.onExit(({ exitCode }) => {
      for (const fn of this.exitListeners) fn(exitCode ?? 0);
      this.instance = null;
    });

    // Shell is ready — UI sends the agent command via write() when user clicks Run
  }

  write(data: string): void {
    this.instance?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.instance?.resize(cols, rows);
  }

  kill(): void {
    if (this.instance) {
      try { this.instance.kill(); } catch { /* already dead */ }
      this.instance = null;
    }
  }

  onData(fn: (data: string) => void): () => void {
    this.dataListeners.push(fn);
    return () => { this.dataListeners = this.dataListeners.filter((f) => f !== fn); };
  }

  onExit(fn: (code: number) => void): () => void {
    this.exitListeners.push(fn);
    return () => { this.exitListeners = this.exitListeners.filter((f) => f !== fn); };
  }
}

export const ptyService = new PtyService();
