/**
 * @compass/llm — the swappable LLM provider layer (ADR-0004).
 * Features call `provider.complete(...)`; never a specific backend. Providers
 * (ollama/groq/gemini-cli/codex-cli) implement this and normalize structured output.
 * Runs in the Electron main process. Populated when we wire the BYO-LLM features.
 */

export interface LlmCapabilities {
  json: boolean;
  streaming: boolean;
  contextWindow: number;
}

export interface LlmCompleteRequest {
  system: string;
  user: string;
  /** JSON schema for structured output (optional). */
  schema?: unknown;
  model?: string;
}

export interface LlmCompleteResult {
  text: string;
  json?: unknown;
}

export interface LlmProvider {
  id: string;
  label: string;
  tier: "bundled" | "local" | "cloud";
  capabilities: LlmCapabilities;
  isAvailable(): Promise<boolean>;
  complete(req: LlmCompleteRequest): Promise<LlmCompleteResult>;
}
