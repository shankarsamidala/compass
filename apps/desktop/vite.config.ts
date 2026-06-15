import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import electron from "vite-plugin-electron/simple";
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
        // pdf-parse / mammoth are CJS with assets — keep them external (not bundled).
        vite: { build: { rollupOptions: { external: ["pdf-parse", "mammoth"] } } },
      },
      preload: { input: "electron/preload.ts" },
    }),
  ],
});
