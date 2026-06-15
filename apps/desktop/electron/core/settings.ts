import { app } from "electron";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { config } from "./config";
import type { AppSettings } from "@compass/ipc-contract";

/**
 * App-local settings store (non-secret). Plain JSON in userData. LLM endpoint
 * defaults come from core/config (env) so a fresh install works out of the box;
 * the user can override them here. Secrets (future API keys) would use safeStorage.
 */
function defaults(): AppSettings {
  return {
    llm: {
      provider: "ollama",
      ollamaUrl: config.ollamaUrl,
      ollamaModel: config.ollamaModel,
    },
    scan: {
      sources: ["naukri"],
      maxPerRole: 20,
      jobAge: 7,
      minMatch: "all",
    },
  };
}

class Settings {
  private cache: AppSettings | null = null;

  private file(): string {
    return join(app.getPath("userData"), "settings.json");
  }

  get(): AppSettings {
    if (this.cache) return this.cache;
    let loaded: Partial<AppSettings> = {};
    try {
      const f = this.file();
      if (existsSync(f)) loaded = JSON.parse(readFileSync(f, "utf8"));
    } catch {
      loaded = {};
    }
    const d = defaults();
    // Shallow-merge each section so new default keys appear for old configs.
    this.cache = {
      llm: { ...d.llm, ...(loaded.llm ?? {}) },
      scan: { ...d.scan, ...(loaded.scan ?? {}) },
    };
    return this.cache;
  }

  update(patch: Partial<AppSettings>): AppSettings {
    const cur = this.get();
    const next: AppSettings = {
      llm: { ...cur.llm, ...(patch.llm ?? {}) },
      scan: { ...cur.scan, ...(patch.scan ?? {}) },
    };
    this.cache = next;
    try {
      writeFileSync(this.file(), JSON.stringify(next, null, 2));
    } catch {
      /* best-effort; cache still holds the value this session */
    }
    return next;
  }
}

export const settings = new Settings();
