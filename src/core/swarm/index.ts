/**
 * Swarm - Module index
 *
 * Re-exports all swarm components.
 *
 * Original Swarm.ts (1469 lines) has been split into:
 * - types.ts              - YoloConfig interface, DEFAULT_CONFIG
 * - BoundedResultStore.ts - Bounded result store with TTL
 * - helpers.ts            - buildMcpContext, generateNextStepSuggestions,
 *                           checkMultiAgentConsensus, validateAgentResults, cleanJson
 * - Swarm.ts              - Swarm class, createSwarm factory
 *
 * @module core/swarm/index
 */

// Utility
export { BoundedResultStore } from './BoundedResultStore.js';
// Helpers
export {
  buildMcpContext,
  checkMultiAgentConsensus,
  cleanJson,
  generateNextStepSuggestions,
  validateAgentResults,
} from './helpers.js';
// Main class and factory
export { createSwarm, Swarm } from './Swarm.js';
// Types and config
export type { YoloConfig } from './types.js';
export { DEFAULT_CONFIG } from './types.js';
