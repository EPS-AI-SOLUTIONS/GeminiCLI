/**
 * ClaudeHydra - Constants & Configuration
 * @module constants
 *
 * Centralized constants for the application.
 * Change values here to update across entire app.
 */

import type { GeminiModelInfo, Settings } from '../types';

// ============================================================================
// APP LIMITS
// ============================================================================

export const LIMITS = {
  MAX_SESSIONS: 100,
  MAX_MESSAGES_PER_SESSION: 1000,
  MAX_CONTENT_LENGTH: 50000, // 50KB
  MAX_SYSTEM_PROMPT_LENGTH: 10000, // 10KB
  MAX_TITLE_LENGTH: 100,
  MAX_AGENT_MEMORIES: 1000,
} as const;
// ============================================================================
// STATUS MESSAGES (PL)
// ============================================================================

export const STATUS = {
  // Streaming
  STREAMING: 'ODBIERANIE STRUMIENIA DANYCH...',
  STREAMING_SHORT: 'Streaming...',

  // Worker
  WORKER_BUSY: 'WATEK ROBOCZY ZAJETY',
  WORKER_IDLE: 'Gotowy',

  // Connection
  SYSTEM_ONLINE: 'System Online',
  GEMINI_READY: 'Gemini Ready',
  NO_API_KEY: 'No API Key',
  API_ERROR: 'API Error',
  LLAMA_OFFLINE: 'llama.cpp Offline',
  LLAMA_READY: 'llama.cpp Ready',
  MODEL_LOADING: 'Loading Model...',
  MODEL_LOADED: 'Model Loaded',

  // Actions
  EXECUTING: 'Wykonuje...',
  LOADING_MODELS: 'Ladowanie modeli...',
  DOWNLOADING_MODEL: 'Pobieranie modelu...',

  // Swarm
  SWARM_INIT: 'Inicjuje Protokol Wilczej Zamieci (Wolf Swarm v3.0)...',
  SWARM_ERROR: 'Blad Swarm',

  // Bridge
  BRIDGE_QUEUED: '[BRIDGE] Command queued for approval:',
} as const;
// ============================================================================
// LLAMA.CPP MODELS
// ============================================================================

export const LLAMA_MODELS = {
  /** Qwen3 4B - Primary workhorse, thinking mode, 256K context */
  QWEN3_4B: 'Qwen3-4B-Q4_K_M.gguf',
  /** Qwen3 1.7B - Fast lightweight model, 32K context */
  QWEN3_1_7B: 'Qwen3-1.7B-Q4_K_M.gguf',
  /** Qwen3 8B - High quality model, 128K context */
  QWEN3_8B: 'Qwen3-8B-Q4_K_M.gguf',
  /** Qwen3 0.6B - Ultra-fast scout model, 32K context */
  QWEN3_0_6B: 'Qwen3-0.6B-Q4_K_M.gguf',
  /** Qwen3 14B - Premium quality for complex tasks */
  QWEN3_14B: 'Qwen3-14B-Q4_K_M.gguf',
} as const;

export const HUGGINGFACE_REPOS = {
  [LLAMA_MODELS.QWEN3_4B]: 'Qwen/Qwen3-4B-GGUF',
  [LLAMA_MODELS.QWEN3_1_7B]: 'Qwen/Qwen3-1.7B-GGUF',
  [LLAMA_MODELS.QWEN3_8B]: 'Qwen/Qwen3-8B-GGUF',
  [LLAMA_MODELS.QWEN3_0_6B]: 'Qwen/Qwen3-0.6B-GGUF',
  [LLAMA_MODELS.QWEN3_14B]: 'Qwen/Qwen3-14B-GGUF',
} as const;
// ============================================================================
// GEMINI MODELS (API-fetched structure)
// ============================================================================

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-3-pro-preview',
    provider: 'google',
    name: 'models/gemini-3-pro-preview',
    label: 'Gemini 3 Pro (Preview)',
    contextWindow: 1048576,
    capabilities: { vision: true, functionCalling: true, jsonMode: true },
    metadata: { isExperimental: true, fetchedAt: Date.now() },
  },
  {
    id: 'gemini-3-flash-preview',
    provider: 'google',
    name: 'models/gemini-3-flash-preview',
    label: 'Gemini 3 Flash (Preview)',
    contextWindow: 1048576,
    capabilities: { vision: true, functionCalling: true, jsonMode: true },
    metadata: { isExperimental: true, fetchedAt: Date.now() },
  },
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].id;
// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

// Synced with src/core/PromptSystem.ts getIdentityContext()
export const DEFAULT_SYSTEM_PROMPT =
  `Jestes ClaudeHydra - lokalnym asystentem AI opartym na Gemini 3 Pro (gemini-3-pro-preview) na Windows (PowerShell). NIE mow ze uzywasz "Gemini 1.5" - uzywasz Gemini 3 Pro Preview.

ZASADY:
1. ODPOWIADAJ WYCZERPUJACO - dawaj pelne, szczegolowe odpowiedzi. Analizuj doglebnie. Jesli temat jest prosty, mozesz odpowiedziec krotko, ale przy zlozonych pytaniach ZAWSZE dawaj pelna analize, wnioski i rekomendacje.
2. ZERO HALUCYNACJI - NIGDY nie wymyslaj wynikow komend. Nie pisz fikcyjnego outputu.
3. WYKONUJ KOMENDY przez [EXECUTE: komenda] na OSOBNEJ LINII. System je wykona i pokaze wynik.
4. NIE GRA ROLI - jestes asystentem AI, nie postacia fikcyjna.
5. NAJPIERW WYKONAJ, POTEM ANALIZUJ - gdy trzeba sprawdzic cos w systemie, uzyj [EXECUTE:] a system automatycznie wykona komende i przesle ci wynik do analizy.
6. NIE POWTARZAJ komendy w tekscie - napisz [EXECUTE: ...] raz, system ja wykona.
7. GDY OTRZYMASZ WYNIKI KOMEND - DOKŁADNIE przeanalizuj je i przedstaw uzytkownikowi PELNA analize: co znaleziono, co jest wazne, jakie sa problemy, jakie sa rekomendacje. NIE odpowiadaj jednym zdaniem. Podaj KONKRETNE informacje z wynikow. Jesli komenda sie nie powiodla, wyjasnic dlaczego i zaproponuj rozwiazanie.
8. REALIZUJ ZADANIA DO KONCA - jesli uzytkownik prosi o analize projektu, przeanalizuj WSZYSTKO: pliki, strukture, zaleznosci, problemy. Nie zatrzymuj sie na polowie.

WAZNE - UZYWASZ POWERSHELL (nie CMD):
- Komendy sa wykonywane przez PowerShell. Uzyj skladni PowerShell.
- NIE uzywaj flag CMD jak /b /s /w - one NIE dzialaja w PowerShell.
- "dir" dziala (alias Get-ChildItem) ale BEZ flag CMD.
- Do rekurencyjnego listowania: Get-ChildItem -Recurse -Filter "*.json"
- Do wyszukiwania plikow: Get-ChildItem -Recurse -Include "*.json","*.yaml"
- Do czytania plikow: Get-Content "sciezka\\plik"

FORMAT KOMEND (zawsze na osobnej linii):
[EXECUTE: dir]
[EXECUTE: Get-ChildItem -Recurse -Filter "*.json"]
[EXECUTE: Get-Content "sciezka\\plik"]
[EXECUTE: git status]

Masz dostep do agentow: Dijkstra (strateg), Geralt (security), Yennefer (architekt), Triss (QA), Ciri (scout), Regis (research), Vesemir (review), Eskel (DevOps), Lambert (debug), Zoltan (dane), Philippa (API).

Jezyk: polski. Styl: profesjonalny, wyczerpujacy, z konkretnymi informacjami.`.trim();

export const DEFAULT_OLLAMA_ENDPOINT = 'http://localhost:11434';

export const DEFAULT_SETTINGS: Settings = {
  llamaModelsDir: './data/models',
  llamaGpuLayers: 99,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  geminiApiKey: '',
  defaultProvider: 'llama',
  selectedModel: DEFAULT_GEMINI_MODEL,
  useSwarm: true,
  ollamaEndpoint: DEFAULT_OLLAMA_ENDPOINT,
};

// ============================================================================
// FALLBACK MODELS
// ============================================================================

export const FALLBACK_MODELS = {
  gemini: GEMINI_MODELS.map((m) => m.id),
  llama: [LLAMA_MODELS.QWEN3_4B, LLAMA_MODELS.QWEN3_1_7B, LLAMA_MODELS.QWEN3_0_6B],
} as const;

// ============================================================================
// AGENT SWARM CONFIG
// ============================================================================

export const AGENTS = {
  GERALT: { name: 'Geralt', model: LLAMA_MODELS.QWEN3_4B, role: 'Security/VETO' },
  YENNEFER: { name: 'Yennefer', model: LLAMA_MODELS.QWEN3_4B, role: 'Design patterns' },
  TRISS: { name: 'Triss', model: LLAMA_MODELS.QWEN3_4B, role: 'QA/Testing' },
  JASKIER: { name: 'Jaskier', model: LLAMA_MODELS.QWEN3_4B, role: 'User summaries' },
  VESEMIR: { name: 'Vesemir', model: LLAMA_MODELS.QWEN3_4B, role: 'Plan reviewer' },
  CIRI: { name: 'Ciri', model: LLAMA_MODELS.QWEN3_0_6B, role: 'Fast executor' },
  ESKEL: { name: 'Eskel', model: LLAMA_MODELS.QWEN3_4B, role: 'DevOps/Build' },
  LAMBERT: { name: 'Lambert', model: LLAMA_MODELS.QWEN3_4B, role: 'Debugger' },
  ZOLTAN: { name: 'Zoltan', model: LLAMA_MODELS.QWEN3_4B, role: 'Data master' },
  REGIS: { name: 'Regis', model: LLAMA_MODELS.QWEN3_1_7B, role: 'Researcher' },
  DIJKSTRA: { name: 'Dijkstra', model: 'gemini:dynamic', role: 'Master strategist' },
  PHILIPPA: { name: 'Philippa', model: LLAMA_MODELS.QWEN3_8B, role: 'API specialist' },
} as const;

// ============================================================================
// API BASE URL (Next.js - relative path since API routes are co-located)
// ============================================================================

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

// ============================================================================
// QUERY KEYS (React Query)
// ============================================================================

export const QUERY_KEYS = {
  GEMINI_MODELS: 'gemini-models',
  LLAMA_MODELS: 'llama-models',
  BRIDGE_STATE: 'bridge-state',
  AGENT_MEMORIES: 'agent-memories',
  KNOWLEDGE_GRAPH: 'knowledge-graph',
  RECOMMENDED_MODELS: 'recommended-models',
} as const;

// ============================================================================
// STORAGE KEYS
// ============================================================================

export const STORAGE_KEYS = {
  APP_STATE: 'claude-storage-v1',
} as const;

// ============================================================================
// COMMAND PATTERNS (Regex)
// ============================================================================

export const COMMAND_PATTERNS = {
  // Match [EXECUTE: command] with or without quotes
  EXECUTE: /\[EXECUTE:\s*"?(.*?)"?\s*\]/,
  // Match ALL [EXECUTE: ...] patterns in a string (global)
  EXECUTE_ALL: /\[EXECUTE:\s*"?(.*?)"?\s*\]/g,
} as const;

// ============================================================================
// AUTO-CONTINUE CONFIG
// ============================================================================

export const AUTO_CONTINUE = {
  /** Maximum auto-continue iterations to prevent infinite EXECUTE loops */
  MAX_ITERATIONS: 3,
  /** Delay in ms before sending follow-up to Gemini (allows UI to render) */
  DELAY_MS: 500,
} as const;

// ============================================================================
// UI CONFIG
// ============================================================================

export const UI = {
  ANIMATION_DURATION: 300,
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  VIRTUOSO_OVERSCAN: 200,
} as const;

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export const KEYBOARD_SHORTCUTS = {
  SUBMIT_MESSAGE: 'ctrl+enter',
  NEW_SESSION: 'ctrl+n',
  OPEN_SETTINGS: 'ctrl+comma',
  CLEAR_CHAT: 'ctrl+l',
  EXPORT_CHAT: 'ctrl+e',
  CLOSE_MODAL: 'escape',
  TOGGLE_SIDEBAR: 'ctrl+b',
  FOCUS_INPUT: 'ctrl+shift+i',
  SEARCH_SESSIONS: 'ctrl+f',
  UNDO: 'ctrl+z',
  REDO: 'ctrl+shift+z',
} as const;

export const KEYBOARD_SHORTCUTS_LABELS = {
  [KEYBOARD_SHORTCUTS.SUBMIT_MESSAGE]: 'Send message',
  [KEYBOARD_SHORTCUTS.NEW_SESSION]: 'New session',
  [KEYBOARD_SHORTCUTS.OPEN_SETTINGS]: 'Open settings',
  [KEYBOARD_SHORTCUTS.CLEAR_CHAT]: 'Clear chat',
  [KEYBOARD_SHORTCUTS.EXPORT_CHAT]: 'Export chat',
  [KEYBOARD_SHORTCUTS.CLOSE_MODAL]: 'Close modal',
  [KEYBOARD_SHORTCUTS.TOGGLE_SIDEBAR]: 'Toggle sidebar',
  [KEYBOARD_SHORTCUTS.FOCUS_INPUT]: 'Focus input',
  [KEYBOARD_SHORTCUTS.SEARCH_SESSIONS]: 'Search sessions',
  [KEYBOARD_SHORTCUTS.UNDO]: 'Undo',
  [KEYBOARD_SHORTCUTS.REDO]: 'Redo',
} as const;
