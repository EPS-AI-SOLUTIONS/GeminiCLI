'use client';

/**
 * Settings Modal - ClaudeHydra system configuration
 * Theme, model selection, API keys, danger zone
 */

import { Monitor, Moon, RefreshCw, Save, Sun, X } from 'lucide-react';
import React, { memo } from 'react';
import { useShallow } from 'zustand/shallow';
import { DEFAULT_OLLAMA_ENDPOINT, GEMINI_MODELS } from '@/constants';
import { useTheme } from '@/contexts/ThemeContext';
import { useGeminiModels } from '@/hooks';
import { useAppStore } from '@/store/useAppStore';
import type { Theme } from '@/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModalComponent: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { settings, updateSettings } = useAppStore(
    useShallow((state) => ({
      settings: state.settings,
      updateSettings: state.updateSettings,
    })),
  );
  const [localSettings, setLocalSettings] = React.useState(settings);
  const {
    models: fetchedModels,
    isLoading: modelsLoading,
    refetch: refetchModels,
    hasApiKey,
  } = useGeminiModels();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  React.useEffect(() => {
    if (isOpen) setLocalSettings(settings);
  }, [isOpen, settings]);

  const availableModels = React.useMemo(() => {
    if (!hasApiKey || fetchedModels.length === 0) return GEMINI_MODELS;
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
          metadata: {
            isExperimental: id.includes('preview') || id.includes('exp'),
            fetchedAt: Date.now(),
          },
        };
      });
  }, [fetchedModels, hasApiKey]);
  if (!isOpen) return null;

  const handleSave = () => {
    updateSettings(localSettings);
    onClose();
  };

  const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: 'dark', label: 'Ciemny', icon: Moon },
    { value: 'light', label: 'Jasny', icon: Sun },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md ${
        isLight ? 'bg-black/30' : 'bg-black/50'
      }`}
    >
      <div
        className={`glass-panel w-full max-w-lg p-6 flex flex-col gap-4 relative mx-4 max-h-[90vh] overflow-y-auto ${
          isLight ? 'scrollbar-thin scrollbar-thumb-slate-300' : ''
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-[var(--matrix-text-dim)] hover:text-[var(--matrix-accent)] hover:bg-[var(--matrix-accent)]/10 transition-all"
        >
          <X size={20} />
        </button>
        <h2 className="text-xl font-bold text-[var(--matrix-accent)] pb-2">Konfiguracja Systemu</h2>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">
              Endpoint Ollama
            </label>
            <input
              value={localSettings.ollamaEndpoint}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, ollamaEndpoint: e.target.value })
              }
              className="matrix-input p-3 text-sm font-mono"
              placeholder={DEFAULT_OLLAMA_ENDPOINT}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">
              Klucz API Google Gemini
            </label>
            <input
              value={localSettings.geminiApiKey}
              onChange={(e) => setLocalSettings({ ...localSettings, geminiApiKey: e.target.value })}
              className="matrix-input p-3 text-sm font-mono"
              type="password"
              placeholder="AIza..."
            />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--matrix-text-dim)] font-mono">
                Model Gemini
              </label>
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
            </div>{' '}
            <select
              value={localSettings.selectedModel}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, selectedModel: e.target.value })
              }
              className="matrix-input p-3 text-sm font-mono bg-[var(--matrix-panel-bg)] cursor-pointer"
            >
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                  {model.metadata.isExperimental ? ' ⚠ EXP' : ''} (
                  {(model.contextWindow / 1024 / 1024).toFixed(0)}M ctx)
                </option>
              ))}
            </select>
            {!hasApiKey && (
              <span
                className={`text-[10px] font-mono ${isLight ? 'text-amber-600/80' : 'text-yellow-400/70'}`}
              >
                Brak klucza API - pokazuję domyślne modele
              </span>
            )}
            {(() => {
              const selected = availableModels.find((m) => m.id === localSettings.selectedModel);
              if (!selected) return null;
              return (
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.capabilities.vision && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-mono">
                      VISION
                    </span>
                  )}
                  {selected.capabilities.functionCalling && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 font-mono">
                      TOOLS
                    </span>
                  )}
                  {selected.capabilities.jsonMode && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 font-mono">
                      JSON
                    </span>
                  )}
                  {selected.metadata.isExperimental && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-mono">
                      EXPERIMENTAL
                    </span>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">
              Prompt Systemowy (Nadpisanie)
            </label>
            <textarea
              value={localSettings.systemPrompt}
              onChange={(e) => setLocalSettings({ ...localSettings, systemPrompt: e.target.value })}
              className="matrix-input p-3 text-sm font-mono h-40 resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm text-[var(--matrix-text-dim)] font-mono">
              Motyw Interfejsu
            </label>
            <div className="flex gap-2">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-mono transition-all border ${
                      isActive
                        ? isLight
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 shadow-sm'
                          : 'bg-[var(--matrix-accent)]/15 border-[var(--matrix-accent)]/40 text-[var(--matrix-accent)] shadow-[0_0_10px_rgba(0,255,65,0.1)]'
                        : isLight
                          ? 'bg-white/40 border-slate-200/50 text-slate-500 hover:bg-white/60 hover:border-slate-300/60'
                          : 'bg-black/20 border-white/10 text-[var(--matrix-text-dim)] hover:bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <Icon size={14} />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div
            className={`rounded-xl p-3 flex flex-col gap-3 mt-2 ${
              isLight ? 'bg-red-50/80 border border-red-200/40' : 'bg-red-900/10'
            }`}
          >
            <span
              className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-red-600' : 'text-red-400'}`}
            >
              Strefa Zagrożenia
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  useAppStore.getState().clearHistory();
                  onClose();
                }}
                className={`flex-1 text-xs py-2 rounded-lg transition-colors ${
                  isLight ? 'hover:bg-red-100 text-red-600' : 'hover:bg-red-500/20 text-red-300'
                }`}
              >
                Wyczyść Czat
              </button>
              <button
                onClick={() => {
                  if (confirm('Zresetować cały stan aplikacji?')) {
                    useAppStore.getState().reset();
                    location.reload();
                  }
                }}
                className={`flex-1 text-xs py-2 rounded-lg transition-colors font-bold ${
                  isLight
                    ? 'bg-red-100 hover:bg-red-200 text-red-700'
                    : 'bg-red-500/20 hover:bg-red-500/40 text-red-200'
                }`}
              >
                Reset Fabryczny
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg text-[var(--matrix-text-dim)] hover:text-[var(--matrix-text)] hover:bg-[var(--matrix-accent)]/5 transition-all"
          >
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
