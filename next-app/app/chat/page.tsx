'use client';

/**
 * ClaudeHydra - Chat Page
 * ========================
 * Main chat interface with multi-agent AI system.
 * Decomposed from original App.tsx (742 lines).
 *
 * Features:
 * - SSE streaming to Gemini/Llama
 * - Auto-continue command execution
 * - Keyboard shortcuts
 * - View switching (chat/agents/history/settings/status)
 * - Tissaia glass-morphism layout
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/shallow';

// Components
import {
  AgentsView,
  ChatContainer,
  ErrorBoundary,
  HistoryView,
  StatusFooter,
  SuspenseFallback,
  WelcomeScreen,
} from '@/components';
import {
  SettingsModalLazy,
  ShortcutsModalLazy,
  SystemContextMenuLazy,
  WitcherRunesLazy,
} from '@/components/LazyComponents';
import Sidebar from '@/components/Sidebar';
import { TabBar } from '@/components/chat/TabBar';

// Constants, hooks, services, store
import { AUTO_CONTINUE, COMMAND_PATTERNS, DEFAULT_GEMINI_MODEL, GEMINI_MODELS } from '@/constants';
import { useTheme } from '@/contexts/ThemeContext';
import {
  useAppKeyboardShortcuts,
  useAppTheme,
  useCommandExecution,
  useContextMenuActions,
  useCopyToClipboard,
  useEnvLoader,
  useGlassPanel,
  useStreamListeners,
  useSystemStats,
} from '@/hooks';
import type { CommandResult } from '@/hooks/useCommandExecution';
import { GeminiService } from '@/services';
import { selectCurrentMessages, useAppStore } from '@/store/useAppStore';
import { useIsHydrated } from '@/store/useHydrated';
import { containsDangerousPatterns } from '@/utils/validators';

/**
 * Merge consecutive messages with the same role.
 * Gemini API requires alternating user/model turns.
 */
function mergeConsecutiveRoles(
  msgs: Array<{ role: string; content: string }>,
): Array<{ role: string; content: string }> {
  if (msgs.length === 0) return msgs;
  const merged: Array<{ role: string; content: string }> = [{ ...msgs[0] }];
  for (let i = 1; i < msgs.length; i++) {
    const prev = merged[merged.length - 1];
    if (msgs[i].role === prev.role) {
      prev.content += `\n\n${msgs[i].content}`;
    } else {
      merged.push({ ...msgs[i] });
    }
  }
  return merged;
}

export default function ChatPage() {
  const hydrated = useIsHydrated();

  // ========================================
  // Local State
  // ========================================
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const autoContinueCountRef = useRef(0);

  // ========================================
  // Store State
  // ========================================
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const sessions = useAppStore(useShallow((state) => state.sessions));
  const settings = useAppStore(useShallow((state) => state.settings));
  const currentView = useAppStore((state) => state.currentView);

  const createSession = useAppStore((state) => state.createSession);
  const selectSession = useAppStore((state) => state.selectSession);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateLastMessage = useAppStore((state) => state.updateLastMessage);
  const clearHistory = useAppStore((state) => state.clearHistory);
  const openTab = useAppStore((state) => state.openTab);
  const tabs = useAppStore(useShallow((state) => state.tabs));

  const currentMessages = useAppStore(useShallow(selectCurrentMessages));

  const { toggleTheme, isDark } = useAppTheme();
  const { resolvedTheme } = useTheme();
  const glassPanel = useGlassPanel();
  useEnvLoader();

  // ========================================
  // System Stats & Live Clock
  // ========================================
  const systemStats = useSystemStats({ intervalMs: 5000 });

  const [currentTime, setCurrentTime] = useState(() => {
    if (typeof window === 'undefined') return '--:--:--';
    return new Date().toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date().toLocaleTimeString('pl-PL', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ========================================
  // Initialization
  // ========================================
  useEffect(() => {
    if (!hydrated) return;
    if (sessions.length === 0) {
      createSession();
    } else if (!currentSessionId && sessions[0]) {
      selectSession(sessions[0].id);
    }
  }, [hydrated, sessions.length, currentSessionId, createSession, selectSession, sessions]);

  // Auto-open tab for current session
  useEffect(() => {
    if (!currentSessionId) return;
    if (currentView !== 'chat') return;
    const hasTab = tabs.some((t) => t.sessionId === currentSessionId);
    if (!hasTab) {
      openTab(currentSessionId);
    }
  }, [currentSessionId, currentView, tabs, openTab]);

  // ========================================
  // Handlers
  // ========================================
  const handleToggleSettings = useCallback(() => setIsSettingsOpen((p) => !p), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleToggleTheme = useCallback(() => toggleTheme(), [toggleTheme]);

  const handleClearHistory = useCallback(() => {
    if (confirm('Wyczyścić historię czatu?')) {
      clearHistory();
    }
  }, [clearHistory]);

  const { copyToClipboard } = useCopyToClipboard();

  const handleCopySession = useCallback(() => {
    if (currentMessages.length === 0) return;
    const formatted = currentMessages
      .map((m: { role: string; content: string; timestamp: number }) => {
        const role =
          m.role === 'user' ? 'Użytkownik' : m.role === 'assistant' ? 'Asystent' : 'System';
        const time = new Date(m.timestamp).toLocaleTimeString('pl-PL');
        return `[${time}] ${role}:\n${m.content}`;
      })
      .join('\n\n---\n\n');
    copyToClipboard(formatted);
  }, [currentMessages, copyToClipboard]);

  // Command execution
  const { executeCommand } = useCommandExecution({
    addMessage,
    updateLastMessage,
  });

  // ========================================
  // Stream Listeners
  // ========================================
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleStreamComplete = useCallback(() => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleStreamError = useCallback((error: unknown) => {
    console.error('[ChatPage] Stream error:', error);
    setIsStreaming(false);
  }, []);

  // Safety timeout to prevent isStreaming deadlock (120s)
  useEffect(() => {
    if (!isStreaming) return;
    const timeout = setTimeout(() => {
      console.warn('[ChatPage] Stream safety timeout reached (120s).');
      setIsStreaming(false);
    }, 120_000);
    streamTimeoutRef.current = timeout;
    return () => {
      clearTimeout(timeout);
      streamTimeoutRef.current = null;
    };
  }, [isStreaming]);

  const { setController } = useStreamListeners({
    onChunk: updateLastMessage,
    onComplete: handleStreamComplete,
    onError: handleStreamError,
  });

  /**
   * Build conversation history for Gemini API.
   * Maps system messages to 'user' role (Gemini only supports user/model).
   */
  const buildGeminiHistory = useCallback((messages: Array<{ role: string; content: string }>) => {
    const mapped = messages
      .filter((m) => m.content.length > 0)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      }));
    return mergeConsecutiveRoles(mapped);
  }, []);

  const currentModelId = useMemo(() => {
    if (!settings.geminiApiKey) return 'llama.cpp';
    return settings.selectedModel || DEFAULT_GEMINI_MODEL;
  }, [settings.geminiApiKey, settings.selectedModel]);

  /**
   * Send a follow-up to Gemini (used for auto-continue after command execution).
   */
  const sendFollowUp = useCallback(
    (allMessages: Array<{ role: string; content: string }>) => {
      addMessage({ role: 'assistant', content: '', timestamp: Date.now(), model: currentModelId });
      setIsStreaming(true);
      updateLastMessage('🔍 Analizuję wyniki...\n\n');

      const history = buildGeminiHistory(allMessages);
      const { selectedModel, systemPrompt, geminiApiKey } = useAppStore.getState().settings;

      const controller = GeminiService.promptStream(
        selectedModel || DEFAULT_GEMINI_MODEL,
        history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        geminiApiKey || '',
        {
          systemPrompt: systemPrompt || undefined,
          temperature: 1.0,
          maxOutputTokens: 65536,
        },
        {
          onChunk: (chunk) => updateLastMessage(chunk),
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            updateLastMessage(`\n[Błąd Gemini: ${err}]`);
            setIsStreaming(false);
          },
        },
      );

      setController(controller);
    },
    [addMessage, updateLastMessage, buildGeminiHistory, currentModelId, setController],
  );

  const handleSubmit = useCallback(
    (userPrompt: string, attachedImage: string | null) => {
      autoContinueCountRef.current = 0;

      let displayContent = userPrompt;
      if (attachedImage) displayContent = `![Uploaded Image](${attachedImage})\n\n${userPrompt}`;

      addMessage({ role: 'user', content: displayContent, timestamp: Date.now() });
      addMessage({ role: 'assistant', content: '', timestamp: Date.now(), model: currentModelId });

      setIsStreaming(true);
      updateLastMessage('🔮 Łączenie z Gemini...\n\n');

      const storeState = useAppStore.getState();
      const sessionId = storeState.currentSessionId;
      if (!sessionId) return;
      const freshMessages = storeState.chatHistory[sessionId] || [];
      const history = buildGeminiHistory([
        ...freshMessages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: userPrompt },
      ]);

      const { selectedModel, systemPrompt, geminiApiKey } = storeState.settings;

      const controller = GeminiService.promptStream(
        selectedModel || DEFAULT_GEMINI_MODEL,
        history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        geminiApiKey || '',
        {
          systemPrompt: systemPrompt || undefined,
          temperature: 1.0,
          maxOutputTokens: 65536,
        },
        {
          onChunk: (chunk) => updateLastMessage(chunk),
          onDone: () => setIsStreaming(false),
          onError: (err) => {
            updateLastMessage(`\n[Błąd Gemini: ${err}]`);
            setIsStreaming(false);
          },
        },
      );

      setController(controller);
    },
    [addMessage, updateLastMessage, buildGeminiHistory, currentModelId, setController],
  );

  // ========================================
  // Keyboard Shortcuts
  // ========================================
  const handleToggleShortcuts = useCallback(() => setIsShortcutsOpen((p) => !p), []);
  const handleCloseShortcuts = useCallback(() => setIsShortcutsOpen(false), []);

  const handleNavigateChat = useCallback(() => useAppStore.getState().setCurrentView('chat'), []);
  const handleNavigateAgents = useCallback(
    () => useAppStore.getState().setCurrentView('agents'),
    [],
  );
  const handleNavigateHistory = useCallback(
    () => useAppStore.getState().setCurrentView('history'),
    [],
  );

  const handleNewTab = useCallback(() => {
    createSession();
    const { currentSessionId: newId } = useAppStore.getState();
    if (newId) openTab(newId);
    useAppStore.getState().setCurrentView('chat');
  }, [createSession, openTab]);

  const handleCloseCurrentTab = useCallback(() => {
    const { activeTabId } = useAppStore.getState();
    if (activeTabId) useAppStore.getState().closeTab(activeTabId);
  }, []);

  useAppKeyboardShortcuts({
    onToggleSettings: handleToggleSettings,
    onToggleShortcuts: handleToggleShortcuts,
    onClearHistory: handleClearHistory,
    onCopySession: handleCopySession,
    onNewSession: createSession,
    onToggleTheme: handleToggleTheme,
    onNavigateChat: handleNavigateChat,
    onNavigateAgents: handleNavigateAgents,
    onNavigateHistory: handleNavigateHistory,
    onNewTab: handleNewTab,
    onCloseTab: handleCloseCurrentTab,
  });

  // Context Menu Actions
  useContextMenuActions({ handleSubmit });

  // ========================================
  // Auto-continue: Execute commands from AI response
  // ========================================
  const [lastProcessedMsgIdx, setLastProcessedMsgIdx] = useState(-1);

  useEffect(() => {
    if (isStreaming || currentMessages.length === 0) return;
    const msgIdx = currentMessages.length - 1;
    if (msgIdx <= lastProcessedMsgIdx) return;
    const lastMsg = currentMessages[msgIdx];
    if (lastMsg.role === 'assistant') {
      const matches = [...lastMsg.content.matchAll(COMMAND_PATTERNS.EXECUTE_ALL)];
      if (matches.length > 0) {
        setLastProcessedMsgIdx(msgIdx);
        let cancelled = false;

        const runCommandsAndContinue = async () => {
          const results: CommandResult[] = [];
          for (const match of matches) {
            if (cancelled) return;
            const cmd = match[1].trim();
            if (!cmd) continue;

            if (containsDangerousPatterns(cmd)) {
              addMessage({
                role: 'system',
                content: `⚠️ ZABLOKOWANO niebezpieczną komendę: \`${cmd}\``,
                timestamp: Date.now(),
              });
              continue;
            }

            const result = await executeCommand(cmd);
            if (cancelled) return;
            results.push(result);
          }

          if (cancelled) return;

          if (autoContinueCountRef.current >= AUTO_CONTINUE.MAX_ITERATIONS) {
            autoContinueCountRef.current = 0;
            return;
          }

          if (results.length === 0) return;

          const resultsSummary = results
            .map((r) => {
              if (r.success) {
                return `Komenda: ${r.command}\nWynik:\n\`\`\`\n${r.output}\n\`\`\``;
              }
              return `Komenda: ${r.command}\nBłąd: ${r.output}`;
            })
            .join('\n\n');

          const followUpContent = `Wyniki wykonanych komend:\n\n${resultsSummary}\n\nPrzeanalizuj te wyniki i odpowiedz użytkownikowi.`;
          if (cancelled) return;

          addMessage({
            role: 'system',
            content: followUpContent,
            timestamp: Date.now(),
          });

          autoContinueCountRef.current += 1;
          await new Promise((resolve) => setTimeout(resolve, AUTO_CONTINUE.DELAY_MS));
          if (cancelled) return;

          const storeState = useAppStore.getState();
          const sessionId = storeState.currentSessionId;
          if (!sessionId) return;
          const freshMessages = storeState.chatHistory[sessionId] || [];

          await sendFollowUp(
            freshMessages.map((m: { role: string; content: string }) => ({
              role: m.role,
              content: m.content,
            })),
          );
        };

        runCommandsAndContinue();
        return () => {
          cancelled = true;
        };
      } else {
        autoContinueCountRef.current = 0;
      }
    }
  }, [currentMessages, isStreaming, executeCommand, lastProcessedMsgIdx, addMessage, sendFollowUp]);

  const currentModel = useMemo(() => {
    if (!settings.geminiApiKey) return 'Local (llama.cpp)';
    const modelId = settings.selectedModel || DEFAULT_GEMINI_MODEL;
    const model = GEMINI_MODELS.find((m) => m.id === modelId);
    return model?.label ?? modelId;
  }, [settings.geminiApiKey, settings.selectedModel]);

  // ========================================
  // View Renderer
  // ========================================
  const renderView = () => {
    switch (currentView) {
      case 'home':
        return (
          <ErrorBoundary
            fallback={() => (
              <div className="glass-panel p-4 text-red-400">Błąd strony startowej</div>
            )}
          >
            <WelcomeScreen />
          </ErrorBoundary>
        );
      case 'chat':
        return (
          <div className="w-full h-full overflow-hidden min-h-0 relative flex flex-col">
            <ErrorBoundary
              fallback={() => (
                <div className="glass-panel p-4 text-red-400">Błąd czatu - odśwież stronę</div>
              )}
            >
              <ChatContainer
                messages={currentMessages}
                isStreaming={isStreaming}
                onSubmit={handleSubmit}
                onExecuteCommand={executeCommand}
              />
            </ErrorBoundary>
          </div>
        );
      case 'agents':
        return (
          <ErrorBoundary
            fallback={() => <div className="glass-panel p-4 text-red-400">Błąd panelu agentów</div>}
          >
            <AgentsView />
          </ErrorBoundary>
        );
      case 'history':
        return (
          <ErrorBoundary
            fallback={() => <div className="glass-panel p-4 text-red-400">Błąd historii</div>}
          >
            <HistoryView />
          </ErrorBoundary>
        );
      case 'settings':
        return (
          <div className="p-6">
            <Suspense fallback={<SuspenseFallback message="Ładowanie ustawień..." />}>
              <SettingsModalLazy
                isOpen={true}
                onClose={() => useAppStore.getState().setCurrentView('chat')}
              />
            </Suspense>
          </div>
        );
      case 'status':
        return (
          <div className="p-6">
            <StatusFooter
              isStreaming={isStreaming}
              isWorking={false}
              hasError={false}
              selectedModel={currentModel}
            />
          </div>
        );
      default:
        return null;
    }
  };

  // ========================================
  // SSR guard - show fallback until hydrated
  // ========================================
  if (!hydrated) {
    return <SuspenseFallback message="Inicjalizacja ClaudeHydra..." />;
  }

  // ========================================
  // Render - Tissaia Dashboard Layout
  // ========================================
  return (
    <div className="relative flex h-screen w-full text-slate-100 overflow-hidden font-mono selection:bg-matrix-accent selection:text-black transition-colors duration-500">
      {/* Background Layer 1 - Image */}
      <div
        className={`absolute inset-0 z-[1] bg-cover bg-center bg-no-repeat transition-opacity duration-1000 pointer-events-none ${
          resolvedTheme === 'light'
            ? "bg-[url('/backgroundlight.webp')] opacity-50"
            : "bg-[url('/background.webp')] opacity-60"
        }`}
      />
      {/* Background Layer 2 - Gradient overlay */}
      <div
        className={`absolute inset-0 z-[2] pointer-events-none transition-opacity duration-1000 ${
          resolvedTheme === 'light'
            ? 'bg-gradient-to-b from-white/30 via-white/15 to-slate-100/40'
            : 'bg-gradient-to-b from-matrix-bg-primary/30 via-matrix-bg-primary/15 to-matrix-bg-secondary/35'
        }`}
      />
      {/* Background Layer 3 - Radial vignette */}
      <div
        className={`absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] ${
          resolvedTheme === 'light'
            ? 'from-transparent via-white/5 to-white/20'
            : 'from-transparent via-black/5 to-black/25'
        }`}
      />

      <Suspense fallback={null}>
        <WitcherRunesLazy isDark={isDark} />
      </Suspense>
      <Suspense fallback={null}>
        <SystemContextMenuLazy />
      </Suspense>

      {isSettingsOpen && currentView !== 'settings' && (
        <Suspense fallback={<SuspenseFallback message="Ładowanie ustawień..." />}>
          <SettingsModalLazy isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        </Suspense>
      )}
      {isShortcutsOpen && (
        <Suspense fallback={<SuspenseFallback message="Ładowanie..." size="sm" />}>
          <ShortcutsModalLazy isOpen={isShortcutsOpen} onClose={handleCloseShortcuts} />
        </Suspense>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex h-full w-full backdrop-blur-[1px] gap-3 p-3 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main
          className={`flex-1 min-w-0 flex flex-col overflow-hidden relative rounded-2xl ${glassPanel}`}
        >
          {/* Chat Tab Bar */}
          {currentView === 'chat' && <TabBar />}

          {/* View Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="h-full"
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Status Bar (footer) */}
          <footer
            className={`px-6 py-2.5 border-t ${
              resolvedTheme === 'light'
                ? 'border-slate-200/30 bg-white/40 text-slate-600'
                : 'border-white/10 bg-black/40 text-slate-300'
            } text-xs flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              <span
                className={resolvedTheme === 'light' ? 'text-emerald-600' : 'text-matrix-accent'}
              >
                v2.0.0
              </span>
              <span className={resolvedTheme === 'light' ? 'text-slate-300' : 'text-white/20'}>
                |
              </span>
              <span>
                {settings.geminiApiKey ? (
                  <span
                    className={
                      resolvedTheme === 'light' ? 'text-emerald-600' : 'text-matrix-accent'
                    }
                  >
                    ● Online
                  </span>
                ) : (
                  <span className="text-yellow-500">● Local</span>
                )}
              </span>
              {systemStats.isLoaded && (
                <>
                  <span className={resolvedTheme === 'light' ? 'text-slate-300' : 'text-white/20'}>
                    |
                  </span>
                  <span
                    className={`font-semibold ${
                      systemStats.cpuUsage > 80
                        ? 'text-red-400'
                        : systemStats.cpuUsage > 50
                          ? 'text-yellow-400'
                          : resolvedTheme === 'light'
                            ? 'text-sky-600'
                            : 'text-sky-400'
                    }`}
                  >
                    CPU {systemStats.cpuUsage}%
                  </span>
                  <span
                    className={`font-semibold ${
                      systemStats.memoryUsagePercent > 85
                        ? 'text-red-400'
                        : systemStats.memoryUsagePercent > 65
                          ? 'text-yellow-400'
                          : resolvedTheme === 'light'
                            ? 'text-violet-600'
                            : 'text-violet-400'
                    }`}
                  >
                    RAM {systemStats.memoryUsagePercent}%
                  </span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span title="Architektura multi-agentowa">🐺 Wolf Swarm</span>
              <span className={resolvedTheme === 'light' ? 'text-slate-300' : 'text-white/20'}>
                |
              </span>
              <span>
                {new Date().toLocaleDateString('pl-PL', {
                  weekday: 'short',
                  day: 'numeric',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
              <span className={resolvedTheme === 'light' ? 'text-slate-300' : 'text-white/20'}>
                |
              </span>
              <span
                className={`font-mono font-semibold ${resolvedTheme === 'light' ? 'text-emerald-600' : 'text-matrix-accent'}`}
              >
                {currentTime}
              </span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
