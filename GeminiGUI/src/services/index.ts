/**
 * GeminiGUI - Services
 * @module services
 *
 * Centralized export of all service modules.
 */

export {
  TauriService,
  BridgeService,
  SystemService,
  MemoryService,
  default as TauriServiceDefault,
} from './tauri.service';

export type {
  EnvVars,
  AgentMemory,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraph,
} from './tauri.service';
