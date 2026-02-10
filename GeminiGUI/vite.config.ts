import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig, loadEnv } from 'vite';
import viteCompression from 'vite-plugin-compression';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isTest = env.APP_ENV === 'test';
  const mockPath = path.resolve(process.cwd(), 'src/mocks/tauri.ts');
  const isProd = mode === 'production';
  const isAnalyze = env.ANALYZE === 'true';

  return {
    plugins: [
      react(),
      tailwindcss(),
      // Gzip compression for production
      isProd &&
        viteCompression({
          algorithm: 'gzip',
          threshold: 1024,
          deleteOriginFile: false,
        }),
      // Brotli compression for production
      isProd &&
        viteCompression({
          algorithm: 'brotliCompress',
          threshold: 1024,
          deleteOriginFile: false,
        }),
      // Bundle size visualization (run with ANALYZE=true)
      isAnalyze &&
        visualizer({
          filename: 'dist/bundle-stats.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        }),
    ].filter(Boolean),

    resolve: {
      alias: {
        // Shared types between frontend and backend
        '@shared': path.resolve(__dirname, '../shared'),
        // Test mocks for Tauri APIs
        ...(isTest
          ? {
              '@tauri-apps/api/core': mockPath,
              '@tauri-apps/api/event': mockPath,
              '@tauri-apps/api/window': mockPath,
              '@tauri-apps/api/webviewWindow': mockPath,
            }
          : {}),
      },
    },

    // Build optimization
    build: {
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: isProd,
        },
      },
      cssCodeSplit: true,
      sourcemap: !isProd,
      // Report gzip/brotli compressed sizes after build
      reportCompressedSize: true,
      rollupOptions: {
        output: {
          // Cache-busting with content hashes
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash][extname]',
          manualChunks: {
            // Core React - loads first, most stable
            'vendor-react': ['react', 'react-dom'],
            // Markdown rendering - heavy, lazy loaded
            'vendor-markdown': ['react-markdown', 'remark-gfm'],
            // Animation library
            'vendor-motion': ['framer-motion'],
            // Icons - tree-shaken
            'vendor-icons': ['lucide-react'],
            // State management
            'vendor-state': ['zustand'],
            // Query management
            'vendor-query': ['@tanstack/react-query'],
            // Tauri APIs
            'vendor-tauri': ['@tauri-apps/api'],
          },
        },
      },
    },

    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    clearScreen: false,
    server: {
      port: 1420,
      strictPort: true,
      host: host || false,
      hmr: host
        ? {
            protocol: 'ws',
            host,
            port: 1421,
          }
        : undefined,
      watch: {
        ignored: ['**/src-tauri/**'],
      },
      // Proxy for Ollama API (CORS bypass)
      proxy: {
        '/api/ollama': {
          target: 'http://127.0.0.1:11434',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
        },
      },
    },
  };
});
