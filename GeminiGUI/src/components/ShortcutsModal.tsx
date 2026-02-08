import { motion, AnimatePresence } from 'framer-motion';
import { Keyboard, X } from 'lucide-react';
import { useEffect } from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: 'Enter', desc: 'Wyślij wiadomość' },
  { key: 'Shift + Enter', desc: 'Nowa linia' },
  { key: 'Ctrl + K', desc: 'Focus na czat' },
  { key: 'Ctrl + L', desc: 'Wyczyść historię' },
  { key: 'Ctrl + ,', desc: 'Ustawienia' },
  { key: 'Ctrl + /', desc: 'Skróty klawiszowe (to okno)' },
];

export const ShortcutsModal = ({ isOpen, onClose }: ShortcutsModalProps) => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-panel w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 bg-[var(--matrix-accent)]/5">
              <div className="flex items-center gap-2 text-[var(--matrix-accent)]">
                <Keyboard size={20} />
                <h2 className="font-bold text-lg">Skróty Klawiszowe</h2>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] hover:bg-[var(--matrix-accent)]/10 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-4 space-y-1">
              {SHORTCUTS.map((s, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 px-2 rounded-lg hover:bg-[var(--matrix-accent)]/5 transition-colors">
                  <span className="text-[var(--matrix-text)] text-sm">{s.desc}</span>
                  <span className="px-2.5 py-1 rounded-lg bg-[var(--matrix-accent)]/10 text-xs font-mono text-[var(--matrix-accent)] font-bold">
                    {s.key}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
