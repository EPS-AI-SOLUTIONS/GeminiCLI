/**
 * ClaudeHydra - Optimized Zustand Selectors
 * @module store/selectors
 *
 * Memoized selectors for performance optimization in component subscriptions.
 *
 * Usage for primitive selectors (string, number, boolean):
 *   const isApiKeySet = useAppStore(selectIsApiKeySet);
 *
 * Usage for object/array selectors (use useShallow):
 *   import { useShallow } from 'zustand/shallow';
 *   const settings = useAppStore(useShallow(selectSettings));
 */

import type { AppState, Message, Session } from '../types';

// Extended AppState with pagination (mirrors definition in useAppStore)
interface PaginationState {
  messagesPerPage: number;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  setMessagesPerPage: (count: number) => void;
}

type AppStateWithPagination = AppState & PaginationState;

// ============================================================================
// MEMOIZATION HELPER
// ============================================================================

function createStableSelector<T extends Record<string, unknown>>(
  selector: (state: AppStateWithPagination) => T,
): (state: AppStateWithPagination) => T {
  let prev: T | undefined;
  return (state: AppStateWithPagination): T => {
    const next = selector(state);
    if (prev !== undefined) {
      const keys = Object.keys(next) as Array<keyof T>;
      const isEqual = keys.every((k) => prev?.[k] === next[k]);
      if (isEqual) return prev;
    }
    prev = next;
    return next;
  };
}

// ============================================================================
// BASIC STATE SELECTORS (Primitive Values)
// ============================================================================

export const selectTheme = (state: AppState) => state.theme;
export const selectProvider = (state: AppState) => state.provider;
export const selectCurrentSessionId = (state: AppState) => state.currentSessionId;
export const selectCount = (state: AppState) => state.count;
export const selectCurrentView = (state: AppState) => state.currentView;

// ============================================================================
// SETTINGS SELECTORS
// ============================================================================

export const selectSettings = (state: AppState) => state.settings;

export const selectIsApiKeySet = (state: AppState): boolean => {
  return Boolean(state.settings.geminiApiKey && state.settings.geminiApiKey.length > 0);
};

export const selectOllamaEndpoint = (state: AppState): string => {
  return state.settings.ollamaEndpoint ?? '';
};

export const selectSystemPrompt = (state: AppState): string => {
  return state.settings.systemPrompt;
};

export const selectDefaultProvider = (state: AppState) => {
  return state.settings.defaultProvider;
};

export const selectUseSwarm = (state: AppState): boolean => {
  return state.settings.useSwarm;
};

export const selectGeminiApiKey = (state: AppState): string => {
  return state.settings.geminiApiKey;
};

// ============================================================================
// SESSION SELECTORS
// ============================================================================

export const selectSessions = (state: AppState) => state.sessions;

export const selectSessionById =
  (id: string) =>
  (state: AppState): Session | undefined => {
    return state.sessions.find((session) => session.id === id);
  };

export const selectCurrentSession = (state: AppState): Session | undefined => {
  if (!state.currentSessionId) return undefined;
  return state.sessions.find((s) => s.id === state.currentSessionId);
};

export const selectSessionCount = (state: AppState): number => {
  return state.sessions.length;
};

// ============================================================================
// MESSAGE SELECTORS
// ============================================================================

export const selectChatHistory = (state: AppState) => state.chatHistory;

export const selectCurrentMessages = (state: AppState): Message[] => {
  if (!state.currentSessionId) return [];
  return state.chatHistory[state.currentSessionId] || [];
};

export const selectMessagesBySessionId =
  (id: string) =>
  (state: AppState): Message[] => {
    return state.chatHistory[id] || [];
  };

export const selectMessageCount = (state: AppState): number => {
  if (!state.currentSessionId) return 0;
  return (state.chatHistory[state.currentSessionId] || []).length;
};

export const selectMessageCountBySessionId =
  (id: string) =>
  (state: AppState): number => {
    return (state.chatHistory[id] || []).length;
  };

export const selectHasMessages = (state: AppState): boolean => {
  if (!state.currentSessionId) return false;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0;
};

export const selectSessionHasMessages =
  (id: string) =>
  (state: AppState): boolean => {
    return (state.chatHistory[id] || []).length > 0;
  };

export const selectLastMessage = (state: AppState): Message | undefined => {
  if (!state.currentSessionId) return undefined;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0 ? messages[messages.length - 1] : undefined;
};

export const selectLastMessageBySessionId =
  (id: string) =>
  (state: AppState): Message | undefined => {
    const messages = state.chatHistory[id] || [];
    return messages.length > 0 ? messages[messages.length - 1] : undefined;
  };

// ============================================================================
// COMPOSITE SELECTORS (Multiple State Slices)
// ============================================================================

export const selectIsAppReady = (state: AppState): boolean => {
  return state.sessions.length > 0 && state.currentSessionId !== null;
};

export const selectSessionMetadata = createStableSelector((state) => ({
  totalSessions: state.sessions.length,
  currentSessionId: state.currentSessionId,
  hasCurrentSession: state.currentSessionId !== null,
  hasMessages: selectHasMessages(state),
  messageCount: selectMessageCount(state),
}));

export const selectApiConfigStatus = createStableSelector((state) => ({
  hasGeminiKey: selectIsApiKeySet(state),
  ollamaEndpoint: state.settings.ollamaEndpoint,
  isConfigured: selectIsApiKeySet(state) || (state.settings.ollamaEndpoint ?? '').length > 0,
}));

export const selectRuntimeSettings = createStableSelector((state) => ({
  provider: state.provider,
  defaultProvider: state.settings.defaultProvider,
  useSwarm: state.settings.useSwarm,
  theme: state.theme,
}));

// ============================================================================
// PAGINATION SELECTORS
// ============================================================================

const EMPTY_MESSAGES: Message[] = [];

export const selectPaginatedMessages = (state: AppStateWithPagination): Message[] => {
  if (!state.currentSessionId) return EMPTY_MESSAGES;
  const allMessages = state.chatHistory[state.currentSessionId] || EMPTY_MESSAGES;
  const totalMessages = allMessages.length;
  const { messagesPerPage, currentPage } = state;
  const endOffset = totalMessages - currentPage * messagesPerPage;
  const startOffset = Math.max(0, endOffset - messagesPerPage);
  return allMessages.slice(startOffset, endOffset);
};

export const selectTotalPages = (state: AppStateWithPagination): number => {
  if (!state.currentSessionId) return 0;
  const allMessages = state.chatHistory[state.currentSessionId] || EMPTY_MESSAGES;
  return Math.ceil(allMessages.length / state.messagesPerPage);
};

export const selectPaginationInfo = createStableSelector((state) => ({
  currentPage: state.currentPage,
  totalPages: selectTotalPages(state),
  messagesPerPage: state.messagesPerPage,
  totalMessages: selectMessageCount(state),
  hasNextPage: state.currentPage < selectTotalPages(state) - 1,
  hasPreviousPage: state.currentPage > 0,
}));
