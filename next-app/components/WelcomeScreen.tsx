'use client';

/**
 * ClaudeHydra - WelcomeScreen (Home View)
 * @module components/WelcomeScreen
 *
 * Standalone home/startup page.
 * Shows hero logo, 3 quick action buttons, and recent sessions list.
 */

import { motion } from 'framer-motion';
import { Clock, MessageSquare, Plus, Settings, Sparkles } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppStore } from '@/store/useAppStore';

// ============================================================================
// HELPERS
// ============================================================================

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'przed chwilą';
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h temu`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'wczoraj';
  return `${days} dni temu`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const WelcomeScreen = memo(() => {
  const sessions = useAppStore((s) => s.sessions);
  const chatHistory = useAppStore((s) => s.chatHistory);
  const selectSession = useAppStore((s) => s.selectSession);
  const createSession = useAppStore((s) => s.createSession);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const { resolvedTheme } = useTheme();

  const recentSessions = useMemo(() => {
    return [...sessions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  }, [sessions]);

  const handleNewChat = useCallback(() => {
    createSession();
    setCurrentView('chat');
  }, [createSession, setCurrentView]);

  const handleOpenSession = useCallback(
    (sessionId: string) => {
      selectSession(sessionId);
      setCurrentView('chat');
    },
    [selectSession, setCurrentView],
  );

  return (
    <div className="h-full flex flex-col items-center justify-center p-8 overflow-y-auto">
      {/* Hero Section */}
      <motion.div
        className="flex flex-col items-center gap-4 mb-10"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg shadow-[var(--matrix-accent)]/30">
          <img
            src={resolvedTheme === 'light' ? '/logolight.webp' : '/logodark.webp'}
            alt="ClaudeHydra"
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--matrix-text)' }}>
          Claude HYDRA
        </h1>
        <p className="text-sm text-center max-w-md" style={{ color: 'var(--matrix-text-dim)' }}>
          AI Swarm Control Center — rozpocznij nowy czat lub kontynuuj poprzednią rozmowę.
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg mb-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        <button
          type="button"
          onClick={handleNewChat}
          className="glass-card p-4 flex flex-col items-center gap-2 hover:border-[var(--matrix-accent)]/40 transition-all group cursor-pointer"
        >
          <Plus
            size={22}
            className="transition-transform group-hover:scale-110"
            style={{ color: 'var(--matrix-accent)' }}
          />
          <span
            className="text-xs transition-colors group-hover:text-[var(--matrix-accent)]"
            style={{ color: 'var(--matrix-text)' }}
          >
            Nowy czat
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('chat')}
          className="glass-card p-4 flex flex-col items-center gap-2 hover:border-[var(--matrix-accent)]/40 transition-all group cursor-pointer"
        >
          <MessageSquare
            size={22}
            className="transition-all group-hover:scale-110"
            style={{ color: 'var(--matrix-text-dim)' }}
          />
          <span
            className="text-xs transition-colors group-hover:text-[var(--matrix-accent)]"
            style={{ color: 'var(--matrix-text)' }}
          >
            Chat
          </span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentView('settings')}
          className="glass-card p-4 flex flex-col items-center gap-2 hover:border-[var(--matrix-accent)]/40 transition-all group cursor-pointer"
        >
          <Settings
            size={22}
            className="transition-all group-hover:scale-110"
            style={{ color: 'var(--matrix-text-dim)' }}
          />
          <span
            className="text-xs transition-colors group-hover:text-[var(--matrix-accent)]"
            style={{ color: 'var(--matrix-text)' }}
          >
            Ustawienia
          </span>
        </button>
      </motion.div>

      {/* Recent Sessions */}
      {recentSessions.length > 0 && (
        <motion.div
          className="w-full max-w-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} style={{ color: 'var(--matrix-text-dim)' }} />
            <span
              className="text-xs uppercase tracking-wider"
              style={{ color: 'var(--matrix-text-dim)' }}
            >
              Ostatnie czaty
            </span>
          </div>
          <div className="space-y-2">
            {recentSessions.map((session) => {
              const msgCount = chatHistory[session.id]?.length ?? 0;
              return (
                <button
                  type="button"
                  key={session.id}
                  onClick={() => handleOpenSession(session.id)}
                  className="w-full glass-card p-3 flex items-center gap-3 hover:border-[var(--matrix-accent)]/40 transition-all group cursor-pointer text-left"
                >
                  <MessageSquare
                    size={16}
                    className="flex-shrink-0 transition-colors group-hover:text-[var(--matrix-accent)]"
                    style={{ color: 'var(--matrix-text-dim)' }}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm truncate transition-colors group-hover:text-[var(--matrix-accent)]"
                      style={{ color: 'var(--matrix-text)' }}
                    >
                      {session.title}
                    </p>
                  </div>
                  <div className="flex flex-col items-end flex-shrink-0">
                    <span className="text-[10px]" style={{ color: 'var(--matrix-text-dim)' }}>
                      {timeAgo(session.createdAt)}
                    </span>
                    {msgCount > 0 && (
                      <span className="text-[10px]" style={{ color: 'var(--matrix-text-dim)' }}>
                        {msgCount} wiad.
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {recentSessions.length === 0 && (
        <motion.div
          className="flex flex-col items-center gap-3 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Sparkles size={32} style={{ color: 'var(--matrix-accent)', opacity: 0.4 }} />
          <p className="text-sm" style={{ color: 'var(--matrix-text-dim)' }}>
            Brak czatów. Zacznij nową rozmowę!
          </p>
        </motion.div>
      )}
    </div>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';
export default WelcomeScreen;
