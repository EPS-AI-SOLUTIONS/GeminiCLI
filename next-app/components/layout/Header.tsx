'use client';

/**
 * ClaudeHydra - Application Header - Tissaia Style
 * Top bar with breadcrumbs, status indicator, and quick actions.
 */

import { ChevronRight, RefreshCw, Server, Sparkles } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useViewTheme } from '@/hooks';
import { useAppStore } from '@/store/useAppStore';

interface HeaderProps {
  isDark?: boolean;
  statusBadgeState: { className: string; text: string };
  currentModel: string;
}

const viewLabels: Record<string, { pl: string; en: string }> = {
  chat: { pl: 'Chat', en: 'Chat' },
  agents: { pl: 'Agenci', en: 'Agents' },
  history: { pl: 'Historia', en: 'History' },
  settings: { pl: 'Ustawienia', en: 'Settings' },
  status: { pl: 'Status', en: 'Status' },
};

export const Header = memo<HeaderProps>(({ statusBadgeState, currentModel }) => {
  const { i18n } = useTranslation();
  const { resolvedTheme } = useTheme();
  const { currentView, setCurrentView } = useAppStore();
  const theme = useViewTheme();

  const currentLabel = viewLabels[currentView]?.[i18n.language as 'pl' | 'en'] || currentView;

  return (
    <header className={`px-6 py-3.5 border-b ${theme.border} ${theme.header}`}>
      <div className="flex items-center justify-between">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setCurrentView('chat')}
            className={`flex items-center gap-1 ${theme.textMuted} hover:text-matrix-accent transition-colors`}
          >
            <Sparkles size={14} />
            <span className="font-medium">ClaudeHydra</span>
          </button>
          <ChevronRight size={14} className={theme.iconMuted} />
          <span className={`${theme.textAccent} font-medium`}>{currentLabel}</span>
          <div className="flex items-center gap-2 ml-4">
            <span
              className={`w-2 h-2 rounded-full ${resolvedTheme === 'light' ? 'bg-emerald-500' : 'bg-matrix-accent'} animate-pulse`}
            />
            <span className={`text-sm ${theme.textMuted}`}>{currentModel}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          <div
            className={`status-badge flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusBadgeState.className} transition-all duration-300`}
          >
            <Server size={10} />
            <span className="font-mono font-medium text-[10px]">{statusBadgeState.text}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className={`p-2 rounded-lg ${theme.btnGhost} hover:rotate-180 transition-all duration-500`}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';
