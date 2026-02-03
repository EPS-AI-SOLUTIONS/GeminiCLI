import React, { memo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { X, Save } from 'lucide-react';
import { DEFAULT_OLLAMA_ENDPOINT } from '../constants';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModalComponent: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppStore();
  const [localSettings, setLocalSettings] = React.useState(settings);

  React.useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg p-6 border-[var(--matrix-border)] shadow-[var(--shadow-glass)] flex flex-col gap-4 relative">

        <button onClick={onClose} className="absolute top-4 right-4 text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)]">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-[var(--matrix-accent)] border-b border-[var(--matrix-border)] pb-2">
          Konfiguracja Systemu
        </h2>

        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Endpoint Ollama</label>
            <input
              value={localSettings.ollamaEndpoint}
              onChange={(e) => setLocalSettings({...localSettings, ollamaEndpoint: e.target.value})}
              className="matrix-input p-2 rounded text-sm font-mono"
              placeholder={DEFAULT_OLLAMA_ENDPOINT}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Klucz API Google Gemini</label>
            <input
              value={localSettings.geminiApiKey}
              onChange={(e) => setLocalSettings({...localSettings, geminiApiKey: e.target.value})}
              className="matrix-input p-2 rounded text-sm font-mono"
              type="password"
              placeholder="AIza..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Prompt Systemowy (Nadpisanie)</label>
            <textarea
              value={localSettings.systemPrompt}
              onChange={(e) => setLocalSettings({...localSettings, systemPrompt: e.target.value})}
              className="matrix-input p-2 rounded text-sm font-mono h-40 resize-none"
            />
          </div>

          {/* STREFA ZAGROŻENIA */}
          <div className="border border-red-500/30 rounded p-3 bg-red-900/10 flex flex-col gap-3 mt-2">
             <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Strefa Zagrożenia</span>
             <div className="flex gap-2">
                <button
                  onClick={() => { useAppStore.getState().clearHistory(); onClose(); }}
                  className="flex-1 border border-red-500/30 hover:bg-red-500/20 text-red-300 text-xs py-2 rounded transition-colors"
                >
                  Wyczyść Czat
                </button>
                <button
                  onClick={() => { if(confirm("Zresetować cały stan aplikacji?")) { useAppStore.getState().reset(); location.reload(); } }}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 text-xs py-2 rounded transition-colors font-bold"
                >
                  Reset Fabryczny
                </button>
             </div>
          </div>

        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-[var(--matrix-border)]">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--matrix-text-dim)] hover:text-[var(--matrix-text)]">
            Anuluj
          </button>
          <button onClick={handleSave} className="glass-button flex items-center gap-2">
            <Save size={16} /> Zapisz Konfigurację
          </button>
        </div>

      </div>
    </div>
  );
};

SettingsModalComponent.displayName = 'SettingsModal';

export const SettingsModal = memo(SettingsModalComponent);
