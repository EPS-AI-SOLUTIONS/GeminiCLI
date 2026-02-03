/**
 * UI Slice - UI-related state management
 *
 * Manages: count, theme, provider
 */

import type { StateCreator } from 'zustand';

// =============================================================================
// TYPES
// =============================================================================

export interface UIState {
  count: number;
  theme: 'dark' | 'light';
  provider: 'ollama' | 'gemini';
}

export interface UIActions {
  increment: () => void;
  decrement: () => void;
  reset: () => void;
  toggleTheme: () => void;
  setProvider: (provider: 'ollama' | 'gemini') => void;
}

export type UISlice = UIState & UIActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialUIState: UIState = {
  count: 0,
  theme: 'dark',
  provider: 'ollama',
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

export const createUISlice: StateCreator<UISlice, [], [], UISlice> = (set) => ({
  ...initialUIState,

  increment: () =>
    set((state) => ({
      count: Math.min(state.count + 1, 999999),
    })),

  decrement: () =>
    set((state) => ({
      count: Math.max(state.count - 1, 0),
    })),

  reset: () => set({ count: 0 }),

  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),

  setProvider: (provider) => set({ provider }),
});

// =============================================================================
// SELECTORS
// =============================================================================

export const selectTheme = (state: UISlice) => state.theme;
export const selectCount = (state: UISlice) => state.count;
export const selectProvider = (state: UISlice) => state.provider;
