/**
 * Agents View - Display Hydra swarm agents (12 Witcher + Serena)
 * Full dark/light theme support with model tier badges
 */

import {
  Circle,
  Cloud,
  Cpu,
  Crown,
  Eye,
  Flame,
  Flower2,
  Gem,
  Heart,
  Mountain,
  Music,
  Shield,
  Sword,
  Wand2,
  Zap,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type { AgentRole, AgentTier } from '../types';

interface AgentMeta {
  displayName: string;
  description: string;
  icon: typeof Sword;
  color: string;
  colorLight: string;
  specialty: string;
  tier: AgentTier;
  model: string;
  modelTier: 'pro' | 'flash' | 'ollama';
}

const agentMeta: Record<AgentRole, AgentMeta> = {
  dijkstra: {
    displayName: 'Dijkstra',
    description: 'Strateg i planista - mistrz skomplikowanych planów',
    icon: Eye,
    color: '#4169E1',
    colorLight: '#2c4fa8',
    specialty: 'Planowanie Strategiczne',
    tier: 'commander',
    model: 'gemini-3-pro',
    modelTier: 'pro',
  },
  geralt: {
    displayName: 'Geralt',
    description: 'Security i operacje - Wiedźmin strzegący systemu',
    icon: Sword,
    color: '#FFD700',
    colorLight: '#b8960a',
    specialty: 'Security',
    tier: 'executor',
    model: 'gemini-3-pro',
    modelTier: 'pro',
  },
  yennefer: {
    displayName: 'Yennefer',
    description: 'Analityk - bezlitosna w ocenie jakości i architektury',
    icon: Wand2,
    color: '#8B008B',
    colorLight: '#6b006b',
    specialty: 'Synteza i Architektura',
    tier: 'coordinator',
    model: 'gemini-3-pro',
    modelTier: 'pro',
  },
  regis: {
    displayName: 'Regis',
    description: 'Badacz i erudyta - ekspert od głębokiej analizy',
    icon: Heart,
    color: '#2F4F4F',
    colorLight: '#1a3030',
    specialty: 'Research i Kontekst',
    tier: 'coordinator',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  jaskier: {
    displayName: 'Jaskier',
    description: 'Dokumentalista i komunikator - mistrz słowa',
    icon: Music,
    color: '#DAA520',
    colorLight: '#a07a10',
    specialty: 'Dokumentacja',
    tier: 'coordinator',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  triss: {
    displayName: 'Triss',
    description: 'QA i testing - specjalistka od jakości',
    icon: Flower2,
    color: '#FF6347',
    colorLight: '#d4402a',
    specialty: 'QA i Testing',
    tier: 'executor',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  vesemir: {
    displayName: 'Vesemir',
    description: 'Mentor - strażnik najlepszych praktyk i code review',
    icon: Shield,
    color: '#8B4513',
    colorLight: '#6b350e',
    specialty: 'Code Review',
    tier: 'executor',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  ciri: {
    displayName: 'Ciri',
    description: 'Szybkie zadania - błyskawiczna lokalna realizacja',
    icon: Zap,
    color: '#00CED1',
    colorLight: '#009a9d',
    specialty: 'Szybkie Zadania',
    tier: 'executor',
    model: 'qwen3:1.7b',
    modelTier: 'ollama',
  },
  eskel: {
    displayName: 'Eskel',
    description: 'DevOps i infrastruktura - solidne fundamenty',
    icon: Mountain,
    color: '#556B2F',
    colorLight: '#3d4e20',
    specialty: 'DevOps',
    tier: 'executor',
    model: 'qwen3:4b',
    modelTier: 'ollama',
  },
  lambert: {
    displayName: 'Lambert',
    description: 'Debugging i profiling - tropiciel bugów',
    icon: Flame,
    color: '#FF4500',
    colorLight: '#cc3700',
    specialty: 'Debugging',
    tier: 'executor',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  zoltan: {
    displayName: 'Zoltan',
    description: 'Dane i bazy danych - krasnolud od danych',
    icon: Gem,
    color: '#4682B4',
    colorLight: '#356a8c',
    specialty: 'Bazy Danych',
    tier: 'executor',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  philippa: {
    displayName: 'Philippa',
    description: 'Integracje i API - mistrzyni połączeń',
    icon: Crown,
    color: '#9370DB',
    colorLight: '#7050b8',
    specialty: 'Integracje API',
    tier: 'executor',
    model: 'gemini-3-flash',
    modelTier: 'flash',
  },
  serena: {
    displayName: 'Serena',
    description: 'Codebase intelligence - nawigacja i analiza kodu przez LSP',
    icon: Circle,
    color: '#20B2AA',
    colorLight: '#178a82',
    specialty: 'Codebase Intelligence',
    tier: 'executor',
    model: 'serena-lsp',
    modelTier: 'ollama',
  },
};

const modelTierConfig = {
  pro: {
    label: 'PRO',
    icon: Cloud,
    dark: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    light: 'text-blue-700 bg-blue-50 border-blue-200/60',
  },
  flash: {
    label: 'FLASH',
    icon: Zap,
    dark: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    light: 'text-amber-700 bg-amber-50 border-amber-200/60',
  },
  ollama: {
    label: 'LOCAL',
    icon: Cpu,
    dark: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    light: 'text-emerald-700 bg-emerald-50 border-emerald-200/60',
  },
};

const tierColors = {
  commander: {
    dark: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    light: 'text-yellow-700 bg-yellow-50 border-yellow-300/50',
  },
  coordinator: {
    dark: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    light: 'text-blue-700 bg-blue-50 border-blue-200/50',
  },
  executor: {
    dark: 'text-green-400 bg-green-400/10 border-green-400/30',
    light: 'text-green-700 bg-green-50 border-green-200/50',
  },
};

const tierLabels: Record<AgentTier, string> = {
  commander: 'Commander',
  coordinator: 'Coordinator',
  executor: 'Executor',
};

export function AgentsView() {
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === 'light';
  const tiers: AgentTier[] = ['commander', 'coordinator', 'executor'];

  return (
    <div className="space-y-6 p-4 overflow-y-auto h-full">
      <div>
        <h2
          className={`text-xl font-semibold ${isLight ? 'text-slate-800' : 'text-[var(--matrix-text)]'}`}
        >
          Agenci Hydry
        </h2>
        <p
          className={`text-sm mt-1 ${isLight ? 'text-slate-500' : 'text-[var(--matrix-text-dim)]'}`}
        >
          13 agentów Wiedźmina • 3 Pro • 7 Flash • 3 Local
        </p>
      </div>

      {/* Model tier legend */}
      <div
        className={`flex flex-wrap gap-3 p-3 rounded-xl ${
          isLight ? 'bg-white/50 border border-slate-200/40' : 'bg-black/20 border border-white/5'
        }`}
      >
        {Object.entries(modelTierConfig).map(([key, cfg]) => {
          const Icon = cfg.icon;
          return (
            <div
              key={key}
              className={`flex items-center gap-1.5 text-[10px] font-mono px-2 py-1 rounded-md border ${
                isLight ? cfg.light : cfg.dark
              }`}
            >
              <Icon size={10} />
              {cfg.label}
            </div>
          );
        })}
      </div>

      {tiers.map((tier) => {
        const agents = (Object.entries(agentMeta) as [AgentRole, AgentMeta][]).filter(
          ([, meta]) => meta.tier === tier,
        );

        return (
          <div key={tier}>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                  isLight ? tierColors[tier].light : tierColors[tier].dark
                }`}
              >
                {tierLabels[tier]}
              </span>
              <span
                className={`text-xs ${isLight ? 'text-slate-500' : 'text-[var(--matrix-text-dim)]'}`}
              >
                {agents.length} {agents.length === 1 ? 'agent' : 'agentów'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {agents.map(([role, meta]) => {
                const Icon = meta.icon;
                const ModelIcon = modelTierConfig[meta.modelTier].icon;
                const agentColor = isLight ? meta.colorLight : meta.color;

                return (
                  <div
                    key={role}
                    className={`rounded-xl p-3 space-y-2 transition-all duration-200 border ${
                      isLight
                        ? 'bg-white/50 border-slate-200/40 hover:border-emerald-400/40 hover:shadow-md'
                        : 'bg-black/20 border-[var(--matrix-border)] hover:border-[var(--matrix-accent)]/40 hover:shadow-[0_0_15px_rgba(0,255,65,0.05)]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{
                          backgroundColor: `${agentColor}15`,
                          border: `1px solid ${agentColor}35`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: agentColor }} />
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div
                          className={`flex items-center gap-1 text-[9px] ${isLight ? 'text-emerald-600' : 'text-green-400'}`}
                        >
                          <Circle className="w-2 h-2" fill="currentColor" />
                          Gotowy
                        </div>
                        <div
                          className={`flex items-center gap-1 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            isLight
                              ? modelTierConfig[meta.modelTier].light
                              : modelTierConfig[meta.modelTier].dark
                          }`}
                        >
                          <ModelIcon size={8} />
                          {modelTierConfig[meta.modelTier].label}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: agentColor }}>
                        {meta.displayName}
                      </h3>
                      <p
                        className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-[var(--matrix-text-dim)]'}`}
                      >
                        {meta.specialty} • {meta.model}
                      </p>
                    </div>

                    <p
                      className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-[var(--matrix-text-dim)]'}`}
                    >
                      {meta.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
