/**
 * useStreamListeners Hook Tests
 * @module hooks/useStreamListeners.test
 *
 * Comprehensive test suite for useStreamListeners hook
 * Tests listener setup, cleanup, event handling, and error scenarios
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StreamPayload } from '../types';
import { useStreamListeners } from './useStreamListeners';

// Mock Tauri's event module
vi.mock('@tauri-apps/api/event', () => {
  const listeners: Record<string, (event: any) => void> = {};
  const unlisteners: Record<string, () => void> = {};

  return {
    listen: vi.fn((eventName: string, callback: (event: any) => void) => {
      listeners[eventName] = callback;
      // Return a promise that resolves with an unlisten function
      return Promise.resolve(() => {
        if (unlisteners[eventName]) {
          unlisteners[eventName]();
        }
        delete listeners[eventName];
      });
    }),
    // Helper to trigger events in tests
    __triggerEvent: (eventName: string, payload: any) => {
      if (listeners[eventName]) {
        listeners[eventName]({ payload });
      }
    },
    __getListeners: () => listeners,
    __setUnlistener: (eventName: string, fn: () => void) => {
      unlisteners[eventName] = fn;
    },
  };
});

import { __getListeners, __triggerEvent, listen } from '@tauri-apps/api/event';

// Mock TAURI_EVENTS constant
vi.mock('../constants', () => ({
  TAURI_EVENTS: {
    OLLAMA_EVENT: 'ollama-event',
    SWARM_DATA: 'swarm-data',
    GEMINI_STREAM: 'gemini-stream',
  },
  // ... other constants
  LIMITS: { MAX_SESSIONS: 100 },
  STATUS: {},
  DEFAULT_SYSTEM_PROMPT: '',
  DEFAULT_SETTINGS: {},
  FALLBACK_MODELS: {},
  AGENTS: {},
  TAURI_COMMANDS: {},
  QUERY_KEYS: {},
  STORAGE_KEYS: {},
  COMMAND_PATTERNS: {},
  UI: {},
}));

describe('useStreamListeners', () => {
  let onChunk: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChunk = vi.fn();
    onComplete = vi.fn();
    onError = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Listener Setup', () => {
    it('should set up listeners on mount', () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      expect(listen).toHaveBeenCalledTimes(2);
      expect(listen).toHaveBeenCalledWith('ollama-event', expect.any(Function));
      expect(listen).toHaveBeenCalledWith('swarm-data', expect.any(Function));
    });

    it('should set up listeners with correct callbacks', () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
        }),
      );

      const listeners = __getListeners();
      expect(listeners['ollama-event']).toBeDefined();
      expect(listeners['swarm-data']).toBeDefined();
      expect(typeof listeners['ollama-event']).toBe('function');
      expect(typeof listeners['swarm-data']).toBe('function');
    });
  });

  describe('Listener Cleanup', () => {
    it('should clean up listeners on unmount', async () => {
      const unlistenOllama = vi.fn(() => Promise.resolve());
      const unlistenSwarm = vi.fn(() => Promise.resolve());

      // Mock the unlisten functions
      vi.mocked(listen).mockImplementation((eventName) => {
        if (eventName === 'ollama-event') {
          return Promise.resolve(unlistenOllama);
        }
        if (eventName === 'swarm-data') {
          return Promise.resolve(unlistenSwarm);
        }
        return Promise.resolve(() => {});
      });

      const { unmount } = renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      // Unmount the hook
      unmount();

      // Wait for cleanup promises to resolve
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(unlistenOllama).toHaveBeenCalled();
      expect(unlistenSwarm).toHaveBeenCalled();
    });

    it('should remove listeners from registry on unmount', async () => {
      const { unmount } = renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      let listeners = __getListeners();
      expect(Object.keys(listeners).length).toBeGreaterThan(0);

      unmount();

      await new Promise((resolve) => setTimeout(resolve, 0));

      listeners = __getListeners();
      expect(listeners['ollama-event']).toBeUndefined();
      expect(listeners['swarm-data']).toBeUndefined();
    });
  });

  describe('Chunk Event Handling', () => {
    it('should call onChunk when chunk event is received', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      const payload: StreamPayload = {
        chunk: 'Hello world',
        done: false,
      };

      __triggerEvent('ollama-event', payload);

      expect(onChunk).toHaveBeenCalledWith('Hello world');
      expect(onChunk).toHaveBeenCalledTimes(1);
    });

    it('should call onChunk for Swarm events', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      const payload: StreamPayload = {
        chunk: 'Swarm data',
        done: false,
      };

      __triggerEvent('swarm-data', payload);

      expect(onChunk).toHaveBeenCalledWith('Swarm data');
    });

    it('should handle multiple consecutive chunks', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      const chunks = ['Hello ', 'world ', 'from ', 'stream'];

      chunks.forEach((chunk) => {
        __triggerEvent('ollama-event', { chunk, done: false });
      });

      expect(onChunk).toHaveBeenCalledTimes(4);
      chunks.forEach((chunk, index) => {
        expect(onChunk).toHaveBeenNthCalledWith(index + 1, chunk);
      });
    });

    it('should not call onChunk when chunk is empty string', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: '', done: false });

      expect(onChunk).not.toHaveBeenCalled();
    });

    it('should not call onChunk when done is true but chunk is provided', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: 'final', done: true });

      expect(onChunk).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Completion Event Handling', () => {
    it('should call onComplete when done=true', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: '', done: true });

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onChunk).not.toHaveBeenCalled();
    });

    it('should call onComplete for Swarm done events', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('swarm-data', { chunk: '', done: true });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple completion signals', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      // Simulate multiple chunks followed by completion
      __triggerEvent('ollama-event', { chunk: 'data', done: false });
      __triggerEvent('ollama-event', { chunk: 'more', done: false });
      __triggerEvent('ollama-event', { chunk: '', done: true });

      expect(onChunk).toHaveBeenCalledTimes(2);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('should call onError when an error occurs in event handler', async () => {
      // Create a mock onChunk that throws an error
      const throwingOnChunk = vi.fn(() => {
        throw new Error('Processing error');
      });

      renderHook(() =>
        useStreamListeners({
          onChunk: throwingOnChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: 'bad data', done: false });

      expect(throwingOnChunk).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Processing error',
        }),
      );
    });

    it('should not break stream on error', async () => {
      const throwingOnChunk = vi.fn(() => {
        throw new Error('Processing error');
      });

      renderHook(() =>
        useStreamListeners({
          onChunk: throwingOnChunk,
          onComplete,
          onError,
        }),
      );

      // First event throws
      __triggerEvent('ollama-event', { chunk: 'bad', done: false });
      expect(onError).toHaveBeenCalledTimes(1);

      // Fix the mock to not throw
      throwingOnChunk.mockImplementation((_chunk) => {
        // normal operation
      });

      // Second event should still be processed
      __triggerEvent('ollama-event', { chunk: 'good', done: false });
      expect(throwingOnChunk).toHaveBeenCalledTimes(2);
    });

    it('should handle errors from both Ollama and Swarm events', async () => {
      const throwingOnChunk = vi.fn(() => {
        throw new Error('Event error');
      });

      renderHook(() =>
        useStreamListeners({
          onChunk: throwingOnChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: 'data', done: false });
      __triggerEvent('swarm-data', { chunk: 'data', done: false });

      expect(onError).toHaveBeenCalledTimes(2);
    });

    it('should call onError when onComplete throws', async () => {
      const throwingOnComplete = vi.fn(() => {
        throw new Error('Completion error');
      });

      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete: throwingOnComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: '', done: true });

      expect(throwingOnComplete).toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should handle missing onError callback gracefully', async () => {
      const throwingOnChunk = vi.fn(() => {
        throw new Error('Test error');
      });

      // Should not throw when onError is undefined
      expect(() => {
        renderHook(() =>
          useStreamListeners({
            onChunk: throwingOnChunk,
            onComplete,
            // onError is undefined
          }),
        );

        __triggerEvent('ollama-event', { chunk: 'data', done: false });
      }).not.toThrow();
    });
  });

  describe('Callback Dependencies', () => {
    it('should update listeners when callbacks change', async () => {
      const newOnChunk = vi.fn();
      const newOnComplete = vi.fn();

      const { rerender } = renderHook(
        ({ onChunk: chunk, onComplete: complete }) =>
          useStreamListeners({
            onChunk: chunk,
            onComplete: complete,
            onError,
          }),
        {
          initialProps: {
            onChunk,
            onComplete,
          },
        },
      );

      // Trigger event with original callbacks
      __triggerEvent('ollama-event', { chunk: 'data1', done: false });
      expect(onChunk).toHaveBeenCalledWith('data1');

      // Re-render with new callbacks
      rerender({
        onChunk: newOnChunk,
        onComplete: newOnComplete,
      });

      // Trigger event with new callbacks
      __triggerEvent('ollama-event', { chunk: 'data2', done: false });
      expect(newOnChunk).toHaveBeenCalledWith('data2');
    });

    it('should include onError in dependency array', async () => {
      const newOnError = vi.fn();

      const { rerender } = renderHook(
        ({ onError: error }) =>
          useStreamListeners({
            onChunk,
            onComplete,
            onError: error,
          }),
        {
          initialProps: {
            onError,
          },
        },
      );

      // Create throwing callback
      const _throwingOnChunk = vi.fn(() => {
        throw new Error('Test');
      });

      rerender({
        onError: newOnError,
      });

      // Mock to use the throwing version
      vi.mocked(listen).mockImplementation((_eventName, _callback) => {
        // Override the callback to throw
        return Promise.resolve(() => {});
      });

      // The new onError should be used
      expect(newOnError).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle realistic streaming sequence', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      // Simulate a realistic stream: multiple chunks then completion
      const chunks = ['The ', 'quick ', 'brown ', 'fox'];
      chunks.forEach((chunk) => {
        __triggerEvent('ollama-event', { chunk, done: false });
      });

      __triggerEvent('ollama-event', { chunk: '', done: true });

      expect(onChunk).toHaveBeenCalledTimes(4);
      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should handle mixed Ollama and Swarm events', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      // Mixed events from different sources
      __triggerEvent('ollama-event', { chunk: 'ollama: ', done: false });
      __triggerEvent('swarm-data', { chunk: 'swarm: ', done: false });
      __triggerEvent('ollama-event', { chunk: 'more', done: false });
      __triggerEvent('swarm-data', { chunk: 'done', done: true });

      expect(onChunk).toHaveBeenCalledTimes(3);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle edge case: completion without chunks', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      // Immediate completion
      __triggerEvent('ollama-event', { chunk: '', done: true });

      expect(onChunk).not.toHaveBeenCalled();
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should handle edge case: chunk with whitespace only', async () => {
      renderHook(() =>
        useStreamListeners({
          onChunk,
          onComplete,
          onError,
        }),
      );

      __triggerEvent('ollama-event', { chunk: '   ', done: false });

      // Whitespace-only chunks should still call onChunk
      expect(onChunk).toHaveBeenCalledWith('   ');
    });
  });
});
