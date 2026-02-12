/**
 * API Constants
 * Centralized constants for API validation and messages
 * Migrated from src/api/constants/
 */

import type { ExecutionMode, Language, Theme } from './api-types';

// ═══════════════════════════════════════════════════════════════════════════
// Validation Enum Values
// ═══════════════════════════════════════════════════════════════════════════

export const VALID_THEMES: readonly Theme[] = ['dark', 'light', 'system'] as const;
export const VALID_LANGUAGES: readonly Language[] = ['pl', 'en'] as const;
export const VALID_EXECUTION_MODES: readonly ExecutionMode[] = [
  'basic',
  'enhanced',
  'swarm',
] as const;

export const VALID_MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type ValidMessageRole = (typeof VALID_MESSAGE_ROLES)[number];

// ═══════════════════════════════════════════════════════════════════════════
// Numeric Ranges
// ═══════════════════════════════════════════════════════════════════════════

export const NUMERIC_RANGES = {
  temperature: { min: 0, max: 2 },
  tokens: { min: 1, max: 32768 },
  promptLength: { min: 1, max: 100000 },
  historyLimit: { min: 1, max: 1000 },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards
// ═══════════════════════════════════════════════════════════════════════════

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALID_THEMES.includes(value as Theme);
}

export function isValidLanguage(value: unknown): value is Language {
  return typeof value === 'string' && VALID_LANGUAGES.includes(value as Language);
}

export function isValidExecutionMode(value: unknown): value is ExecutionMode {
  return typeof value === 'string' && VALID_EXECUTION_MODES.includes(value as ExecutionMode);
}

export function isValidMessageRole(value: unknown): value is ValidMessageRole {
  return typeof value === 'string' && VALID_MESSAGE_ROLES.includes(value as ValidMessageRole);
}

// ═══════════════════════════════════════════════════════════════════════════
// Validation Errors
// ═══════════════════════════════════════════════════════════════════════════

export const VALIDATION_ERRORS = {
  REQUIRED: (field: string) => `${field} is required`,
  INVALID_TYPE: (field: string, expected: string) => `${field} must be a ${expected}`,
  INVALID_ENUM: (field: string, values: readonly string[]) =>
    `${field} must be one of: ${values.join(', ')}`,
  OUT_OF_RANGE: (field: string, min: number, max: number) =>
    `${field} must be between ${min} and ${max}`,
  TOO_SHORT: (field: string, min: number) => `${field} must be at least ${min} characters`,
  TOO_LONG: (field: string, max: number) => `${field} must be at most ${max} characters`,
  EMPTY_STRING: (field: string) => `${field} cannot be empty`,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// API Errors
// ═══════════════════════════════════════════════════════════════════════════

export const API_ERRORS = {
  NOT_FOUND: (resource: string) => `${resource} not found`,
  ROUTE_NOT_FOUND: (method: string, url: string) => `Route ${method} ${url} not found`,
  EXECUTION_FAILED: (reason: string) => `Execution failed: ${reason}`,
  SWARM_UNAVAILABLE: 'Swarm not available - check MCP or API configuration',
  INTERNAL_ERROR: 'Internal server error',
  BAD_REQUEST: 'Bad request',
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// Success Messages
// ═══════════════════════════════════════════════════════════════════════════

export const SUCCESS_MESSAGES = {
  HISTORY_CLEARED: (count: number) => `Successfully cleared ${count} messages`,
  SETTINGS_UPDATED: 'Settings updated successfully',
  SETTINGS_RESET: 'Settings reset to defaults',
} as const;
