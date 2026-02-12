/**
 * Validators
 * Centralized validation for API requests
 * Migrated from src/api/validators/
 */

import { API_CONFIG } from './api-config';
import {
  isValidExecutionMode,
  isValidLanguage,
  isValidTheme,
  NUMERIC_RANGES,
  VALID_EXECUTION_MODES,
  VALID_LANGUAGES,
  VALID_THEMES,
  VALIDATION_ERRORS,
} from './api-constants';
import { ValidationError } from './api-errors';
import type { ExecuteRequest, ExecutionMode, Settings } from './api-types';

// ═══════════════════════════════════════════════════════════════════════════
// Prompt Validators
// ═══════════════════════════════════════════════════════════════════════════

export function validatePrompt(prompt: unknown): string {
  if (typeof prompt !== 'string') {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('prompt', 'string'));
  }

  const trimmed = prompt.trim();

  if (trimmed.length === 0) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Prompt'));
  }

  const { min, max } = NUMERIC_RANGES.promptLength;
  if (trimmed.length < min || trimmed.length > max) {
    throw new ValidationError(VALIDATION_ERRORS.TOO_LONG('prompt', max));
  }

  return trimmed;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// Agents Validators
// ═══════════════════════════════════════════════════════════════════════════

export interface ClassifyRequest {
  prompt: string;
}

export function validateClassifyRequest(body: unknown): ClassifyRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('Request body', 'object'));
  }

  const { prompt } = body as Record<string, unknown>;
  return { prompt: validatePrompt(prompt) };
}

export function validateAgentId(agentId: unknown): string {
  if (typeof agentId !== 'string' || agentId.trim().length === 0) {
    throw new ValidationError(VALIDATION_ERRORS.REQUIRED('Agent ID'));
  }
  return agentId.trim();
}

// ═══════════════════════════════════════════════════════════════════════════
// Execute Validators
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecuteValidatedOptions {
  verbose?: boolean;
  skipResearch?: boolean;
}

export function validateExecuteRequest(body: unknown): ExecuteRequest {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('Request body', 'object'));
  }

  const { prompt, mode, options } = body as Record<string, unknown>;

  const validatedPrompt = validatePrompt(prompt);
  const validatedMode = validateExecutionMode(mode);
  const validatedOptions = validateExecuteOptions(options);

  return {
    prompt: validatedPrompt,
    mode: validatedMode,
    options: validatedOptions,
  };
}

export function validateExecutionMode(mode: unknown): ExecutionMode {
  if (mode === undefined) {
    return 'basic';
  }

  if (!isValidExecutionMode(mode)) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ENUM('mode', VALID_EXECUTION_MODES));
  }

  return mode;
}

export function validateExecuteOptions(options: unknown): ExecuteValidatedOptions {
  if (options === undefined) {
    return {};
  }

  if (typeof options !== 'object' || options === null) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('options', 'object'));
  }

  const { verbose, skipResearch } = options as Record<string, unknown>;

  return {
    verbose: verbose !== undefined ? Boolean(verbose) : undefined,
    skipResearch: skipResearch !== undefined ? Boolean(skipResearch) : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// History Validators
// ═══════════════════════════════════════════════════════════════════════════

export function validateHistoryLimit(limit: unknown): number {
  if (limit === undefined || limit === null) {
    return API_CONFIG.history.defaultLimit;
  }

  const parsed = Number(limit);
  if (Number.isNaN(parsed)) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('limit', 'number'));
  }

  const { maxSize } = API_CONFIG.history;
  return Math.min(Math.max(1, parsed), maxSize);
}

export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') {
    return '';
  }
  return query.trim();
}

export function validateDateRange(
  start: unknown,
  end: unknown,
): { startDate?: Date; endDate?: Date } {
  const result: { startDate?: Date; endDate?: Date } = {};

  if (start !== undefined) {
    const startDate = new Date(String(start));
    if (!Number.isNaN(startDate.getTime())) {
      result.startDate = startDate;
    }
  }

  if (end !== undefined) {
    const endDate = new Date(String(end));
    if (!Number.isNaN(endDate.getTime())) {
      result.endDate = endDate;
    }
  }

  if (result.startDate && result.endDate && result.startDate > result.endDate) {
    throw new ValidationError('Start date must be before end date');
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Settings Validators
// ═══════════════════════════════════════════════════════════════════════════

export function validateSettingsUpdate(body: unknown): Partial<Settings> {
  if (typeof body !== 'object' || body === null) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('Request body', 'object'));
  }

  const updates = body as Record<string, unknown>;
  const validated: Partial<Settings> = {};

  if (updates.theme !== undefined) {
    validated.theme = validateTheme(updates.theme);
  }

  if (updates.language !== undefined) {
    validated.language = validateLanguage(updates.language);
  }

  if (updates.temperature !== undefined) {
    validated.temperature = validateTemperature(updates.temperature);
  }

  if (updates.maxTokens !== undefined) {
    validated.maxTokens = validateMaxTokens(updates.maxTokens);
  }

  if (updates.streaming !== undefined) {
    validated.streaming = Boolean(updates.streaming);
  }

  if (updates.verbose !== undefined) {
    validated.verbose = Boolean(updates.verbose);
  }

  if (updates.model !== undefined) {
    validated.model = validateModel(updates.model);
  }

  return validated;
}

export function validateTheme(theme: unknown): Settings['theme'] {
  if (!isValidTheme(theme)) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ENUM('theme', VALID_THEMES));
  }
  return theme;
}

export function validateLanguage(language: unknown): Settings['language'] {
  if (!isValidLanguage(language)) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_ENUM('language', VALID_LANGUAGES));
  }
  return language;
}

export function validateTemperature(temperature: unknown): number {
  const temp = Number(temperature);
  const { min, max } = API_CONFIG.settings.temperature;
  if (Number.isNaN(temp) || temp < min || temp > max) {
    throw new ValidationError(VALIDATION_ERRORS.OUT_OF_RANGE('temperature', min, max));
  }
  return temp;
}

export function validateMaxTokens(maxTokens: unknown): number {
  const tokens = Number(maxTokens);
  const { min, max } = API_CONFIG.settings.tokens;
  if (Number.isNaN(tokens) || tokens < min || tokens > max) {
    throw new ValidationError(VALIDATION_ERRORS.OUT_OF_RANGE('maxTokens', min, max));
  }
  return tokens;
}

export function validateModel(model: unknown): string {
  if (typeof model !== 'string' || model.trim().length === 0) {
    throw new ValidationError(VALIDATION_ERRORS.EMPTY_STRING('model'));
  }
  return model.trim();
}
