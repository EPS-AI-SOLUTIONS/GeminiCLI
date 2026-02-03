/**
 * Memory System Index
 * All memory features exported from here
 */

// Base Memory Class and Utilities
export {
  BaseMemory,
  TypedBaseMemory,
  generateId,
  generateNumericId,
  estimateSize,
  pruneOldEntries,
  sortByImportance,
  extractTags,
  getDefaultBaseDir
} from './BaseMemory.js';

export type {
  MemoryEntry,
  MemoryOptions,
  MemoryStats,
  PruneOptions
} from './BaseMemory.js';

// Session Memory (Features 1-5)
export { SessionMemory, sessionMemory } from './SessionMemory.js';

// Long-term Memory (Features 6-10)
export { LongTermMemory, longTermMemory } from './LongTermMemory.js';
export type { MemoryCategory } from './LongTermMemory.js';

// Project Memory
export { ProjectMemory, projectMemory } from './ProjectMemory.js';

// Agent Memory
export { AgentMemory, agentMemory } from './AgentMemory.js';

// Feature #3: Persistent Memory (JSON-based)
export { PersistentMemory, persistentMemory } from './PersistentMemory.js';
export type {
  MemoryEntry as PersistentMemoryEntry,
  MemorySearchOptions
} from './PersistentMemory.js';

// Feature #51: Codebase Memory
export { CodebaseMemory, codebaseMemory } from './CodebaseMemory.js';
export type {
  FileInfo,
  ProjectStructure,
  CodebaseAnalysis,
  ContextEnrichment
} from './CodebaseMemory.js';

// Prompt Memory - Zapisywanie i zarządzanie promptami
export { PromptMemory, promptMemory } from './PromptMemory.js';
export type {
  SavedPrompt,
  PromptCategory,
  PromptVariable,
  PromptSearchOptions,
  PromptSuggestion
} from './PromptMemory.js';
