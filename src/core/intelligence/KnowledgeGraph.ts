/**
 * KnowledgeGraph - Feature #9
 * Graph-based knowledge representation for context building
 */

import crypto from 'crypto';
import type {
  KnowledgeNode,
  KnowledgeEdge,
  KnowledgeNodeType,
  IKnowledgeGraph,
} from '../../types/knowledge.types.js';

// Re-export types for backward compatibility
export type { KnowledgeNode, KnowledgeEdge, KnowledgeNodeType } from '../../types/knowledge.types.js';

export class KnowledgeGraph implements IKnowledgeGraph {
  private nodes: Map<string, KnowledgeNode> = new Map();
  private edges: KnowledgeEdge[] = [];
  private maxNodes: number = 500;

  /**
   * Add a node to the graph
   */
  addNode(type: KnowledgeNodeType, content: string, metadata: Record<string, unknown> = {}): string {
    const id = crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);

    if (this.nodes.has(id)) {
      return id; // Already exists
    }

    // Evict oldest if at capacity
    if (this.nodes.size >= this.maxNodes) {
      const oldest = [...this.nodes.entries()]
        .sort((a, b) => {
          const aTime = a[1].createdAt?.getTime() ?? 0;
          const bTime = b[1].createdAt?.getTime() ?? 0;
          return aTime - bTime;
        })[0];
      if (oldest) {
        this.nodes.delete(oldest[0]);
        this.edges = this.edges.filter(e => e.source !== oldest[0] && e.target !== oldest[0]);
      }
    }

    this.nodes.set(id, {
      id,
      type,
      content,
      label: content.substring(0, 50),
      metadata,
      createdAt: new Date()
    });

    return id;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(sourceId: string, targetId: string, relation: string, weight: number = 1.0): void {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return;

    // Check if edge already exists
    const existing = this.edges.find(
      e => e.source === sourceId && e.target === targetId && e.relation === relation
    );

    if (existing) {
      existing.weight = Math.min((existing.weight ?? 1.0) + 0.1, 2.0); // Strengthen
    } else {
      this.edges.push({
        source: sourceId,
        target: targetId,
        relation,
        label: relation,
        weight
      });
    }
  }

  /**
   * Find related nodes by content similarity
   */
  findRelated(query: string, limit: number = 5): KnowledgeNode[] {
    const queryLower = query.toLowerCase();
    const queryWords = new Set(queryLower.split(/\s+/));

    const scored = [...this.nodes.values()].map(node => {
      const nodeContent = node.content ?? node.label ?? '';
      const nodeWords = new Set(nodeContent.toLowerCase().split(/\s+/));
      const intersection = [...queryWords].filter(w => nodeWords.has(w));
      const score = intersection.length / Math.max(queryWords.size, nodeWords.size);
      return { node, score };
    });

    return scored
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.node);
  }

  /**
   * Get connected nodes (neighbors)
   */
  getNeighbors(nodeId: string): KnowledgeNode[] {
    const neighborIds = new Set<string>();

    for (const edge of this.edges) {
      if (edge.source === nodeId) neighborIds.add(edge.target);
      if (edge.target === nodeId) neighborIds.add(edge.source);
    }

    return [...neighborIds]
      .map(id => this.nodes.get(id))
      .filter((n): n is KnowledgeNode => n !== undefined);
  }

  /**
   * Build context from related knowledge
   */
  buildContext(query: string): string {
    const related = this.findRelated(query, 3);
    if (related.length === 0) return '';

    const contextParts: string[] = [];

    for (const node of related) {
      const neighbors = this.getNeighbors(node.id).slice(0, 2);
      const nodeContent = node.content ?? node.label ?? node.id;
      contextParts.push(`* ${nodeContent}`);
      for (const neighbor of neighbors) {
        const neighborContent = neighbor.content ?? neighbor.label ?? neighbor.id;
        contextParts.push(`  -> ${neighborContent}`);
      }
    }

    return `\nPOWIAZANA WIEDZA:\n${contextParts.join('\n')}`;
  }

  /**
   * Record a task execution for learning
   */
  recordExecution(objective: string, result: string, success: boolean): void {
    const objectiveId = this.addNode('action', objective, { success });
    const resultId = this.addNode('result', result.substring(0, 500), { success });
    this.addEdge(objectiveId, resultId, success ? 'succeeded_with' : 'failed_with');
  }

  /**
   * Get graph statistics
   */
  getStats(): { nodes: number; edges: number } {
    return { nodes: this.nodes.size, edges: this.edges.length };
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): KnowledgeNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): KnowledgeNode[] {
    return [...this.nodes.values()];
  }

  /**
   * Get all edges
   */
  getAllEdges(): KnowledgeEdge[] {
    return [...this.edges];
  }

  /**
   * Clear the graph
   */
  clear(): void {
    this.nodes.clear();
    this.edges = [];
  }
}

// Singleton instance
export const knowledgeGraph = new KnowledgeGraph();
