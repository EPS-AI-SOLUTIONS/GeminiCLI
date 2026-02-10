/**
 * useAppKeyboardShortcuts - Global keyboard shortcuts for the application
 *
 * Handles all global keyboard shortcuts in a single location.
 * This hook consolidates keyboard handling from App.tsx for better maintainability.
 */

import { useCallback, useEffect } from 'react';

export interface KeyboardShortcutHandlers {
  /** Handler for toggling settings modal (Ctrl+,) */
  onToggleSettings?: () => void;
  /** Handler for toggling shortcuts modal (Ctrl+/) */
  onToggleShortcuts?: () => void;
  /** Handler for clearing chat history (Ctrl+L) */
  onClearHistory?: () => void;
  /** Handler for copying current session to clipboard (Ctrl+E) */
  onCopySession?: () => void;
  /** Handler for creating new session (Ctrl+N) */
  onNewSession?: () => void;
  /** Handler for toggling theme (Ctrl+Shift+T) */
  onToggleTheme?: () => void;
  /** Handler for focusing input (Ctrl+Shift+I) */
  onFocusInput?: () => void;
  /** Handler for navigating to Chat view (Alt+1) */
  onNavigateChat?: () => void;
  /** Handler for navigating to Agents view (Alt+2) */
  onNavigateAgents?: () => void;
  /** Handler for navigating to History view (Alt+3) */
  onNavigateHistory?: () => void;
  /** Handler for toggling sidebar (Ctrl+B) */
  onToggleSidebar?: () => void;
}

/**
 * Hook for managing global keyboard shortcuts
 *
 * @param handlers - Object containing handler functions for each shortcut
 *
 * @example
 * ```tsx
 * useAppKeyboardShortcuts({
 *   onToggleSettings: () => setIsSettingsOpen(p => !p),
 *   onClearHistory: handleClearHistory,
 * });
 * ```
 */
export function useAppKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const {
    onToggleSettings,
    onToggleShortcuts,
    onClearHistory,
    onCopySession,
    onNewSession,
    onToggleTheme,
    onFocusInput,
    onNavigateChat,
    onNavigateAgents,
    onNavigateHistory,
    onToggleSidebar,
  } = handlers;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Skip if user is typing in an input/textarea
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

      // Ctrl+, -> Settings (always works)
      if (e.ctrlKey && e.key === ',') {
        e.preventDefault();
        onToggleSettings?.();
        return;
      }

      // Ctrl+/ -> Shortcuts (always works)
      if (e.ctrlKey && e.key === '/') {
        e.preventDefault();
        onToggleShortcuts?.();
        return;
      }

      // Ctrl+L -> Clear (skip if in input)
      if (e.ctrlKey && e.key.toLowerCase() === 'l' && !isInputFocused) {
        e.preventDefault();
        onClearHistory?.();
        return;
      }

      // Ctrl+E -> Copy session to clipboard (skip if in input)
      if (e.ctrlKey && e.key.toLowerCase() === 'e' && !isInputFocused) {
        e.preventDefault();
        onCopySession?.();
        return;
      }

      // Ctrl+N -> New Session (skip if in input)
      if (e.ctrlKey && e.key.toLowerCase() === 'n' && !isInputFocused) {
        e.preventDefault();
        onNewSession?.();
        return;
      }

      // Ctrl+Shift+T -> Toggle Theme
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        onToggleTheme?.();
        return;
      }

      // Ctrl+Shift+I -> Focus Input
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        onFocusInput?.();
        return;
      }

      // Alt+1 -> Navigate to Chat
      if (e.altKey && e.key === '1' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        onNavigateChat?.();
        return;
      }

      // Alt+2 -> Navigate to Agents
      if (e.altKey && e.key === '2' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        onNavigateAgents?.();
        return;
      }

      // Alt+3 -> Navigate to History
      if (e.altKey && e.key === '3' && !e.ctrlKey && !e.shiftKey) {
        e.preventDefault();
        onNavigateHistory?.();
        return;
      }

      // Ctrl+B -> Toggle Sidebar
      if (e.ctrlKey && e.key.toLowerCase() === 'b' && !isInputFocused) {
        e.preventDefault();
        onToggleSidebar?.();
        return;
      }
    },
    [
      onToggleSettings,
      onToggleShortcuts,
      onClearHistory,
      onCopySession,
      onNewSession,
      onToggleTheme,
      onFocusInput,
      onNavigateChat,
      onNavigateAgents,
      onNavigateHistory,
      onToggleSidebar,
    ],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useAppKeyboardShortcuts;
