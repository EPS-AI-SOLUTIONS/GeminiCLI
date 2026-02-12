/**
 * ClaudeHydra - SSR Hydration Guard Hook
 * @module store/useHydrated
 *
 * Prevents Zustand persist hydration mismatch in Next.js SSR.
 * The store uses `skipHydration: true`, so hydration must be
 * triggered manually on the client side.
 *
 * Usage in layout.tsx or top-level client component:
 *   function StoreHydration() {
 *     useHydrated();
 *     return null;
 *   }
 *
 * Usage in components that need hydrated state:
 *   const isHydrated = useIsHydrated();
 *   if (!isHydrated) return <Skeleton />;
 */

'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from './useAppStore';

/**
 * Triggers Zustand persist rehydration on client mount.
 * Call once in root layout or provider component.
 */
export function useHydrated(): void {
  useEffect(() => {
    // Trigger rehydration from localStorage on client
    useAppStore.persist.rehydrate();
  }, []);
}

/**
 * Returns whether the store has been hydrated from localStorage.
 * Use this to conditionally render UI that depends on persisted state.
 *
 * @returns true once hydration is complete, false during SSR and initial render
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist to finish rehydration
    const unsub = useAppStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g., from useHydrated() call), set immediately
    if (useAppStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return () => {
      unsub();
    };
  }, []);

  return hydrated;
}
