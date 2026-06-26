import { app } from "electron";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * "Not interested" store — job IDs the user dismissed from the feed. Plain JSON in
 * userData, kept as a Set in memory. Local-only for now (survives restarts); a
 * co-atlas table can replace this later for cross-device sync.
 */
class Dismissed {
  private cache: Set<string> | null = null;

  private file(): string {
    return join(app.getPath("userData"), "dismissed-jobs.json");
  }

  private load(): Set<string> {
    if (this.cache) return this.cache;
    let ids: string[] = [];
    try {
      const f = this.file();
      if (existsSync(f)) {
        const parsed = JSON.parse(readFileSync(f, "utf8"));
        if (Array.isArray(parsed)) ids = parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      ids = [];
    }
    this.cache = new Set(ids);
    return this.cache;
  }

  has(id: string): boolean {
    return this.load().has(id);
  }

  /** Add IDs to the dismissed set. Returns how many were newly added. */
  add(ids: string[]): number {
    const set = this.load();
    const before = set.size;
    for (const id of ids) if (id) set.add(id);
    if (set.size !== before) this.persist();
    return set.size - before;
  }

  /** Un-dismiss (e.g. an undo). */
  remove(ids: string[]): void {
    const set = this.load();
    let changed = false;
    for (const id of ids) changed = set.delete(id) || changed;
    if (changed) this.persist();
  }

  private persist() {
    try {
      writeFileSync(this.file(), JSON.stringify([...(this.cache ?? [])], null, 2));
    } catch {
      /* best-effort; cache still holds the value this session */
    }
  }
}

export const dismissed = new Dismissed();
