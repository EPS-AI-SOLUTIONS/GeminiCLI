/**
 * History Store
 * In-memory message history with optional persistent storage (Upstash Redis)
 * Uses write-through cache pattern: fast in-memory reads, async persistence
 * Migrated from src/api/stores/HistoryStore.ts
 */

import { API_CONFIG } from '../api-config';
import type { Message, MessageMetadata, MessageRole } from '../api-types';
import { getStorage, StorageKeys } from '../storage';
import type { StorageAdapter } from '../storage/adapter';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AddMessageInput {
  role: MessageRole;
  content: string;
  agent?: string;
  tier?: string;
  metadata?: MessageMetadata;
}

// ═══════════════════════════════════════════════════════════════════════════
// ID Generation
// ═══════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Store Class
// ═══════════════════════════════════════════════════════════════════════════

export class HistoryStore {
  private messages: Message[] = [];
  private readonly maxSize: number;
  private readonly defaultLimit: number;
  private storage: StorageAdapter | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(
    maxSize: number = API_CONFIG.history.maxSize,
    defaultLimit: number = API_CONFIG.history.defaultLimit,
  ) {
    this.maxSize = maxSize;
    this.defaultLimit = defaultLimit;
  }

  /**
   * Initialize persistence layer (lazy, called once on first access)
   * Loads existing messages from storage into memory cache
   */
  private async initStorage(): Promise<void> {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        this.storage = getStorage();
        const stored = await this.storage.get<Message[]>(StorageKeys.historyMessages);
        if (stored && Array.isArray(stored) && stored.length > 0) {
          this.messages = stored.slice(-this.maxSize);
        }
      } catch (error) {
        console.warn('[HistoryStore] Failed to load from storage, using in-memory:', error);
        this.storage = null;
      } finally {
        this.initialized = true;
        this.initPromise = null;
      }
    })();

    return this.initPromise;
  }

  /**
   * Persist current messages to storage (fire-and-forget)
   */
  private persistAsync(): void {
    if (!this.storage) return;
    this.storage.set(StorageKeys.historyMessages, this.messages).catch((error) => {
      console.warn('[HistoryStore] Failed to persist:', error);
    });
  }

  /**
   * Ensure storage is initialized before read operations
   */
  async ensureReady(): Promise<void> {
    await this.initStorage();
  }

  add(input: AddMessageInput): Message {
    const message: Message = {
      id: generateId(),
      role: input.role,
      content: input.content,
      timestamp: new Date().toISOString(),
      agent: input.agent,
      tier: input.tier,
      metadata: input.metadata,
    };

    this.messages.push(message);

    if (this.messages.length > this.maxSize) {
      this.messages = this.messages.slice(-this.maxSize);
    }

    this.persistAsync();
    return message;
  }

  get(limit?: number): Message[] {
    const effectiveLimit = limit ?? this.defaultLimit;
    const validLimit = Math.min(Math.max(1, effectiveLimit), this.maxSize);
    return this.messages.slice(-validLimit);
  }

  getAll(): Message[] {
    return [...this.messages];
  }

  count(): number {
    return this.messages.length;
  }

  clear(): number {
    const count = this.messages.length;
    this.messages = [];
    this.persistAsync();
    return count;
  }

  getById(id: string): Message | undefined {
    return this.messages.find((m) => m.id === id);
  }

  delete(id: string): boolean {
    const index = this.messages.findIndex((m) => m.id === id);
    if (index === -1) return false;
    this.messages.splice(index, 1);
    this.persistAsync();
    return true;
  }

  search(query: string): Message[] {
    const lowerQuery = query.toLowerCase();
    return this.messages.filter((m) => m.content.toLowerCase().includes(lowerQuery));
  }

  getByRole(role: MessageRole): Message[] {
    return this.messages.filter((m) => m.role === role);
  }

  getByAgent(agent: string): Message[] {
    return this.messages.filter((m) => m.agent === agent);
  }

  getByTimeRange(startTime: Date, endTime: Date): Message[] {
    return this.messages.filter((m) => {
      const timestamp = new Date(m.timestamp);
      return timestamp >= startTime && timestamp <= endTime;
    });
  }
}

// Singleton
export const historyStore = new HistoryStore();
