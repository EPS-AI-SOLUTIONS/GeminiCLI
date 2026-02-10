/**
 * Long-term Memory System (Features 6-10)
 * Agent: Regis (Research/Synthesis)
 *
 * 6. Memory Tags - #remember tagging
 * 7. Semantic Memory Store - Vector DB for semantic search
 * 8. Auto-Memory Extraction - AI extracts key facts
 * 9. Memory Categories - decisions, bugs, patterns, preferences, todos
 * 10. Memory Decay - Older memories lose priority
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import chalk from 'chalk';
import {
  BaseMemory,
  estimateSize,
  extractTags,
  generateId,
  getDefaultBaseDir,
  type MemoryOptions,
  type MemoryStats,
  reviveDates,
} from './BaseMemory.js';

const MEMORY_DIR = path.join(getDefaultBaseDir(), 'memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'long-term.json');

// Memory categories (Feature 9)
export type MemoryCategory =
  | 'decision' // Architectural/design decisions
  | 'bug' // Known bugs and fixes
  | 'pattern' // Code patterns used
  | 'preference' // User preferences
  | 'todo' // Things to remember
  | 'fact' // General facts
  | 'learning' // Things learned from interactions
  | 'context'; // Project context

interface Memory {
  id: string;
  content: string;
  category: MemoryCategory;
  tags: string[];
  embedding?: number[]; // For semantic search (Feature 7)
  importance: number; // 0-1, decays over time (Feature 10)
  accessCount: number; // How often retrieved
  created: Date;
  lastAccessed: Date;
  source?: string; // Where this memory came from
  relatedMemories?: string[]; // IDs of related memories
}

interface MemoryStore {
  memories: Memory[];
  version: number;
  lastCleanup: Date;
}

interface LongTermMemoryOptions extends MemoryOptions {
  decayRate?: number;
}

export class LongTermMemory extends BaseMemory<MemoryStore> {
  private store: MemoryStore = {
    memories: [],
    version: 1,
    lastCleanup: new Date(),
  };
  private decayRate: number;

  // LongTermMemory-specific date fields
  protected override dateFields = ['created', 'lastAccessed', 'lastCleanup'];

  constructor(options: LongTermMemoryOptions = {}) {
    super({
      ...options,
      persistPath: options.persistPath || MEMORY_FILE,
    });
    this.decayRate = options.decayRate || 0.01; // Importance decay per day
  }

  // ============================================================================
  // BaseMemory Abstract Methods Implementation
  // ============================================================================

  serialize(): string {
    return this.serializeData(this.store);
  }

  deserialize(data: string): void {
    const parsed = this.deserializeData<MemoryStore & Record<string, unknown>>(data, [
      'lastCleanup',
    ]);
    if (parsed) {
      this.store = {
        ...parsed,
        memories: (parsed.memories || []).map(
          (m: Memory) =>
            reviveDates(m as unknown as Record<string, unknown>, [
              'created',
              'lastAccessed',
            ]) as unknown as Memory,
        ),
        lastCleanup:
          parsed.lastCleanup instanceof Date
            ? parsed.lastCleanup
            : new Date(parsed.lastCleanup as string),
      } as MemoryStore;
    } else {
      this.initializeEmpty();
    }
  }

  protected initializeEmpty(): void {
    this.store = {
      memories: [],
      version: 1,
      lastCleanup: new Date(),
    };
  }

  getStats(): MemoryStats {
    const timestamps = this.store.memories
      .map((m) => m.created)
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      entries: this.store.memories.length,
      size: estimateSize(this.store),
      oldestEntry: timestamps[0],
      newestEntry: timestamps[timestamps.length - 1],
    };
  }

  getEntryCount(): number {
    return this.store.memories.length;
  }

  clear(): void {
    this.store.memories = [];
    this.store.lastCleanup = new Date();
    this.scheduleSave();
  }

  // ============================================================================
  // Lifecycle Overrides
  // ============================================================================

  async init(): Promise<void> {
    await fs.mkdir(MEMORY_DIR, { recursive: true });
    await this.load();
    // Apply decay on load (Feature 10)
    this.applyDecay();
    this.initialized = true;
  }

  // ============================================================================
  // Memory Operations
  // ============================================================================

  /**
   * Remember something (Feature 6 - #remember tag)
   */
  async remember(
    content: string,
    category: MemoryCategory = 'fact',
    tags: string[] = [],
    importance: number = 0.5,
  ): Promise<string> {
    const id = generateId();

    // Extract tags from content (#tag syntax)
    const extractedTags = extractTags(content);
    const allTags = [...new Set([...tags, ...extractedTags])];

    // Clean content (remove #tags)
    const cleanContent = content.replace(/#\w+/g, '').trim();

    const memory: Memory = {
      id,
      content: cleanContent,
      category,
      tags: allTags,
      importance: Math.min(1, Math.max(0, importance)),
      accessCount: 0,
      created: new Date(),
      lastAccessed: new Date(),
    };

    // Generate simple embedding for semantic search
    memory.embedding = this.generateEmbedding(cleanContent);

    this.store.memories.push(memory);
    this.scheduleSave();

    console.log(chalk.green(`Memory saved: ${id} [${category}]`));
    return id;
  }

  /**
   * Auto-extract memories from text (Feature 8)
   */
  async autoExtract(text: string, _source?: string): Promise<string[]> {
    const extractedIds: string[] = [];

    // Extract decisions
    const decisionPatterns = [
      /decided to (.+)/gi,
      /decision: (.+)/gi,
      /we(?:'ll| will) (.+)/gi,
      /going with (.+)/gi,
    ];

    for (const pattern of decisionPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const id = await this.remember(match[1], 'decision', [], 0.7);
        extractedIds.push(id);
      }
    }

    // Extract bugs
    const bugPatterns = [/bug: (.+)/gi, /fixed: (.+)/gi, /issue: (.+)/gi, /error in (.+)/gi];

    for (const pattern of bugPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const id = await this.remember(match[1], 'bug', [], 0.8);
        extractedIds.push(id);
      }
    }

    // Extract TODOs
    const todoPatterns = [
      /TODO: (.+)/gi,
      /FIXME: (.+)/gi,
      /remember to (.+)/gi,
      /don't forget (.+)/gi,
    ];

    for (const pattern of todoPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const id = await this.remember(match[1], 'todo', [], 0.9);
        extractedIds.push(id);
      }
    }

    // Extract explicit #remember tags
    const rememberPattern = /#remember\s+(.+?)(?=#|$)/gi;
    const rememberMatches = text.matchAll(rememberPattern);
    for (const match of rememberMatches) {
      const id = await this.remember(match[1].trim(), 'fact', ['explicit'], 0.9);
      extractedIds.push(id);
    }

    return extractedIds;
  }

  /**
   * Search memories semantically (Feature 7)
   */
  search(query: string, limit: number = 5, category?: MemoryCategory): Memory[] {
    const queryEmbedding = this.generateEmbedding(query);

    let candidates = this.store.memories;
    if (category) {
      candidates = candidates.filter((m) => m.category === category);
    }

    // Score by semantic similarity + importance + recency
    const scored = candidates.map((memory) => {
      const similarity = this.cosineSimilarity(queryEmbedding, memory.embedding || []);
      const recencyBonus = this.getRecencyScore(memory.lastAccessed);
      const score = similarity * 0.6 + memory.importance * 0.3 + recencyBonus * 0.1;

      return { memory, score };
    });

    // Sort by score and take top results
    scored.sort((a, b) => b.score - a.score);
    const results = scored.slice(0, limit).map((s) => s.memory);

    // Update access counts
    for (const memory of results) {
      memory.accessCount++;
      memory.lastAccessed = new Date();
      // Boost importance when accessed (counter decay)
      memory.importance = Math.min(1, memory.importance + 0.05);
    }

    this.scheduleSave();

    return results;
  }

  /**
   * Get memories by category (Feature 9)
   */
  getByCategory(category: MemoryCategory, limit: number = 10): Memory[] {
    return this.store.memories
      .filter((m) => m.category === category)
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Get memories by tag
   */
  getByTag(tag: string, limit: number = 10): Memory[] {
    return this.store.memories
      .filter((m) => m.tags.includes(tag))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, limit);
  }

  /**
   * Apply memory decay (Feature 10)
   */
  private applyDecay(): void {
    const now = new Date();
    const daysSinceCleanup =
      (now.getTime() - this.store.lastCleanup.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceCleanup < 1) return; // Only decay once per day

    for (const memory of this.store.memories) {
      const daysSinceAccess =
        (now.getTime() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
      const decay = this.decayRate * daysSinceAccess;
      memory.importance = Math.max(0.01, memory.importance - decay); // Never fully forget
    }

    this.store.lastCleanup = now;
    this.scheduleSave();
  }

  /**
   * Get context for a task (combines relevant memories)
   */
  getContextForTask(task: string): string {
    const memories = this.search(task, 5);

    if (memories.length === 0) {
      return '';
    }

    let context = '## Relevant Memories\n\n';
    for (const memory of memories) {
      context += `- [${memory.category}] ${memory.content}\n`;
    }

    return context;
  }

  /**
   * Forget a memory
   */
  async forget(memoryId: string): Promise<boolean> {
    const index = this.store.memories.findIndex((m) => m.id === memoryId);
    if (index === -1) return false;

    this.store.memories.splice(index, 1);
    this.scheduleSave();
    return true;
  }

  /**
   * Get extended memory stats
   */
  getExtendedStats(): Record<string, unknown> {
    const byCategory: Record<string, number> = {};
    let totalImportance = 0;

    for (const memory of this.store.memories) {
      byCategory[memory.category] = (byCategory[memory.category] || 0) + 1;
      totalImportance += memory.importance;
    }

    return {
      totalMemories: this.store.memories.length,
      byCategory,
      averageImportance: totalImportance / this.store.memories.length || 0,
      oldestMemory: this.store.memories[0]?.created,
      newestMemory: this.store.memories[this.store.memories.length - 1]?.created,
    };
  }

  /**
   * Print memory summary
   */
  printSummary(): void {
    const stats = this.getExtendedStats();

    console.log(chalk.cyan('\n=== Long-term Memory Summary ===\n'));
    console.log(chalk.gray(`Total memories: ${stats.totalMemories}`));
    console.log(
      chalk.gray(`Average importance: ${((stats.averageImportance as number) * 100).toFixed(1)}%`),
    );

    console.log(chalk.yellow('\nBy Category:'));
    for (const [category, count] of Object.entries(stats.byCategory as Record<string, number>)) {
      console.log(chalk.gray(`  ${category}: ${count}`));
    }
    console.log('');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private generateEmbedding(text: string): number[] {
    // Simple bag-of-words embedding (in production, use proper embedding model)
    const words = text
      .toLowerCase()
      .split(/\W+/)
      .filter((w) => w.length > 2);
    const embedding = new Array(100).fill(0);

    for (const word of words) {
      const hash = this.hashCode(word);
      const index = Math.abs(hash) % 100;
      embedding[index] += 1;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum: number, v: number) => sum + v * v, 0));
    return embedding.map((v: number) => (magnitude > 0 ? v / magnitude : 0));
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator > 0 ? dotProduct / denominator : 0;
  }

  private getRecencyScore(date: Date): number {
    const daysSince = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return Math.exp(-daysSince / 30); // Exponential decay over 30 days
  }

  /**
   * Get all memories (for backup/export)
   */
  getAllMemories(): Memory[] {
    return [...this.store.memories];
  }

  /**
   * Import memories
   */
  async importMemories(memories: Memory[]): Promise<number> {
    let added = 0;
    for (const memory of memories) {
      if (!this.store.memories.some((m) => m.id === memory.id)) {
        this.store.memories.push({
          ...memory,
          created: new Date(memory.created),
          lastAccessed: new Date(memory.lastAccessed),
        });
        added++;
      }
    }
    if (added > 0) {
      await this.save();
    }
    return added;
  }
}

export const longTermMemory = new LongTermMemory();
