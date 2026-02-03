/**
 * ConversationLayer.ts - Advanced Conversation & Context Management
 *
 * Features #21-30 from the 50 improvements list:
 * #21 - Conversation Memory -> ./conversation/ConversationMemory.ts
 * #22 - Smart Context Pruning -> ./conversation/ContextPruner.ts
 * #23 - Intent Detection -> ./conversation/IntentDetection.ts
 * #24 - Proactive Suggestions -> ./conversation/ProactiveSuggestions.ts
 * #25 - Learning from Corrections -> ./conversation/CorrectionLearner.ts
 * #26 - Task Estimation -> ./conversation/TaskEstimation.ts
 * #27 - Progress Tracking -> ./conversation/ProgressTracking.ts
 * #28 - Rollback Capability -> ./conversation/RollbackManager.ts
 * #29 - Dry-Run Preview -> ./conversation/DryRunPreview.ts
 * #30 - Explanation Mode -> ./conversation/ExplanationMode.ts
 *
 * This file re-exports all conversation features for backward compatibility.
 * All implementations are now in the ./conversation/ subdirectory.
 */

// ============================================================
// Re-export all features from conversation module
// ============================================================

// #21 Conversation Memory
export {
  ConversationMemory,
  conversationMemory,
  type ConversationTurn,
  type ConversationSession
} from './conversation/ConversationMemory.js';

// #22 Smart Context Pruning
export {
  SmartContextPruner,
  contextPruner,
  type PruningStrategy,
  type PrunedContext,
  type PruningItem
} from './conversation/ContextPruner.js';

// #23 Intent Detection
export {
  detectIntent,
  getSuggestedAgents,
  getIntentCategories,
  matchesIntent,
  type IntentCategory,
  type DetectedIntent
} from './conversation/IntentDetection.js';

// #24 Proactive Suggestions
export {
  ProactiveSuggestions,
  proactiveSuggestions,
  type Suggestion,
  type SuggestionContext
} from './conversation/ProactiveSuggestions.js';

// #25 Learning from Corrections
export {
  CorrectionLearner,
  correctionLearner,
  type Correction,
  type LearnedPattern,
  type CorrectionStats
} from './conversation/CorrectionLearner.js';

// #26 Task Estimation
export {
  estimateTask,
  determineComplexity,
  getEstimatesForComplexity,
  type TaskEstimate
} from './conversation/TaskEstimation.js';

// #27 Progress Tracking
export {
  ProgressTracker,
  progressTracker,
  type ProgressStep,
  type ProgressReport,
  type ProgressListener
} from './conversation/ProgressTracking.js';

// #28 Rollback Capability
export {
  RollbackManager,
  rollbackManager,
  type FileSnapshot,
  type RollbackPoint,
  type RollbackResult
} from './conversation/RollbackManager.js';

// #29 Dry-Run Preview
export {
  generateDryRunPreview,
  formatDryRunPreview,
  createAction,
  calculateImpact,
  isDestructive,
  type ActionType,
  type ImpactLevel,
  type TotalImpactLevel,
  type DryRunAction,
  type DryRunPreview
} from './conversation/DryRunPreview.js';

// #30 Explanation Mode
export {
  ExplanationMode,
  explanationMode,
  type VerbosityLevel,
  type ExplanationStep,
  type Explanation
} from './conversation/ExplanationMode.js';

// Initialization helpers
export {
  initConversationSubsystems,
  persistConversationData
} from './conversation/index.js';

// ============================================================
// Legacy Initialization (for backward compatibility)
// ============================================================

import { initConversationSubsystems } from './conversation/index.js';

/**
 * Initialize the conversation layer
 * @deprecated Use initConversationSubsystems() instead
 */
export async function initConversationLayer(): Promise<void> {
  return initConversationSubsystems();
}

// ============================================================
// Default Export (for backward compatibility)
// ============================================================

import {
  conversationMemory,
  contextPruner,
  proactiveSuggestions,
  correctionLearner,
  progressTracker,
  rollbackManager,
  explanationMode
} from './conversation/index.js';

import {
  detectIntent,
  estimateTask,
  generateDryRunPreview
} from './conversation/index.js';

export default {
  // Classes & Instances
  conversationMemory,
  contextPruner,
  proactiveSuggestions,
  correctionLearner,
  progressTracker,
  rollbackManager,
  explanationMode,

  // Functions
  detectIntent,
  estimateTask,
  generateDryRunPreview,
  initConversationLayer,

  // Re-export all from conversation module
  ...require('./conversation/index.js')
};
