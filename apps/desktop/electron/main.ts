import "@datadog/electron-sdk/instrument"; // must be before electron
import { app, BrowserWindow, nativeImage, session } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";
import { init as initDatadog } from "@datadog/electron-sdk";

// Lean Electron shell for Compass. No mic/screen/accessibility permissions —
// just a window. Career-ops services (auth, jobs, BYO-LLM) get ported in next.

function createWindow() {
  const iconFile = process.platform === "win32" ? "icon.ico" : "icon.icns";
  const iconPath = path.join(__dirname, "../src/assets/icons", iconFile);
  const icon = nativeImage.createFromPath(iconPath);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0e1217",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    icon: icon.isEmpty() ? undefined : icon,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
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
      env: process.env.NODE_ENV === "production" ? "beta" : "dev",
      version: "0.1.0",
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

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
