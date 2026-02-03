import { useState, memo } from 'react';
import { Plus, Search, MessageSquare, Edit2, Trash2 } from 'lucide-react';
import type { Session, SessionSidebarProps } from '../types';

const SessionSidebarComponent: React.FC<SessionSidebarProps> = ({
  sessions,
  currentSessionId,
  onCreateSession,
  onSelectSession,
  onDeleteSession,
  onUpdateTitle
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredSessions = sessions.filter(s =>
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startEditing = (session: Session) => {
    setEditingSessionId(session.id);
    setEditTitle(session.title);
  };

  const saveTitle = () => {
    if (editingSessionId) {
      onUpdateTitle(editingSessionId, editTitle);
      setEditingSessionId(null);
    }
  };

  return (
    <aside className="hidden md:flex md:col-span-1 glass-panel rounded-lg border-[var(--matrix-border)] flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="p-3 border-b border-[var(--matrix-border)] flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-[var(--matrix-text-dim)]">Sesje</span>
          <button onClick={onCreateSession} className="glass-button p-1 rounded-full">
            <Plus size={16}/>
          </button>
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
            onClick={() => onSelectSession(session.id)}
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
              <div
                className="flex items-center gap-2 truncate flex-1"
                onDoubleClick={() => startEditing(session)}
              >
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
                onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                className={`hover:text-red-500 ${session.id === currentSessionId ? 'text-black/50' : 'text-[var(--matrix-text-dim)]'}`}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};

SessionSidebarComponent.displayName = 'SessionSidebar';

export const SessionSidebar = memo(SessionSidebarComponent);
