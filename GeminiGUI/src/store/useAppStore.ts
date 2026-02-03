/**
 * GeminiGUI - Zustand App Store
 * @module store/useAppStore
 *
 * Centralized state management composed from domain-specific slices.
 * Each slice is defined in ./slices/ for better maintainability.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Message, Session, Settings, AppState } from '../types';
import { STORAGE_KEYS, DEFAULT_SETTINGS, LIMITS } from '../constants';
import {
  isValidUrl,
  isValidApiKey,
  sanitizeContent,
  sanitizeTitle,
} from '../utils/validators';

// =============================================================================
// STORE IMPLEMENTATION
// =============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // ========================================
      // UI State
      // ========================================
      count: 0,
      theme: 'dark',
      provider: 'llama',

      setProvider: (provider) => set({ provider }),

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

      // ========================================
      // Session State
      // ========================================
      sessions: [],
      currentSessionId: null,

      createSession: () => {
        const id = crypto.randomUUID();
        const newSession: Session = {
          id,
          title: 'New Chat',
          createdAt: Date.now(),
        };

        set((state) => {
          let sessions = [newSession, ...state.sessions];

          if (sessions.length > LIMITS.MAX_SESSIONS) {
            const removedIds = sessions.slice(LIMITS.MAX_SESSIONS).map((s) => s.id);
            sessions = sessions.slice(0, LIMITS.MAX_SESSIONS);

            const newHistory = { ...state.chatHistory };
            removedIds.forEach((removedId) => delete newHistory[removedId]);

            return {
              sessions,
              currentSessionId: id,
              chatHistory: { ...newHistory, [id]: [] },
            };
          }

          return {
            sessions,
            currentSessionId: id,
            chatHistory: { ...state.chatHistory, [id]: [] },
          };
        });
      },

      deleteSession: (id) =>
        set((state) => {
          const newSessions = state.sessions.filter((s) => s.id !== id);
          const newHistory = { ...state.chatHistory };
          delete newHistory[id];

          let newCurrentId = state.currentSessionId;
          if (state.currentSessionId === id) {
            newCurrentId = newSessions.length > 0 ? newSessions[0].id : null;
          }

          return {
            sessions: newSessions,
            chatHistory: newHistory,
            currentSessionId: newCurrentId,
          };
        }),

      selectSession: (id) =>
        set((state) => {
          const exists = state.sessions.some((s) => s.id === id);
          if (!exists) return state;
          return { currentSessionId: id };
        }),

      updateSessionTitle: (id, title) =>
        set((state) => {
          const sanitizedTitle = sanitizeTitle(title, LIMITS.MAX_TITLE_LENGTH);
          if (!sanitizedTitle) return state;

          return {
            sessions: state.sessions.map((s) =>
              s.id === id ? { ...s, title: sanitizedTitle } : s
            ),
          };
        }),

      // ========================================
      // Chat State
      // ========================================
      chatHistory: {},

      addMessage: (msg) =>
        set((state) => {
          if (!state.currentSessionId) return state;

          const sanitizedMsg: Message = {
            ...msg,
            content: sanitizeContent(msg.content, LIMITS.MAX_CONTENT_LENGTH),
          };

          const currentMessages = state.chatHistory[state.currentSessionId] || [];

          let updatedMessages = [...currentMessages, sanitizedMsg];
          if (updatedMessages.length > LIMITS.MAX_MESSAGES_PER_SESSION) {
            updatedMessages = updatedMessages.slice(-LIMITS.MAX_MESSAGES_PER_SESSION);
          }

          let updatedSessions = state.sessions;
          if (msg.role === 'user' && currentMessages.length === 0) {
            const title = sanitizeTitle(
              msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''),
              LIMITS.MAX_TITLE_LENGTH
            );
            updatedSessions = state.sessions.map((s) =>
              s.id === state.currentSessionId ? { ...s, title } : s
            );
          }

          return {
            chatHistory: {
              ...state.chatHistory,
              [state.currentSessionId]: updatedMessages,
            },
            sessions: updatedSessions,
          };
        }),

      updateLastMessage: (content) =>
        set((state) => {
          if (!state.currentSessionId) return state;
          const messages = state.chatHistory[state.currentSessionId] || [];
          if (messages.length === 0) return state;

          const newMessages = [...messages];
          const lastMsg = newMessages[newMessages.length - 1];

          const newContent = sanitizeContent(
            lastMsg.content + content,
            LIMITS.MAX_CONTENT_LENGTH
          );

          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            content: newContent,
          };

          return {
            chatHistory: {
              ...state.chatHistory,
              [state.currentSessionId]: newMessages,
            },
          };
        }),

      clearHistory: () =>
        set((state) => {
          if (!state.currentSessionId) return state;
          return {
            chatHistory: {
              ...state.chatHistory,
              [state.currentSessionId]: [],
            },
          };
        }),

      // ========================================
      // Settings State
      // ========================================
      settings: DEFAULT_SETTINGS,

      updateSettings: (newSettings) =>
        set((state) => {
          const validated: Partial<Settings> = {};

          if (newSettings.ollamaEndpoint !== undefined) {
            if (isValidUrl(newSettings.ollamaEndpoint)) {
              validated.ollamaEndpoint = newSettings.ollamaEndpoint;
            }
          }

          if (newSettings.geminiApiKey !== undefined) {
            if (isValidApiKey(newSettings.geminiApiKey)) {
              validated.geminiApiKey = newSettings.geminiApiKey;
            }
          }

          if (newSettings.systemPrompt !== undefined) {
            validated.systemPrompt = sanitizeContent(
              newSettings.systemPrompt,
              LIMITS.MAX_SYSTEM_PROMPT_LENGTH
            );
          }

          if (newSettings.useSwarm !== undefined) {
            validated.useSwarm = Boolean(newSettings.useSwarm);
          }

          return {
            settings: { ...state.settings, ...validated },
          };
        }),
    }),
    {
      name: STORAGE_KEYS.APP_STATE,
      partialize: (state) => ({
        count: state.count,
        theme: state.theme,
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
        chatHistory: state.chatHistory,
        settings: state.settings,
      }),
    }
  )
);

// =============================================================================
// SELECTORS (for optimized subscriptions)
// =============================================================================

const EMPTY_ARRAY: Message[] = [];

export const selectTheme = (state: AppState) => state.theme;
export const selectSettings = (state: AppState) => state.settings;
export const selectSessions = (state: AppState) => state.sessions;
export const selectCurrentSessionId = (state: AppState) => state.currentSessionId;
export const selectChatHistory = (state: AppState) => state.chatHistory;

export const selectCurrentMessages = (state: AppState): Message[] => {
  if (!state.currentSessionId) return EMPTY_ARRAY;
  return state.chatHistory[state.currentSessionId] || EMPTY_ARRAY;
};

export const selectIsApiKeySet = (state: AppState): boolean => {
  return Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.length > 0);
};

export const selectSessionById = (id: string) => (state: AppState) => {
  return state.sessions.find((session) => session.id === id);
};

export const selectMessageCount = (state: AppState): number => {
  if (!state.currentSessionId) return 0;
  return (state.chatHistory[state.currentSessionId] || []).length;
};

export const selectHasMessages = (state: AppState): boolean => {
  if (!state.currentSessionId) return false;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0;
};

export const selectUseSwarm = (state: AppState): boolean => {
  return state.settings.useSwarm;
};

export const selectOllamaEndpoint = (state: AppState): string => {
  return state.settings.ollamaEndpoint;
};

export default useAppStore;
