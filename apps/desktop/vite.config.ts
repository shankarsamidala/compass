import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";
import { datadogVitePlugin } from "@datadog/electron-sdk/vite-plugin";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: { alias: { "@": resolve(root, "src") } },
  plugins: [
    react(),
    tailwindcss(),
    electron({
      main: {
        entry: "electron/main.ts",
        vite: {
          plugins: [datadogVitePlugin()],
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
});
