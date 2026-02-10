/**
 * ShortcutsModal - Keyboard shortcuts reference with grouped categories
 * Improvement #40: Enhanced keyboard shortcuts display
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{ key: string; desc: string }>;
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'Nawigacja',
    shortcuts: [
      { key: 'Alt + 1', desc: 'Widok czatu' },
      { key: 'Alt + 2', desc: 'Widok agentów' },
      { key: 'Alt + 3', desc: 'Historia rozmów' },
      { key: 'Ctrl + B', desc: 'Pokaż/ukryj sidebar' },
    ],
  },
  {
    title: 'Czat',
    shortcuts: [
      { key: 'Enter', desc: 'Wyślij wiadomość' },
      { key: 'Shift + Enter', desc: 'Nowa linia' },
      { key: 'Ctrl + K', desc: 'Focus na czat' },
      { key: 'Ctrl + N', desc: 'Nowa sesja' },
      { key: 'Ctrl + L', desc: 'Wyczyść historię' },
      { key: 'Ctrl + E', desc: 'Kopiuj sesję' },
    ],
  },
  {
    title: 'Aplikacja',
    shortcuts: [
      { key: 'Ctrl + ,', desc: 'Ustawienia' },
      { key: 'Ctrl + /', desc: 'Skróty klawiszowe' },
      { key: 'Ctrl+Shift+T', desc: 'Zmień motyw' },
      { key: 'Ctrl+Shift+I', desc: 'Focus na input' },
      { key: 'Escape', desc: 'Zamknij modal' },
    ],
  },
];

export const ShortcutsModal = ({ isOpen, onClose }: ShortcutsModalProps) => {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label="Skróty klawiszowe"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full max-w-lg overflow-hidden rounded-xl border shadow-2xl ${
              isLight ? 'bg-white/95 border-slate-200' : 'glass-panel'
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between p-4 border-b ${
                isLight
                  ? 'bg-emerald-50/50 border-slate-200'
                  : 'bg-[var(--matrix-accent)]/5 border-white/5'
              }`}
            >
              <div
                className={`flex items-center gap-2 ${
                  isLight ? 'text-emerald-700' : 'text-[var(--matrix-accent)]'
                }`}
              >
                <Keyboard size={20} />
                <h2 className="font-bold text-lg">Skróty Klawiszowe</h2>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-all ${
                  isLight
                    ? 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                    : 'text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] hover:bg-[var(--matrix-accent)]/10'
                }`}
                aria-label="Zamknij"
              >
                <X size={20} />
              </button>
            </div>

            {/* Shortcut groups */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {SHORTCUT_GROUPS.map((group) => (
                <div key={group.title}>
                  <h3
                    className={`text-[10px] font-semibold uppercase tracking-wider mb-2 px-2 ${
                      isLight ? 'text-slate-400' : 'text-[var(--matrix-text-dim)]'
                    }`}
                  >
                    {group.title}
                  </h3>
                  <div className="space-y-0.5">
                    {group.shortcuts.map((s) => (
                      <div
                        key={s.key}
                        className={`flex justify-between items-center py-2 px-2 rounded-lg transition-colors ${
                          isLight ? 'hover:bg-emerald-50/60' : 'hover:bg-[var(--matrix-accent)]/5'
                        }`}
                      >
                        <span
                          className={`text-sm ${
                            isLight ? 'text-slate-700' : 'text-[var(--matrix-text)]'
                          }`}
                        >
                          {s.desc}
                        </span>
                        <kbd
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                            isLight
                              ? 'bg-slate-100 border-slate-200 text-slate-600'
                              : 'bg-[var(--matrix-accent)]/10 border-[var(--matrix-accent)]/20 text-[var(--matrix-accent)]'
                          }`}
                        >
                          {s.key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div
              className={`px-4 py-2.5 text-center text-[10px] border-t ${
                isLight
                  ? 'text-slate-400 border-slate-100 bg-slate-50/50'
                  : 'text-[var(--matrix-text-dim)] border-white/5 bg-black/10'
              }`}
            >
              Naciśnij <kbd className="font-mono font-bold">Esc</kbd> aby zamknąć
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
