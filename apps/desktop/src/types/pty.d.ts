export interface AgentStatus {
  id: "claude" | "gemini" | "copilot";
  label: string;
  available: boolean;
  path?: string;
}

interface PtyBridge {
  detect(): Promise<AgentStatus[]>;
  spawn(agentId: string, cols: number, rows: number): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  onData(cb: (data: string) => void): () => void;
  onExit(cb: (code: number) => void): () => void;
}

declare global {
  interface Window {
    pty: PtyBridge;
  }
}
