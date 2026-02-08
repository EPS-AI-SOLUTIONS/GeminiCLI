import React, { memo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useShallow } from 'zustand/shallow';
import { X, Save, RefreshCw } from 'lucide-react';
import { DEFAULT_OLLAMA_ENDPOINT, GEMINI_MODELS } from '../constants';
import { useGeminiModels } from '../hooks';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModalComponent: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppStore(
    useShallow((state) => ({
      settings: state.settings,
      updateSettings: state.updateSettings,
    }))
  );
  const [localSettings, setLocalSettings] = React.useState(settings);
  const { models: fetchedModels, isLoading: modelsLoading, refetch: refetchModels, hasApiKey } = useGeminiModels();

  React.useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  // Merge fetched model IDs with static metadata (labels, capabilities)
  const availableModels = React.useMemo(() => {
    if (!hasApiKey || fetchedModels.length === 0) return GEMINI_MODELS;
    // For fetched models, try to find metadata from static list, otherwise create basic entry
    return fetchedModels
      .filter((id) => id.startsWith('gemini-'))
      .map((id) => {
        const staticInfo = GEMINI_MODELS.find((m) => m.id === id);
        if (staticInfo) return staticInfo;
        return {
          id,
          provider: 'google' as const,
          name: `models/${id}`,
          label: id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
          contextWindow: 1048576,
          capabilities: { vision: true, functionCalling: true, jsonMode: true },
          metadata: { isExperimental: id.includes('preview') || id.includes('exp'), fetchedAt: Date.now() },
        };
      });
  }, [fetchedModels, hasApiKey]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md">
      <div className="glass-panel w-full max-w-lg p-6 flex flex-col gap-4 relative mx-4">

        <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] hover:bg-[var(--matrix-accent)]/10 transition-all">
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold text-[var(--matrix-accent)] pb-2">
          Konfiguracja Systemu
        </h2>

        <div className="flex flex-col gap-4">

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Endpoint Ollama</label>
            <input
              value={localSettings.ollamaEndpoint}
              onChange={(e) => setLocalSettings({...localSettings, ollamaEndpoint: e.target.value})}
              className="matrix-input p-3 text-sm font-mono"
              placeholder={DEFAULT_OLLAMA_ENDPOINT}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Klucz API Google Gemini</label>
            <input
              value={localSettings.geminiApiKey}
              onChange={(e) => setLocalSettings({...localSettings, geminiApiKey: e.target.value})}
              className="matrix-input p-3 text-sm font-mono"
              type="password"
              placeholder="AIza..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Model Gemini</label>
              {hasApiKey && (
                <button
                  onClick={() => refetchModels()}
                  disabled={modelsLoading}
                  className="flex items-center gap-1 text-[10px] text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] transition-colors disabled:opacity-50"
                  title="Odśwież listę modeli z API"
                >
                  <RefreshCw size={12} className={modelsLoading ? 'animate-spin' : ''} />
                  {modelsLoading ? 'Pobieranie...' : 'Odśwież'}
                </button>
              )}
            </div>
            <select
              value={localSettings.selectedModel}
              onChange={(e) => setLocalSettings({...localSettings, selectedModel: e.target.value})}
              className="matrix-input p-3 text-sm font-mono bg-[var(--matrix-panel-bg)] cursor-pointer"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                  {model.metadata.isExperimental ? ' ⚠ EXP' : ''}
                  {' '}({(model.contextWindow / 1024 / 1024).toFixed(0)}M ctx)
                </option>
              ))}
            </select>
            {!hasApiKey && (
              <span className="text-[10px] text-yellow-400/70 font-mono">Brak klucza API - pokazuję domyślne modele</span>
            )}
            {(() => {
              const selected = availableModels.find((m) => m.id === localSettings.selectedModel);
              if (!selected) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.capabilities.vision && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">VISION</span>}
                  {selected.capabilities.functionCalling && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-mono">TOOLS</span>}
                  {selected.capabilities.jsonMode && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">JSON</span>}
                  {selected.metadata.isExperimental && <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-mono">EXPERIMENTAL</span>}
                </div>
              );
            })()}
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">Prompt Systemowy (Nadpisanie)</label>
            <textarea
              value={localSettings.systemPrompt}
              onChange={(e) => setLocalSettings({...localSettings, systemPrompt: e.target.value})}
              className="matrix-input p-3 text-sm font-mono h-40 resize-none"
            />
          </div>

          {/* STREFA ZAGROŻENIA */}
          <div className="rounded-xl p-3 bg-red-900/10 flex flex-col gap-3 mt-2">
             <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Strefa Zagrożenia</span>
             <div className="flex gap-2">
                <button
                  onClick={() => { useAppStore.getState().clearHistory(); onClose(); }}
                  className="flex-1 hover:bg-red-500/20 text-red-300 text-xs py-2 rounded-lg transition-colors"
                >
                  Wyczyść Czat
                </button>
                <button
                  onClick={() => { if(confirm("Zresetować cały stan aplikacji?")) { useAppStore.getState().reset(); location.reload(); } }}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/40 text-red-200 text-xs py-2 rounded-lg transition-colors font-bold"
                >
                  Reset Fabryczny
                </button>
             </div>
          </div>

        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg text-[var(--matrix-text-dim)] hover:text-[var(--matrix-text)] hover:bg-[var(--matrix-accent)]/5 transition-all">
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
