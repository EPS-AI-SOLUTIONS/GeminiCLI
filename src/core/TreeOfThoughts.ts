/**
 * @deprecated Import directly from './intelligence/TreeOfThoughts.js' instead.
 *
 * TreeOfThoughts - Re-export from consolidated intelligence module
 *
 * This file re-exports the consolidated TreeOfThoughts implementation
 * from src/core/intelligence/TreeOfThoughts.ts for backward compatibility.
 */

// Default export
export {
  aggregateThoughts,
  beamExplore,
  bfsExplore,
  bfsTreeOfThoughts,
  calculatePruneThreshold,
  calculateThoughtSimilarity,
  deduplicateThoughts,
  default,
  dfsExplore,
  dfsTreeOfThoughts,
  type ExplorationStats,
  extractSolution,
  formatToTResult,
  // Utility functions
  generateChildThoughts,
  getPathFromRoot,
  type LLMInterface,
  // Search strategy implementations
  mctsExplore,
  mctsTreeOfThoughts,
  parallelTreeOfThoughts,
  pruneNodes,
  quickTreeOfThoughts,
  // Types
  type SearchStrategy,
  type ThoughtNode,
  type ToTOptions,
  // Class
  TreeOfThoughts,
  type TreeOfThoughtsResult,
  // Main functions
  treeOfThoughts,
  visualizeTree,
} from './intelligence/TreeOfThoughts.js';
