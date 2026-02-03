/**
 * Chat Slice - Chat history and message management
 *
 * Manages: chatHistory, message operations
 */

import type { StateCreator } from 'zustand';
import type { Message, Session } from '../../types';
import { sanitizeContent, sanitizeTitle } from '../../utils/validators';
import { LIMITS } from '../../constants';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatState {
  chatHistory: Record<string, Message[]>;
}

export interface ChatActions {
  addMessage: (msg: Omit<Message, 'id'>) => void;
  updateLastMessage: (content: string) => void;
  clearHistory: () => void;
}

export type ChatSlice = ChatState & ChatActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialChatState: ChatState = {
  chatHistory: {},
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

type SessionState = {
  currentSessionId: string | null;
  sessions: Session[];
};

export const createChatSlice: StateCreator<
  ChatSlice & SessionState,
  [],
  [],
  ChatSlice
> = (set) => ({
  ...initialChatState,

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
});

// =============================================================================
// SELECTORS
// =============================================================================

const EMPTY_ARRAY: Message[] = [];

export const selectChatHistory = (state: ChatSlice) => state.chatHistory;

export const selectCurrentMessages = (state: ChatSlice & SessionState): Message[] => {
  if (!state.currentSessionId) return EMPTY_ARRAY;
  return state.chatHistory[state.currentSessionId] || EMPTY_ARRAY;
};

export const selectMessageCount = (state: ChatSlice & SessionState): number => {
  if (!state.currentSessionId) return 0;
  return (state.chatHistory[state.currentSessionId] || []).length;
};

export const selectHasMessages = (state: ChatSlice & SessionState): boolean => {
  if (!state.currentSessionId) return false;
  const messages = state.chatHistory[state.currentSessionId] || [];
  return messages.length > 0;
};
