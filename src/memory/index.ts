/**
 * Memory System Index
 *
 * Consolidated memory architecture organized into 5 categories:
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  CORE         Base classes, session state, persistent storage   │
 * │               BaseMemory, SessionMemory, PersistentMemory       │
 * │                                                                 │
 * │  AGENT        Per-agent memory and long-term learning           │
 * │               AgentMemory, LongTermMemory                       │
 * │                                                                 │
 * │  PROJECT      Codebase analysis and project-level knowledge     │
 * │               ProjectMemory, CodebaseMemory                     │
 * │                                                                 │
 * │  ADVANCED     Semantic search, knowledge graph, prompt library  │
 * │               VectorStore, GraphMemory, PromptMemory            │
 * │                                                                 │
 * │  CACHE        Fast in-memory caching with disk persistence      │
 * │               SessionCache                                      │
 * └─────────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// CORE: Base classes, session state, persistent storage
// =============================================================================

export type {
  MemoryEntry,
  MemoryOptions,
  MemoryStats,
  PruneOptions,
} from './BaseMemory.js';
// BaseMemory - Abstract base class and shared utilities for all memory modules
export {
  BaseMemory,
  estimateSize,
  extractTags,
  generateId,
  generateNumericId,
  getDefaultBaseDir,
  pruneOldEntries,
  sortByImportance,
  TypedBaseMemory,
} from './BaseMemory.js';
export type {
  MemoryEntry as PersistentMemoryEntry,
  MemorySearchOptions,
} from './PersistentMemory.js';

// PersistentMemory - JSON-based durable storage that survives restarts
export { PersistentMemory, persistentMemory } from './PersistentMemory.js';
// SessionMemory - Short-lived conversational context within a single session
export { SessionMemory, sessionMemory } from './SessionMemory.js';

// =============================================================================
// AGENT: Per-agent memory and long-term learning
// =============================================================================

// AgentMemory - Isolated memory scope for individual swarm agents
export { AgentMemory, agentMemory } from './AgentMemory.js';
export type { MemoryCategory } from './LongTermMemory.js';
// LongTermMemory - Cross-session learning and knowledge retention
export { LongTermMemory, longTermMemory } from './LongTermMemory.js';

// =============================================================================
// PROJECT: Codebase analysis and project-level knowledge
// =============================================================================

export type {
  CodebaseAnalysis,
  ContextEnrichment,
  FileInfo,
  ProjectStructure,
} from './CodebaseMemory.js';

// CodebaseMemory - Source code analysis, file structure, and context enrichment
export { CodebaseMemory, codebaseMemory } from './CodebaseMemory.js';
// ProjectMemory - High-level project metadata and configuration memory
export { ProjectMemory, projectMemory } from './ProjectMemory.js';

// =============================================================================
// ADVANCED: Semantic search, knowledge graph, prompt library
// =============================================================================

export type {
  Entity,
  EntityType,
  GraphSearchResult,
  GraphStats,
  Observation,
  Relation,
  RelationType,
  TraversalOptions,
} from './GraphMemory.js';

// GraphMemory - Native knowledge graph with entities, relations, and traversal
export { GraphMemory, getGraphMemory, graphMemory } from './GraphMemory.js';
export type {
  PromptCategory,
  PromptSearchOptions,
  PromptSuggestion,
  PromptVariable,
  SavedPrompt,
} from './PromptMemory.js';

// PromptMemory - Saved prompts library with categories and variables
export { PromptMemory, promptMemory } from './PromptMemory.js';
// VectorStore - Vector-based memory for swarm agents (JSON + JSONL storage)
export { AgentVectorMemory, agentVectorMemory, VectorStore } from './VectorStore.js';

// =============================================================================
// CACHE: Fast in-memory caching with disk persistence
// =============================================================================

export type { SessionCacheConfig } from './SessionCache.js';
// SessionCache - L1 in-memory cache with auto-save for objectives and chronicles
export { SessionCache, sessionCache } from './SessionCache.js';
