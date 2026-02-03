/**
 * PersistentMemory - File-based persistent agent memory
 * Feature #3: Agent Memory Persistence
 */

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import {
  BaseMemory,
  MemoryOptions,
  MemoryStats,
  generateNumericId,
  estimateSize,
  pruneOldEntries,
  getDefaultBaseDir
} from './BaseMemory.js';

const DB_DIR = getDefaultBaseDir();
const DB_PATH = path.join(DB_DIR, 'memory.json');

export interface MemoryEntry {
  id: number;
  agent: string;
  type: string;
  content: string;
  tags: string;
  importance: number;
  createdAt: string;
  accessedAt: string;
  accessCount: number;
}

export interface MemorySearchOptions {
  agent?: string;
  type?: string;
  tags?: string[];
  limit?: number;
  minImportance?: number;
}

interface MemoryStore {
  nextId: number;
  entries: MemoryEntry[];
}

interface PersistentMemoryOptions extends MemoryOptions {
  // Additional options specific to PersistentMemory can be added here
}

/**
 * Persistent Memory Store using JSON file
 * Extends BaseMemory for common functionality
 */
export class PersistentMemory extends BaseMemory<MemoryStore> {
  private store: MemoryStore = { nextId: 1, entries: [] };

  // PersistentMemory-specific date fields
  protected override dateFields = ['createdAt', 'accessedAt'];

  constructor(options: PersistentMemoryOptions = {}) {
    super({
      ...options,
      persistPath: options.persistPath || DB_PATH,
      saveDebounceMs: options.saveDebounceMs || 1000,
    });
  }

  // ============================================================================
  // BaseMemory Abstract Methods Implementation
  // ============================================================================

  serialize(): string {
    return this.serializeData(this.store);
  }

  deserialize(data: string): void {
    const parsed = this.deserializeData<MemoryStore & Record<string, unknown>>(data);
    if (parsed) {
      this.store = {
        nextId: parsed.nextId || 1,
        entries: parsed.entries || [],
      };
    } else {
      this.initializeEmpty();
    }
  }

  protected initializeEmpty(): void {
    this.store = { nextId: 1, entries: [] };
  }

  getStats(): MemoryStats {
    const timestamps = this.store.entries
      .map(e => new Date(e.createdAt))
      .sort((a, b) => a.getTime() - b.getTime());

    return {
      entries: this.store.entries.length,
      size: estimateSize(this.store),
      oldestEntry: timestamps[0],
      newestEntry: timestamps[timestamps.length - 1],
    };
  }

  getEntryCount(): number {
    return this.store.entries.length;
  }

  clear(): void {
    this.store = { nextId: 1, entries: [] };
    this.scheduleSave();
  }

  // ============================================================================
  // Lifecycle Overrides
  // ============================================================================

  async init(): Promise<void> {
    if (this.initialized) return;

    await this.ensureDir();
    await this.load();

    this.initialized = true;
    console.log(chalk.gray(`[PersistentMemory] Initialized at ${this.persistPath} (${this.store.entries.length} entries)`));
  }

  // ============================================================================
  // Memory Operations
  // ============================================================================

  /**
   * Add a memory entry
   */
  add(
    agent: string,
    type: string,
    content: string,
    tags: string = '',
    importance: number = 0.5
  ): number {
    const entry: MemoryEntry = {
      id: this.store.nextId++,
      agent,
      type,
      content,
      tags,
      importance,
      createdAt: new Date().toISOString(),
      accessedAt: new Date().toISOString(),
      accessCount: 0
    };

    this.store.entries.push(entry);

    // Enforce max entries limit
    if (this.store.entries.length > this.maxEntries) {
      // Remove oldest, least important entries
      this.store.entries.sort((a, b) => {
        // Sort by importance (desc), then by accessedAt (desc)
        if (b.importance !== a.importance) return b.importance - a.importance;
        return new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime();
      });
      this.store.entries = this.store.entries.slice(0, this.maxEntries);
    }

    this.scheduleSave();
    return entry.id;
  }

  /**
   * Search memories using simple text matching
   */
  search(query: string, options: MemorySearchOptions = {}): MemoryEntry[] {
    const { agent, type, tags, limit = 10, minImportance = 0 } = options;
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

    let results = this.store.entries.filter(entry => {
      // Filter by importance
      if (entry.importance < minImportance) return false;

      // Filter by agent
      if (agent && entry.agent !== agent) return false;

      // Filter by type
      if (type && entry.type !== type) return false;

      // Filter by tags
      if (tags && tags.length > 0) {
        const entryTags = entry.tags.toLowerCase().split(',').map(t => t.trim());
        if (!tags.some(t => entryTags.includes(t.toLowerCase()))) return false;
      }

      // Text search
      const contentLower = entry.content.toLowerCase();
      const tagsLower = entry.tags.toLowerCase();
      return queryWords.some(word =>
        contentLower.includes(word) || tagsLower.includes(word)
      );
    });

    // Sort by relevance (how many query words match) and importance
    results.sort((a, b) => {
      const aMatches = queryWords.filter(w =>
        a.content.toLowerCase().includes(w) || a.tags.toLowerCase().includes(w)
      ).length;
      const bMatches = queryWords.filter(w =>
        b.content.toLowerCase().includes(w) || b.tags.toLowerCase().includes(w)
      ).length;

      if (bMatches !== aMatches) return bMatches - aMatches;
      return b.importance - a.importance;
    });

    // Update access stats
    const now = new Date().toISOString();
    results.slice(0, limit).forEach(entry => {
      entry.accessedAt = now;
      entry.accessCount++;
    });

    this.scheduleSave();
    return results.slice(0, limit);
  }

  /**
   * Get memories for an agent
   */
  getByAgent(agent: string, limit: number = 20): MemoryEntry[] {
    return this.store.entries
      .filter(e => e.agent === agent)
      .sort((a, b) => b.importance - a.importance ||
        new Date(b.accessedAt).getTime() - new Date(a.accessedAt).getTime())
      .slice(0, limit);
  }

  /**
   * Get contextual memories for a task
   */
  getContextual(agent: string, taskContext: string, limit: number = 5): MemoryEntry[] {
    // Extract keywords from task context
    const keywords = taskContext
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3)
      .slice(0, 5);

    if (keywords.length === 0) {
      return this.getByAgent(agent, limit);
    }

    const query = keywords.join(' ');
    return this.search(query, { agent, limit });
  }

  /**
   * Update memory importance
   */
  updateImportance(id: number, importance: number): void {
    const entry = this.store.entries.find(e => e.id === id);
    if (entry) {
      entry.importance = importance;
      this.scheduleSave();
    }
  }

  /**
   * Delete a memory
   */
  delete(id: number): boolean {
    const idx = this.store.entries.findIndex(e => e.id === id);
    if (idx !== -1) {
      this.store.entries.splice(idx, 1);
      this.scheduleSave();
      return true;
    }
    return false;
  }

  /**
   * Delete old/unused memories
   */
  prune(options: { maxAgeDays?: number; minAccessCount?: number; minImportance?: number } = {}): number {
    const { maxAgeDays = 30, minAccessCount = 0, minImportance = 0.1 } = options;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

    const beforeCount = this.store.entries.length;

    this.store.entries = this.store.entries.filter(entry => {
      const accessDate = new Date(entry.accessedAt);
      const isOld = accessDate < cutoffDate;
      const isUnused = entry.accessCount <= minAccessCount;
      const isLowImportance = entry.importance < minImportance;

      // Keep if NOT (old AND unused AND low importance)
      return !(isOld && isUnused && isLowImportance);
    });

    const pruned = beforeCount - this.store.entries.length;
    if (pruned > 0) {
      this.scheduleSave();
    }
    return pruned;
  }

  /**
   * Get extended statistics
   */
  getExtendedStats(): { total: number; byAgent: Record<string, number>; byType: Record<string, number> } {
    const byAgent: Record<string, number> = {};
    const byType: Record<string, number> = {};

    for (const entry of this.store.entries) {
      byAgent[entry.agent] = (byAgent[entry.agent] || 0) + 1;
      byType[entry.type] = (byType[entry.type] || 0) + 1;
    }

    return { total: this.store.entries.length, byAgent, byType };
  }

  /**
   * Get all entries (for backup/export)
   */
  getAll(): MemoryEntry[] {
    return [...this.store.entries];
  }

  /**
   * Import entries (for restore)
   */
  async import(entries: MemoryEntry[]): Promise<number> {
    // Find max ID to avoid conflicts
    const maxId = Math.max(
      this.store.nextId,
      ...entries.map(e => e.id),
      ...this.store.entries.map(e => e.id)
    );

    this.store.nextId = maxId + 1;

    // Add entries that don't exist
    let added = 0;
    for (const entry of entries) {
      if (!this.store.entries.some(e => e.id === entry.id)) {
        this.store.entries.push(entry);
        added++;
      }
    }

    await this.save();
    return added;
  }
}

// Global instance
export const persistentMemory = new PersistentMemory();

export default persistentMemory;
