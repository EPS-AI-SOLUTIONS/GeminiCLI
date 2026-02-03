/**
 * Unified Knowledge Graph Types
 * @module types/knowledge
 *
 * This file contains unified type definitions for KnowledgeNode and KnowledgeEdge,
 * consolidating types from:
 * - GeminiGUI/src/types/index.ts
 * - src/core/intelligence/KnowledgeGraph.ts
 */

// ============================================================================
// NODE TYPES
// ============================================================================

/**
 * Node type for the knowledge graph.
 * Supports both GUI visualization types and intelligence graph types.
 */
export type KnowledgeNodeType =
  | 'concept'   // Abstract concept from intelligence layer
  | 'entity'    // Named entity from intelligence layer
  | 'action'    // Action/task from intelligence layer
  | 'result'    // Execution result from intelligence layer
  | string;     // Extensible for GUI visualization (custom types)

/**
 * Unified KnowledgeNode interface.
 * Combines fields from both GeminiGUI and KnowledgeGraph implementations.
 */
export interface KnowledgeNode {
  /** Unique identifier for the node */
  id: string;

  /** Node type classification */
  type: KnowledgeNodeType;

  /** Human-readable label for visualization (from GUI) */
  label?: string;

  /** Content/description of the node (from intelligence layer) */
  content?: string;

  /** Additional data for visualization (from GUI) */
  data?: Record<string, unknown>;

  /** Metadata for intelligence processing */
  metadata?: Record<string, any>;

  /** Creation timestamp (from intelligence layer) */
  createdAt?: Date;
}

// ============================================================================
// EDGE TYPES
// ============================================================================

/**
 * Unified KnowledgeEdge interface.
 * Combines fields from both GeminiGUI and KnowledgeGraph implementations.
 */
export interface KnowledgeEdge {
  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Relationship type/label (unified from 'label' and 'relation') */
  relation: string;

  /** Human-readable label for visualization (alias for relation) */
  label?: string;

  /** Edge weight for weighted graph operations (from intelligence layer) */
  weight?: number;
}

// ============================================================================
// GRAPH TYPES
// ============================================================================

/**
 * Simple graph data structure for serialization and visualization.
 * Used primarily by GeminiGUI for rendering.
 */
export interface KnowledgeGraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
}

/**
 * Interface for KnowledgeGraph class operations.
 * Defines the contract for graph manipulation.
 */
export interface IKnowledgeGraph {
  addNode(type: KnowledgeNodeType, content: string, metadata?: Record<string, any>): string;
  addEdge(sourceId: string, targetId: string, relation: string, weight?: number): void;
  findRelated(query: string, limit?: number): KnowledgeNode[];
  getNeighbors(nodeId: string): KnowledgeNode[];
  buildContext(query: string): string;
  recordExecution(objective: string, result: string, success: boolean): void;
  getStats(): { nodes: number; edges: number };
  getNode(id: string): KnowledgeNode | undefined;
  getAllNodes(): KnowledgeNode[];
  getAllEdges(): KnowledgeEdge[];
  clear(): void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Creates a KnowledgeNode with default values.
 */
export function createKnowledgeNode(
  id: string,
  type: KnowledgeNodeType,
  options?: Partial<Omit<KnowledgeNode, 'id' | 'type'>>
): KnowledgeNode {
  return {
    id,
    type,
    label: options?.label ?? options?.content ?? id,
    content: options?.content,
    data: options?.data,
    metadata: options?.metadata ?? {},
    createdAt: options?.createdAt ?? new Date(),
  };
}

/**
 * Creates a KnowledgeEdge with default values.
 */
export function createKnowledgeEdge(
  source: string,
  target: string,
  relation: string,
  weight: number = 1.0
): KnowledgeEdge {
  return {
    source,
    target,
    relation,
    label: relation,
    weight,
  };
}
