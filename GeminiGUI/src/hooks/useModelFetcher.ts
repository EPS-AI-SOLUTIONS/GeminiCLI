/**
 * useModelFetcher - Generic Model Fetching Hook
 * @module hooks/useModelFetcher
 *
 * A unified, generic hook for fetching AI models from various providers.
 * Replaces provider-specific implementations with a single configurable hook.
 *
 * @example
 * ```tsx
 * // For Gemini
 * const { models, isLoading, error } = useModelFetcher({
 *   provider: 'gemini',
 *   credential: apiKey,
 *   fallbackModels: FALLBACK_MODELS.gemini,
 *   tauriCommand: TAURI_COMMANDS.GET_GEMINI_MODELS,
 *   queryKey: QUERY_KEYS.GEMINI_MODELS,
 * });
 *
 * // For Ollama
 * const { models, isLoading, error } = useModelFetcher({
 *   provider: 'ollama',
 *   credential: endpoint,
 *   fallbackModels: FALLBACK_MODELS.ollama,
 *   tauriCommand: TAURI_COMMANDS.GET_OLLAMA_MODELS,
 *   queryKey: QUERY_KEYS.OLLAMA_MODELS,
 * });
 * ```
 */

import { useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useModels } from './useModels';

// ============================================================================
// Types
// ============================================================================

export type ProviderType = 'gemini' | 'ollama' | 'openai' | 'anthropic' | string;

export interface UseModelFetcherOptions {
  /** Provider identifier (e.g., 'gemini', 'ollama') */
  provider: ProviderType;

  /** API key or endpoint URL depending on provider */
  credential?: string;

  /** Fallback models when API fails or no credential */
  fallbackModels: readonly string[] | string[];

  /** Tauri command name to invoke */
  tauriCommand: string;

  /** React Query cache key */
  queryKey: string;

  /** Parameter name for credential in Tauri command (default: auto-detect) */
  credentialParamName?: 'apiKey' | 'endpoint' | string;

  /** Number of retry attempts (default: 1) */
  retry?: number;

  /** Whether credential is required for fetching (default: true for most providers) */
  requireCredential?: boolean;

  /** Enable/disable the query */
  enabled?: boolean;
}

export interface UseModelFetcherReturn {
  /** List of available models */
  models: string[];

  /** Loading state */
  isLoading: boolean;

  /** Error object if fetch failed */
  error: Error | null;

  /** Function to manually refetch models */
  refetch: () => void;

  /** Whether credential is set */
  hasCredential: boolean;

  /** Provider identifier */
  provider: ProviderType;
}

// ============================================================================
// Default Credential Parameter Names
// ============================================================================

const DEFAULT_CREDENTIAL_PARAMS: Record<string, string> = {
  gemini: 'apiKey',
  openai: 'apiKey',
  anthropic: 'apiKey',
  ollama: 'endpoint',
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Generic hook for fetching models from any AI provider
 */
export function useModelFetcher({
  provider,
  credential,
  fallbackModels,
  tauriCommand,
  queryKey,
  credentialParamName,
  retry = 1,
  requireCredential = provider !== 'ollama',
  enabled = true,
}: UseModelFetcherOptions): UseModelFetcherReturn {
  // Memoize fallback models to prevent unnecessary re-renders
  const memoizedFallback = useMemo(
    () => [...fallbackModels],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fallbackModels.join(',')]
  );

  // Determine the credential parameter name
  const paramName = credentialParamName ?? DEFAULT_CREDENTIAL_PARAMS[provider] ?? 'credential';

  // Check if we have a valid credential
  const hasCredential = !!credential;

  // Build the fetch function
  const fetchModels = useCallback(async (): Promise<string[]> => {
    console.log(`[useModelFetcher:${provider}] Fetching models...`);

    // No credential and it's required - return fallback models
    if (requireCredential && !credential) {
      console.warn(`[useModelFetcher:${provider}] No credential - using fallback models`);
      return memoizedFallback;
    }

    // Build invoke parameters dynamically
    const invokeParams: Record<string, string> = {};
    if (credential) {
      invokeParams[paramName] = credential;
    }

    const fetchedModels = await invoke<string[]>(tauriCommand, invokeParams);

    console.log(`[useModelFetcher:${provider}] Models loaded:`, fetchedModels);
    return fetchedModels;
  }, [provider, credential, requireCredential, memoizedFallback, paramName, tauriCommand]);

  // Use the base useModels hook
  const { models, isLoading, error, refetch } = useModels({
    queryKey: [queryKey, credential ?? ''],
    queryFn: fetchModels,
    fallbackModels: memoizedFallback,
    retry,
    enabled,
  });

  return {
    models,
    isLoading,
    error,
    refetch,
    hasCredential,
    provider,
  };
}

export default useModelFetcher;
