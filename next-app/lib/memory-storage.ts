/**
 * Memory Storage
 * Centralized access to agent memory and knowledge graph data.
 * Uses StorageAdapter in production (Upstash Redis), falls back to file system.
 *
 * This replaces the duplicated readMemoryStore/writeMemoryStore helpers
 * that were scattered across multiple memory route handlers.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { MemoryStore } from './api-types';
import { getStorage, StorageKeys } from './storage';
import type { StorageAdapter } from './storage/adapter';

// ═══════════════════════════════════════════════════════════════════════════
// Defaults
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_MEMORY_STORE: MemoryStore = {
  memories: [],
  graph: { nodes: [], edges: [] },
};

// ═══════════════════════════════════════════════════════════════════════════
// File-based fallback (dev / local)
// ═══════════════════════════════════════════════════════════════════════════

function getMemoryPath(): string {
  return path.join(process.cwd(), 'agent_memory.json');
}

function readFromFile(): MemoryStore {
  const memPath = getMemoryPath();
  if (!fs.existsSync(memPath)) {
    return { ...DEFAULT_MEMORY_STORE, graph: { ...DEFAULT_MEMORY_STORE.graph } };
  }

  try {
    const content = fs.readFileSync(memPath, 'utf-8');
    return JSON.parse(content) as MemoryStore;
  } catch {
    return { ...DEFAULT_MEMORY_STORE, graph: { ...DEFAULT_MEMORY_STORE.graph } };
  }
}

function writeToFile(store: MemoryStore): void {
  const memPath = getMemoryPath();
  fs.writeFileSync(memPath, JSON.stringify(store, null, 2), 'utf-8');
}

// ═══════════════════════════════════════════════════════════════════════════
// Storage-backed access
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if we should use StorageAdapter (production) or filesystem (dev)
 */
function getStorageAdapter(): StorageAdapter | null {
  const hasUpstash = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!hasUpstash) return null;

  try {
    return getStorage();
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read the complete memory store (memories + knowledge graph)
 * Uses Upstash in production, filesystem in development
 */
export async function readMemoryStore(): Promise<MemoryStore> {
  const adapter = getStorageAdapter();

  if (adapter) {
    try {
      // In production, memories and graph are stored separately for efficiency
      const [memories, graph] = await Promise.all([
        adapter.get<MemoryStore['memories']>(StorageKeys.agentMemory('_all')),
        adapter.get<MemoryStore['graph']>(StorageKeys.knowledgeGraph),
      ]);

      return {
        memories: memories ?? [],
        graph: graph ?? { nodes: [], edges: [] },
      };
    } catch (error) {
      console.warn('[MemoryStorage] Failed to read from storage, falling back to file:', error);
    }
  }

  return readFromFile();
}

/**
 * Write the complete memory store
 * Uses Upstash in production, filesystem in development
 */
export async function writeMemoryStore(store: MemoryStore): Promise<void> {
  const adapter = getStorageAdapter();

  if (adapter) {
    try {
      // Store memories and graph separately for independent access
      await Promise.all([
        adapter.set(StorageKeys.agentMemory('_all'), store.memories),
        adapter.set(StorageKeys.knowledgeGraph, store.graph),
      ]);
      return;
    } catch (error) {
      console.warn('[MemoryStorage] Failed to write to storage, falling back to file:', error);
    }
  }

  writeToFile(store);
}

// ═══════════════════════════════════════════════════════════════════════════
// Bridge Storage
// ═══════════════════════════════════════════════════════════════════════════

import type { BridgeData } from './api-types';

const DEFAULT_BRIDGE: BridgeData = { requests: [], auto_approve: false };

function getBridgePath(): string {
  return path.join(process.cwd(), 'bridge.json');
}

/**
 * Read bridge state
 * Uses Upstash in production, filesystem in development
 */
export async function readBridgeState(): Promise<BridgeData> {
  const adapter = getStorageAdapter();

  if (adapter) {
    try {
      const data = await adapter.get<BridgeData>(StorageKeys.bridgeState);
      return data ?? { ...DEFAULT_BRIDGE };
    } catch (error) {
      console.warn('[BridgeStorage] Failed to read from storage:', error);
    }
  }

  // File-based fallback
  const bridgePath = getBridgePath();
  if (!fs.existsSync(bridgePath)) {
    const defaultData: BridgeData = { ...DEFAULT_BRIDGE };
    fs.writeFileSync(bridgePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }

  try {
    const content = fs.readFileSync(bridgePath, 'utf-8');
    return JSON.parse(content) as BridgeData;
  } catch {
    return { ...DEFAULT_BRIDGE };
  }
}

/**
 * Write bridge state
 * Uses Upstash in production, filesystem in development
 */
export async function writeBridgeState(data: BridgeData): Promise<void> {
  const adapter = getStorageAdapter();

  if (adapter) {
    try {
      await adapter.set(StorageKeys.bridgeState, data);
      return;
    } catch (error) {
      console.warn('[BridgeStorage] Failed to write to storage:', error);
    }
  }

  const bridgePath = getBridgePath();
  fs.writeFileSync(bridgePath, JSON.stringify(data, null, 2), 'utf-8');
}
