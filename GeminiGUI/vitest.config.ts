/**
 * Vitest Configuration
 * @module vitest.config
 *
 * Comprehensive Vitest setup for testing React components with TypeScript
 * Includes support for:
 * - React 19 components
 * - TypeScript strict mode
 * - React Testing Library
 * - Coverage reporting
 * - Virtual scrolling (Virtuoso)
 * - Tailwind CSS
 * - Framer Motion
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  test: {
    // Test environment setup
    globals: true,
    environment: 'jsdom',

    // Setup files run before all tests
    setupFiles: ['./src/test/setup.ts'],

    // Include CSS in test environment
    css: true,

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportOnFailure: true,
      exclude: [
        'node_modules/',
        'src/test/',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/*.spec.ts',
        'src/**/*.spec.tsx',
        'dist/',
        'build/',
        '**/*.d.ts',
      ],
      // Coverage thresholds (fail if below these)
      branches: 80,
      lines: 85,
      functions: 80,
      statements: 85,
      // Include untested files in report
      include: ['src/**/*.{ts,tsx}'],
    },

    // Test file patterns - only unit tests, not Playwright e2e tests
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'src-tauri',
      'tests/**', // Playwright e2e and integration tests
      '**/*.spec.{ts,tsx}', // All Playwright tests
    ],

    // Test timeout in milliseconds
    testTimeout: 10000,

    // Hook timeout
    hookTimeout: 10000,

    // Suppress console output in tests
    silent: false,

    // Reporter configuration
    reporter: ['verbose'],

    // Threading for parallel test execution
    threads: true,
    maxThreads: 4,
    minThreads: 1,

    // Isolate test environment per file
    isolate: true,

    // Mock reset behavior
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Transform configuration
    transformMode: {
      web: [/\.[jt]sx?$/],
    },

    // Dependencies optimization for SSR
    deps: {
      optimizer: {
        web: {
          // Exclude Tauri packages from optimization
          exclude: [
            '@tauri-apps/api',
            '@tauri-apps/plugin-dialog',
            '@tauri-apps/plugin-fs',
            '@tauri-apps/plugin-opener',
          ],
        },
      },
    },
  },

  // Path alias configuration
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
