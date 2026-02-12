'use client';

/**
 * ClaudeHydra - StatusFooter
 * Enhanced status bar with connection health, token usage, agent count
 */

import { Activity, Cloud, Cpu, Hash, Wifi, WifiOff, Zap } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';

interface StatusFooterProps {
  isStreaming: boolean;
  isWorking: boolean;
  hasError: boolean;
  selectedModel: string;
  tokenCount?: number;
  connectionHealth?: 'connected' | 'degraded' | 'disconnected';
}

const StatusFooterComponent: React.FC<StatusFooterProps> = ({
  isStreaming,
  isWorking,
  hasError,
  selectedModel,
  tokenCount = 0,
  connectionHealth = 'connected',
}) => {
  const [time, setTime] = useState(new Date().toLocaleTimeString('pl-PL'));
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString('pl-PL')), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatus = () => {
    if (isStreaming)
      return { text: 'Streaming', color: isLight ? '#059669' : '#ffffff', pulse: true, icon: Wifi };
    if (isWorking)
      return { text: 'Praca', color: isLight ? '#d97706' : '#facc15', pulse: true, icon: Cpu };
    if (hasError)
      return { text: 'Błąd', color: isLight ? '#dc2626' : '#f87171', pulse: false, icon: WifiOff };
    return { text: 'Gotowy', color: isLight ? '#047857' : '#e5e7eb', pulse: false, icon: Cloud };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const modelTier = selectedModel.includes('pro')
    ? { label: 'PRO', icon: Cloud, cls: isLight ? 'text-blue-600' : 'text-blue-400' }
    : selectedModel.includes('flash')
      ? { label: 'FLASH', icon: Zap, cls: isLight ? 'text-amber-600' : 'text-amber-400' }
      : selectedModel.toLowerCase().includes('qwen') ||
          selectedModel.toLowerCase().includes('llama')
        ? { label: 'LOCAL', icon: Cpu, cls: isLight ? 'text-emerald-600' : 'text-emerald-400' }
        : null;

  const healthConfig = {
    connected: { color: isLight ? '#059669' : '#e5e7eb', label: 'Online' },
    degraded: { color: isLight ? '#d97706' : '#facc15', label: 'Degraded' },
    disconnected: { color: isLight ? '#dc2626' : '#f87171', label: 'Offline' },
  };
  const health = healthConfig[connectionHealth];

  const formatTokens = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return String(count);
  };

  return (
    <footer
      className="glass-panel px-3 py-1.5 flex items-center justify-between text-[10px] font-mono shrink-0 transition-all duration-400"
      role="contentinfo"
      aria-label="Status bar"
    >
      {/* Left: Status + Connection Health + Agent Count */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center gap-1.5" aria-live="polite">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${status.pulse ? 'animate-pulse' : ''}`}
            style={{ background: status.color, boxShadow: `0 0 6px ${status.color}` }}
            aria-hidden="true"
          />
          <StatusIcon size={10} style={{ color: status.color }} aria-hidden="true" />
          <span style={{ color: status.color }} className="font-medium">
            {status.text}
          </span>
        </div>
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100/60' : 'bg-white/5'}`}
          title={`Połączenie: ${health.label}`}
        >
          <Activity size={9} style={{ color: health.color }} aria-hidden="true" />
          <span style={{ color: health.color }}>{health.label}</span>
        </div>
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100/60' : 'bg-white/5'}`}
        >
          <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>13 agentów</span>
        </div>
      </div>

      {/* Right: Tokens + Model + Tier + Time */}
      <div className="flex items-center gap-3">
        {tokenCount > 0 && (
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${isLight ? 'bg-slate-100/60 text-slate-700' : 'bg-white/5 text-slate-300'}`}
            title={`Zużycie tokenów: ${tokenCount.toLocaleString()}`}
          >
            <Hash size={9} aria-hidden="true" />
            <span>{formatTokens(tokenCount)} tok</span>
          </div>
        )}
        {modelTier && (
          <div className={`flex items-center gap-1 ${modelTier.cls}`}>
            <modelTier.icon size={10} aria-hidden="true" />
            <span className="font-bold">{modelTier.label}</span>
          </div>
        )}
        <span className={isLight ? 'text-slate-700' : 'text-[var(--matrix-text-dim)]'}>
          {selectedModel || 'brak'}
        </span>
        <span
          className={`tabular-nums ${isLight ? 'text-emerald-600' : 'text-[var(--matrix-accent)]'}`}
        >
          {time}
        </span>
      </div>
    </footer>
  );
};

StatusFooterComponent.displayName = 'StatusFooter';
export const StatusFooter = memo(StatusFooterComponent);
