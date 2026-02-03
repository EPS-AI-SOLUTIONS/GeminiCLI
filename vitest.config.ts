/**
 * Vitest Configuration - Root Level
 * @module vitest.config
 *
 * Configuration for backend/CLI tests only.
 * Frontend tests (GeminiGUI) should be run separately with:
 *   cd GeminiGUI && npm test
 *
 * Or use: npm run test:all (runs both)
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use globals (describe, it, expect without imports)
    globals: true,

    // Node.js environment for backend tests
    environment: 'node',

    // Test file patterns - only backend tests
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],

    // Exclude frontend tests and Playwright tests
    exclude: [
      'node_modules',
      'dist',
      'GeminiGUI/**', // Frontend has own config
      '**/*.spec.ts', // Playwright tests
      '**/e2e/**',
      '**/integration/**/*.spec.ts',
    ],

    // Test timeout
    testTimeout: 30000,

    // Mock reset behavior
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,

    // Reporter
    reporter: ['verbose'],

    // Coverage configuration (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'GeminiGUI/',
        'dist/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.spec.ts',
      ],
    },
  },
});
