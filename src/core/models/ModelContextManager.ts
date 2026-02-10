/**
 * ModelContextManager - Feature #18: Context Window Management
 * Manages conversation context with intelligent pruning
 */

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  importance: number;
}

class ContextWindowManager {
  private maxTokens = 30000;
  private messages: ContextMessage[] = [];

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  add(message: ContextMessage): void {
    this.messages.push(message);
    this.pruneIfNeeded();
  }

  private pruneIfNeeded(): void {
    const totalTokens = this.messages.reduce((sum, m) => sum + this.estimateTokens(m.content), 0);

    if (totalTokens <= this.maxTokens) return;

    // Sort by importance and recency
    const scored = this.messages.map((m, i) => ({
      message: m,
      index: i,
      score: m.importance * 0.6 + (i / this.messages.length) * 0.4,
    }));

    scored.sort((a, b) => b.score - a.score);

    // Keep highest scored messages up to limit
    const kept: typeof scored = [];
    let tokens = 0;

    for (const item of scored) {
      const itemTokens = this.estimateTokens(item.message.content);
      if (tokens + itemTokens <= this.maxTokens) {
        kept.push(item);
        tokens += itemTokens;
      }
    }

    // Restore chronological order
    kept.sort((a, b) => a.index - b.index);
    this.messages = kept.map((k) => k.message);
  }

  getContext(): string {
    return this.messages.map((m) => `[${m.role}]: ${m.content}`).join('\n\n');
  }

  getMessages(): ContextMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  setMaxTokens(max: number): void {
    this.maxTokens = max;
  }
}

export const contextManager = new ContextWindowManager();
