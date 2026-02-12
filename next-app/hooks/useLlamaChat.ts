'use client';

/**
 * useLlamaChat - Hook for llama.cpp chat with streaming support
 * @module hooks/useLlamaChat
 *
 * Uses SSE-based streaming via LlamaService.
 */

import { useCallback, useRef, useState } from 'react';
import { type ChatMessage, LlamaService } from '../services';

export interface UseLlamaChatOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface UseLlamaChatReturn {
  // State
  isStreaming: boolean;
  streamContent: string;
  error: string | null;

  // Actions
  sendMessage: (messages: ChatMessage[], options?: UseLlamaChatOptions) => Promise<string>;
  sendMessageStream: (messages: ChatMessage[], options?: UseLlamaChatOptions) => Promise<void>;
  generate: (prompt: string, system?: string, options?: UseLlamaChatOptions) => Promise<string>;
  generateStream: (prompt: string, system?: string, options?: UseLlamaChatOptions) => Promise<void>;
  cancelStream: () => void;
  clearStream: () => void;
}

export const useLlamaChat = (): UseLlamaChatReturn => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  // Send chat message (non-streaming)
  const sendMessage = useCallback(
    async (messages: ChatMessage[], options?: UseLlamaChatOptions): Promise<string> => {
      setError(null);
      try {
        const response = await LlamaService.chat(messages, {
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        });
        return response;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
        throw e;
      }
    },
    [],
  );

  // Send chat message with streaming (SSE)
  const sendMessageStream = useCallback(
    async (messages: ChatMessage[], options?: UseLlamaChatOptions): Promise<void> => {
      setError(null);
      setStreamContent('');
      setIsStreaming(true);

      controllerRef.current = LlamaService.chatStream(
        messages,
        {
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        },
        {
          onChunk: (chunk) => setStreamContent((prev) => prev + chunk),
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
          },
        },
      );
    },
    [],
  );

  // Generate from prompt (non-streaming)
  const generate = useCallback(
    async (prompt: string, system?: string, options?: UseLlamaChatOptions): Promise<string> => {
      setError(null);
      try {
        const response = await LlamaService.generate(prompt, {
          system,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        });
        return response;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(errorMessage);
        throw e;
      }
    },
    [],
  );

  // Generate from prompt with streaming (SSE)
  const generateStream = useCallback(
    async (prompt: string, system?: string, options?: UseLlamaChatOptions): Promise<void> => {
      setError(null);
      setStreamContent('');
      setIsStreaming(true);

      controllerRef.current = LlamaService.generateStream(
        prompt,
        {
          system,
          temperature: options?.temperature,
          maxTokens: options?.maxTokens,
        },
        {
          onChunk: (chunk) => setStreamContent((prev) => prev + chunk),
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            setError(err);
            setIsStreaming(false);
          },
        },
      );
    },
    [],
  );

  // Cancel ongoing stream via AbortController
  const cancelStream = useCallback(() => {
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Clear stream content
  const clearStream = useCallback(() => {
    setStreamContent('');
    setError(null);
  }, []);

  return {
    isStreaming,
    streamContent,
    error,
    sendMessage,
    sendMessageStream,
    generate,
    generateStream,
    cancelStream,
    clearStream,
  };
};

export default useLlamaChat;
