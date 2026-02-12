'use client';

/**
 * ClaudeHydra - TabBar Component
 * @module components/chat/TabBar
 *
 * Browser-style tab bar for managing multiple chat sessions.
 */

import { Pin, Plus, X } from 'lucide-react';
import { memo, useCallback, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';
import { useViewTheme } from '@/hooks';
import { useAppStore } from '@/store/useAppStore';
import type { ChatTab } from '@/types';

// ============================================================================
// TAB ITEM
// ============================================================================

interface TabItemProps {
  tab: ChatTab;
  isActive: boolean;
  onSwitch: (tabId: string) => void;
  onClose: (tabId: string) => void;
  onTogglePin: (tabId: string) => void;
  messageCount: number;
}

const TabItem = memo<TabItemProps>(
  ({ tab, isActive, onSwitch, onClose, onTogglePin, messageCount }) => {
    const theme = useViewTheme();
    const [isHovering, setIsHovering] = useState(false);

    const handleMouseDown = useCallback(
      (e: React.MouseEvent) => {
        if (e.button === 1) {
          e.preventDefault();
          if (!tab.isPinned) onClose(tab.id);
        }
      },
      [tab.id, tab.isPinned, onClose],
    );

    const handleClose = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        onClose(tab.id);
      },
      [tab.id, onClose],
    );

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onTogglePin(tab.id);
      },
      [tab.id, onTogglePin],
    );

    return (
      <div
        role="tab"
        aria-selected={isActive}
        tabIndex={0}
        onClick={() => onSwitch(tab.id)}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onSwitch(tab.id);
        }}
        className={`
          group relative flex items-center gap-2 px-4 py-2.5 min-w-[140px] max-w-[220px]
          cursor-pointer select-none text-sm font-semibold rounded-t-xl transition-all duration-200
          ${
            isActive
              ? theme.isLight
                ? 'bg-white/80 text-black border-b-[3px] border-emerald-500 shadow-md backdrop-blur-sm'
                : 'bg-white/15 text-white border-b-[3px] border-white shadow-lg shadow-white/5 backdrop-blur-sm'
              : theme.isLight
                ? 'bg-white/30 text-gray-700 hover:bg-white/55 hover:text-black border-b-[3px] border-transparent'
                : 'bg-white/[0.06] text-white/60 hover:bg-white/15 hover:text-white border-b-[3px] border-transparent'
          }
        `}
      >
        {tab.isPinned && (
          <Pin
            size={13}
            className={theme.isLight ? 'text-emerald-600 shrink-0' : 'text-white/70 shrink-0'}
          />
        )}

        <span className="flex-1 truncate">{tab.title || 'New Chat'}</span>

        {messageCount > 0 && (
          <span
            className={`
              text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-[20px] text-center
              ${
                isActive
                  ? theme.isLight
                    ? 'bg-emerald-500/25 text-emerald-800'
                    : 'bg-white/20 text-white'
                  : theme.isLight
                    ? 'bg-slate-500/15 text-gray-600'
                    : 'bg-white/10 text-white/50'
              }
            `}
          >
            {messageCount}
          </span>
        )}

        {!tab.isPinned && (isHovering || isActive) && (
          <button
            onClick={handleClose}
            className={`
              shrink-0 p-1 rounded-md transition-colors
              ${
                theme.isLight
                  ? 'text-gray-400 hover:bg-red-500/25 hover:text-red-600'
                  : 'text-white/40 hover:bg-red-500/30 hover:text-red-400'
              }
            `}
            title="Zamknij zakładkę"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  },
);

TabItem.displayName = 'TabItem';

// ============================================================================
// TAB BAR
// ============================================================================

export const TabBar = memo(() => {
  const theme = useViewTheme();
  const scrollRef = useRef<HTMLDivElement>(null);

  const tabs = useAppStore(useShallow((state) => state.tabs));
  const activeTabId = useAppStore((state) => state.activeTabId);
  const chatHistory = useAppStore(useShallow((state) => state.chatHistory));
  const switchTab = useAppStore((state) => state.switchTab);
  const closeTab = useAppStore((state) => state.closeTab);
  const togglePinTab = useAppStore((state) => state.togglePinTab);
  const createSession = useAppStore((state) => state.createSession);
  const openTab = useAppStore((state) => state.openTab);

  const handleNewTab = useCallback(() => {
    createSession();
    const { currentSessionId } = useAppStore.getState();
    if (currentSessionId) {
      openTab(currentSessionId);
    }
  }, [createSession, openTab]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  }, []);

  if (tabs.length === 0) return null;

  return (
    <div
      className={`
        flex items-end gap-1 px-3 pt-2 shrink-0 overflow-hidden
        border-b-2 ${theme.isLight ? 'border-slate-300/50' : 'border-white/10'}
        ${theme.isLight ? 'bg-slate-100/50 backdrop-blur-sm' : 'bg-black/40 backdrop-blur-sm'}
      `}
    >
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className="flex items-end gap-1 overflow-x-auto scrollbar-none flex-1 min-w-0"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            tab={tab}
            isActive={tab.id === activeTabId}
            onSwitch={switchTab}
            onClose={closeTab}
            onTogglePin={togglePinTab}
            messageCount={(chatHistory[tab.sessionId] || []).length}
          />
        ))}
      </div>

      <button
        onClick={handleNewTab}
        className={`
          shrink-0 p-2 mb-1 rounded-xl transition-all
          ${
            theme.isLight
              ? 'text-gray-500 hover:bg-emerald-500/15 hover:text-emerald-700 active:bg-emerald-500/25'
              : 'text-white/50 hover:bg-white/15 hover:text-white active:bg-white/25'
          }
        `}
        title="Nowa zakładka (Ctrl+T)"
      >
        <Plus size={18} strokeWidth={2.5} />
      </button>
    </div>
  );
});

TabBar.displayName = 'TabBar';

export default TabBar;
