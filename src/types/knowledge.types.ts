/**
 * Knowledge Graph Types - Backend Re-export
 * @module types/knowledge
 *
 * Re-exports from the canonical shared location (shared/types/knowledge.types.ts).
 * This avoids fragile cross-project imports between backend and frontend.
 */

// Re-export everything from the shared canonical location
export {
  createKnowledgeNode,
  createKnowledgeEdge,
} from '../../shared/types/knowledge.types.js';

export type {
  KnowledgeNodeType,
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeGraphData,
  IKnowledgeGraph,
} from '../../shared/types/knowledge.types.js';
