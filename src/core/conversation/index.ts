/**
 * Conversation Module - Index
 *
 * Re-exports all conversation-related features:
 * - Feature #21: ConversationMemory
 * - Feature #22: ContextPruner (Smart Context Pruning)
 * - Feature #23: IntentDetection
 * - Feature #24: ProactiveSuggestions
 * - Feature #25: CorrectionLearner
 * - Feature #26: TaskEstimation
 * - Feature #27: ProgressTracking
 * - Feature #28: RollbackManager
 * - Feature #29: DryRunPreview
 * - Feature #30: ExplanationMode
 *
 * This module was refactored from the original ConversationLayer.ts
 */

// ============================================================
// Feature #21: Conversation Memory
// ============================================================
export {
  ConversationMemory,
  conversationMemory,
  type ConversationTurn,
  type ConversationSession
} from './ConversationMemory.js';

// ============================================================
// Feature #22: Smart Context Pruning
// ============================================================
export {
  SmartContextPruner,
  contextPruner,
  type PruningStrategy,
  type PrunedContext,
  type PruningItem
} from './ContextPruner.js';

// ============================================================
// Feature #23: Intent Detection
// ============================================================
export {
  detectIntent,
  getSuggestedAgents,
  getIntentCategories,
  matchesIntent,
  type IntentCategory,
  type DetectedIntent
} from './IntentDetection.js';

// ============================================================
// Feature #24: Proactive Suggestions
// ============================================================
export {
  ProactiveSuggestions,
  proactiveSuggestions,
  type Suggestion,
  type SuggestionContext
} from './ProactiveSuggestions.js';

// ============================================================
// Feature #25: Correction Learner
// ============================================================
export {
  CorrectionLearner,
  correctionLearner,
  type Correction,
  type LearnedPattern,
  type CorrectionStats
} from './CorrectionLearner.js';

// ============================================================
// Feature #26: Task Estimation
// ============================================================
export {
  estimateTask,
  determineComplexity,
  getEstimatesForComplexity,
  type TaskEstimate
} from './TaskEstimation.js';

// ============================================================
// Feature #27: Progress Tracking
// ============================================================
export {
  ProgressTracker,
  progressTracker,
  type ProgressStep,
  type ProgressReport,
  type ProgressListener
} from './ProgressTracking.js';

// ============================================================
// Feature #28: Rollback Manager
// ============================================================
export {
  RollbackManager,
  rollbackManager,
  type FileSnapshot,
  type RollbackPoint,
  type RollbackResult
} from './RollbackManager.js';

// ============================================================
// Feature #29: Dry-Run Preview
// ============================================================
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
} from './DryRunPreview.js';

// ============================================================
// Feature #30: Explanation Mode
// ============================================================
export {
  ExplanationMode,
  explanationMode,
  type VerbosityLevel,
  type ExplanationStep,
  type Explanation
} from './ExplanationMode.js';

// ============================================================
// Initialization Helper
// ============================================================

import { conversationMemory } from './ConversationMemory.js';
import { correctionLearner } from './CorrectionLearner.js';
import chalk from 'chalk';

/**
 * Initialize all conversation subsystems
 */
export async function initConversationSubsystems(): Promise<void> {
  console.log(chalk.cyan('[Conversation] Initializing subsystems...'));

  await Promise.all([
    conversationMemory.initialize(),
    correctionLearner.initialize()
  ]);

  console.log(chalk.green('[Conversation] All subsystems ready'));
}

/**
 * Persist all conversation data
 */
export async function persistConversationData(): Promise<void> {
  await Promise.all([
    conversationMemory.persist(),
    correctionLearner.persist()
  ]);
}
