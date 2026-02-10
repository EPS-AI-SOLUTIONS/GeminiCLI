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
// AutoCompact - Automatic Context Compaction
// ============================================================
export {
  AutoCompact,
  type AutoCompactConfig,
  autoCompact,
  type CompactionLevel,
  type CompactionResult,
  type CompactionStats,
} from './AutoCompact.js';

// ============================================================
// Feature #22: Smart Context Pruning
// ============================================================
export {
  contextPruner,
  type PrunedContext,
  type PruningItem,
  type PruningStrategy,
  SmartContextPruner,
} from './ContextPruner.js';
// ============================================================
// Feature #21: Conversation Memory
// ============================================================
export {
  ConversationMemory,
  type ConversationSession,
  type ConversationTurn,
  conversationMemory,
} from './ConversationMemory.js';
// ============================================================
// Feature #25: Correction Learner
// ============================================================
export {
  type Correction,
  CorrectionLearner,
  type CorrectionStats,
  correctionLearner,
  type LearnedPattern,
} from './CorrectionLearner.js';
// ============================================================
// Feature #29: Dry-Run Preview
// ============================================================
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
} from './DryRunPreview.js';
// ============================================================
// Feature #30: Explanation Mode
// ============================================================
export {
  type Explanation,
  ExplanationMode,
  type ExplanationStep,
  explanationMode,
  type VerbosityLevel,
} from './ExplanationMode.js';
// ============================================================
// Feature #23: Intent Detection
// ============================================================
export {
  type DetectedIntent,
  detectIntent,
  getIntentCategories,
  getSuggestedAgents,
  type IntentCategory,
  matchesIntent,
} from './IntentDetection.js';
// ============================================================
// Feature #24: Proactive Suggestions
// ============================================================
export {
  ProactiveSuggestions,
  proactiveSuggestions,
  type Suggestion,
  type SuggestionContext,
} from './ProactiveSuggestions.js';
// ============================================================
// Feature #27: Progress Tracking
// ============================================================
export {
  type ProgressListener,
  type ProgressReport,
  type ProgressStep,
  ProgressTracker,
  progressTracker,
} from './ProgressTracking.js';
// ============================================================
// Feature #28: Rollback Manager
// ============================================================
export {
  type FileSnapshot,
  RollbackManager,
  type RollbackPoint,
  type RollbackResult,
  rollbackManager,
} from './RollbackManager.js';
// ============================================================
// Feature #26: Task Estimation
// ============================================================
export {
  determineComplexity,
  estimateTask,
  getEstimatesForComplexity,
  type TaskEstimate,
} from './TaskEstimation.js';

// ============================================================
// Initialization Helper
// ============================================================

import chalk from 'chalk';
import { autoCompact } from './AutoCompact.js';
import { conversationMemory } from './ConversationMemory.js';
import { correctionLearner } from './CorrectionLearner.js';

/**
 * Initialize all conversation subsystems
 */
export async function initConversationSubsystems(): Promise<void> {
  console.log(chalk.cyan('[Conversation] Initializing subsystems...'));

  await Promise.all([conversationMemory.initialize(), correctionLearner.initialize()]);

  // Start auto-compaction monitoring
  autoCompact.start();

  console.log(chalk.green('[Conversation] All subsystems ready (AutoCompact active)'));
}

/**
 * Persist all conversation data
 */
export async function persistConversationData(): Promise<void> {
  await Promise.all([conversationMemory.persist(), correctionLearner.persist()]);
}
