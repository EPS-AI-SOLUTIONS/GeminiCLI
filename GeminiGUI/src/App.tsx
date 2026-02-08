// Store & Hooks
import { useAppStore, selectCurrentMessages } from './store/useAppStore';
import { useShallow } from 'zustand/shallow';
import {
  useAppTheme,
  useStreamListeners,
  useEnvLoader,
  useAppKeyboardShortcuts,
  useCommandExecution,
  useContextMenuActions,
} from './hooks';

// Components
import { ChatContainer } from './components/ChatContainer';
import { SessionSidebar } from './components/SessionSidebar';
import { StatusFooter } from './components/StatusFooter';
import { Header } from './components/layout/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster, toast } from 'sonner';

// Lazy-loaded components for code splitting
import {
  SettingsModalLazy,
  ShortcutsModalLazy,
  WitcherRunesLazy,
  SystemContextMenuLazy,
} from './components/LazyComponents';
import { SuspenseFallback } from './components/SuspenseFallback';

// Constants & Utils
import { STATUS, COMMAND_PATTERNS, TAURI_COMMANDS, GEMINI_MODELS, DEFAULT_GEMINI_MODEL } from './constants';
import { useState, useCallback, useEffect, useMemo, useRef, Suspense } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { cn } from './utils';

// WitcherRunes and SystemContextMenu are lazy-loaded via LazyComponents

function App() {
  console.log('[App] Mounting...');
  
  // ========================================
  // Local State
  // ========================================
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  // ========================================
  // Store State
  // ========================================
  const currentSessionId = useAppStore((state) => state.currentSessionId);
  const sessions = useAppStore(useShallow((state) => state.sessions));
  const settings = useAppStore(useShallow((state) => state.settings));

  const createSession = useAppStore((state) => state.createSession);
  const selectSession = useAppStore((state) => state.selectSession);
  const deleteSession = useAppStore((state) => state.deleteSession);
  const updateSessionTitle = useAppStore((state) => state.updateSessionTitle);
  const addMessage = useAppStore((state) => state.addMessage);
  const updateLastMessage = useAppStore((state) => state.updateLastMessage);
  const clearHistory = useAppStore((state) => state.clearHistory);

  const currentMessages = useAppStore(useShallow(selectCurrentMessages));
  const { toggleTheme, isDark } = useAppTheme();
  useEnvLoader();

  // ========================================
  // Initialization & Tauri Check
  // ========================================
  useEffect(() => {
    // Check if running in Tauri
    const checkTauri = async () => {
      try {
        await invoke('greet', { name: 'HealthCheck' });
        setIsTauri(true);
        console.log('[App] Tauri environment detected.');
      } catch (e) {
        console.log('[App] Web environment detected (Tauri unavailable).');
        setIsTauri(false);
      }
    };
    checkTauri();

    if (sessions.length === 0) {
      createSession();
    } else if (!currentSessionId) {
      selectSession(sessions[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions.length, currentSessionId, createSession, selectSession]);

  // ========================================
  // Auto-send context on session start
  // ========================================
  const [contextSentForSession, setContextSentForSession] = useState<string | null>(null);

  // Use a ref for selectedModel to avoid re-triggering the context-send effect
  // when the user changes the model setting mid-session.
  const selectedModelRef = useRef(settings.selectedModel);
  useEffect(() => {
    selectedModelRef.current = settings.selectedModel;
  }, [settings.selectedModel]);

  useEffect(() => {
    if (!isTauri || !currentSessionId || !settings.systemPrompt) return;
    if (contextSentForSession === currentSessionId) return;
    if (currentMessages.length > 0) {
      // Session already has messages - context was sent before
      setContextSentForSession(currentSessionId);
      return;
    }

    // Send hidden context as first exchange using systemInstruction
    const sendContext = async () => {
      try {
        addMessage({ role: 'user', content: `[CONTEXT] ${settings.systemPrompt}`, timestamp: Date.now() });
        addMessage({ role: 'assistant', content: '', timestamp: Date.now() });
        await invoke(TAURI_COMMANDS.CHAT_WITH_GEMINI, {
          messages: [
            { role: 'user', content: 'Powitaj sie krotko i powiedz czym jestes. Max 2 zdania.' },
          ],
          model: selectedModelRef.current || null,
          systemPrompt: settings.systemPrompt || null,
        });
        setContextSentForSession(currentSessionId);
      } catch (e) {
        console.warn('[App] Context send failed:', e);
        setContextSentForSession(currentSessionId);
      }
    };
    sendContext();
  }, [isTauri, currentSessionId, currentMessages.length, settings.systemPrompt, contextSentForSession, addMessage]);

  // ========================================
  // Handlers
  // ========================================
  const handleToggleSettings = useCallback(() => setIsSettingsOpen((p) => !p), []);
  const handleCloseSettings = useCallback(() => setIsSettingsOpen(false), []);
  const handleToggleTheme = useCallback(() => toggleTheme(), [toggleTheme]);

  const handleClearHistory = useCallback(() => {
    if (confirm('Wyczyścić historię czatu?')) {
      clearHistory();
      toast.info('Historia wyczyszczona');
    }
  }, [clearHistory]);

  // Command execution (using dedicated hook)
  const { executeCommand } = useCommandExecution({
    addMessage,
    updateLastMessage,
    isTauri,
  });

  const handleSubmit = useCallback(async (userPrompt: string, attachedImage: string | null) => {
    let displayContent = userPrompt;
    if (attachedImage) displayContent = '![Uploaded Image](' + attachedImage + ')\n\n' + userPrompt;

    addMessage({ role: 'user', content: displayContent, timestamp: Date.now() });
    addMessage({ role: 'assistant', content: '', timestamp: Date.now() });

    setIsStreaming(true);
    
    // Web Simulation Mode
    if (!isTauri) {
        setTimeout(() => {
          updateLastMessage(STATUS.SWARM_INIT + '\n\n');
          setTimeout(() => {
             updateLastMessage("\n[SYMULACJA TRYBU WEB]\nBackend Tauri nie jest dostępny (Web Mode).\nAplikacja działa w trybie offline/demo.\n\nOdebrano: " + userPrompt);
             setIsStreaming(false);
          }, 800);
        }, 100);
        return;
    }

    try {
      updateLastMessage('🔮 Łączenie z Gemini...\n\n');
      // Build conversation history for Gemini context
      const history = currentMessages
        .filter((m: { role: string }) => m.role === 'user' || m.role === 'assistant')
        .filter((m: { content: string }) => m.content.length > 0)
        .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

      // Add current prompt
      history.push({ role: 'user', content: userPrompt });
      await invoke(TAURI_COMMANDS.CHAT_WITH_GEMINI, {
        messages: history,
        model: settings.selectedModel || null,
        systemPrompt: settings.systemPrompt || null,
      });
    } catch (error) {
      updateLastMessage(`\n[Błąd Gemini: ${error}]`);
      toast.error('Błąd połączenia z Gemini');
      setIsStreaming(false);
    }
  }, [addMessage, updateLastMessage, isTauri, currentMessages, settings.systemPrompt, settings.selectedModel]);

  // ========================================
  // Stream Listeners
  // ========================================
  const handleStreamComplete = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleStreamError = useCallback((error: unknown) => {
    console.error('[App] Stream error:', error);
    setIsStreaming(false);
    toast.error('Przerwano strumieniowanie');
  }, []);

  const { cancelStream } = useStreamListeners({
    onChunk: updateLastMessage,
    onComplete: handleStreamComplete,
    onError: handleStreamError,
  });

  // ========================================
  // Keyboard Shortcuts (using dedicated hook)
  // ========================================
  const handleToggleShortcuts = useCallback(() => setIsShortcutsOpen((p) => !p), []);
  const handleCloseShortcuts = useCallback(() => setIsShortcutsOpen(false), []);

  useAppKeyboardShortcuts({
    onToggleSettings: handleToggleSettings,
    onToggleShortcuts: handleToggleShortcuts,
    onClearHistory: handleClearHistory,
    onNewSession: createSession,
    onToggleTheme: handleToggleTheme,
  });

  // ========================================
  // Context Menu Actions (using dedicated hook)
  // ========================================
  useContextMenuActions({ handleSubmit });

  // ========================================
  // Effects & Memos
  // ========================================
  const [lastProcessedMsgIdx, setLastProcessedMsgIdx] = useState(-1);

  useEffect(() => {
    if (isStreaming || currentMessages.length === 0) return;
    const msgIdx = currentMessages.length - 1;
    // Skip if we already processed this message index
    if (msgIdx <= lastProcessedMsgIdx) return;
    const lastMsg = currentMessages[msgIdx];
    if (lastMsg.role === 'assistant') {
      // Find ALL [EXECUTE: ...] commands in the response
      const matches = [...lastMsg.content.matchAll(COMMAND_PATTERNS.EXECUTE_ALL)];
      if (matches.length > 0) {
        setLastProcessedMsgIdx(msgIdx);
        // Execute each command sequentially
        const runCommands = async () => {
          for (const match of matches) {
            const cmd = match[1].trim();
            if (cmd) await executeCommand(cmd);
          }
        };
        runCommands();
      }
    }
  }, [currentMessages, isStreaming, executeCommand, lastProcessedMsgIdx]);

  useEffect(() => {
    if (!(window as any).__TAURI_INTERNALS__) return;
    const openPreview = async () => {
      try {
        const current = getCurrentWindow();
        if (current.label === 'main') {
          const livePreview = await WebviewWindow.getByLabel('live-preview');
          livePreview?.show();
        }
      } catch (e) { console.warn('Window err:', e); }
    };
    openPreview();
  }, []);

  const logoSrc = useMemo(() => (isDark ? '/logodark.webp' : '/logolight.webp'), [isDark]);
  const headerSpanClass = useMemo(() => (isDark ? 'text-white' : 'text-gray-800'), [isDark]);
  const statusBadgeState = useMemo(() =>
    settings.geminiApiKey
      ? { className: 'status-approved bg-green-500/10 text-green-400', text: STATUS.GEMINI_READY }
      : { className: 'status-pending bg-yellow-500/10 text-yellow-400', text: 'Local Only' },
  [settings.geminiApiKey]);

  const currentModel = useMemo(() => {
    if (!settings.geminiApiKey) return 'Local (llama.cpp)';
    const modelId = settings.selectedModel || DEFAULT_GEMINI_MODEL;
    const model = GEMINI_MODELS.find((m) => m.id === modelId);
    return model?.label ?? modelId;
  }, [settings.geminiApiKey, settings.selectedModel]);

  return (
    <main className={cn(
      "w-full h-screen flex flex-col gap-2 overflow-hidden transition-all duration-500 relative p-2",
      "bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat bg-blend-overlay",
      isDark ? "bg-black/15" : "bg-white/15"
    )}>
      <Suspense fallback={null}>
        <WitcherRunesLazy isDark={isDark} />
      </Suspense>
      <Suspense fallback={null}>
        <SystemContextMenuLazy />
      </Suspense>
      
      {isSettingsOpen && (
        <Suspense fallback={<SuspenseFallback message="Ładowanie ustawień..." />}>
          <SettingsModalLazy isOpen={isSettingsOpen} onClose={handleCloseSettings} />
        </Suspense>
      )}
      {isShortcutsOpen && (
        <Suspense fallback={<SuspenseFallback message="Ładowanie..." size="sm" />}>
          <ShortcutsModalLazy isOpen={isShortcutsOpen} onClose={handleCloseShortcuts} />
        </Suspense>
      )}
      <Toaster position="top-right" theme={isDark ? 'dark' : 'light'} />

      <Header
        isDark={isDark}
        logoSrc={logoSrc}
        headerSpanClass={headerSpanClass}
        statusBadgeState={statusBadgeState}
        currentModel={currentModel}
        onClearHistory={handleClearHistory}
        onToggleSettings={handleToggleSettings}
        onToggleTheme={handleToggleTheme}
      />

      <div className="flex-1 flex gap-2 overflow-hidden min-h-0 relative">
        <div className="w-[200px] shrink-0 flex flex-col">
          <ErrorBoundary fallback={() => <div className="glass-panel p-4 text-red-400">Błąd panelu sesji</div>}>
            <SessionSidebar
              sessions={sessions}
              currentSessionId={currentSessionId}
              onCreateSession={createSession}
              onSelectSession={selectSession}
              onDeleteSession={deleteSession}
              onUpdateTitle={updateSessionTitle}
            />
          </ErrorBoundary>
        </div>

        <div className="flex-1 min-w-0 flex flex-col">
          <ErrorBoundary fallback={() => <div className="glass-panel p-4 text-red-400">Błąd czatu - odśwież stronę</div>}>
            <ChatContainer
              messages={currentMessages}
              isStreaming={isStreaming}
              onSubmit={handleSubmit}
              onExecuteCommand={executeCommand}
            />
          </ErrorBoundary>
        </div>
      </div>

      <StatusFooter
        isStreaming={isStreaming}
        isWorking={false}
        hasError={false}
        selectedModel={currentModel}
      />
    </main>
  );
}

export default App;