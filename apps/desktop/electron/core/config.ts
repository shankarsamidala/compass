import { z } from "zod";

/**
 * Runtime config, zod-validated (fails fast on bad values). The career-ops API
 * base URL — hosted default; override with COMPASS_API_URL for self-host/localhost.
 */
const schema = z.object({
  apiUrl: z.string().url(),
  ollamaUrl: z.string().url(),
  ollamaModel: z.string().min(1),
});

export const config = schema.parse({
  apiUrl: process.env.COMPASS_API_URL ?? "http://127.0.0.1:3000",
  // BYO-LLM: local inference endpoint + default model (user-overridable).
  ollamaUrl: process.env.OLLAMA_URL ?? "http://127.0.0.1:11434",
  ollamaModel: process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct",
});
