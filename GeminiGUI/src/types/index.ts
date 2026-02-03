/**
 * GeminiGUI - Centralized Type Definitions
 * @module types
 */

// ============================================================================
// RE-EXPORTED SHARED TYPES (Knowledge Graph)
// ============================================================================

// Re-export unified knowledge types from shared location
// Note: Using relative path to reach the shared types in src/types
export type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraphData,
  KnowledgeNodeType,
  IKnowledgeGraph,
} from '../../../src/types/knowledge.types';

export {
  createKnowledgeNode,
  createKnowledgeEdge,
} from '../../../src/types/knowledge.types';

// Alias for backward compatibility - use KnowledgeGraphData for new code
export type { KnowledgeGraphData as KnowledgeGraph } from '../../../src/types/knowledge.types';

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
// SETTINGS TYPES
// ============================================================================

export type Provider = 'llama' | 'gemini';

export interface Settings {
  systemPrompt: string;
  geminiApiKey: string;
  defaultProvider: Provider;
  useSwarm: boolean;
  llamaModelsDir?: string;
  llamaGpuLayers?: number;
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
}
