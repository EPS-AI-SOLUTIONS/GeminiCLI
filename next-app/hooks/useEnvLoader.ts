'use client';

/**
 * useEnvLoader - Environment Variables Loader
 * @module hooks/useEnvLoader
 *
 * Loads API keys and settings from backend on startup.
 */

import { useEffect, useState } from 'react';
import { SystemService } from '../services';
import { useAppStore } from '../store/useAppStore';

interface UseEnvLoaderReturn {
  isLoaded: boolean;
  error: string | null;
}

/**
 * Hook for loading environment variables from backend API
 */
export const useEnvLoader = (): UseEnvLoaderReturn => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSettings = useAppStore((state) => state.updateSettings);

  useEffect(() => {
    const loadEnv = async () => {
      try {
        const env = await SystemService.getEnvVars();

        const newSettings: Record<string, string> = {};

        // Always load API key from .env if available (env takes priority)
        const envKey = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
        if (envKey) {
          newSettings.geminiApiKey = envKey;
          console.log('[useEnvLoader] Loaded API key from .env');
        }

        // Apply loaded settings
        if (Object.keys(newSettings).length > 0) {
          updateSettings(newSettings);
        }

        setIsLoaded(true);
        setError(null);
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn('[useEnvLoader] Failed to load .env:', errorMessage);
        setError(errorMessage);
        setIsLoaded(true);
      }
    };

    loadEnv();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateSettings]);

  return {
    isLoaded,
    error,
  };
};

export default useEnvLoader;
