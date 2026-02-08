/**
 * useStreamListeners - Tauri Stream Event Listeners
 * @module hooks/useStreamListeners
 *
 * Sets up listeners for Ollama and Swarm streaming events.
 */

import { useEffect, useCallback, useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { TAURI_EVENTS } from '../constants';
import type { StreamPayload } from '../types';

interface UseStreamListenersOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError?: (error: unknown) => void;
}

interface UseStreamListenersReturn {
  cancelStream: () => void;
}

/**
 * Hook for listening to Tauri streaming events with AbortController support.
 *
 * @example
 * ```tsx
 * const { cancelStream } = useStreamListeners({
 *   onChunk: (chunk) => updateLastMessage(chunk),
 *   onComplete: () => setIsStreaming(false),
 *   onError: (err) => console.error(err),
 * });
 *
 * // Cancel from UI:
 * <button onClick={cancelStream}>Stop</button>
 * ```
 */
export const useStreamListeners = ({
  onChunk,
  onComplete,
  onError,
}: UseStreamListenersOptions): UseStreamListenersReturn => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStreamEvent = useCallback(
    (payload: StreamPayload, signal: AbortSignal) => {
      // Ignore events if the stream has been aborted
      if (signal.aborted) return;

      const { chunk, done } = payload;
      if (!done && chunk) {
        onChunk(chunk);
      } else if (done) {
        onComplete();
      }
    },
    [onChunk, onComplete]
  );

  useEffect(() => {
    // Guard: skip if Tauri API is not available (web mode)
    if (typeof window === 'undefined' || !(window as any).__TAURI_INTERNALS__) {
      return;
    }

    // Create a new AbortController for this listener lifecycle
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    // Listen to Llama/Gemini stream events
    const unlistenLlama = listen<StreamPayload>(
      TAURI_EVENTS.LLAMA_STREAM,
      (event) => {
        if (signal.aborted) return;
        try {
          handleStreamEvent(event.payload, signal);
        } catch (error) {
          console.error('[StreamListeners] Llama event error:', error);
          onError?.(error);
        }
      }
    );

    // Listen to Gemini stream events
    const unlistenGemini = listen<StreamPayload>(
      TAURI_EVENTS.GEMINI_STREAM,
      (event) => {
        if (signal.aborted) return;
        try {
          handleStreamEvent(event.payload, signal);
        } catch (error) {
          console.error('[StreamListeners] Gemini event error:', error);
          onError?.(error);
        }
      }
    );

    // Listen to Swarm events
    const unlistenSwarm = listen<StreamPayload>(
      TAURI_EVENTS.SWARM_DATA,
      (event) => {
        if (signal.aborted) return;
        try {
          handleStreamEvent(event.payload, signal);
        } catch (error) {
          console.error('[StreamListeners] Swarm event error:', error);
          onError?.(error);
        }
      }
    );

    // Cleanup listeners on unmount or dependency change
    return () => {
      controller.abort();
      abortControllerRef.current = null;
      unlistenLlama.then((f) => f());
      unlistenGemini.then((f) => f());
      unlistenSwarm.then((f) => f());
    };
  }, [handleStreamEvent, onError]);

  /**
   * Cancel the active stream from the UI.
   * Aborts the current controller, which causes all event handlers
   * to ignore subsequent payloads, then triggers onComplete to
   * reset the streaming state.
   */
  const cancelStream = useCallback(() => {
    const controller = abortControllerRef.current;
    if (controller && !controller.signal.aborted) {
      console.log('[StreamListeners] Stream cancelled by user.');
      controller.abort();
      onComplete();
    }
  }, [onComplete]);

  return { cancelStream };
};

export default useStreamListeners;
