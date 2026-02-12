'use client';

/**
 * ClaudeHydra - Home Page
 * =======================
 * Landing page that shows the WelcomeScreen component.
 * Users can navigate from here to the chat view.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { useIsHydrated } from '@/store/useHydrated';
import WelcomeScreen from '@/components/WelcomeScreen';
import { SuspenseFallback } from '@/components';

export default function HomePage() {
  const router = useRouter();
  const hydrated = useIsHydrated();
  const currentView = useAppStore((state) => state.currentView);

  // If store indicates user was on chat, redirect there
  useEffect(() => {
    if (!hydrated) return;
    if (currentView === 'chat') {
      router.replace('/chat');
    }
  }, [hydrated, currentView, router]);

  if (!hydrated) {
    return <SuspenseFallback message="Inicjalizacja ClaudeHydra..." />;
  }

  return <WelcomeScreen />;
}
