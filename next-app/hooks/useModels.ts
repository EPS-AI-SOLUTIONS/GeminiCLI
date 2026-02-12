'use client';

/**
 * useModels - Generic Model Fetching Hook Factory
 * @module hooks/useModels
 *
 * Provides a reusable pattern for fetching model lists from various providers.
 * Handles loading states, errors, and fallback models consistently.
 */

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

interface UseModelsOptions<T> {
  queryKey: string[];
  queryFn: () => Promise<T[]>;
  fallbackModels: T[];
  enabled?: boolean;
  staleTime?: number;
  retry?: number;
}

interface UseModelsReturn<T> {
  models: T[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Generic hook factory for fetching models from any provider
 */
export function useModels<T>({
  queryKey,
  queryFn,
  fallbackModels,
  enabled = true,
  staleTime = Infinity,
  retry = 1,
}: UseModelsOptions<T>): UseModelsReturn<T> {
  const query = useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const result = await queryFn();
        // Return fallback if result is empty
        if (!result || result.length === 0) {
          return fallbackModels;
        }
        return result;
      } catch (error) {
        console.error(`[useModels] Failed to fetch:`, error);
        return fallbackModels;
      }
    },
    enabled,
    staleTime,
    retry,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const models = useMemo(() => {
    return query.data ?? fallbackModels;
  }, [query.data, fallbackModels]);

  return {
    models,
    isLoading: query.isPending,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export default useModels;
