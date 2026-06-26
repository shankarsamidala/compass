import "@datadog/electron-sdk/instrument"; // must be before electron
import { app, BrowserWindow, nativeImage, session, shell } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";
import { cliService } from "./services/cli.service";
import { claudeWarmAgent } from "./services/agent-session.service";
import { init as initDatadog } from "@datadog/electron-sdk";

// Lean Electron shell for Compass. No mic/screen/accessibility permissions —
// just a window. Career-ops services (auth, jobs, BYO-LLM) get ported in next.

// Don't use the macOS Keychain for Chromium's os_crypt — it pops a Keychain
// prompt on launch (and errors with userCanceledErr if dismissed). We store no
// secrets in Chromium storage, so the "basic" password store is fine and silent.
app.commandLine.appendSwitch("password-store", "basic");

function createWindow() {
  const iconFile = process.platform === "win32" ? "icon.ico" : "icon.icns";
  const iconPath = path.join(__dirname, "../src/assets/icons", iconFile);
  const icon = nativeImage.createFromPath(iconPath);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#ffffff",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // All target="_blank" links and window.open() calls open in the system browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Warm the Claude session in the background once the UI is up — so the first
  // scan/rank/evaluate is instant instead of paying MCP cold-start. Best-effort:
  // if claude isn't installed it just no-ops.
  win.webContents.once("did-finish-load", () => {
    void cliService
      .detect()
      .then((res) => {
        if (res.ok && res.data.claude) {
          claudeWarmAgent.start().catch((e) => console.warn("[warm-agent] start failed:", e?.message ?? e));
        }
      })
      .catch(() => {/* non-fatal */});
  });
}

app.whenReady().then(async () => {
  const appId = process.env.DD_RUM_APP_ID;
  const clientToken = process.env.DD_RUM_CLIENT_TOKEN;
  if (appId && clientToken) {
    await initDatadog({
      applicationId: appId,
      clientToken,
      service: "compass-desktop",
      site: "us5.datadoghq.com",
      env: process.env.DD_RUM_ENV ?? "beta",
      version: "0.1.0",
      defaultPrivacyLevel: "mask-user-input",
      // Allow renderer bridge from both dev server (localhost) and prod (local file)
      allowedWebViewHosts: ["localhost"],
    }).catch(() => {/* non-fatal */});
  }

  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ["https://api.daily.dev/*"] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          "Access-Control-Allow-Origin": ["*"],
          "Access-Control-Allow-Headers": ["*"],
        },
      });
    }
  );

  registerIpcHandlers();
  createWindow();
});

app.on("before-quit", () => {
  claudeWarmAgent.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
