import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Server, RefreshCw, Send, Lock, Sun, Moon, Trash2, FileText, Paperclip, Terminal, X, Settings, Plus, MessageSquare, Search, Edit2, Download, Eraser, Zap } from "lucide-react";
import { useAppStore } from "./store/useAppStore";
import { SettingsModal } from "./components/SettingsModal";
import { CodeBlock } from "./components/CodeBlock";
import { BridgePanel } from "./components/BridgePanel";
import { MemoryPanel } from "./components/MemoryPanel";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import "./App.css";

interface StreamPayload {
    chunk: string;
    done: boolean;
}
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";

function App() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  
  // Session Manager States
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  const { 
      count, increment, decrement, 
      theme, toggleTheme, provider, setProvider,
      sessions, currentSessionId, chatHistory,
      createSession, selectSession, deleteSession, updateSessionTitle,
      addMessage, updateLastMessage, clearHistory,
      settings, updateSettings
  } = useAppStore();

  // Open Live Preview Window on boot
  useEffect(() => {
    const openPreview = async () => {
      const livePreview = await WebviewWindow.getByLabel('live-preview');
      if (livePreview) {
        livePreview.show();
      }
    };
    openPreview();
  }, []);

  // Load API Keys from .env if not set
  useEffect(() => {
    const loadEnv = async () => {
        try {
            const env = await invoke<Record<string, string>>('get_env_vars');
            const newSettings: any = {};
            if (!settings.geminiApiKey && env.GEMINI_API_KEY) {
                newSettings.geminiApiKey = env.GEMINI_API_KEY;
            }
            if (Object.keys(newSettings).length > 0) {
                updateSettings(newSettings);
            }
        } catch (e) {
            console.warn("Failed to load .env keys", e);
        }
    };
    loadEnv();
  }, [settings.geminiApiKey, updateSettings]);

  // Derived State: Current Messages
  const currentMessages = currentSessionId ? (chatHistory[currentSessionId] || []) : [];

  // Filtered Sessions
  const filteredSessions = sessions.filter(s => 
      s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Scroll to bottom on new messages is handled by Virtuoso `followOutput`

  // Setup Stream Listener
  useEffect(() => {
    const unlistenOllama = listen<StreamPayload>('ollama-event', (event) => {
        const { chunk, done } = event.payload;
        if (!done) {
            updateLastMessage(chunk);
        } else {
            setIsStreaming(false);
        }
    });

    const unlistenSwarm = listen<StreamPayload>('swarm-data', (event) => {
        const { chunk, done } = event.payload;
        if (!done) {
            updateLastMessage(chunk);
        } else {
            setIsStreaming(false);
        }
    });

    return () => {
        unlistenOllama.then(f => f());
        unlistenSwarm.then(f => f());
    };
  }, [updateLastMessage]);

  // Agentic Tool Execution
  useEffect(() => {
    if (isStreaming) return;
    if (currentMessages.length === 0) return;

    const lastMsg = currentMessages[currentMessages.length - 1];
    if (lastMsg.role === 'assistant') {
        const match = lastMsg.content.match(/\ Electrochemical: \"(.*?)\"\\]/);
        if (match) {
            const command = match[1];
            executeCommand(command);
        }
    }
  }, [currentMessages, isStreaming]);

  const executeCommand = async (cmd: string) => {
      // Integration with Bridge: Check if we need manual approval
      try {
          const bridge = await invoke<{auto_approve: boolean}>('get_bridge_state');
          if (!bridge.auto_approve) {
              addMessage({ role: 'system', content: `[BRIDGE] Command queued for approval: ${cmd}`, timestamp: Date.now() });
              // We don't block the UI, the user will approve it in the BridgePanel
              // For a tighter integration, we could poll for status change, but for now, we notify.
              return;
          }
      } catch (e) {
          console.warn("Bridge check failed, proceeding anyway", e);
      }

      addMessage({ role: 'system', content: `> Executing: ${cmd}...`, timestamp: Date.now() });
      try {
          const result = await invoke<string>('run_system_command', { command: cmd });
          updateLastMessage(`\n\nRESULT:\n\`\`\`\n${result}\n\`\`\`\n`);
      } catch (err) {
          updateLastMessage(`\n\nERROR:\n${err}`);
      }
  };

  // Worker Logic
  const [workerProgress, setWorkerProgress] = useState(0);
  const [workerResult, setWorkerResult] = useState<number | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./workers/heavyLogic.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      const { type, value } = e.data;
      if (type === 'progress') setWorkerProgress(value);
      else if (type === 'result') {
        setWorkerResult(value);
        setIsWorking(false);
        setWorkerProgress(100);
      }
    };
    return () => { workerRef.current?.terminate(); };
  }, []);

  const startDecryption = () => {
    if (!workerRef.current) return;
    setIsWorking(true);
    setWorkerProgress(0);
    setWorkerResult(null);
    workerRef.current.postMessage(50000);
  };

  // Fetch Models
  const { data: models, isPending: modelsLoading, error: modelsError } = useQuery({
    queryKey: ['models', provider, settings.ollamaEndpoint, settings.geminiApiKey],
    queryFn: async () => {
       if (provider === 'gemini') {
           if (!settings.geminiApiKey) return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
           try {
               const gModels = await invoke<string[]>( "get_gemini_models", { apiKey: settings.geminiApiKey });
               if (gModels && gModels.length > 0 && !selectedModel) {
                   setSelectedModel(gModels[0]);
               }
               return gModels;
           } catch (e) {
               console.error("Failed to fetch Gemini models", e);
               return ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
           }
       }
       const models = await invoke<string[]>( "get_ollama_models", { endpoint: settings.ollamaEndpoint });
       if (models && models.length > 0 && !selectedModel) {
           setSelectedModel(models[0]);
       }
       return models;
    },
    retry: 1
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!prompt.trim() && !pendingImage) || isStreaming) return;

    const userPrompt = prompt;
    const attachedImage = pendingImage;
    
    setPrompt("");
    setPendingImage(null);
    
    let displayContent = userPrompt;
    if (attachedImage) {
        displayContent = `![Uploaded Image](${attachedImage})\n\n${userPrompt}`;
    }

    addMessage({ role: 'user', content: displayContent, timestamp: Date.now() });
    addMessage({ role: 'assistant', content: "", timestamp: Date.now() });
    
    setIsStreaming(true);

    // SWARM MODE (FORCED)
    try {
        updateLastMessage("Inicjuję Protokół Wilczej Zamieci (Wolf Swarm v3.0)... 🐺\n\n");
        await invoke('spawn_swarm_agent', { objective: userPrompt });
        // The result comes via 'swarm-data' event listener
        return;
    } catch (error) {
        updateLastMessage(`\n[Błąd Swarm: ${error}]`);
        setIsStreaming(false);
        return;
    }
  };

  // Export Session
  const handleExport = () => {
      if (!currentSessionId) return;
      const session = sessions.find(s => s.id === currentSessionId);
      const messages = chatHistory[currentSessionId] || [];
      
      const content = messages.map(m => `### ${m.role.toUpperCase()} [${new Date(m.timestamp).toLocaleString()}]\n${m.content}\n`).join('\n---\n');
      
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `session-${session?.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  // Edit Session Title
  const startEditing = (session: {id: string, title: string}) => {
      setEditingSessionId(session.id);
      setEditTitle(session.title);
  };

  const saveTitle = () => {
      if (editingSessionId) {
          updateSessionTitle(editingSessionId, editTitle);
          setEditingSessionId(null);
      }
  };

  // Clock
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusText = () => {
    if (isStreaming) return "ODBIERANIE STRUMIENIA DANYCH...";
    if (isWorking) return "WĄTEK ROBOCZY ZAJĘTY";
    if (modelsError) return "POŁĄCZENIE PRZERWANE";
    return "SYSTEM GOTOWY";
  };

  // Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
       const file = e.dataTransfer.files[0];
       if(file.size > 1024 * 1024 * 5) { alert("Plik zbyt duży. Maksymalnie 5MB."); return; }

       const reader = new FileReader();
       if (file.type.startsWith('image/')) {
           reader.onload = (event) => {
               if (event.target?.result) setPendingImage(event.target.result as string);
           };
           reader.readAsDataURL(file);
       } else {
           reader.onload = (event) => {
               if (event.target?.result) {
                   const content = event.target.result as string;
                   const contextPrompt = `[Plik Kontekstowy: ${file.name}]\n\`\`\`\n${content.substring(0, 20000)}\n\`\`\`\n\nPrzeanalizuj treść tego pliku.`;
                   setPrompt(contextPrompt);
               }
           };
           reader.readAsText(file);
       }
    }
  };

  // Message Item Renderer for Virtuoso
  const renderMessage = (index: number) => {
      const msg = currentMessages[index];
      return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} py-2 px-4`}
        >
            <div 
                className={`max-w-[95%] p-3 rounded-lg text-sm overflow-hidden ${ 
                    msg.role === 'user' 
                    ? 'bg-[var(--matrix-accent)] text-black font-bold font-sans' 
                    : msg.role === 'system'
                        ? 'bg-blue-900/20 text-blue-200 border border-blue-500/30 font-mono text-xs'
                        : 'bg-black/20 text-[var(--matrix-text)] border border-[var(--matrix-border)] font-mono'
                }`}
            >
                {msg.role === 'system' && (
                    <div className="flex items-center gap-2 mb-1 border-b border-blue-500/20 pb-1 text-blue-400">
                        <Terminal size={14} />
                        <span className="font-bold">SYSTEM OUTPUT</span>
                    </div>
                )}

                {msg.role === 'assistant' ? (
                    <div className="markdown-body">
                        <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <CodeBlock 
                                            language={match[1]} 
                                            value={String(children).replace(/\n$/, '')} 
                                            onRun={(cmd) => executeCommand(cmd)}
                                        />
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                        >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                ) : (
                    <div className="whitespace-pre-wrap">
                            <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                code(props) {
                                    const {children, className, node, ...rest} = props
                                    const match = /language-(\w+)/.exec(className || '')
                                    return match ? (
                                        <CodeBlock 
                                            language={match[1]} 
                                            value={String(children).replace(/\n$/, '')} 
                                            onRun={(cmd) => executeCommand(cmd)}
                                        />
                                    ) : (
                                        <code {...rest} className={className}>
                                            {children}
                                        </code>
                                    )
                                }
                            }}
                            >
                            {msg.content}
                        </ReactMarkdown>
                    </div>
                )}

                {msg.role === 'assistant' && isStreaming && index === currentMessages.length - 1 && (
                    <span className="inline-block w-2 h-4 ml-1 bg-[var(--matrix-accent)] animate-pulse align-middle"></span>
                )}
            </div>
        </motion.div>
      );
  };

  return (
    <main 
        className="container mx-auto p-4 h-screen flex flex-col gap-4 matrix-bg overflow-hidden transition-all duration-500"
        onDragEnter={handleDrag}
    >
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* DRAG OVERLAY */}
      {dragActive && (
        <div 
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center border-4 border-[var(--matrix-accent)] border-dashed m-4 rounded-xl"
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >
            <div className="text-[var(--matrix-accent)] text-2xl font-mono animate-pulse flex flex-col items-center gap-4 pointer-events-none">
                <Paperclip size={64} />
                <span>UPUŚĆ PLIK, ABY DODAĆ KONTEKST</span>
            </div>
        </div>
      )}

      {/* HEADER */}
      <header className="flex items-center justify-between border-b border-[var(--matrix-border)] pb-2 shrink-0">
          <div className="flex items-center gap-4">
            <img 
                src={theme === 'dark' ? "/logodark.webp" : "/logolight.webp"} 
                alt="Gemini Logo" 
                className="w-10 h-10 object-contain transition-all duration-300" 
            />
            <h1 className="text-3xl font-bold flex items-center gap-3 text-[var(--matrix-accent)] transition-colors duration-300">
              Gemini<span className={theme === 'dark' ? "text-white" : "text-gray-800"}>GUI</span>
            </h1>
          </div>
          <div className="flex gap-3 items-center">
            <button 
                onClick={() => updateSettings({ useSwarm: !settings.useSwarm })}
                className={`p-2 rounded-full transition-colors ${settings.useSwarm ? 'bg-[var(--matrix-accent)] text-black shadow-[0_0_10px_rgba(0,255,65,0.5)]' : 'hover:bg-[var(--matrix-border)] text-[var(--matrix-text-dim)]'}`}
                title={settings.useSwarm ? "Tryb Swarm Aktywny (Wolf Swarm)" : "Aktywuj Tryb Swarm"}
            >
                <Zap size={20} fill={settings.useSwarm ? "currentColor" : "none"} />
            </button>
            <button 
                onClick={() => { if(confirm("Wyczyścić historię czatu?")) clearHistory(); }}
                className="p-2 rounded-full hover:bg-[var(--matrix-border)] transition-colors text-[var(--matrix-accent)]"
                title="Wyczyść Czat"
            >
                <Eraser size={20} />
            </button>
            <button 
                onClick={() => setIsSettingsOpen(true)}  
                className="p-2 rounded-full hover:bg-[var(--matrix-border)] transition-colors text-[var(--matrix-accent)]"
                title="Ustawienia"
            >
                <Settings size={20} />
            </button>
            <div className="flex bg-black/20 rounded-full p-1 border border-[var(--matrix-border)]">
                <button 
                    onClick={() => setProvider('ollama')}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${provider === 'ollama' ? 'bg-[var(--matrix-accent)] text-black font-bold' : 'text-[var(--matrix-text-dim)]'}`}
                >
                    Local
                </button>
                <button 
                    onClick={() => setProvider('gemini')}
                    className={`px-3 py-1 rounded-full text-xs transition-colors ${provider === 'gemini' ? 'bg-[var(--matrix-accent)] text-black font-bold' : 'text-[var(--matrix-text-dim)]'}`}
                >
                    Cloud
                </button>
            </div>
            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-[var(--matrix-border)] transition-colors text-[var(--matrix-accent)]"
                title="Toggle Theme"
            >
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <span className={`status-badge flex items-center gap-1 ${modelsError ? 'status-pending' : 'status-approved'}`}>
              <Server size={12} /> {modelsError ? 'Ollama Offline' : 'System Online'}
            </span>
          </div>
      </header>

      {/* MAIN CONTENT GRID */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden min-h-0">
          
          {/* LEFT SIDEBAR: SESSION LIST */}
          <aside className="hidden md:flex md:col-span-1 glass-panel rounded-lg border-[var(--matrix-border)] flex-col overflow-hidden">
             
             {/* Toolbar */}
             <div className="p-3 border-b border-[var(--matrix-border)] flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <span className="font-semibold text-[var(--matrix-text-dim)]">Sesje</span>
                    <button onClick={createSession} className="glass-button p-1 rounded-full"><Plus size={16}/></button>
                </div>
                {/* Search Bar */}
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-2 text-[var(--matrix-text-dim)]" />
                    <input 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Szukaj..."
                        className="w-full bg-black/20 border border-[var(--matrix-border)] rounded pl-8 pr-2 py-1 text-xs text-[var(--matrix-text)] focus:outline-none focus:border-[var(--matrix-accent)]"
                    />
                </div>
             </div>

             {/* List */}
             <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {filteredSessions.map(session => (
                    <div 
                        key={session.id}
                        onClick={() => selectSession(session.id)}
                        className={`p-2 rounded cursor-pointer flex justify-between items-center group transition-colors ${ 
                            session.id === currentSessionId 
                            ? 'bg-[var(--matrix-accent)] text-black font-bold' 
                            : 'hover:bg-black/10 text-[var(--matrix-text)]'
                        }`}
                    >
                        {editingSessionId === session.id ? (
                            <input 
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                onBlur={saveTitle}
                                onKeyDown={(e) => e.key === 'Enter' && saveTitle()}
                                autoFocus
                                className="bg-white/90 text-black text-xs rounded px-1 w-full"
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <div className="flex items-center gap-2 truncate flex-1" onDoubleClick={() => startEditing(session)}>
                                <MessageSquare size={14} />
                                <span className="truncate text-xs">{session.title}</span>
                            </div>
                        )}
                        
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => { e.stopPropagation(); startEditing(session); }}
                                className={`hover:text-[var(--matrix-accent)] ${session.id === currentSessionId ? 'text-black/50' : 'text-[var(--matrix-text-dim)]'}`}
                            >
                                <Edit2 size={12} />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                                className={`hover:text-red-500 ${session.id === currentSessionId ? 'text-black/50' : 'text-[var(--matrix-text-dim)]'}`}
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                ))}
             </div>
          </aside>

          {/* MIDDLE: CHAT INTERFACE (Takes 2 columns) */}
          <section className="md:col-span-2 flex flex-col gap-4 min-h-0 relative">
             <div className="glass-panel flex-1 rounded-lg border-[var(--matrix-border)] flex flex-col min-h-0">
                {/* MESSAGES LIST with Virtuoso */}
                <div className="flex-1 min-h-0">
                    {currentMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-[var(--matrix-text-dim)] opacity-50 gap-2">
                            <FileText size={48} />
                            <span>Oczekiwanie na dane lub plik...</span>
                        </div>
                    ) : (
                        <Virtuoso 
                            ref={virtuosoRef}
                            totalCount={currentMessages.length}
                            itemContent={renderMessage}
                            followOutput={'auto'}
                            className="h-full scrollbar-thin"
                        />
                    )}
                </div>

                {/* INPUT AREA */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-[var(--matrix-border)] bg-black/10 flex flex-col gap-2">
                    {/* Image Preview */}
                    {pendingImage && (
                        <div className="relative inline-block w-fit">
                            <img src={pendingImage} alt="Preview" className="h-16 w-auto rounded border border-[var(--matrix-accent)]" />
                            <button 
                                type="button"
                                onClick={() => setPendingImage(null)}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    )}

                    <div className="flex gap-2">
                        <select 
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="matrix-input rounded px-2 py-2 text-sm max-w-[120px] truncate transition-colors duration-300"
                            disabled={modelsLoading || !!modelsError}
                        >
                            {modelsLoading && <option>...</option>}
                            {modelsError && <option>Offline</option>}
                            {models?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <input
                            value={prompt}
                            onChange={(e) => setPrompt(e.currentTarget.value)}
                            placeholder={pendingImage ? "Opisz ten obraz..." : "Wpisz polecenie..."}
                            disabled={!!modelsError || isStreaming}
                            className="flex-1 matrix-input rounded px-4 py-2 transition-colors duration-300 disabled:opacity-50"
                        />
                        <button 
                            type="submit" 
                            className="glass-button flex items-center gap-2" 
                            disabled={!!modelsError || isStreaming || (!prompt.trim() && !pendingImage)}
                        >
                            {isStreaming ? <RefreshCw className="animate-spin" size={16}/> : <Send size={16}/>}
                        </button>
                    </div>
                </form>
             </div>
          </section>

          {/* RIGHT: SIDEBAR (Stats & Workers) - Collapses on mobile */}
          <aside className="hidden lg:flex lg:col-span-1 flex-col gap-4 overflow-y-auto pr-1">
            
            <MemoryPanel />
            <BridgePanel />

            {/* ACTIONS SECTION (New) */}
            <div className="glass-panel p-4 rounded-lg flex flex-col justify-center gap-4 border-[var(--matrix-border)]">
                <div className="flex justify-between items-center text-[var(--matrix-text-dim)] border-b border-[var(--matrix-border)] pb-2">
                   <span className="flex items-center gap-2 font-semibold text-sm">Akcje Sesji</span>
                </div>
                <button 
                    onClick={handleExport}
                    className="glass-button text-xs flex items-center justify-center gap-2"
                    title="Eksportuj jako Markdown"
                >
                    <Download size={14} /> Eksportuj Czat
                </button>
            </div>

            {/* WORKER SECTION */}
            <div className="glass-panel p-4 rounded-lg flex flex-col justify-center gap-4 border-[var(--matrix-border)]">
                <div className="flex justify-between items-center text-[var(--matrix-text-dim)] border-b border-[var(--matrix-border)] pb-2">
                   <span className="flex items-center gap-2 font-semibold text-sm"><Lock size={16}/> Deszyfracja</span>
                   {isWorking && <span className="text-[10px] animate-pulse text-[var(--matrix-accent)]">PRACA</span>}
                </div>
                
                <div className="w-full bg-black/10 rounded-full h-2.5 border border-[var(--matrix-border)] overflow-hidden">
                    <div 
                        className="bg-[var(--matrix-accent)] h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${workerProgress}%` }}
                    ></div>
                </div>
                
                <div className="flex justify-between items-center">
                    <div className="text-xs font-mono text-[var(--matrix-text-dim)]">
                        {workerResult ? `Klucz: ${workerResult}` : isWorking ? `${Math.round(workerProgress)}%` : "IDLE"}
                    </div>
                    <button 
                        onClick={startDecryption} 
                        disabled={isWorking}
                        className={`glass-button text-[10px] px-2 py-1 ${isWorking ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {isWorking ? 'Działa...' : 'Start'}
                    </button>
                </div>
            </div>

            {/* ZUSTAND SECTION */}
            <div className="glass-panel p-4 rounded-lg flex flex-col justify-center gap-4 border-[var(--matrix-border)]">
                <h2 className="text-sm font-semibold text-[var(--matrix-text-dim)] border-b border-[var(--matrix-border)] pb-2">
                Stan Systemu
                </h2>
                <div className="flex items-center justify-between text-[var(--matrix-text)]">
                    <span>Licznik Sync:</span>
                    <span className="text-xl font-bold text-[var(--matrix-accent)]">{count}</span>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={increment} className="glass-button text-xs px-2">+</button>
                    <button onClick={decrement} className="glass-button text-xs px-2">-</button>
                </div>
            </div>

          </aside>
      </div>

      {/* STATUS LINE FOOTER */}
      <footer className="glass-panel rounded-lg p-2 border-[var(--matrix-border)] flex items-center justify-between text-xs font-mono shrink-0 transition-colors duration-300">
         <div className="flex items-center gap-4">
            <span className={`font-bold ${isStreaming || isWorking ? 'animate-pulse text-[var(--matrix-accent)]' : 'text-[var(--matrix-text-dim)]'}`}>
                [{getStatusText()}]
            </span>
            <span className="hidden md:inline text-[var(--matrix-text-dim)]">
                MEM: 24MB | BRIDGE: AKTYWNY
            </span>
         </div>
         
         <div className="flex items-center gap-4 text-[var(--matrix-text)]">
            <span className="opacity-70">MDL: {selectedModel || "BRAK"}</span>
            <span className="text-[var(--matrix-accent)]">{time}</span>
         </div>
      </footer>
    </main>
  );
}

export default App;
