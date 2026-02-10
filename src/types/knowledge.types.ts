/**
 * Knowledge Graph Types - Backend Re-export
 * @module types/knowledge
 *
 * Re-exports from the canonical shared location (shared/types/knowledge.types.ts).
 * This avoids fragile cross-project imports between backend and frontend.
 */

export type {
  IKnowledgeGraph,
  KnowledgeEdge,
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeNodeType,
} from '../../shared/types/knowledge.types.js';
// Re-export everything from the shared canonical location
export {
  createKnowledgeEdge,
  createKnowledgeNode,
} from '../../shared/types/knowledge.types.js';
