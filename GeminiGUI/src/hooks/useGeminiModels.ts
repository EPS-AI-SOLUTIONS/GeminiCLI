/**
 * useGeminiModels - Gemini Model Fetching Hook
 * @module hooks/useGeminiModels
 *
 * Fetches available Gemini models from the API.
 * Falls back to default models if API key not set.
 *
 * Now uses the generic useModelFetcher internally.
 */

import { FALLBACK_MODELS, QUERY_KEYS, TAURI_COMMANDS } from '../constants';
import { useAppStore } from '../store/useAppStore';
import { useModelFetcher } from './useModelFetcher';

// ============================================================================
// Types (preserved for backward compatibility)
// ============================================================================

export interface UseGeminiModelsReturn {
  models: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  hasApiKey: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for fetching Gemini models
 *
 * @example
 * ```tsx
 * const { models, isLoading, error, hasApiKey } = useGeminiModels();
 * ```
 */
export const useGeminiModels = (): UseGeminiModelsReturn => {
  const geminiApiKey = useAppStore((state) => state.settings.geminiApiKey);

  const { models, isLoading, error, refetch, hasCredential } = useModelFetcher({
    provider: 'gemini',
    credential: geminiApiKey,
    fallbackModels: FALLBACK_MODELS.gemini,
    tauriCommand: TAURI_COMMANDS.GET_GEMINI_MODELS,
    queryKey: QUERY_KEYS.GEMINI_MODELS,
    credentialParamName: 'apiKey',
    retry: 1,
    requireCredential: true,
  });

  return {
    models,
    isLoading,
    error,
    refetch,
    hasApiKey: hasCredential,
  };
};

export default useGeminiModels;
