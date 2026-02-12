/**
 * Storage Factory
 * Returns the appropriate StorageAdapter based on environment
 *
 * - Development: InMemoryAdapter (no external deps needed)
 * - Production: UpstashAdapter (persistent via Upstash Redis)
 *
 * The adapter is chosen based on the presence of Upstash env vars.
 * If KV_REST_API_URL is set, UpstashAdapter is used.
 * Otherwise, InMemoryAdapter is used as fallback.
 */

import type { StorageAdapter } from './adapter';
import { InMemoryAdapter } from './memory';
import { UpstashAdapter } from './upstash';

// Re-export types
export type { StorageAdapter } from './adapter';
export { InMemoryAdapter } from './memory';
export { UpstashAdapter } from './upstash';

// ═══════════════════════════════════════════════════════════════════════════
// Singleton Storage Instance
// ═══════════════════════════════════════════════════════════════════════════

let _storage: StorageAdapter | null = null;

/**
 * Get the storage adapter singleton.
 * Automatically selects InMemory (dev) or Upstash (prod) based on env vars.
 */
export function getStorage(): StorageAdapter {
  if (_storage) return _storage;

  const hasUpstash = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;

  if (hasUpstash) {
    _storage = new UpstashAdapter();
    console.log('[Storage] Using UpstashAdapter (production)');
  } else {
    _storage = new InMemoryAdapter();
    console.log('[Storage] Using InMemoryAdapter (development)');
  }

  return _storage;
}

// ═══════════════════════════════════════════════════════════════════════════
// Key Namespaces
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Standardized key namespaces for the storage adapter.
 * Use these to ensure consistent key naming across the app.
 */
export const StorageKeys = {
  /** History messages: history:messages */
  historyMessages: 'history:messages',

  /** Settings: settings:current */
  settings: 'settings:current',

  /** Agent memory: memory:agent:{agentName} */
  agentMemory: (agentName: string) => `memory:agent:${agentName}`,

  /** Knowledge graph: memory:graph */
  knowledgeGraph: 'memory:graph',

  /** Bridge state: bridge:state */
  bridgeState: 'bridge:state',

  /** Session: session:{id} */
  session: (id: string) => `session:${id}`,
} as const;
