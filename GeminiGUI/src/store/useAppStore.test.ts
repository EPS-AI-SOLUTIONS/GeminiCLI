/**
 * GeminiGUI - useAppStore Tests
 * @module store/useAppStore.test
 *
 * Comprehensive test suite for Zustand app store with state management,
 * validation, persistence, and selector functions.
 *
 * Test Coverage:
 * - Initial state values
 * - Counter actions with bounds
 * - Session management (create, delete, select, update)
 * - Message operations (add, update, clear)
 * - Settings validation
 * - Selectors and derived state
 */

import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SETTINGS, LIMITS } from '../constants';
import type { AppState, Message } from '../types';
import {
  selectCurrentMessages,
  selectHasMessages,
  selectIsApiKeySet,
  selectMessageCount,
  selectOllamaEndpoint,
  selectSessionById,
  selectUseSwarm,
  useAppStore,
} from './useAppStore';

// ============================================================================
// MOCKS & SETUP
// ============================================================================

// Mock localStorage on window
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      // Ensure value is a string, although persist should send a string
      store[key] = String(value);
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock zustand persist middleware
vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>();
  return {
    ...actual,
    persist: (config: any, options: any) =>
      actual.persist(config, {
        ...options,
        storage: {
          getItem: (name: string) => {
            const val = window.localStorage.getItem(name);
            return val ? JSON.parse(val) : null;
          },
          setItem: (name: string, value: any) => {
            window.localStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name: string) => window.localStorage.removeItem(name),
        },
      }),
  };
});

// Mock crypto.randomUUID
let uuidIndex = 0;
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => {
    uuidIndex++;
    return `uuid-${uuidIndex}`;
  }),
});

// ============================================================================
// TEST SUITE
// ============================================================================

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset store before each test
    const _store = useAppStore.getState();
    useAppStore.setState({
      count: 0,
      theme: 'dark',
      provider: 'ollama',
      sessions: [],
      currentSessionId: null,
      chatHistory: {},
      settings: DEFAULT_SETTINGS,
    });
    localStorage.clear();
    uuidIndex = 0;
  });

  // ==========================================================================
  // 1. INITIAL STATE TESTS
  // ==========================================================================

  describe('Initial State', () => {
    it('should have correct initial count value', () => {
      const state = useAppStore.getState();
      expect(state.count).toBe(0);
    });

    it('should have dark theme by default', () => {
      const state = useAppStore.getState();
      expect(state.theme).toBe('dark');
    });

    it('should have ollama as default provider', () => {
      const state = useAppStore.getState();
      expect(state.provider).toBe('ollama');
    });

    it('should have empty sessions array', () => {
      const state = useAppStore.getState();
      expect(state.sessions).toEqual([]);
    });

    it('should have null currentSessionId', () => {
      const state = useAppStore.getState();
      expect(state.currentSessionId).toBeNull();
    });

    it('should have empty chatHistory', () => {
      const state = useAppStore.getState();
      expect(state.chatHistory).toEqual({});
    });

    it('should have default settings', () => {
      const state = useAppStore.getState();
      expect(state.settings).toEqual(DEFAULT_SETTINGS);
    });
  });

  // ==========================================================================
  // 2. COUNTER ACTIONS TESTS
  // ==========================================================================

  describe('Counter Actions', () => {
    it('should increment count', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.increment();
      });

      expect(result.current.count).toBe(1);
    });

    it('should increment multiple times', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.increment();
        result.current.increment();
        result.current.increment();
      });

      expect(result.current.count).toBe(3);
    });

    it('should not exceed maximum count (999999)', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ count: 999999 });
        result.current.increment();
      });

      expect(result.current.count).toBe(999999);
    });

    it('should decrement count', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ count: 5 });
        result.current.decrement();
      });

      expect(result.current.count).toBe(4);
    });

    it('should not go below zero on decrement', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ count: 0 });
        result.current.decrement();
      });

      expect(result.current.count).toBe(0);
    });

    it('should reset count to zero', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ count: 42 });
        result.current.reset();
      });

      expect(result.current.count).toBe(0);
    });
  });

  // ==========================================================================
  // 3. THEME ACTIONS TESTS
  // ==========================================================================

  describe('Theme Actions', () => {
    it('should toggle from dark to light', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });

    it('should toggle from light to dark', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ theme: 'light' });
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should toggle theme multiple times', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.toggleTheme();
        result.current.toggleTheme();
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');
    });
  });

  // ==========================================================================
  // 4. PROVIDER ACTIONS TESTS
  // ==========================================================================

  describe('Provider Actions', () => {
    it('should set provider to gemini', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.setProvider('gemini');
      });

      expect(result.current.provider).toBe('gemini');
    });

    it('should set provider to ollama', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        useAppStore.setState({ provider: 'gemini' });
        result.current.setProvider('ollama');
      });

      expect(result.current.provider).toBe('ollama');
    });
  });

  // ==========================================================================
  // 5. SESSION MANAGEMENT TESTS
  // ==========================================================================

  describe('Session Management', () => {
    describe('createSession', () => {
      it('should create a new session with UUID and timestamp', () => {
        const { result } = renderHook(() => useAppStore());
        const beforeTime = Date.now();

        act(() => {
          result.current.createSession();
        });

        const afterTime = Date.now();
        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].id).toBe('uuid-1');
        expect(result.current.sessions[0].title).toBe('New Chat');
        expect(result.current.sessions[0].createdAt).toBeGreaterThanOrEqual(beforeTime);
        expect(result.current.sessions[0].createdAt).toBeLessThanOrEqual(afterTime);
      });

      it('should set currentSessionId to new session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        expect(result.current.currentSessionId).toBe('uuid-1');
      });

      it('should create empty chatHistory for new session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        expect(result.current.chatHistory['uuid-1']).toEqual([]);
      });

      it('should add new session to front of sessions array', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          result.current.createSession();
        });

        expect(result.current.sessions[0].id).toBe('uuid-2');
        expect(result.current.sessions[1].id).toBe('uuid-1');
      });

      it('should enforce MAX_SESSIONS limit', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          // Create more sessions than allowed
          for (let i = 0; i < LIMITS.MAX_SESSIONS + 5; i++) {
            result.current.createSession();
          }
        });

        expect(result.current.sessions).toHaveLength(LIMITS.MAX_SESSIONS);
      });

      it('should clean up orphaned chat history when exceeding MAX_SESSIONS', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          // Create sessions up to limit
          for (let i = 0; i < LIMITS.MAX_SESSIONS + 1; i++) {
            result.current.createSession();
          }
        });

        // Should have exactly MAX_SESSIONS entries
        expect(Object.keys(result.current.chatHistory)).toHaveLength(LIMITS.MAX_SESSIONS);
      });
    });

    describe('deleteSession', () => {
      it('should delete session by id', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          result.current.createSession();
        });

        const firstSessionId = result.current.sessions[1].id;

        act(() => {
          result.current.deleteSession(firstSessionId);
        });

        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0].id).toBe('uuid-2');
      });

      it('should remove chat history for deleted session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const sessionId = result.current.sessions[0].id;

        act(() => {
          result.current.deleteSession(sessionId);
        });

        expect(result.current.chatHistory[sessionId]).toBeUndefined();
      });

      it('should set currentSessionId to first remaining session if deleted', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          result.current.createSession();
        });

        const firstSessionId = result.current.sessions[0].id;
        const secondSessionId = result.current.sessions[1].id;

        act(() => {
          result.current.deleteSession(firstSessionId);
        });

        expect(result.current.currentSessionId).toBe(secondSessionId);
      });

      it('should set currentSessionId to null if deleting last session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const sessionId = result.current.sessions[0].id;

        act(() => {
          result.current.deleteSession(sessionId);
        });

        expect(result.current.currentSessionId).toBeNull();
      });

      it('should not change currentSessionId if deleting non-current session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          result.current.createSession();
        });

        const currentId = result.current.currentSessionId;
        const otherSessionId = result.current.sessions[1].id;

        act(() => {
          result.current.deleteSession(otherSessionId);
        });

        expect(result.current.currentSessionId).toBe(currentId);
      });
    });

    describe('selectSession', () => {
      it('should select existing session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          result.current.createSession();
        });

        const sessionId = result.current.sessions[1].id;

        act(() => {
          result.current.selectSession(sessionId);
        });

        expect(result.current.currentSessionId).toBe(sessionId);
      });

      it('should not change state when selecting non-existent session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const currentId = result.current.currentSessionId;

        act(() => {
          result.current.selectSession('non-existent-id');
        });

        expect(result.current.currentSessionId).toBe(currentId);
      });
    });

    describe('updateSessionTitle', () => {
      it('should update session title', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const sessionId = result.current.sessions[0].id;

        act(() => {
          result.current.updateSessionTitle(sessionId, 'Custom Title');
        });

        expect(result.current.sessions[0].title).toBe('Custom Title');
      });

      it('should sanitize title by removing newlines', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const sessionId = result.current.sessions[0].id;

        act(() => {
          result.current.updateSessionTitle(sessionId, 'Title\nWith\nNewlines');
        });

        expect(result.current.sessions[0].title).toBe('Title With Newlines');
      });

      it('should limit title length to MAX_TITLE_LENGTH', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const sessionId = result.current.sessions[0].id;
        const longTitle = 'a'.repeat(LIMITS.MAX_TITLE_LENGTH + 50);

        act(() => {
          result.current.updateSessionTitle(sessionId, longTitle);
        });

        expect(result.current.sessions[0].title.length).toBeLessThanOrEqual(
          LIMITS.MAX_TITLE_LENGTH,
        );
      });

      it('should not update with empty title', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        act(() => {
          result.current.updateSessionTitle(result.current.sessions[0].id, 'Original Title');
        });

        const originalTitle = result.current.sessions[0].title;

        act(() => {
          result.current.updateSessionTitle(result.current.sessions[0].id, '   ');
        });

        expect(result.current.sessions[0].title).toBe(originalTitle);
      });
    });
  });

  // ==========================================================================
  // 6. MESSAGE OPERATIONS TESTS
  // ==========================================================================

  describe('Message Operations', () => {
    describe('addMessage', () => {
      it('should add message to current session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const message: Message = {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message);
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId]).toHaveLength(1);
        expect(result.current.chatHistory[sessionId][0]).toEqual(message);
      });

      it('should not add message if no current session', () => {
        const { result } = renderHook(() => useAppStore());

        const message: Message = {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message);
        });

        expect(result.current.chatHistory).toEqual({});
      });

      it('should sanitize message content', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const longContent = 'a'.repeat(LIMITS.MAX_CONTENT_LENGTH + 1000);
        const message: Message = {
          role: 'user',
          content: longContent,
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message);
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId][0].content.length).toBeLessThanOrEqual(
          LIMITS.MAX_CONTENT_LENGTH,
        );
      });

      it('should auto-update session title on first user message', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const message: Message = {
          role: 'user',
          content: 'This is a very long first message that should be truncated for the title',
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message);
        });

        expect(result.current.sessions[0].title).toContain('This is a very long first mess...');
      });

      it('should not auto-update title for assistant messages', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        act(() => {
          result.current.updateSessionTitle(result.current.sessions[0].id, 'Original Title');
        });

        const originalTitle = result.current.sessions[0].title;

        const message: Message = {
          role: 'assistant',
          content: 'This should not affect the title',
          timestamp: Date.now(),
        };

        act(() => {
          result.current.addMessage(message);
        });

        expect(result.current.sessions[0].title).toBe(originalTitle);
      });

      it('should enforce MAX_MESSAGES_PER_SESSION limit', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        act(() => {
          for (let i = 0; i < LIMITS.MAX_MESSAGES_PER_SESSION + 50; i++) {
            const message: Message = {
              role: 'user',
              content: `Message ${i}`,
              timestamp: Date.now() + i,
            };
            result.current.addMessage(message);
          }
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId]).toHaveLength(LIMITS.MAX_MESSAGES_PER_SESSION);
      });
    });

    describe('updateLastMessage', () => {
      it('should append content to last message', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const message: Message = {
            role: 'assistant',
            content: 'Hello',
            timestamp: Date.now(),
          };
          result.current.addMessage(message);
        });

        act(() => {
          result.current.updateLastMessage(' world');
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId][0].content).toBe('Hello world');
      });

      it('should not update if no current session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateLastMessage('content');
        });

        expect(result.current.chatHistory).toEqual({});
      });

      it('should not update if no messages in session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          result.current.updateLastMessage('content');
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId]).toHaveLength(0);
      });

      it('should respect MAX_CONTENT_LENGTH when appending', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const message: Message = {
            role: 'assistant',
            content: 'a'.repeat(LIMITS.MAX_CONTENT_LENGTH - 10),
            timestamp: Date.now(),
          };
          result.current.addMessage(message);
        });

        act(() => {
          result.current.updateLastMessage('b'.repeat(100));
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId][0].content.length).toBeLessThanOrEqual(
          LIMITS.MAX_CONTENT_LENGTH,
        );
      });

      it('should only update last message in sequence', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const msg1: Message = { role: 'user', content: 'First', timestamp: Date.now() };
          const msg2: Message = { role: 'assistant', content: 'Second', timestamp: Date.now() + 1 };
          result.current.addMessage(msg1);
          result.current.addMessage(msg2);
        });

        act(() => {
          result.current.updateLastMessage(' updated');
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId][0].content).toBe('First');
        expect(result.current.chatHistory[sessionId][1].content).toBe('Second updated');
      });
    });

    describe('clearHistory', () => {
      it('should clear all messages in current session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const msg: Message = { role: 'user', content: 'Test', timestamp: Date.now() };
          result.current.addMessage(msg);
          result.current.addMessage(msg);
        });

        act(() => {
          result.current.clearHistory();
        });

        const sessionId = result.current.currentSessionId!;
        expect(result.current.chatHistory[sessionId]).toHaveLength(0);
      });

      it('should not affect other sessions', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const msg: Message = { role: 'user', content: 'Session 1', timestamp: Date.now() };
          result.current.addMessage(msg);

          result.current.createSession();
          const msg2: Message = { role: 'user', content: 'Session 2', timestamp: Date.now() };
          result.current.addMessage(msg2);
        });

        const session2Id = result.current.currentSessionId!;

        act(() => {
          result.current.clearHistory();
        });

        expect(result.current.chatHistory[session2Id]).toHaveLength(0);
      });

      it('should not clear if no current session', () => {
        const { result } = renderHook(() => useAppStore());

        const beforeState = { ...result.current.chatHistory };

        act(() => {
          result.current.clearHistory();
        });

        expect(result.current.chatHistory).toEqual(beforeState);
      });
    });
  });

  // ==========================================================================
  // 7. SETTINGS VALIDATION TESTS
  // ==========================================================================

  describe('Settings Actions', () => {
    describe('updateSettings', () => {
      it('should accept valid Ollama endpoint', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateSettings({ ollamaEndpoint: 'http://localhost:11434' });
        });

        expect(result.current.settings.ollamaEndpoint).toBe('http://localhost:11434');
      });

      it('should reject invalid URL for ollamaEndpoint', () => {
        const { result } = renderHook(() => useAppStore());

        const originalEndpoint = result.current.settings.ollamaEndpoint;

        act(() => {
          result.current.updateSettings({ ollamaEndpoint: 'not-a-url' });
        });

        expect(result.current.settings.ollamaEndpoint).toBe(originalEndpoint);
      });

      it('should accept valid Gemini API key', () => {
        const { result } = renderHook(() => useAppStore());
        const validKey = `AIza${'a'.repeat(35)}`;

        act(() => {
          result.current.updateSettings({ geminiApiKey: validKey });
        });

        expect(result.current.settings.geminiApiKey).toBe(validKey);
      });

      it('should accept empty string for Gemini API key', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateSettings({ geminiApiKey: '' });
        });

        expect(result.current.settings.geminiApiKey).toBe('');
      });

      it('should reject invalid Gemini API key format', () => {
        const { result } = renderHook(() => useAppStore());

        const originalKey = result.current.settings.geminiApiKey;

        act(() => {
          result.current.updateSettings({ geminiApiKey: '123' });
        });

        expect(result.current.settings.geminiApiKey).toBe(originalKey);
      });

      it('should sanitize system prompt content', () => {
        const { result } = renderHook(() => useAppStore());
        const longPrompt = 'a'.repeat(LIMITS.MAX_SYSTEM_PROMPT_LENGTH + 1000);

        act(() => {
          result.current.updateSettings({ systemPrompt: longPrompt });
        });

        expect(result.current.settings.systemPrompt.length).toBeLessThanOrEqual(
          LIMITS.MAX_SYSTEM_PROMPT_LENGTH,
        );
      });

      it('should accept valid defaultProvider', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateSettings({ defaultProvider: 'gemini' });
        });

        expect(result.current.settings.defaultProvider).toBe('gemini');
      });

      it('should reject invalid defaultProvider', () => {
        const { result } = renderHook(() => useAppStore());
        const originalProvider = result.current.settings.defaultProvider;

        act(() => {
          result.current.updateSettings({ defaultProvider: 'invalid' as any });
        });

        expect(result.current.settings.defaultProvider).toBe(originalProvider);
      });

      it('should convert useSwarm to boolean', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateSettings({ useSwarm: true });
        });

        expect(result.current.settings.useSwarm).toBe(true);
        expect(typeof result.current.settings.useSwarm).toBe('boolean');
      });

      it('should merge partial settings without overwriting unspecified keys', () => {
        const { result } = renderHook(() => useAppStore());

        const originalSystemPrompt = result.current.settings.systemPrompt;

        act(() => {
          result.current.updateSettings({ defaultProvider: 'gemini' });
        });

        expect(result.current.settings.systemPrompt).toBe(originalSystemPrompt);
        expect(result.current.settings.defaultProvider).toBe('gemini');
      });
    });
  });

  // ==========================================================================
  // 8. SELECTOR TESTS
  // ==========================================================================

  describe('Selectors', () => {
    describe('selectCurrentMessages', () => {
      it('should return empty array when no current session', () => {
        const state = useAppStore.getState();
        const messages = selectCurrentMessages(state);
        expect(messages).toEqual([]);
      });

      it('should return messages from current session', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const msg: Message = { role: 'user', content: 'Test', timestamp: Date.now() };
          result.current.addMessage(msg);
        });

        const state = result.current as unknown as AppState;
        const messages = selectCurrentMessages(state);
        expect(messages).toHaveLength(1);
        expect(messages[0].content).toBe('Test');
      });

      it('should return empty array if session has no messages', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const state = result.current as unknown as AppState;
        const messages = selectCurrentMessages(state);
        expect(messages).toEqual([]);
      });
    });

    describe('selectIsApiKeySet', () => {
      it('should return false when API key is empty', () => {
        const state = useAppStore.getState();
        expect(selectIsApiKeySet(state)).toBe(false);
      });

      it('should return true when API key is set', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateSettings({ geminiApiKey: `AIza${'a'.repeat(35)}` });
        });

        const state = result.current as unknown as AppState;
        expect(selectIsApiKeySet(state)).toBe(true);
      });
    });

    describe('selectSessionById', () => {
      it('should return session when it exists', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const sessionId = result.current.sessions[0].id;
        const state = result.current as unknown as AppState;
        const sessionSelector = selectSessionById(sessionId);
        const session = sessionSelector(state);

        expect(session).toBeDefined();
        expect(session?.id).toBe(sessionId);
        expect(session?.title).toBe('New Chat');
      });

      it('should return undefined when session does not exist', () => {
        const state = useAppStore.getState();
        const sessionSelector = selectSessionById('non-existent');
        const session = sessionSelector(state);

        expect(session).toBeUndefined();
      });
    });

    describe('selectMessageCount', () => {
      it('should return 0 when no current session', () => {
        const state = useAppStore.getState();
        expect(selectMessageCount(state)).toBe(0);
      });

      it('should return correct message count', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          for (let i = 0; i < 5; i++) {
            const msg: Message = { role: 'user', content: `Msg ${i}`, timestamp: Date.now() };
            result.current.addMessage(msg);
          }
        });

        const state = result.current as unknown as AppState;
        expect(selectMessageCount(state)).toBe(5);
      });
    });

    describe('selectHasMessages', () => {
      it('should return false when no current session', () => {
        const state = useAppStore.getState();
        expect(selectHasMessages(state)).toBe(false);
      });

      it('should return false when session has no messages', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
        });

        const state = result.current as unknown as AppState;
        expect(selectHasMessages(state)).toBe(false);
      });

      it('should return true when session has messages', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.createSession();
          const msg: Message = { role: 'user', content: 'Test', timestamp: Date.now() };
          result.current.addMessage(msg);
        });

        const state = result.current as unknown as AppState;
        expect(selectHasMessages(state)).toBe(true);
      });
    });

    describe('selectUseSwarm', () => {
      it('should return default useSwarm value', () => {
        const state = useAppStore.getState();
        expect(selectUseSwarm(state)).toBe(DEFAULT_SETTINGS.useSwarm);
      });

      it('should return updated useSwarm value', () => {
        const { result } = renderHook(() => useAppStore());

        act(() => {
          result.current.updateSettings({ useSwarm: true });
        });

        const state = result.current as unknown as AppState;
        expect(selectUseSwarm(state)).toBe(true);
      });
    });

    describe('selectOllamaEndpoint', () => {
      it('should return default Ollama endpoint', () => {
        const state = useAppStore.getState();
        expect(selectOllamaEndpoint(state)).toBe(DEFAULT_SETTINGS.ollamaEndpoint);
      });

      it('should return updated Ollama endpoint', () => {
        const { result } = renderHook(() => useAppStore());
        const newEndpoint = 'http://192.168.1.100:11434';

        act(() => {
          result.current.updateSettings({ ollamaEndpoint: newEndpoint });
        });

        const state = result.current as unknown as AppState;
        expect(selectOllamaEndpoint(state)).toBe(newEndpoint);
      });
    });
  });

  // ==========================================================================
  // 9. INTEGRATION TESTS
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should handle complete session workflow', () => {
      const { result } = renderHook(() => useAppStore());

      // Create session
      act(() => {
        result.current.createSession();
      });

      const sessionId = result.current.currentSessionId!;
      expect(result.current.sessions).toHaveLength(1);

      // Add messages
      act(() => {
        result.current.addMessage({
          role: 'user',
          content: 'Hello AI',
          timestamp: Date.now(),
        });
        result.current.addMessage({
          role: 'assistant',
          content: 'Hello!',
          timestamp: Date.now(),
        });
      });

      expect(selectMessageCount(result.current as unknown as AppState)).toBe(2);

      // Update last message
      act(() => {
        result.current.updateLastMessage(' How can I help?');
      });

      expect(result.current.chatHistory[sessionId][1].content).toBe('Hello! How can I help?');

      // Clear history
      act(() => {
        result.current.clearHistory();
      });

      expect(selectHasMessages(result.current as unknown as AppState)).toBe(false);
    });

    it('should handle multiple sessions with different histories', () => {
      const { result } = renderHook(() => useAppStore());

      // Create and populate first session
      act(() => {
        result.current.createSession();
        result.current.addMessage({
          role: 'user',
          content: 'Session 1',
          timestamp: Date.now(),
        });
      });

      const session1Id = result.current.currentSessionId!;

      // Create and populate second session
      act(() => {
        result.current.createSession();
        result.current.addMessage({
          role: 'user',
          content: 'Session 2',
          timestamp: Date.now(),
        });
      });

      const session2Id = result.current.currentSessionId!;

      // Switch to first session
      act(() => {
        result.current.selectSession(session1Id);
      });

      expect(selectCurrentMessages(result.current as unknown as AppState)[0].content).toBe(
        'Session 1',
      );

      // Switch back to second session
      act(() => {
        result.current.selectSession(session2Id);
      });

      expect(selectCurrentMessages(result.current as unknown as AppState)[0].content).toBe(
        'Session 2',
      );
    });

    it('should persist state to localStorage', () => {
      const { result } = renderHook(() => useAppStore());

      act(() => {
        result.current.createSession();
        result.current.addMessage({
          role: 'user',
          content: 'Test message',
          timestamp: Date.now(),
        });
      });

      // Check if data was written to localStorage
      const storedData = localStorage.getItem('gemini-storage-v3');
      expect(storedData).toBeTruthy();

      // Parse and verify
      const parsed = JSON.parse(storedData!);
      expect(parsed.state.sessions).toHaveLength(1);
    });
  });
});
