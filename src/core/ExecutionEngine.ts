/**
 * ExecutionEngine - Advanced Task Execution Capabilities for GeminiHydra
 *
 * This module serves as a facade that re-exports all execution functionality
 * from specialized sub-modules. Each feature is implemented in its own file
 * under the execution/ directory for better maintainability and testability.
 *
 * Features:
 * 11. Adaptive Retry Strategy (AdaptiveRetry.ts)
 * 12. Partial Completion Handling (PartialCompletion.ts)
 * 13. Parallel Sub-Task Execution (ParallelExecution.ts)
 * 14. Dependency Auto-Detection (DependencyDetection.ts)
 * 15. Checkpoint System (CheckpointSystem.ts)
 * 16. Task Prioritization (TaskPrioritization.ts)
 * 17. Resource-Aware Scheduling (ResourceScheduler.ts)
 * 18. Graceful Degradation (GracefulDegradation.ts)
 * 19. Task Templating (TaskTemplating.ts)
 * 20. Execution Profiling (ExecutionProfiler.ts)
 *
 * @module ExecutionEngine
 */

// =============================================================================
// RE-EXPORTS FROM EXECUTION MODULE
// =============================================================================

// Feature #11: Adaptive Retry
export {
  adaptiveRetry,
  classifyError,
  DEFAULT_RETRY_CONFIGS,
  type ErrorType,
  type RetryConfig
} from './execution/AdaptiveRetry.js';

// Feature #12: Partial Completion
export {
  partialManager,
  PartialCompletionManager,
  type PartialResult
} from './execution/PartialCompletion.js';

// Feature #13: Parallel Execution
export {
  detectParallelGroups,
  executeParallelGroups,
  estimateParallelDuration,
  getParallelizationEfficiency,
  type SubTask,
  type ParallelExecutionResult
} from './execution/ParallelExecution.js';

// Feature #14: Dependency Detection
export {
  autoDetectDependencies,
  extractEntities,
  taskProducesOutput,
  taskConsumesInput,
  visualizeDependencies,
  getTopologicalOrder,
  OUTPUT_KEYWORDS,
  INPUT_KEYWORDS,
  FILE_WRITE_KEYWORDS,
  FILE_READ_KEYWORDS,
  ENTITY_PATTERN
} from './execution/DependencyDetection.js';

// Feature #15: Checkpoint System
export {
  checkpointManager,
  CheckpointManager,
  createCheckpointId,
  parseCheckpointId,
  type Checkpoint
} from './execution/CheckpointSystem.js';

// Feature #16: Task Prioritization
export {
  detectTaskPriority,
  calculatePriorityScore,
  sortByPriority,
  createPrioritizedTask,
  getPriorityLabel,
  PRIORITY_WEIGHTS,
  PRIORITY_KEYWORDS,
  type TaskPriority,
  type PrioritizedTask
} from './execution/TaskPrioritization.js';

// Feature #17: Resource Scheduler
export {
  resourceScheduler,
  ResourceScheduler,
  type ResourceState,
  type CanExecuteResult,
  type SchedulingRecommendation
} from './execution/ResourceScheduler.js';

// Feature #18: Graceful Degradation
export {
  degradationManager,
  GracefulDegradationManager,
  DEGRADATION_LEVELS,
  type DegradationLevelName,
  type DegradationLevel,
  type DegradationStatus
} from './execution/GracefulDegradation.js';

// Feature #19: Task Templating
export {
  taskTemplateManager,
  TaskTemplateManager,
  type TaskTemplate,
  type TaskTemplateStructure,
  type TaskTemplateJSON
} from './execution/TaskTemplating.js';

// Feature #20: Execution Profiler
export {
  executionProfiler,
  ExecutionProfiler,
  type ExecutionProfile,
  type ExecutionStats,
  type AgentStats,
  type ModelStats
} from './execution/ExecutionProfiler.js';

// Engine Management
export {
  initExecutionEngine,
  getExecutionEngineStatus,
  resetExecutionEngine,
  printExecutionEngineStatus,
  isEngineReady,
  getEngineHealth,
  type ExecutionEngineConfig
} from './execution/index.js';

// =============================================================================
// DEFAULT EXPORT (for backward compatibility)
// =============================================================================

import {
  adaptiveRetry,
  classifyError
} from './execution/AdaptiveRetry.js';

import { partialManager } from './execution/PartialCompletion.js';

import {
  detectParallelGroups,
  executeParallelGroups
} from './execution/ParallelExecution.js';

import { autoDetectDependencies } from './execution/DependencyDetection.js';

import { checkpointManager } from './execution/CheckpointSystem.js';

import {
  detectTaskPriority,
  calculatePriorityScore,
  sortByPriority
} from './execution/TaskPrioritization.js';

import { resourceScheduler } from './execution/ResourceScheduler.js';

import { degradationManager } from './execution/GracefulDegradation.js';

import { taskTemplateManager } from './execution/TaskTemplating.js';

import { executionProfiler } from './execution/ExecutionProfiler.js';

import {
  initExecutionEngine,
  getExecutionEngineStatus
} from './execution/index.js';

export default {
  // #11 Adaptive Retry
  adaptiveRetry,
  classifyError,

  // #12 Partial Completion
  partialManager,

  // #13 Parallel Execution
  detectParallelGroups,
  executeParallelGroups,

  // #14 Auto Dependencies
  autoDetectDependencies,

  // #15 Checkpoints
  checkpointManager,

  // #16 Prioritization
  detectTaskPriority,
  calculatePriorityScore,
  sortByPriority,

  // #17 Resource Scheduling
  resourceScheduler,

  // #18 Graceful Degradation
  degradationManager,

  // #19 Task Templating
  taskTemplateManager,

  // #20 Execution Profiling
  executionProfiler,

  // Engine
  initExecutionEngine,
  getExecutionEngineStatus
};
