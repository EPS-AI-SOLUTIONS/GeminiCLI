/**
 * API Types - Shared type definitions for Route Handlers
 * Migrated from src/api/types/index.ts
 */

// ═══════════════════════════════════════════════════════════════════════════
// Settings Types
// ═══════════════════════════════════════════════════════════════════════════

export type Theme = 'dark' | 'light' | 'system';
export type Language = 'pl' | 'en';
export type ExecutionMode = 'basic' | 'enhanced' | 'swarm';

export interface Settings {
  theme: Theme;
  streaming: boolean;
  verbose: boolean;
  language: Language;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  streaming: true,
  verbose: false,
  language: 'pl',
  model: 'gemini-3-pro-preview',
  temperature: 0.7,
  maxTokens: 8192,
};

// ═══════════════════════════════════════════════════════════════════════════
// Message Types
// ═══════════════════════════════════════════════════════════════════════════

export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  agent?: string;
  tier?: string;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  duration?: number;
  mode?: ExecutionMode;
  streaming?: boolean;
  error?: boolean;
  [key: string]: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// Execution Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecuteRequest {
  prompt: string;
  mode?: ExecutionMode;
  options?: ExecuteOptions;
}

export interface ExecuteOptions {
  verbose?: boolean;
  skipResearch?: boolean;
}

export interface ExecutePlan {
  agent: string;
  tier: string;
  model: string;
  confidence: number;
  complexity: ComplexityInfo;
}

export interface ComplexityInfo {
  level: string;
  score: number;
}

export interface ExecuteResponse {
  plan: ExecutePlan;
  result: string;
  duration: number;
  mode: ExecutionMode;
}

export interface ExecuteErrorResponse {
  error: string;
  plan?: ExecutePlan;
}

// ═══════════════════════════════════════════════════════════════════════════
// SSE Event Types
// ═══════════════════════════════════════════════════════════════════════════

export type SSEEventType = 'plan' | 'chunk' | 'result' | 'error' | 'status';

export interface SSEEvent<T = unknown> {
  type: SSEEventType;
  data: T;
}

// ═══════════════════════════════════════════════════════════════════════════
// API Response Types
// ═══════════════════════════════════════════════════════════════════════════

export interface HealthResponse {
  status: 'ok' | 'error';
  version: string;
  timestamp: string;
  uptime: number;
}

export interface AgentSummary {
  role: string;
  persona: string;
  focus: string;
  tier: 'commander' | 'coordinator' | 'executor';
  model: string;
}

export interface AgentsResponse {
  agents: AgentSummary[];
}

export interface HistoryResponse {
  messages: Message[];
  total: number;
}

export interface ClearHistoryResponse {
  success: boolean;
  cleared: number;
}

export interface ClassifyResponse {
  classification: {
    agent: string;
    tier: string;
    model: string;
    confidence: number;
  };
  complexity: {
    level: string;
    score: number;
    wordCount: number;
    hasCode: boolean;
    hasMultipleTasks: boolean;
  };
}

export interface ExecuteStatusResponse {
  available: boolean;
  modes?: ExecutionMode[];
  streaming?: boolean;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Memory Types
// ═══════════════════════════════════════════════════════════════════════════

export interface MemoryEntry {
  id: string;
  agent: string;
  content: string;
  timestamp: number;
  importance: number;
}

export interface KnowledgeNode {
  id: string;
  type: string;
  label: string;
}

export interface KnowledgeEdge {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeGraph {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

export interface MemoryStore {
  memories: MemoryEntry[];
  graph: KnowledgeGraph;
}

// ═══════════════════════════════════════════════════════════════════════════
// Bridge Types
// ═══════════════════════════════════════════════════════════════════════════

export interface BridgeRequest {
  id: string;
  message: string;
  status: string;
}

export interface BridgeData {
  requests: BridgeRequest[];
  auto_approve: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Response
// ═══════════════════════════════════════════════════════════════════════════

export interface ErrorResponse {
  error: string;
  code?: string;
  statusCode: number;
  timestamp: string;
}
