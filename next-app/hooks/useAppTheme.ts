'use client';

/**
 * useAppTheme - Theme Management Hook (Adapter)
 * Backward-compatible adapter that delegates to ThemeContext.
 */

import { useTheme } from '../contexts/ThemeContext';

interface UseAppThemeReturn {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (theme: 'dark' | 'light' | 'system') => void;
  isDark: boolean;
}

export const useAppTheme = (): UseAppThemeReturn => {
  const { resolvedTheme, toggleTheme, setTheme } = useTheme();

  return {
    theme: resolvedTheme,
    toggleTheme,
    setTheme,
    isDark: resolvedTheme === 'dark',
  };
};

export default useAppTheme;
