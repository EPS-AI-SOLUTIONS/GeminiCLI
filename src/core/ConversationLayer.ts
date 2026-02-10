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

// #22 Smart Context Pruning
export {
  contextPruner,
  type PrunedContext,
  type PruningItem,
  type PruningStrategy,
  SmartContextPruner,
} from './conversation/ContextPruner.js';
// #21 Conversation Memory
export {
  ConversationMemory,
  type ConversationSession,
  type ConversationTurn,
  conversationMemory,
} from './conversation/ConversationMemory.js';
// #25 Learning from Corrections
export {
  type Correction,
  CorrectionLearner,
  type CorrectionStats,
  correctionLearner,
  type LearnedPattern,
} from './conversation/CorrectionLearner.js';
// #29 Dry-Run Preview
export {
  type ActionType,
  calculateImpact,
  createAction,
  type DryRunAction,
  type DryRunPreview,
  formatDryRunPreview,
  generateDryRunPreview,
  type ImpactLevel,
  isDestructive,
  type TotalImpactLevel,
} from './conversation/DryRunPreview.js';
// #30 Explanation Mode
export {
  type Explanation,
  ExplanationMode,
  type ExplanationStep,
  explanationMode,
  type VerbosityLevel,
} from './conversation/ExplanationMode.js';
// #23 Intent Detection
export {
  type DetectedIntent,
  detectIntent,
  getIntentCategories,
  getSuggestedAgents,
  type IntentCategory,
  matchesIntent,
} from './conversation/IntentDetection.js';
// Initialization helpers
export {
  initConversationSubsystems,
  persistConversationData,
} from './conversation/index.js';
// #24 Proactive Suggestions
export {
  ProactiveSuggestions,
  proactiveSuggestions,
  type Suggestion,
  type SuggestionContext,
} from './conversation/ProactiveSuggestions.js';
// #27 Progress Tracking
export {
  type ProgressListener,
  type ProgressReport,
  type ProgressStep,
  ProgressTracker,
  progressTracker,
} from './conversation/ProgressTracking.js';
// #28 Rollback Capability
export {
  type FileSnapshot,
  RollbackManager,
  type RollbackPoint,
  type RollbackResult,
  rollbackManager,
} from './conversation/RollbackManager.js';
// #26 Task Estimation
export {
  determineComplexity,
  estimateTask,
  getEstimatesForComplexity,
  type TaskEstimate,
} from './conversation/TaskEstimation.js';

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
  contextPruner,
  conversationMemory,
  correctionLearner,
  detectIntent,
  estimateTask,
  explanationMode,
  generateDryRunPreview,
  proactiveSuggestions,
  progressTracker,
  rollbackManager,
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
  ...require('./conversation/index.js'),
};
