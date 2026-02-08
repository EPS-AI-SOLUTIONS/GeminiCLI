/**
 * GeminiHydra - Shared Types
 * @module shared/types
 *
 * Canonical location for types shared between:
 * - Backend CLI (src/)
 * - Frontend GUI (GeminiGUI/src/)
 *
 * Both projects re-export from here to avoid fragile cross-project imports.
 */

// Re-export all knowledge graph types
export type {
  KnowledgeNodeType,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraphData,
  IKnowledgeGraph,
} from './knowledge.types.js';

export {
  createKnowledgeNode,
  createKnowledgeEdge,
} from './knowledge.types.js';
