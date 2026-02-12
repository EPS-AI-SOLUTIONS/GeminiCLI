'use client';

/**
 * ClaudeHydra - Client-side Providers
 * ====================================
 * Wraps the app in all required providers:
 * - QueryClientProvider (TanStack Query)
 * - ThemeProvider (dark/light/system)
 * - Toaster (sonner notifications)
 * - Zustand store hydration
 *
 * This is a client component because providers
 * require React context and browser APIs.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from 'sonner';

import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { useHydrated } from '@/store/useHydrated';

/**
 * Inner providers that need ThemeContext access
 * (e.g., Toaster needs isDark for theme prop)
 */
function InnerProviders({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        richColors
        closeButton
      />
    </>
  );
}

/**
 * Zustand hydration wrapper.
 * Ensures the persisted store is rehydrated before
 * rendering children, preventing SSR/client mismatch.
 */
function StoreHydration({ children }: { children: ReactNode }) {
  useHydrated();
  return <>{children}</>;
}

/**
 * Root Providers component.
 * Creates a fresh QueryClient per render to avoid
 * sharing state between server and client.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="claudehydra-theme">
        <StoreHydration>
          <InnerProviders>{children}</InnerProviders>
        </StoreHydration>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
