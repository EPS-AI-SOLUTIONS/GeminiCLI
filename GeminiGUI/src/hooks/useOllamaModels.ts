/**
 * useOllamaModels - Ollama Model Fetching Hook
 * @module hooks/useOllamaModels
 *
 * Fetches available Ollama models from the local server.
 */

import { useQuery } from '@tanstack/react-query';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/useAppStore';
import { QUERY_KEYS, FALLBACK_MODELS, TAURI_COMMANDS } from '../constants';
import { useMemo } from 'react';

interface UseOllamaModelsReturn {
  models: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Hook for fetching Ollama models
 *
 * @example
 * ```tsx
 * const { models, isLoading, error } = useOllamaModels();
 * ```
 */
export const useOllamaModels = (): UseOllamaModelsReturn => {
  const ollamaEndpoint = useAppStore((state) => state.settings.ollamaEndpoint);

  const {
    data: models,
    isPending: isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [QUERY_KEYS.OLLAMA_MODELS, ollamaEndpoint],
    queryFn: async (): Promise<string[]> => {
      console.log('[useOllamaModels] Fetching models...');

      try {
        const fetchedModels = await invoke<string[]>(
          TAURI_COMMANDS.GET_OLLAMA_MODELS,
          { endpoint: ollamaEndpoint }
        );

        console.log('[useOllamaModels] Models loaded:', fetchedModels);

        if (fetchedModels && fetchedModels.length > 0) {
          return fetchedModels;
        }

        return [...FALLBACK_MODELS.ollama];
      } catch (error) {
        console.warn('[useOllamaModels] Failed to fetch (server might be down):', error);
        // Do not throw, just return fallback/empty so UI doesn't crash
        return [...FALLBACK_MODELS.ollama];
      }
    },
    enabled: true,
    retry: 2,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const finalModels = useMemo(() => models ?? [...FALLBACK_MODELS.ollama], [models]);

  return {
    models: finalModels,
    isLoading,
    error: error as Error | null,
    refetch,
  };
};

export default useOllamaModels;
