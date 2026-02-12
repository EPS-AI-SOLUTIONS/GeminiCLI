/**
 * In-Memory Storage Adapter
 * For development and testing - data is lost on server restart
 */

import type { StorageAdapter } from './adapter';

interface StoredEntry {
  value: unknown;
  expiresAt: number | null; // Unix timestamp in ms, null = no expiry
}

export class InMemoryAdapter implements StorageAdapter {
  private store = new Map<string, StoredEntry>();

  private isExpired(entry: StoredEntry): boolean {
    return entry.expiresAt !== null && Date.now() > entry.expiresAt;
  }

  private cleanup(key: string): void {
    const entry = this.store.get(key);
    if (entry && this.isExpired(entry)) {
      this.store.delete(key);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.cleanup(key);
    const entry = this.store.get(key);
    if (!entry) return null;
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const expiresAt = ttl ? Date.now() + ttl * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    for (const [key, entry] of this.store) {
      if (key.startsWith(prefix) && !this.isExpired(entry)) {
        keys.push(key);
      }
    }
    return keys;
  }

  async exists(key: string): Promise<boolean> {
    this.cleanup(key);
    return this.store.has(key);
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const result = new Map<string, T | null>();
    for (const key of keys) {
      result.set(key, await this.get<T>(key));
    }
    return result;
  }

  async deleteMany(keys: string[]): Promise<number> {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  /**
   * Clear all entries (useful for testing)
   */
  async clear(): Promise<void> {
    this.store.clear();
  }

  /**
   * Get current store size (useful for debugging)
   */
  get size(): number {
    return this.store.size;
  }
}
