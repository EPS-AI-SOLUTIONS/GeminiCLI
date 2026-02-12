'use client';

/**
 * useStreamListeners - SSE Stream Controller
 * @module hooks/useStreamListeners
 *
 * Provides a shared AbortController ref for SSE-based streaming.
 * Streaming is handled per-call by individual services
 * (GeminiService.promptStream, LlamaService.chatStream, etc.)
 * which return AbortController instances. This hook stores
 * the active controller and exposes cancelStream().
 */

import { useCallback, useRef } from 'react';

interface UseStreamListenersOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError?: (error: unknown) => void;
}

interface UseStreamListenersReturn {
  cancelStream: () => void;
  /** Store an AbortController from an SSE call so cancelStream can abort it */
  setController: (controller: AbortController | null) => void;
  /** Get the callbacks for passing to SSE service methods */
  callbacks: {
    onChunk: (chunk: string) => void;
    onDone: () => void;
    onError: (error: string) => void;
  };
}

export const useStreamListeners = ({
  onChunk,
  onComplete,
  onError,
}: UseStreamListenersOptions): UseStreamListenersReturn => {
  const controllerRef = useRef<AbortController | null>(null);

  const setController = useCallback((controller: AbortController | null) => {
    controllerRef.current = controller;
  }, []);

  const cancelStream = useCallback(() => {
    const controller = controllerRef.current;
    if (controller && !controller.signal.aborted) {
      controller.abort();
      controllerRef.current = null;
      onComplete();
    }
  }, [onComplete]);

  const callbacks = {
    onChunk,
    onDone: onComplete,
    onError: (error: string) => {
      onError?.(error);
      onComplete();
    },
  };

  return { cancelStream, setController, callbacks };
};

export default useStreamListeners;
