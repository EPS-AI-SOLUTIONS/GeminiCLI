/**
 * API Configuration for Next.js Route Handlers
 * Migrated from src/api/config/index.ts
 */

const getEnvNumber = (key: string, defaultValue: number): number => {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

const getEnvString = (key: string, defaultValue: string): string => {
  return process.env[key] || defaultValue;
};

export const API_CONFIG = {
  version: getEnvString('API_VERSION', '16.0.0'),

  history: {
    maxSize: getEnvNumber('HISTORY_MAX_SIZE', 1000),
    defaultLimit: getEnvNumber('HISTORY_DEFAULT_LIMIT', 50),
  },

  settings: {
    temperature: { min: 0, max: 2 },
    tokens: { min: 1, max: 32768 },
  },

  monitoring: {
    slowRequestThresholdMs: getEnvNumber('SLOW_REQUEST_THRESHOLD_MS', 1000),
    keepAliveIntervalMs: getEnvNumber('SSE_KEEPALIVE_MS', 15000),
  },
} as const;

export type ApiConfig = typeof API_CONFIG;
