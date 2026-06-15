import { app, BrowserWindow, nativeImage, session } from "electron";
import path from "node:path";
import { registerIpcHandlers } from "./ipc/handlers";

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

app.whenReady().then(() => {
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
