/**
 * ContextPruner.ts - Feature #22: Smart Context Pruning
 *
 * Intelligently reduces context while preserving key information.
 * Implements multiple pruning strategies: recency, importance, semantic, and hybrid.
 *
 * Part of ConversationLayer refactoring - extracted from lines 158-284
 */

import chalk from 'chalk';

// ============================================================
// Types & Interfaces
// ============================================================

export interface PruningStrategy {
  type: 'recency' | 'importance' | 'semantic' | 'hybrid';
  maxTokens: number;
  preserveSystemMessages: boolean;
  preserveRecentN: number;
}

export interface PrunedContext {
  content: string;
  originalTokens: number;
  prunedTokens: number;
  preservedItems: number;
  removedItems: number;
}

export interface PruningItem {
  content: string;
  importance: number;
  isSystem: boolean;
  timestamp: number;
}

// ============================================================
// SmartContextPruner Class
// ============================================================

export class SmartContextPruner {
  private defaultStrategy: PruningStrategy = {
    type: 'hybrid',
    maxTokens: 4000,
    preserveSystemMessages: true,
    preserveRecentN: 5,
  };

  async prune(
    items: PruningItem[],
    strategy: Partial<PruningStrategy> = {},
  ): Promise<PrunedContext> {
    const config = { ...this.defaultStrategy, ...strategy };

    // Estimate tokens (rough: 4 chars = 1 token)
    const estimateTokens = (text: string) => Math.ceil(text.length / 4);
    const originalTokens = items.reduce((sum, i) => sum + estimateTokens(i.content), 0);

    if (originalTokens <= config.maxTokens) {
      return {
        content: items.map((i) => i.content).join('\n'),
        originalTokens,
        prunedTokens: originalTokens,
        preservedItems: items.length,
        removedItems: 0,
      };
    }

    // Score items for preservation
    const scored = items.map((item, index) => ({
      ...item,
      index,
      score: this.calculateScore(item, index, items.length, config),
    }));

    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);

    // Select items up to token limit
    const selected: typeof scored = [];
    let currentTokens = 0;

    for (const item of scored) {
      const tokens = estimateTokens(item.content);
      if (currentTokens + tokens <= config.maxTokens) {
        selected.push(item);
        currentTokens += tokens;
      }
    }

    // Restore original order
    selected.sort((a, b) => a.index - b.index);

    const content = selected.map((i) => i.content).join('\n');

    console.log(
      chalk.gray(
        `[ContextPruner] ${originalTokens} -> ${currentTokens} tokens (kept ${selected.length}/${items.length})`,
      ),
    );

    return {
      content,
      originalTokens,
      prunedTokens: currentTokens,
      preservedItems: selected.length,
      removedItems: items.length - selected.length,
    };
  }

  private calculateScore(
    item: PruningItem,
    index: number,
    total: number,
    config: PruningStrategy,
  ): number {
    let score = 0;

    // System messages get high priority
    if (config.preserveSystemMessages && item.isSystem) {
      score += 100;
    }

    // Recent items get priority
    const recency = index / total;
    if (index >= total - config.preserveRecentN) {
      score += 50;
    }

    // Apply strategy-specific scoring
    switch (config.type) {
      case 'recency':
        score += recency * 30;
        break;
      case 'importance':
        score += item.importance * 50;
        break;
      case 'semantic':
        // Would use embeddings here
        score += item.importance * 30 + recency * 20;
        break;
      default:
        score += item.importance * 25 + recency * 25;
    }

    return score;
  }

  /**
   * Get default strategy configuration
   */
  getDefaultStrategy(): PruningStrategy {
    return { ...this.defaultStrategy };
  }

  /**
   * Update default strategy
   */
  setDefaultStrategy(strategy: Partial<PruningStrategy>): void {
    this.defaultStrategy = { ...this.defaultStrategy, ...strategy };
  }
}

// ============================================================
// Default Instance
// ============================================================

export const contextPruner = new SmartContextPruner();
