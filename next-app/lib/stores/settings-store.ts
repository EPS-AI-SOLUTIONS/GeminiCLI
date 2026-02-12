/**
 * Settings Store
 * In-memory settings with optional persistent storage (Upstash Redis)
 * Uses write-through cache pattern: fast in-memory reads, async persistence
 * Migrated from src/api/stores/SettingsStore.ts
 */

import {
  isValidLanguage,
  isValidTheme,
  NUMERIC_RANGES,
  VALID_LANGUAGES,
  VALID_THEMES,
  VALIDATION_ERRORS,
} from '../api-constants';
import { type Settings, DEFAULT_SETTINGS } from '../api-types';
import { getStorage, StorageKeys } from '../storage';
import type { StorageAdapter } from '../storage/adapter';

// ═══════════════════════════════════════════════════════════════════════════
// Validation
// ═══════════════════════════════════════════════════════════════════════════

const { min: TEMP_MIN, max: TEMP_MAX } = NUMERIC_RANGES.temperature;
const { min: TOKENS_MIN, max: TOKENS_MAX } = NUMERIC_RANGES.tokens;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateTheme(theme: unknown): ValidationResult {
  if (!isValidTheme(theme)) {
    return { valid: false, error: VALIDATION_ERRORS.INVALID_ENUM('theme', VALID_THEMES) };
  }
  return { valid: true };
}

function validateLanguage(language: unknown): ValidationResult {
  if (!isValidLanguage(language)) {
    return { valid: false, error: VALIDATION_ERRORS.INVALID_ENUM('language', VALID_LANGUAGES) };
  }
  return { valid: true };
}

function validateTemperature(temperature: unknown): ValidationResult {
  const temp = Number(temperature);
  if (Number.isNaN(temp) || temp < TEMP_MIN || temp > TEMP_MAX) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.OUT_OF_RANGE('temperature', TEMP_MIN, TEMP_MAX),
    };
  }
  return { valid: true };
}

function validateMaxTokens(maxTokens: unknown): ValidationResult {
  const tokens = Number(maxTokens);
  if (Number.isNaN(tokens) || tokens < TOKENS_MIN || tokens > TOKENS_MAX) {
    return {
      valid: false,
      error: VALIDATION_ERRORS.OUT_OF_RANGE('maxTokens', TOKENS_MIN, TOKENS_MAX),
    };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// Store Class
// ═══════════════════════════════════════════════════════════════════════════

export class SettingsStore {
  private settings: Settings;
  private storage: StorageAdapter | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(initialSettings?: Partial<Settings>) {
    this.settings = { ...DEFAULT_SETTINGS, ...initialSettings };
  }

  /**
   * Initialize persistence layer (lazy, called once on first access)
   * Loads existing settings from storage
   */
  private async initStorage(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.storage = getStorage();
        const stored = await this.storage.get<Settings>(StorageKeys.settings);
        if (stored && typeof stored === 'object') {
          this.settings = { ...DEFAULT_SETTINGS, ...stored };
        }
      } catch (error) {
        console.warn('[SettingsStore] Failed to load from storage, using defaults:', error);
        this.storage = null;
      } finally {
        this.initialized = true;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Persist current settings to storage (fire-and-forget)
   */
  private persistAsync(): void {
    if (!this.storage) return;
    this.storage.set(StorageKeys.settings, this.settings).catch((error) => {
      console.warn('[SettingsStore] Failed to persist:', error);
    });
  }

  /**
   * Ensure storage is initialized before read operations
   */
  async ensureReady(): Promise<void> {
    await this.initStorage();
  }

  get(): Settings {
    return { ...this.settings };
  }

  update(updates: Partial<Settings>): Settings | { error: string } {
    const newSettings = { ...this.settings };

    if (updates.theme !== undefined) {
      const result = validateTheme(updates.theme);
      if (!result.valid) return { error: result.error ?? 'Validation failed' };
      newSettings.theme = updates.theme;
    }

    if (updates.language !== undefined) {
      const result = validateLanguage(updates.language);
      if (!result.valid) return { error: result.error ?? 'Validation failed' };
      newSettings.language = updates.language;
    }

    if (updates.temperature !== undefined) {
      const result = validateTemperature(updates.temperature);
      if (!result.valid) return { error: result.error ?? 'Validation failed' };
      newSettings.temperature = Number(updates.temperature);
    }

    if (updates.maxTokens !== undefined) {
      const result = validateMaxTokens(updates.maxTokens);
      if (!result.valid) return { error: result.error ?? 'Validation failed' };
      newSettings.maxTokens = Number(updates.maxTokens);
    }

    if (updates.streaming !== undefined) {
      newSettings.streaming = Boolean(updates.streaming);
    }

    if (updates.verbose !== undefined) {
      newSettings.verbose = Boolean(updates.verbose);
    }

    if (updates.model !== undefined) {
      newSettings.model = String(updates.model);
    }

    this.settings = newSettings;
    this.persistAsync();
    return this.get();
  }

  reset(): Settings {
    this.settings = { ...DEFAULT_SETTINGS };
    this.persistAsync();
    return this.get();
  }
}

// Singleton
export const settingsStore = new SettingsStore();
