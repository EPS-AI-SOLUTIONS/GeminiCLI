/**
 * useOllamaModels - Ollama Model Fetching Hook
 * @module hooks/useOllamaModels
 *
 * Fetches available Ollama models from the local server.
 *
 * Now uses the generic useModelFetcher internally.
 */

import { useAppStore } from '../store/useAppStore';
import { QUERY_KEYS, FALLBACK_MODELS, TAURI_COMMANDS } from '../constants';
import { useModelFetcher } from './useModelFetcher';

// ============================================================================
// Types (preserved for backward compatibility)
// ============================================================================

export interface UseOllamaModelsReturn {
  models: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

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

  const { models, isLoading, error, refetch } = useModelFetcher({
    provider: 'ollama',
    credential: ollamaEndpoint,
    fallbackModels: FALLBACK_MODELS.llama,
    tauriCommand: TAURI_COMMANDS.LLAMA_LIST_MODELS,
    queryKey: QUERY_KEYS.LLAMA_MODELS,
    credentialParamName: 'endpoint',
    retry: 2, // Ollama uses more retries since server might be starting up
    requireCredential: false, // Ollama doesn't require credential to be set
  });

  return {
    models,
    isLoading,
    error,
    refetch,
  };
};

export default useOllamaModels;
