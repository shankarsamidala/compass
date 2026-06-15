import { ipcMain } from "electron";
import { err, type Result } from "@compass/ipc-contract";

/**
 * Wraps every IPC handler: catches throws → `{ ok:false, error, code }` so no
 * stack trace leaks to the renderer and every channel returns the Result envelope.
 */
export function safeHandle<T>(
  channel: string,
  fn: (...args: any[]) => Promise<Result<T>> | Result<T>,
): void {
  ipcMain.handle(channel, async (_event, ...args: any[]) => {
    try {
      return await fn(...args);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unexpected error";
      const code = e && typeof e === "object" && "code" in e ? String((e as any).code) : undefined;
      return err(message, code);
    }
  });
}
