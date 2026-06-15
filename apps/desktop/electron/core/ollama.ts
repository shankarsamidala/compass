import { config } from "./config";

/**
 * Minimal local Ollama client (BYO-LLM). Inference runs on the user's machine;
 * the app only executes prompts it fetched from career-ops — it never authors them.
 */
export interface OllamaChatResult {
  text: string;
}

export class OllamaError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

/** List installed Ollama models from a base URL (GET /api/tags → models[].name). */
export async function ollamaListModels(baseUrl: string): Promise<string[]> {
  const url = (baseUrl || "http://127.0.0.1:11434").replace("localhost", "127.0.0.1");
  try {
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return [];
    const data = (await res.json().catch(() => ({}))) as { models?: { name?: string }[] };
    return (data?.models ?? []).map((m) => m.name).filter((n): n is string => !!n);
  } catch {
    return [];
  }
}

export async function ollamaChat(
  system: string,
  user: string,
  opts: { model?: string; format?: unknown } = {},
): Promise<OllamaChatResult> {
  const model = opts.model ?? config.ollamaModel;
  let res: Response;
  try {
    res = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        options: { num_ctx: 8192 },
        ...(opts.format ? { format: opts.format } : {}),
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    throw new OllamaError(
      "Couldn't reach Ollama. Is it running? Start it with `ollama serve`.",
      "OLLAMA_UNREACHABLE",
    );
  }

  if (res.status === 404) {
    throw new OllamaError(`Model "${model}" isn't installed. Run \`ollama pull ${model}\`.`, "OLLAMA_MODEL_MISSING");
  }
  if (!res.ok) {
    throw new OllamaError(`Ollama returned an error (${res.status}).`, "OLLAMA_ERROR");
  }

  const json = (await res.json().catch(() => ({}))) as { message?: { content?: string } };
  return { text: (json?.message?.content ?? "").trim() };
}
