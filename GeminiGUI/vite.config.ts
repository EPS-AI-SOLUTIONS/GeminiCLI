import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isTest = env.APP_ENV === 'test';
  const mockPath = path.resolve(process.cwd(), 'src/mocks/tauri.ts');

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: isTest ? {
        '@tauri-apps/api/core': mockPath,
        '@tauri-apps/api/event': mockPath,
        '@tauri-apps/api/window': mockPath,
        '@tauri-apps/api/webviewWindow': mockPath,
      } : {},
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ["**/src-tauri/**"],
      },
    },
  };
});
