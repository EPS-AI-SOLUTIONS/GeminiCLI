/**
 * Upstash Redis Storage Adapter
 * For production on Vercel - persistent KV storage via @upstash/redis
 *
 * Environment variables required:
 * - KV_REST_API_URL (or UPSTASH_REDIS_REST_URL)
 * - KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_TOKEN)
 *
 * Note: @upstash/redis auto-serializes/deserializes JSON values,
 * so we pass objects directly (no manual JSON.stringify needed).
 */

import type { StorageAdapter } from './adapter';

// Lazy import to avoid issues when @upstash/redis is not installed (dev mode)
let Redis: typeof import('@upstash/redis').Redis | null = null;

async function getRedisClass() {
  if (!Redis) {
    const mod = await import('@upstash/redis');
    Redis = mod.Redis;
  }
  return Redis;
}

export class UpstashAdapter implements StorageAdapter {
  // biome-ignore lint/suspicious/noExplicitAny: Redis instance type varies
  private client: any = null;
  private prefix: string;

  constructor(prefix = 'claudehydra:') {
    this.prefix = prefix;
  }

  private async getClient() {
    if (!this.client) {
      const RedisClass = await getRedisClass();

      const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

      if (!url || !token) {
        throw new Error(
          'Upstash Redis not configured. Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables.',
        );
      }

      this.client = new RedisClass({ url, token });
    }
    return this.client;
  }

  private prefixKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    const client = await this.getClient();
    const value = await client.get(this.prefixKey(key));
    if (value === null || value === undefined) return null;
    // Upstash auto-deserializes JSON, so value is already the correct type
    return value as T;
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const client = await this.getClient();
    const prefixed = this.prefixKey(key);

    // Upstash auto-serializes objects, pass value directly
    if (ttl) {
      await client.set(prefixed, value, { ex: ttl });
    } else {
      await client.set(prefixed, value);
    }
  }

  async delete(key: string): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.del(this.prefixKey(key));
    return result > 0;
  }

  async list(prefix: string): Promise<string[]> {
    const client = await this.getClient();
    const pattern = `${this.prefix}${prefix}*`;

    // Use SCAN for production safety (non-blocking)
    const keys: string[] = [];
    let cursor = 0;

    do {
      const [nextCursor, batch] = await client.scan(cursor, {
        match: pattern,
        count: 100,
      });
      cursor = Number(nextCursor);
      keys.push(...(batch as string[]));
    } while (cursor !== 0);

    // Remove prefix from returned keys
    return keys.map((k: string) => k.slice(this.prefix.length));
  }

  async exists(key: string): Promise<boolean> {
    const client = await this.getClient();
    const result = await client.exists(this.prefixKey(key));
    return result > 0;
  }

  async getMany<T>(keys: string[]): Promise<Map<string, T | null>> {
    const client = await this.getClient();
    const prefixedKeys = keys.map((k) => this.prefixKey(k));

    if (prefixedKeys.length === 0) {
      return new Map();
    }

    const values = await client.mget(...prefixedKeys);
    const result = new Map<string, T | null>();

    for (let i = 0; i < keys.length; i++) {
      const val = values[i];
      result.set(keys[i], val !== null && val !== undefined ? (val as T) : null);
    }

    return result;
  }

  async deleteMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    const client = await this.getClient();
    const prefixedKeys = keys.map((k) => this.prefixKey(k));
    return client.del(...prefixedKeys);
  }
}
