/**
 * GeminiGUI - Constants & Configuration
 * @module constants
 *
 * Centralized constants for the application.
 * Change values here to update across entire app.
 */

import type { Settings, GeminiModelInfo } from '../types';

// ============================================================================
// APP LIMITS
// ============================================================================

export const LIMITS = {
  MAX_SESSIONS: 100,
  MAX_MESSAGES_PER_SESSION: 1000,
  MAX_CONTENT_LENGTH: 50000,        // 50KB
  MAX_SYSTEM_PROMPT_LENGTH: 10000,  // 10KB
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
  LLAMA_3_2_3B: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  QWEN_CODER_1_5B: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
  QWEN_CODER_7B: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf',
  DEEPSEEK_CODER_LITE: 'deepseek-coder-v2-lite-instruct-q4_k_m.gguf',
  MISTRAL_7B: 'mistral-7b-instruct-v0.2.Q4_K_M.gguf',
  LLAMA_3_2_1B: 'Llama-3.2-1B-Instruct-Q4_K_M.gguf',
  PHI_3_MINI: 'Phi-3-mini-4k-instruct-q4.gguf',
} as const;

export const HUGGINGFACE_REPOS = {
  [LLAMA_MODELS.LLAMA_3_2_3B]: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
  [LLAMA_MODELS.QWEN_CODER_1_5B]: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
  [LLAMA_MODELS.QWEN_CODER_7B]: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
  [LLAMA_MODELS.DEEPSEEK_CODER_LITE]: 'deepseek-ai/DeepSeek-Coder-V2-Lite-Instruct-GGUF',
  [LLAMA_MODELS.MISTRAL_7B]: 'TheBloke/Mistral-7B-Instruct-v0.2-GGUF',
  [LLAMA_MODELS.LLAMA_3_2_1B]: 'bartowski/Llama-3.2-1B-Instruct-GGUF',
  [LLAMA_MODELS.PHI_3_MINI]: 'microsoft/Phi-3-mini-4k-instruct-gguf',
} as const;

// ============================================================================
// GEMINI MODELS (API-fetched structure)
// ============================================================================

export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-2.5-flash',
    provider: 'google',
    name: 'models/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    contextWindow: 1048576,
    capabilities: { vision: true, functionCalling: true, jsonMode: true },
    metadata: { isExperimental: false, fetchedAt: Date.now() },
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'google',
    name: 'models/gemini-2.5-pro',
    label: 'Gemini 2.5 Pro',
    contextWindow: 1048576,
    capabilities: { vision: true, functionCalling: true, jsonMode: true },
    metadata: { isExperimental: false, fetchedAt: Date.now() },
  },
  {
    id: 'gemini-2.5-flash-lite',
    provider: 'google',
    name: 'models/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    contextWindow: 1048576,
    capabilities: { vision: true, functionCalling: true, jsonMode: true },
    metadata: { isExperimental: false, fetchedAt: Date.now() },
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
  {
    id: 'gemini-3-pro-preview',
    provider: 'google',
    name: 'models/gemini-3-pro-preview',
    label: 'Gemini 3 Pro (Preview)',
    contextWindow: 1048576,
    capabilities: { vision: true, functionCalling: true, jsonMode: true },
    metadata: { isExperimental: true, fetchedAt: Date.now() },
  },
] as const;

export const DEFAULT_GEMINI_MODEL = GEMINI_MODELS[0].id; // gemini-2.5-flash

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

// Synced with src/core/PromptSystem.ts getIdentityContext()
export const DEFAULT_SYSTEM_PROMPT = `Jestes GeminiHydra - lokalnym wieloagentowym systemem AI. Dzialasz na komputerze uzytkownika (Windows).

KRYTYCZNE ZASADY ODPOWIADANIA:
1. ODPOWIADAJ KONKRETNIE i BEZPOSREDNIO na pytania uzytkownika.
2. NIE HALUCYNUJ - nie udawaj ze wykonujesz komendy. Nie pisz fikcyjnych wynikow komend.
3. Gdy uzytkownik prosi o wylistowanie plikow, pokazanie struktury itp. - uzyj formatu: [EXECUTE: komenda] na OSOBNEJ LINII. System automatycznie wykona komende i pokaze wynik.
4. NIE wymyslaj wynikow komend. Jesli nie mozesz czegos wykonac, powiedz o tym wprost.
5. Odpowiadaj ZWIEZLE - nie dodawaj zbednych metafor, dygresji ani ozdobnikow chyba ze uzytkownik tego chce.
6. Gdy uzytkownik pyta o cos konkretnego, ODPOWIEDZ na pytanie, nie opowiadaj historii.

DOSTEPNE KOMENDY (uzywaj na osobnej linii):
[EXECUTE: dir] - lista plikow
[EXECUTE: tree /F] - struktura katalogow
[EXECUTE: type "sciezka\\plik"] - odczyt pliku
[EXECUTE: git status] - status git
[EXECUTE: komenda] - dowolna komenda systemowa

PRZYKLAD PRAWIDLOWEJ ODPOWIEDZI:
Uzytkownik: "pokaz mi strukture projektu"
Odpowiedz: "Oto struktura projektu:
[EXECUTE: tree /F /A]"

PRZYKLAD ZLEJ ODPOWIEDZI (NIE ROB TAK):
"Rzucam zaklecie! [EXECUTE: dir] No i proszę, oto wynik: C:\\Users\\..."  <-- TO JEST HALUCYNACJA!

Twoje agenty: Dijkstra (strateg), Geralt (bezpieczenstwo), Yennefer (architekt), Triss (QA), Ciri (zwiadowca), Regis (badacz), Jaskier (komunikator), Vesemir (mentor), Eskel (DevOps), Lambert (debugger), Zoltan (dane), Philippa (API).
Odpowiadaj po polsku.`.trim();

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
  llama: [LLAMA_MODELS.LLAMA_3_2_3B, LLAMA_MODELS.QWEN_CODER_1_5B, LLAMA_MODELS.LLAMA_3_2_1B],
} as const;

// ============================================================================
// AGENT SWARM CONFIG
// ============================================================================

export const AGENTS = {
  GERALT: { name: 'Geralt', model: LLAMA_MODELS.LLAMA_3_2_3B, role: 'Security/VETO' },
  YENNEFER: { name: 'Yennefer', model: LLAMA_MODELS.QWEN_CODER_1_5B, role: 'Design patterns' },
  TRISS: { name: 'Triss', model: LLAMA_MODELS.QWEN_CODER_1_5B, role: 'QA/Testing' },
  JASKIER: { name: 'Jaskier', model: LLAMA_MODELS.LLAMA_3_2_3B, role: 'User summaries' },
  VESEMIR: { name: 'Vesemir', model: LLAMA_MODELS.LLAMA_3_2_3B, role: 'Plan reviewer' },
  CIRI: { name: 'Ciri', model: LLAMA_MODELS.LLAMA_3_2_1B, role: 'Fast executor' },
  ESKEL: { name: 'Eskel', model: LLAMA_MODELS.LLAMA_3_2_3B, role: 'DevOps/Build' },
  LAMBERT: { name: 'Lambert', model: LLAMA_MODELS.QWEN_CODER_1_5B, role: 'Debugger' },
  ZOLTAN: { name: 'Zoltan', model: LLAMA_MODELS.LLAMA_3_2_3B, role: 'Data master' },
  REGIS: { name: 'Regis', model: LLAMA_MODELS.PHI_3_MINI, role: 'Researcher' },
  DIJKSTRA: { name: 'Dijkstra', model: 'gemini:dynamic', role: 'Master strategist' },
  PHILIPPA: { name: 'Philippa', model: LLAMA_MODELS.QWEN_CODER_7B, role: 'API specialist' },
} as const;

// ============================================================================
// TAURI EVENTS
// ============================================================================

export const TAURI_EVENTS = {
  LLAMA_STREAM: 'llama-stream',
  LLAMA_DOWNLOAD_PROGRESS: 'llama-download-progress',
  SWARM_DATA: 'swarm-data',
  GEMINI_STREAM: 'gemini-stream',
} as const;

// ============================================================================
// TAURI COMMANDS
// ============================================================================

export const TAURI_COMMANDS = {
  // Bridge
  GET_BRIDGE_STATE: 'get_bridge_state',
  SET_AUTO_APPROVE: 'set_auto_approve',
  APPROVE_REQUEST: 'approve_request',
  REJECT_REQUEST: 'reject_request',

  // llama.cpp Core
  LLAMA_INITIALIZE: 'llama_initialize',
  LLAMA_LOAD_MODEL: 'llama_load_model',
  LLAMA_UNLOAD_MODEL: 'llama_unload_model',
  LLAMA_IS_MODEL_LOADED: 'llama_is_model_loaded',
  LLAMA_GET_CURRENT_MODEL: 'llama_get_current_model',
  LLAMA_GENERATE: 'llama_generate',
  LLAMA_GENERATE_STREAM: 'llama_generate_stream',
  LLAMA_CHAT: 'llama_chat',
  LLAMA_CHAT_STREAM: 'llama_chat_stream',
  LLAMA_GET_EMBEDDINGS: 'llama_get_embeddings',

  // llama.cpp Model Management
  LLAMA_LIST_MODELS: 'llama_list_models',
  LLAMA_GET_MODEL_INFO: 'llama_get_model_info',
  LLAMA_DELETE_MODEL: 'llama_delete_model',
  LLAMA_GET_RECOMMENDED_MODELS: 'llama_get_recommended_models',
  LLAMA_DOWNLOAD_MODEL: 'llama_download_model',
  LLAMA_CANCEL_DOWNLOAD: 'llama_cancel_download',

  // Gemini
  GET_GEMINI_MODELS: 'get_gemini_models',
  PROMPT_GEMINI_STREAM: 'prompt_gemini_stream',
  CHAT_WITH_GEMINI: 'chat_with_gemini',

  // System
  RUN_SYSTEM_COMMAND: 'run_system_command',
  SPAWN_SWARM_AGENT: 'spawn_swarm_agent_v2',
  SAVE_FILE_CONTENT: 'save_file_content',
  GET_ENV_VARS: 'get_env_vars',

  // Memory
  GET_AGENT_MEMORIES: 'get_agent_memories',
  ADD_AGENT_MEMORY: 'add_agent_memory',
  CLEAR_AGENT_MEMORIES: 'clear_agent_memories',
  GET_KNOWLEDGE_GRAPH: 'get_knowledge_graph',
  ADD_KNOWLEDGE_NODE: 'add_knowledge_node',
  ADD_KNOWLEDGE_EDGE: 'add_knowledge_edge',
} as const;

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
  APP_STATE: 'gemini-storage-v4',
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
