/**
 * GeminiGUI - Centralized Type Definitions
 * @module types
 */

// ============================================================================
// RE-EXPORTED SHARED TYPES (Knowledge Graph)
// ============================================================================

// Re-export unified knowledge types from shared canonical location
// See shared/types/knowledge.types.ts for the source of truth
export type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraphData,
  KnowledgeNodeType,
  IKnowledgeGraph,
} from '@shared/types/knowledge.types';

export {
  createKnowledgeNode,
  createKnowledgeEdge,
} from '@shared/types/knowledge.types';

// Alias for backward compatibility - use KnowledgeGraphData for new code
export type { KnowledgeGraphData as KnowledgeGraph } from '@shared/types/knowledge.types';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: number;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface Session {
  id: string;
  title: string;
  createdAt: number;
}

// ============================================================================
// MODEL TYPES
// ============================================================================

export interface GeminiModelCapabilities {
  vision: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
}

export interface GeminiModelMetadata {
  isExperimental: boolean;
  fetchedAt: number;
}

export interface GeminiModelInfo {
  id: string;
  provider: string;
  name: string;
  label: string;
  contextWindow: number;
  capabilities: GeminiModelCapabilities;
  metadata: GeminiModelMetadata;
}

// ============================================================================
// SETTINGS TYPES
// ============================================================================

export type Provider = 'llama' | 'gemini';

export interface Settings {
  systemPrompt: string;
  geminiApiKey: string;
  defaultProvider: Provider;
  selectedModel: string;
  useSwarm: boolean;
  llamaModelsDir?: string;
  llamaGpuLayers?: number;
  ollamaEndpoint?: string;
}

// ============================================================================
// THEME TYPES
// ============================================================================

export type Theme = 'dark' | 'light';

// ============================================================================
// STREAM TYPES (Tauri Events)
// ============================================================================

export interface StreamPayload {
  chunk: string;
  done: boolean;
}

// ============================================================================
// BRIDGE TYPES
// ============================================================================

export interface BridgeState {
  auto_approve: boolean;
}

export interface BridgeRequest {
  id: string;
  command?: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: number;
}

// ============================================================================
// MEMORY TYPES (Agent Swarm)
// ============================================================================

export interface AgentMemory {
  id: string;
  agent: string;
  content: string;
  timestamp: number;
  tags?: string[];
  importance?: number;
  metadata?: Record<string, unknown>;
}

// KnowledgeNode, KnowledgeEdge, and KnowledgeGraph are now imported from
// shared types at ../../../src/types/knowledge.types.ts

// ============================================================================
// APP STATE TYPES (Zustand Store)
// ============================================================================

export interface AppState {
  // UI State
  count: number;
  theme: Theme;
  provider: Provider;

  // Session Management
  sessions: Session[];
  currentSessionId: string | null;
  chatHistory: Record<string, Message[]>;

  // Settings
  settings: Settings;

  // Pagination (optional, extended in store)
  messagesPerPage?: number;
  currentPage?: number;

  // Actions - Counter
  increment: () => void;
  decrement: () => void;
  reset: () => void;

  // Actions - Theme
  toggleTheme: () => void;

  // Actions - Provider
  setProvider: (provider: Provider) => void;

  // Actions - Sessions
  createSession: () => void;
  deleteSession: (id: string) => void;
  selectSession: (id: string) => void;
  updateSessionTitle: (id: string, title: string) => void;

  // Actions - Messages
  addMessage: (msg: Message) => void;
  updateLastMessage: (content: string) => void;
  clearHistory: () => void;

  // Actions - Settings
  updateSettings: (settings: Partial<Settings>) => void;

  // Actions - Pagination (optional)
  setCurrentPage?: (page: number) => void;
  setMessagesPerPage?: (count: number) => void;
}
