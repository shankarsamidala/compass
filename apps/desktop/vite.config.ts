import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";
import { datadogVitePlugin } from "@datadog/electron-sdk/vite-plugin";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load .env.local so VITE_DD_* vars reach both renderer (via import.meta.env)
  // and main process (injected via define below).
  const env = loadEnv(mode, root, "");

  return {
    resolve: { alias: { "@": resolve(root, "src") } },
    plugins: [
      react(),
      tailwindcss(),
      electron({
        main: {
          entry: "electron/main.ts",
          vite: {
            plugins: [datadogVitePlugin()],
            define: {
              "process.env.DD_RUM_APP_ID": JSON.stringify(env.VITE_DD_RUM_APP_ID ?? ""),
              "process.env.DD_RUM_CLIENT_TOKEN": JSON.stringify(env.VITE_DD_RUM_CLIENT_TOKEN ?? ""),
              "process.env.DD_RUM_ENV": JSON.stringify(env.VITE_DD_RUM_ENV ?? "beta"),
            },
            build: {
              rollupOptions: {
                // pdf-parse / mammoth are CJS with assets; dd-trace has native binaries — keep all external.
                external: ["pdf-parse", "mammoth", "dd-trace"],
              },
            },
          },
        },
        preload: { input: "electron/preload.ts" },
      }),
    ],
  };
});
