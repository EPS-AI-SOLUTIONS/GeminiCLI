'use client';

/**
 * useModelFetcher - Generic Model Fetching Hook
 * @module hooks/useModelFetcher
 *
 * A unified, generic hook for fetching AI models from various providers.
 * Uses HTTP API for all provider communications.
 */

import { useCallback, useMemo } from 'react';
import { GeminiService } from '../services';
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

  /** React Query cache key */
  queryKey: string;

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
// Hook Implementation
// ============================================================================

/**
 * Generic hook for fetching models from any AI provider via HTTP API
 */
export function useModelFetcher({
  provider,
  credential,
  fallbackModels,
  queryKey,
  retry = 1,
  requireCredential = provider !== 'ollama',
  enabled = true,
}: UseModelFetcherOptions): UseModelFetcherReturn {
  // Memoize fallback models to prevent unnecessary re-renders
  const memoizedFallback = useMemo(
    () => [...fallbackModels],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fallbackModels],
  );

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

    // Use the appropriate service based on provider
    let fetchedModels: string[];

    if (provider === 'gemini') {
      fetchedModels = await GeminiService.getModels(credential!);
    } else {
      // For other providers, return fallback for now
      console.warn(`[useModelFetcher:${provider}] Provider not yet implemented via HTTP API`);
      return memoizedFallback;
    }

    console.log(`[useModelFetcher:${provider}] Models loaded:`, fetchedModels);
    return fetchedModels;
  }, [provider, credential, requireCredential, memoizedFallback]);

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
