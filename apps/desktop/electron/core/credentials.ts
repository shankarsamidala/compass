import { app, safeStorage } from "electron";
import { readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { AuthUser } from "@compass/ipc-contract";

/**
 * Encrypted session store (ADR / AGENTS §2). Tokens live ONLY in the main process,
 * encrypted at rest via Electron safeStorage. The renderer never sees them.
 */
interface Session {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

class Credentials {
  private cache: Session | null = null;
  private loaded = false;

  private file(): string {
    return join(app.getPath("userData"), "auth.bin");
  }
  // Fallback when OS encryption (Keychain) isn't available — e.g. an unsigned dev
  // build, or the user dismissed the Keychain prompt. Without this the session
  // simply never persists and the app logs out on every reload.
  private plainFile(): string {
    return join(app.getPath("userData"), "auth.json");
  }

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const f = this.file();
      if (existsSync(f) && safeStorage.isEncryptionAvailable()) {
        this.cache = JSON.parse(safeStorage.decryptString(readFileSync(f)));
        return;
      }
      const p = this.plainFile();
      if (existsSync(p)) {
        this.cache = JSON.parse(Buffer.from(readFileSync(p, "utf8"), "base64").toString("utf8"));
      }
    } catch {
      this.cache = null;
    }
  }

  private persist(): void {
    const f = this.file();
    const p = this.plainFile();
    if (!this.cache) {
      for (const x of [f, p]) {
        try {
          rmSync(x, { force: true });
        } catch {
          /* ignore */
        }
      }
      return;
    }
    const json = JSON.stringify(this.cache);
    if (safeStorage.isEncryptionAvailable()) {
      writeFileSync(f, safeStorage.encryptString(json));
      try {
        rmSync(p, { force: true });
      } catch {
        /* ignore */
      }
      return;
    }
    // No OS encryption available → persist obfuscated (base64) so the session
    // survives reloads. userData is per-user; the API token already lives in ~/.reinit.
    writeFileSync(p, Buffer.from(json, "utf8").toString("base64"));
  }

  setSession(session: Session): void {
    this.cache = session;
    this.loaded = true;
    this.persist();
  }

  setTokens(accessToken: string, refreshToken: string): void {
    this.load();
    if (this.cache) {
      this.cache.accessToken = accessToken;
      this.cache.refreshToken = refreshToken;
      this.persist();
    }
  }

  getAccessToken(): string | null {
    this.load();
    return this.cache?.accessToken ?? null;
  }

  getRefreshToken(): string | null {
    this.load();
    return this.cache?.refreshToken ?? null;
  }

  clear(): void {
    this.cache = null;
    this.loaded = true;
    this.persist();
  }
}

export const credentials = new Credentials();
