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
  IKnowledgeGraph,
  KnowledgeEdge,
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeNodeType,
} from './knowledge.types.js';

export {
  createKnowledgeEdge,
  createKnowledgeNode,
} from './knowledge.types.js';
