/**
 * Storage Adapter Interface
 * Abstract interface for key-value storage backends
 * Implementations: InMemoryAdapter (dev), UpstashAdapter (prod)
 */

export interface StorageAdapter {
  /**
   * Get a value by key
   * @returns The value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value by key
   * @param ttl - Optional time-to-live in seconds
   */
  set<T>(key: string, value: T, ttl?: number): Promise<void>;

  /**
   * Delete a value by key
   * @returns true if the key existed
   */
  delete(key: string): Promise<boolean>;

  /**
   * List all keys matching a prefix
   * @returns Array of matching keys
   */
  list(prefix: string): Promise<string[]>;

  /**
   * Check if a key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get multiple values by keys
   * @returns Map of key -> value (null for missing keys)
   */
  getMany<T>(keys: string[]): Promise<Map<string, T | null>>;

  /**
   * Delete multiple keys
   * @returns Number of keys deleted
   */
  deleteMany(keys: string[]): Promise<number>;
}
