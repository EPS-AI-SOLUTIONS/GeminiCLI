/**
 * StatusFooter - Enhanced status bar with connection health, token usage, agent count
 * Improvements #37 (agent indicators), #38 (connection status), #39 (token usage)
 */

import { Activity, Cloud, Cpu, Hash, Wifi, WifiOff, Zap } from 'lucide-react';
import { memo, useEffect, useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface StatusFooterProps {
  isStreaming: boolean;
  isWorking: boolean;
  hasError: boolean;
  selectedModel: string;
  /** Total tokens used in current session */
  tokenCount?: number;
  /** Connection health: 'connected' | 'degraded' | 'disconnected' */
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
      return {
        text: 'Streaming',
        color: isLight ? '#059669' : '#00ff41',
        pulse: true,
        icon: Wifi,
      };
    if (isWorking)
      return {
        text: 'Praca',
        color: isLight ? '#d97706' : '#facc15',
        pulse: true,
        icon: Cpu,
      };
    if (hasError)
      return {
        text: 'Błąd',
        color: isLight ? '#dc2626' : '#f87171',
        pulse: false,
        icon: WifiOff,
      };
    return {
      text: 'Gotowy',
      color: isLight ? '#047857' : '#4ade80',
      pulse: false,
      icon: Cloud,
    };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Detect model tier
  const modelTier = selectedModel.includes('pro')
    ? { label: 'PRO', icon: Cloud, cls: isLight ? 'text-blue-600' : 'text-blue-400' }
    : selectedModel.includes('flash')
      ? { label: 'FLASH', icon: Zap, cls: isLight ? 'text-amber-600' : 'text-amber-400' }
      : selectedModel.toLowerCase().includes('qwen') ||
          selectedModel.toLowerCase().includes('llama')
        ? { label: 'LOCAL', icon: Cpu, cls: isLight ? 'text-emerald-600' : 'text-emerald-400' }
        : null;

  // Connection health indicator (#38)
  const healthConfig = {
    connected: { color: isLight ? '#059669' : '#4ade80', label: 'Online' },
    degraded: { color: isLight ? '#d97706' : '#facc15', label: 'Degraded' },
    disconnected: { color: isLight ? '#dc2626' : '#f87171', label: 'Offline' },
  };
  const health = healthConfig[connectionHealth];

  // Format token count (#39)
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
        {/* Activity status */}
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

        {/* Connection health (#38) */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
            isLight ? 'bg-slate-100/60' : 'bg-white/5'
          }`}
          title={`Połączenie: ${health.label}`}
        >
          <Activity size={9} style={{ color: health.color }} aria-hidden="true" />
          <span style={{ color: health.color }}>{health.label}</span>
        </div>

        {/* Agent count indicator (#37) */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
            isLight ? 'bg-slate-100/60' : 'bg-white/5'
          }`}
        >
          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>13 agentów</span>
        </div>
      </div>

      {/* Right: Tokens + Model + Tier + Time */}
      <div className="flex items-center gap-3">
        {/* Token usage (#39) */}
        {tokenCount > 0 && (
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${
              isLight ? 'bg-slate-100/60 text-slate-500' : 'bg-white/5 text-slate-400'
            }`}
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
        <span className={isLight ? 'text-slate-500' : 'text-[var(--matrix-text-dim)]'}>
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
