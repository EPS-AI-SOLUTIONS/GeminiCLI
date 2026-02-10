/**
 * History View - Session history with search and management
 * Full dark/light theme support
 */

import { ArrowRight, Clock, MessageSquare, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/shallow';
import { useTheme } from '../contexts/ThemeContext';
import { useAppStore } from '../store/useAppStore';

export function HistoryView() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const [searchQuery, setSearchQuery] = useState('');

  const { sessions, chatHistory, currentSessionId, selectSession, deleteSession, setCurrentView } =
    useAppStore(
      useShallow((state) => ({
        sessions: state.sessions,
        chatHistory: state.chatHistory,
        currentSessionId: state.currentSessionId,
        selectSession: state.selectSession,
        deleteSession: state.deleteSession,
        setCurrentView: state.setCurrentView,
      })),
    );

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => {
      const msgs = chatHistory[s.id] || [];
      return (
        s.title.toLowerCase().includes(q) || msgs.some((m) => m.content.toLowerCase().includes(q))
      );
    });
  }, [sessions, chatHistory, searchQuery]);

  const handleOpenSession = (sessionId: string) => {
    selectSession(sessionId);
    setCurrentView('chat');
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Usunąć tę sesję?')) {
      deleteSession(sessionId);
      toast.info('Sesja usunięta');
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="flex flex-col h-full p-4 gap-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2
            className={`text-xl font-semibold ${isLight ? 'text-slate-800' : 'text-[var(--matrix-text)]'}`}
          >
            Historia Sesji
          </h2>
          <p
            className={`text-sm mt-0.5 ${isLight ? 'text-slate-500' : 'text-[var(--matrix-text-dim)]'}`}
          >
            {sessions.length} {sessions.length === 1 ? 'sesja' : 'sesji'}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          size={14}
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            isLight ? 'text-slate-400' : 'text-slate-500'
          }`}
        />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj w sesjach..."
          className={`w-full pl-9 pr-4 py-2.5 rounded-xl text-sm font-mono transition-all outline-none ${
            isLight
              ? 'bg-white/60 border border-slate-200/50 text-slate-800 placeholder:text-slate-400 focus:border-emerald-400/50 focus:bg-white/80'
              : 'bg-black/30 border border-white/10 text-slate-200 placeholder:text-slate-500 focus:border-[var(--matrix-accent)]/50 focus:bg-black/50'
          }`}
        />
      </div>

      {/* Session List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {filteredSessions.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center h-40 gap-3 ${
              isLight ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            <Clock size={32} className="opacity-40" />
            <p className="text-sm italic">
              {searchQuery ? 'Brak wyników wyszukiwania' : 'Brak sesji'}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const msgs = chatHistory[session.id] || [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
            const isActive = session.id === currentSessionId;

            return (
              <button
                key={session.id}
                onClick={() => handleOpenSession(session.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 border group ${
                  isActive
                    ? isLight
                      ? 'bg-emerald-50/80 border-emerald-300/50 shadow-sm'
                      : 'bg-[var(--matrix-accent)]/10 border-[var(--matrix-accent)]/30 shadow-[0_0_10px_rgba(0,255,65,0.05)]'
                    : isLight
                      ? 'bg-white/40 border-slate-200/30 hover:bg-white/60 hover:border-slate-300/50'
                      : 'bg-black/20 border-white/5 hover:bg-black/30 hover:border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <MessageSquare
                        size={14}
                        className={
                          isActive
                            ? isLight
                              ? 'text-emerald-600'
                              : 'text-[var(--matrix-accent)]'
                            : isLight
                              ? 'text-slate-400'
                              : 'text-slate-500'
                        }
                      />
                      <h3
                        className={`text-sm font-medium truncate ${
                          isActive
                            ? isLight
                              ? 'text-emerald-700'
                              : 'text-[var(--matrix-accent)]'
                            : isLight
                              ? 'text-slate-700'
                              : 'text-slate-200'
                        }`}
                      >
                        {session.title}
                      </h3>
                    </div>
                    {lastMsg && (
                      <p
                        className={`text-xs mt-1 truncate ${isLight ? 'text-slate-400' : 'text-slate-500'}`}
                      >
                        {lastMsg.content.slice(0, 100)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className={`text-[10px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}
                    >
                      {msgs.length} msg • {formatDate(session.createdAt)}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-all ${
                        isLight
                          ? 'hover:bg-red-100 text-red-500'
                          : 'hover:bg-red-500/20 text-red-400'
                      }`}
                      title="Usuń sesję"
                    >
                      <Trash2 size={12} />
                    </button>
                    <ArrowRight
                      size={14}
                      className={`opacity-0 group-hover:opacity-100 transition-all ${
                        isLight ? 'text-emerald-600' : 'text-[var(--matrix-accent)]'
                      }`}
                    />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
