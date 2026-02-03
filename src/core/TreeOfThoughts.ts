/**
 * @deprecated Import directly from './intelligence/TreeOfThoughts.js' instead.
 *
 * TreeOfThoughts - Re-export from consolidated intelligence module
 *
 * This file re-exports the consolidated TreeOfThoughts implementation
 * from src/core/intelligence/TreeOfThoughts.ts for backward compatibility.
 */

export {
  // Types
  type SearchStrategy,
  type ThoughtNode,
  type ToTOptions,
  type ExplorationStats,
  type TreeOfThoughtsResult,
  type LLMInterface,

  // Main functions
  treeOfThoughts,
  quickTreeOfThoughts,
  mctsTreeOfThoughts,
  bfsTreeOfThoughts,
  dfsTreeOfThoughts,
  parallelTreeOfThoughts,
  formatToTResult,

  // Utility functions
  generateChildThoughts,
  extractSolution,
  calculateThoughtSimilarity,
  deduplicateThoughts,
  aggregateThoughts,
  pruneNodes,
  calculatePruneThreshold,
  visualizeTree,
  getPathFromRoot,

  // Search strategy implementations
  mctsExplore,
  bfsExplore,
  dfsExplore,
  beamExplore,

  // Class
  TreeOfThoughts
} from './intelligence/TreeOfThoughts.js';

// Default export
export { default } from './intelligence/TreeOfThoughts.js';
