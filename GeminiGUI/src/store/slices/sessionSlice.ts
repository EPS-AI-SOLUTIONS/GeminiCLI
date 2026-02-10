/**
 * Session Slice - Session management
 *
 * Manages: sessions, currentSessionId
 */

import type { StateCreator } from 'zustand';
import { LIMITS } from '../../constants';
import type { Session } from '../../types';
import { sanitizeTitle } from '../../utils/validators';

// =============================================================================
// TYPES
// =============================================================================

export interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
}

export interface SessionActions {
  createSession: () => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;
}

export type SessionSlice = SessionState & SessionActions;

// =============================================================================
// INITIAL STATE
// =============================================================================

export const initialSessionState: SessionState = {
  sessions: [],
  currentSessionId: null,
};

// =============================================================================
// SLICE CREATOR
// =============================================================================

type ChatHistoryState = {
  chatHistory: Record<string, unknown[]>;
};

export const createSessionSlice: StateCreator<
  SessionSlice & ChatHistoryState,
  [],
  [],
  SessionSlice
> = (set) => ({
  ...initialSessionState,

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
        sessions: state.sessions.map((s) => (s.id === id ? { ...s, title: sanitizedTitle } : s)),
      };
    }),
});

// =============================================================================
// SELECTORS
// =============================================================================

export const selectSessions = (state: SessionSlice) => state.sessions;
export const selectCurrentSessionId = (state: SessionSlice) => state.currentSessionId;

export const selectSessionById = (id: string) => (state: SessionSlice) => {
  return state.sessions.find((session) => session.id === id);
};
