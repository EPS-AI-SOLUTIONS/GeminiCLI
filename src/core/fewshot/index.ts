/**
 * FewShot Module - Re-exports for few-shot examples system
 *
 * @module fewshot
 */

export { AGENT_SPECIFIC_EXAMPLES } from './agent-examples.js';

// Data
export { EXTENDED_FEW_SHOT_EXAMPLES } from './extended-examples.js';
// Selection & scoring
export {
  detectExampleCategory,
  getAgentSpecificExamples,
  getBestFewShotExamples,
  getTopEffectiveExamples,
  recordExampleUsage,
  scoreExampleEffectiveness,
  selectBestExamples,
} from './selection.js';
// Types
export type {
  AgentExample,
  AgentExampleCollection,
  ExampleUsageStats,
  FewShotExample,
  FewShotExampleCollection,
} from './types.js';

import { AGENT_SPECIFIC_EXAMPLES } from './agent-examples.js';
// Default export (backward compatibility)
import { EXTENDED_FEW_SHOT_EXAMPLES } from './extended-examples.js';
import {
  detectExampleCategory,
  getAgentSpecificExamples,
  getBestFewShotExamples,
  getTopEffectiveExamples,
  recordExampleUsage,
  scoreExampleEffectiveness,
  selectBestExamples,
} from './selection.js';

export default {
  EXTENDED_FEW_SHOT_EXAMPLES,
  AGENT_SPECIFIC_EXAMPLES,
  selectBestExamples,
  getAgentSpecificExamples,
  recordExampleUsage,
  scoreExampleEffectiveness,
  getTopEffectiveExamples,
  detectExampleCategory,
  getBestFewShotExamples,
};
