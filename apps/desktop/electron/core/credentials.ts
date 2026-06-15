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

  private load(): void {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const f = this.file();
      if (existsSync(f) && safeStorage.isEncryptionAvailable()) {
        this.cache = JSON.parse(safeStorage.decryptString(readFileSync(f)));
      }
    } catch {
      this.cache = null;
    }
  }

  private persist(): void {
    const f = this.file();
    if (!this.cache) {
      try {
        rmSync(f, { force: true });
      } catch {
        /* ignore */
      }
      return;
    }
    if (!safeStorage.isEncryptionAvailable()) return; // never write plaintext tokens
    writeFileSync(f, safeStorage.encryptString(JSON.stringify(this.cache)));
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
