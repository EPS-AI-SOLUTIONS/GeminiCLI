/**
 * Settings Slice - Application settings management
 *
 * Manages: settings
 */

import type { StateCreator } from 'zustand';
import type { Settings } from '../../types';
import { isValidApiKey, sanitizeContent } from '../../utils/validators';
import { LIMITS, DEFAULT_SETTINGS } from '../../constants';

// =============================================================================
// TYPES
// =============================================================================

export interface SettingsState {
  settings: Settings;
}

export interface SettingsActions {
  updateSettings: (newSettings: Partial<Settings>) => void;
}

export type SettingsSlice = SettingsState & SettingsActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialSettingsState: SettingsState = {
  settings: DEFAULT_SETTINGS,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createSettingsSlice: StateCreator<SettingsSlice, [], [], SettingsSlice> = (set) => ({
  ...initialSettingsState,

  updateSettings: (newSettings) =>
    set((state) => {
      const validated: Partial<Settings> = {};

      // Validate geminiApiKey
      if (newSettings.geminiApiKey !== undefined) {
        if (isValidApiKey(newSettings.geminiApiKey)) {
          validated.geminiApiKey = newSettings.geminiApiKey;
        } else {
          console.warn('[Store] Invalid Gemini API key format');
        }
      }

      // Validate systemPrompt
      if (newSettings.systemPrompt !== undefined) {
        validated.systemPrompt = sanitizeContent(
          newSettings.systemPrompt,
          LIMITS.MAX_SYSTEM_PROMPT_LENGTH
        );
      }

      // Validate useSwarm
      if (newSettings.useSwarm !== undefined) {
        validated.useSwarm = Boolean(newSettings.useSwarm);
      }

      // Validate defaultProvider
      if (newSettings.defaultProvider !== undefined) {
        validated.defaultProvider = newSettings.defaultProvider;
      }

      // Validate llama settings
      if (newSettings.llamaModelsDir !== undefined) {
        validated.llamaModelsDir = newSettings.llamaModelsDir;
      }
      if (newSettings.llamaGpuLayers !== undefined) {
        validated.llamaGpuLayers = Math.max(0, Math.min(999, newSettings.llamaGpuLayers));
      }

      return {
        settings: { ...state.settings, ...validated },
      };
    }),
});

// =============================================================================
// SELECTORS
// =============================================================================

export const selectSettings = (state: SettingsSlice) => state.settings;

export const selectIsApiKeySet = (state: SettingsSlice): boolean => {
  return Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.length > 0);
};

export const selectUseSwarm = (state: SettingsSlice): boolean => {
  return state.settings.useSwarm;
};

export const selectLlamaModelsDir = (state: SettingsSlice): string => {
  return state.settings.llamaModelsDir || './data/models';
};

export const selectLlamaGpuLayers = (state: SettingsSlice): number => {
  return state.settings.llamaGpuLayers ?? 99;
};
