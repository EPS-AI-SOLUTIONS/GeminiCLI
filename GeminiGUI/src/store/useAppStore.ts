/**
 * GeminiGUI - Zustand App Store
 * @module store/useAppStore
 *
 * Centralized state management with validation and persistence.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { Message, Session, Settings, AppState } from '../types';
import {
  isValidUrl,
  isValidApiKey,
  sanitizeContent,
  sanitizeTitle,
} from '../utils/validators';
import {
  LIMITS,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
} from '../constants';

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial State
      count: 0,
      theme: 'dark',
      sessions: [],
      currentSessionId: null,
      chatHistory: {},
      settings: DEFAULT_SETTINGS,
      provider: 'ollama',

      setProvider: (provider) => set({ provider }),

      // ========================================
      // Counter Actions
      // ========================================
      increment: () =>
        set((state) => ({
          count: Math.min(state.count + 1, 999999),
        })),

      decrement: () =>
        set((state) => ({
          count: Math.max(state.count - 1, 0),
        })),

      reset: () => set({ count: 0 }),

      // ========================================
      // Theme Actions
      // ========================================
      toggleTheme: () =>
        set((state) => ({
          theme: state.theme === 'dark' ? 'light' : 'dark',
        })),

      // ========================================
      // Session Actions
      // ========================================
      createSession: () => {
        const id = crypto.randomUUID();
        const newSession: Session = {
          id,
          title: 'New Chat',
          createdAt: Date.now(),
        };

        set((state) => {
          let sessions = [newSession, ...state.sessions];

          // Enforce session limit
          if (sessions.length > LIMITS.MAX_SESSIONS) {
            const removedIds = sessions.slice(LIMITS.MAX_SESSIONS).map((s) => s.id);
            sessions = sessions.slice(0, LIMITS.MAX_SESSIONS);

            // Clean up orphaned chat history
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
      // Message Actions
      // ========================================
      addMessage: (msg) =>
        set((state) => {
          if (!state.currentSessionId) return state;

          // Sanitize message content
          const sanitizedMsg: Message = {
            ...msg,
            content: sanitizeContent(msg.content, LIMITS.MAX_CONTENT_LENGTH),
          };

          const currentMessages = state.chatHistory[state.currentSessionId] || [];

          // Enforce message limit per session
          let updatedMessages = [...currentMessages, sanitizedMsg];
          if (updatedMessages.length > LIMITS.MAX_MESSAGES_PER_SESSION) {
            updatedMessages = updatedMessages.slice(-LIMITS.MAX_MESSAGES_PER_SESSION);
          }

          // Auto-update session title on first user message
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

          // Sanitize and limit content growth
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
      // Settings Actions
      // ========================================
      updateSettings: (newSettings) =>
        set((state) => {
          const validated: Partial<Settings> = {};

          // Validate ollamaEndpoint
          if (newSettings.ollamaEndpoint !== undefined) {
            if (isValidUrl(newSettings.ollamaEndpoint)) {
              validated.ollamaEndpoint = newSettings.ollamaEndpoint;
            } else {
              console.warn('[Store] Invalid Ollama endpoint URL');
            }
          }

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

// ============================================================================
// SELECTORS (for optimized subscriptions)
// ============================================================================

const EMPTY_ARRAY: Message[] = [];

export const selectTheme = (state: AppState) => state.theme;
export const selectSettings = (state: AppState) => state.settings;
export const selectSessions = (state: AppState) => state.sessions;
export const selectCurrentSessionId = (state: AppState) => state.currentSessionId;
export const selectChatHistory = (state: AppState) => state.chatHistory;

/**
 * Get messages for current session
 */
export const selectCurrentMessages = (state: AppState): Message[] => {
  if (!state.currentSessionId) return EMPTY_ARRAY;
  return state.chatHistory[state.currentSessionId] || EMPTY_ARRAY;
};

/**
 * Check if Gemini API key is set
 * @param state - Current app state
 * @returns Boolean indicating if API key exists and is non-empty
 */
export const selectIsApiKeySet = (state: AppState): boolean => {
  return Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.length > 0);
};

/**
 * Get session by ID (curried selector for memoization)
 * @param id - Session ID to find
 * @returns Function that takes state and returns the session or undefined
 */
export const selectSessionById = (id: string) => (state: AppState) => {
  return state.sessions.find((session) => session.id === id);
};

/**
 * Get total message count in current session
 * @param state - Current app state
 * @returns Number of messages in the current session
 */
export const selectMessageCount = (state: AppState): number => {
  if (!state.currentSessionId) return 0;
  return (state.chatHistory[state.currentSessionId] || []).length;
};

/**
 * Check if current session has any messages
 * @param state - Current app state
 * @returns Boolean indicating if there are messages in current session
 */
export const selectHasMessages = (state: AppState): boolean => {
  if (!state.currentSessionId) return false;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0;
};

/**
 * Get useSwarm setting
 * @param state - Current app state
 * @returns Boolean indicating if swarm mode is enabled
 */
export const selectUseSwarm = (state: AppState): boolean => {
  return state.settings.useSwarm;
};

/**
 * Get Ollama endpoint setting
 * @param state - Current app state
 * @returns Ollama endpoint URL string
 */
export const selectOllamaEndpoint = (state: AppState): string => {
  return state.settings.ollamaEndpoint;
};

export default useAppStore;
