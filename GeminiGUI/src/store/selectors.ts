/**
 * GeminiGUI - Optimized Zustand Selectors
 * @module store/selectors
 *
 * Memoized selectors for performance optimization in component subscriptions.
 * These selectors prevent unnecessary re-renders by only triggering when
 * their specific slice of state changes.
 *
 * Usage for primitive selectors (string, number, boolean):
 *   const isApiKeySet = useAppStore(selectIsApiKeySet);
 *
 * Usage for object/array selectors (use useShallow to prevent unnecessary re-renders):
 *   import { useShallow } from 'zustand/shallow';
 *   const settings = useAppStore(useShallow(selectSettings));
 *   const sessions = useAppStore(useShallow(selectSessions));
 *   const metadata = useAppStore(useShallow(selectSessionMetadata));
 */

import type { AppState, Session, Message } from '../types';

// ============================================================================
// BASIC STATE SELECTORS (Primitive Values)
// ============================================================================

/**
 * Select theme setting
 * @param state - Current app state
 * @returns 'dark' | 'light'
 */
export const selectTheme = (state: AppState) => state.theme;

/**
 * Select current provider
 * @param state - Current app state
 * @returns 'ollama' | 'gemini'
 */
export const selectProvider = (state: AppState) => state.provider;

/**
 * Select current session ID
 * @param state - Current app state
 * @returns Session ID string or null
 */
export const selectCurrentSessionId = (state: AppState) => state.currentSessionId;

/**
 * Select counter value
 * @param state - Current app state
 * @returns Counter number
 */
export const selectCount = (state: AppState) => state.count;

// ============================================================================
// SETTINGS SELECTORS
// ============================================================================

/**
 * Select entire settings object
 * @param state - Current app state
 * @returns Settings object
 */
export const selectSettings = (state: AppState) => state.settings;

/**
 * Check if Gemini API key is set
 * Optimized selector to avoid full settings subscription
 * @param state - Current app state
 * @returns Boolean indicating if API key exists and is non-empty
 */
export const selectIsApiKeySet = (state: AppState): boolean => {
  return Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.length > 0);
};

/**
 * Get Ollama endpoint setting
 * Optimized selector to avoid full settings subscription
 * @param state - Current app state
 * @returns Ollama endpoint URL string
 */
export const selectOllamaEndpoint = (state: AppState): string => {
  return state.settings.ollamaEndpoint ?? '';
};

/**
 * Get system prompt setting
 * @param state - Current app state
 * @returns System prompt string
 */
export const selectSystemPrompt = (state: AppState): string => {
  return state.settings.systemPrompt;
};

/**
 * Get default provider setting
 * @param state - Current app state
 * @returns Default provider ('ollama' | 'gemini')
 */
export const selectDefaultProvider = (state: AppState) => {
  return state.settings.defaultProvider;
};

/**
 * Get useSwarm setting
 * Optimized selector to avoid full settings subscription
 * @param state - Current app state
 * @returns Boolean indicating if swarm mode is enabled
 */
export const selectUseSwarm = (state: AppState): boolean => {
  return state.settings.useSwarm;
};

/**
 * Get Gemini API key
 * Warning: Use with caution - returns sensitive data
 * @param state - Current app state
 * @returns API key string
 */
export const selectGeminiApiKey = (state: AppState): string => {
  return state.settings.geminiApiKey;
};

// ============================================================================
// SESSION SELECTORS
// ============================================================================

/**
 * Select all sessions
 * @param state - Current app state
 * @returns Array of all sessions
 */
export const selectSessions = (state: AppState) => state.sessions;

/**
 * Get session by ID (curried selector for memoization)
 * Enables per-session subscriptions without full sessions array subscription
 *
 * Usage:
 *   const session = useAppStore(selectSessionById(mySessionId));
 *
 * @param id - Session ID to find
 * @returns Function that takes state and returns the session or undefined
 */
export const selectSessionById = (id: string) => (state: AppState): Session | undefined => {
  return state.sessions.find((session) => session.id === id);
};

/**
 * Get current session object
 * @param state - Current app state
 * @returns Current session object or undefined
 */
export const selectCurrentSession = (state: AppState): Session | undefined => {
  if (!state.currentSessionId) return undefined;
  return state.sessions.find((s) => s.id === state.currentSessionId);
};

/**
 * Get count of total sessions
 * @param state - Current app state
 * @returns Number of sessions
 */
export const selectSessionCount = (state: AppState): number => {
  return state.sessions.length;
};

// ============================================================================
// MESSAGE SELECTORS
// ============================================================================

/**
 * Select entire chat history
 * @param state - Current app state
 * @returns Record of session ID to messages array
 */
export const selectChatHistory = (state: AppState) => state.chatHistory;

/**
 * Get messages for current session
 * @param state - Current app state
 * @returns Array of messages in current session
 */
export const selectCurrentMessages = (state: AppState): Message[] => {
  if (!state.currentSessionId) return [];
  return state.chatHistory[state.currentSessionId] || [];
};

/**
 * Get messages by session ID (curried selector for memoization)
 *
 * Usage:
 *   const messages = useAppStore(selectMessagesBySessionId(sessionId));
 *
 * @param id - Session ID
 * @returns Function that takes state and returns messages for that session
 */
export const selectMessagesBySessionId = (id: string) => (state: AppState): Message[] => {
  return state.chatHistory[id] || [];
};

/**
 * Get total message count in current session
 * Optimized selector that only returns a number
 * @param state - Current app state
 * @returns Number of messages in the current session
 */
export const selectMessageCount = (state: AppState): number => {
  if (!state.currentSessionId) return 0;
  return (state.chatHistory[state.currentSessionId] || []).length;
};

/**
 * Get message count for a specific session
 * @param id - Session ID
 * @returns Function that takes state and returns message count
 */
export const selectMessageCountBySessionId = (id: string) => (state: AppState): number => {
  return (state.chatHistory[id] || []).length;
};

/**
 * Check if current session has any messages
 * Optimized selector that only returns a boolean
 * @param state - Current app state
 * @returns Boolean indicating if there are messages in current session
 */
export const selectHasMessages = (state: AppState): boolean => {
  if (!state.currentSessionId) return false;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0;
};

/**
 * Check if a specific session has messages
 * @param id - Session ID
 * @returns Function that takes state and returns boolean
 */
export const selectSessionHasMessages = (id: string) => (state: AppState): boolean => {
  return (state.chatHistory[id] || []).length > 0;
};

/**
 * Get last message in current session
 * @param state - Current app state
 * @returns Last message or undefined
 */
export const selectLastMessage = (state: AppState): Message | undefined => {
  if (!state.currentSessionId) return undefined;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0 ? messages[messages.length - 1] : undefined;
};

/**
 * Get last message by session ID
 * @param id - Session ID
 * @returns Function that takes state and returns last message or undefined
 */
export const selectLastMessageBySessionId = (id: string) => (state: AppState): Message | undefined => {
  const messages = state.chatHistory[id] || [];
  return messages.length > 0 ? messages[messages.length - 1] : undefined;
};

// ============================================================================
// COMPOSITE SELECTORS (Multiple State Slices)
// ============================================================================

/**
 * Check if app is ready (has sessions and current session selected)
 * @param state - Current app state
 * @returns Boolean indicating if app is in ready state
 */
export const selectIsAppReady = (state: AppState): boolean => {
  return state.sessions.length > 0 && state.currentSessionId !== null;
};

/**
 * Get session metadata (count, current ID, has messages)
 * Useful for header/status displays
 * @param state - Current app state
 * @returns Object with session metadata
 */
export const selectSessionMetadata = (state: AppState) => ({
  totalSessions: state.sessions.length,
  currentSessionId: state.currentSessionId,
  hasCurrentSession: state.currentSessionId !== null,
  hasMessages: selectHasMessages(state),
  messageCount: selectMessageCount(state),
});

/**
 * Get API configuration status
 * Useful for settings validation displays
 * @param state - Current app state
 * @returns Object with API configuration status
 */
export const selectApiConfigStatus = (state: AppState) => ({
  hasGeminiKey: selectIsApiKeySet(state),
  ollamaEndpoint: state.settings.ollamaEndpoint,
  isConfigured: selectIsApiKeySet(state) || (state.settings.ollamaEndpoint ?? '').length > 0,
});

/**
 * Get runtime settings summary
 * Useful for displaying active configuration
 * @param state - Current app state
 * @returns Object with current settings summary
 */
export const selectRuntimeSettings = (state: AppState) => ({
  provider: state.provider,
  defaultProvider: state.settings.defaultProvider,
  useSwarm: state.settings.useSwarm,
  theme: state.theme,
});
