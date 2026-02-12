/**
 * ClaudeHydra - Services
 * @module services
 *
 * Centralized export of all service modules.
 * Uses HTTP API via Next.js Route Handlers.
 */

export type {
  AgentMemory,
  ChatMessage,
  DownloadProgress,
  EnvVars,
  GGUFModelInfo,
  GenerateOptions,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
  RecommendedModel,
  SystemStats,
} from './api.service';

export {
  ApiService,
  BridgeService,
  GeminiService,
  LlamaService,
  MemoryService,
  SystemService,
} from './api.service';
