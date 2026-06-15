import { settings } from "../core/settings";
import { ollamaListModels } from "../core/ollama";
import { ok, type Result, type AppSettings, type LlmProvider } from "@compass/ipc-contract";

/** Settings service — read/patch the app-local settings store + provider model discovery. */
export const settingsService = {
  async get(): Promise<Result<AppSettings>> {
    return ok(settings.get());
  },
  async update(patch: Partial<AppSettings>): Promise<Result<AppSettings>> {
    return ok(settings.update(patch));
  },
  async listModels(provider: LlmProvider, baseUrl?: string): Promise<Result<{ models: string[] }>> {
    if (provider === "ollama") {
      const url = baseUrl?.trim() || settings.get().llm.ollamaUrl;
      return ok({ models: await ollamaListModels(url) });
    }
    return ok({ models: [] });
  },
};
