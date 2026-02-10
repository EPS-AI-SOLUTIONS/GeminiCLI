/**
 * Model Intelligence - Re-exports all model-related modules
 * Features #11, #12, #14, #15, #16, #17, #18, #19, #20
 */

// Feature #17: Multi-Model Consensus
export {
  type ConsensusResult,
  getConsensus,
} from './ConsensusEngine.js';

// Feature #12: Agent-Specific Fallback Chains
export {
  AGENT_FALLBACK_CHAINS,
  type FallbackChainEntry,
  getFallbackChain,
} from './FallbackChains.js';
// Feature #18: Context Window Management
export {
  type ContextMessage,
  contextManager,
} from './ModelContextManager.js';
// Feature #20: Model Health Check
export {
  type ModelHealth,
  modelHealth,
} from './ModelHealthCheck.js';
// Feature #11: Dynamic Model Selection
export {
  classifyComplexity,
  type ModelSelectionResult,
  selectModelForTask,
  type TaskComplexity,
} from './ModelSelection.js';
// Feature #14: Model Performance Tracking
export {
  type ModelMetrics,
  modelPerformance,
} from './PerformanceTracking.js';
// Feature #15: Prompt Caching
export { promptCache } from './PromptCaching.js';

// Feature #19: Model-Specific Prompt Optimization
export {
  MODEL_PROMPT_CONFIGS,
  type ModelPromptConfig,
  optimizePromptForModel,
} from './PromptOptimization.js';
// Feature #16: Response Quality Scoring
export {
  type ExpectedResponseType,
  type QualityScore,
  scoreResponseQuality,
} from './QualityScoring.js';

// Default export with all utilities
export default {
  // Feature #11
  classifyComplexity: (await import('./ModelSelection.js')).classifyComplexity,
  selectModelForTask: (await import('./ModelSelection.js')).selectModelForTask,

  // Feature #12
  getFallbackChain: (await import('./FallbackChains.js')).getFallbackChain,
  AGENT_FALLBACK_CHAINS: (await import('./FallbackChains.js')).AGENT_FALLBACK_CHAINS,

  // Feature #14
  modelPerformance: (await import('./PerformanceTracking.js')).modelPerformance,

  // Feature #15
  promptCache: (await import('./PromptCaching.js')).promptCache,

  // Feature #16
  scoreResponseQuality: (await import('./QualityScoring.js')).scoreResponseQuality,

  // Feature #17
  getConsensus: (await import('./ConsensusEngine.js')).getConsensus,

  // Feature #18
  contextManager: (await import('./ModelContextManager.js')).contextManager,

  // Feature #19
  optimizePromptForModel: (await import('./PromptOptimization.js')).optimizePromptForModel,
  MODEL_PROMPT_CONFIGS: (await import('./PromptOptimization.js')).MODEL_PROMPT_CONFIGS,

  // Feature #20
  modelHealth: (await import('./ModelHealthCheck.js')).modelHealth,
};
