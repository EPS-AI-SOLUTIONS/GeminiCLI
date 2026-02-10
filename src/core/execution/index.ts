/**
 * Execution Module - Unified exports for ExecutionEngine components
 *
 * This module re-exports all execution-related functionality:
 * - Feature #11: AdaptiveRetry - Error-type specific retry strategies
 * - Feature #12: PartialCompletion - Resume interrupted tasks
 * - Feature #13: ParallelExecution - Concurrent sub-task execution
 * - Feature #14: DependencyDetection - Auto-detect task dependencies
 * - Feature #15: CheckpointSystem - Save/restore execution state
 * - Feature #16: TaskPrioritization - Task priority detection and sorting
 * - Feature #17: ResourceScheduler - Resource-aware task scheduling
 * - Feature #18: GracefulDegradation - Automatic service level degradation
 * - Feature #19: TaskTemplating - Reusable task templates
 * - Feature #20: ExecutionProfiler - Performance profiling and statistics
 *
 * Part of GeminiHydra ExecutionEngine
 */

import chalk from 'chalk';

// =============================================================================
// FEATURE #11: ADAPTIVE RETRY
// =============================================================================

export {
  adaptiveRetry,
  classifyError,
  DEFAULT_RETRY_CONFIGS,
  type ErrorType,
  type RetryConfig,
} from './AdaptiveRetry.js';

// =============================================================================
// FEATURE #12: PARTIAL COMPLETION
// =============================================================================

export {
  PartialCompletionManager,
  type PartialResult,
  partialManager,
} from './PartialCompletion.js';

// =============================================================================
// FEATURE #13: PARALLEL EXECUTION
// =============================================================================

export {
  detectParallelGroups,
  estimateParallelDuration,
  executeParallelGroups,
  getParallelizationEfficiency,
  type ParallelExecutionResult,
  type SubTask,
} from './ParallelExecution.js';

// =============================================================================
// FEATURE #14: DEPENDENCY DETECTION
// =============================================================================

export {
  autoDetectDependencies,
  ENTITY_PATTERN,
  extractEntities,
  FILE_READ_KEYWORDS,
  FILE_WRITE_KEYWORDS,
  getTopologicalOrder,
  INPUT_KEYWORDS,
  OUTPUT_KEYWORDS,
  taskConsumesInput,
  taskProducesOutput,
  visualizeDependencies,
} from './DependencyDetection.js';

// =============================================================================
// FEATURE #15: CHECKPOINT SYSTEM
// =============================================================================

export {
  type Checkpoint,
  CheckpointManager,
  checkpointManager,
  createCheckpointId,
  parseCheckpointId,
} from './CheckpointSystem.js';

// =============================================================================
// FEATURE #16: TASK PRIORITIZATION
// =============================================================================

export {
  calculatePriorityScore,
  createPrioritizedTask,
  detectTaskPriority,
  getPriorityLabel,
  PRIORITY_KEYWORDS,
  PRIORITY_WEIGHTS,
  type PrioritizedTask,
  sortByPriority,
  type TaskPriority,
} from './TaskPrioritization.js';

// =============================================================================
// FEATURE #17: RESOURCE SCHEDULER
// =============================================================================

export {
  type CanExecuteResult,
  ResourceScheduler,
  type ResourceState,
  resourceScheduler,
  type SchedulingRecommendation,
} from './ResourceScheduler.js';

// =============================================================================
// FEATURE #18: GRACEFUL DEGRADATION
// =============================================================================

export {
  DEGRADATION_LEVELS,
  type DegradationLevel,
  type DegradationLevelName,
  type DegradationStatus,
  degradationManager,
  GracefulDegradationManager,
} from './GracefulDegradation.js';

// =============================================================================
// FEATURE #19: TASK TEMPLATING
// =============================================================================

export {
  type TaskTemplate,
  type TaskTemplateJSON,
  TaskTemplateManager,
  type TaskTemplateStructure,
  taskTemplateManager,
} from './TaskTemplating.js';

// =============================================================================
// FEATURE #20: EXECUTION PROFILER
// =============================================================================

export {
  type AgentStats,
  type ExecutionProfile,
  ExecutionProfiler,
  type ExecutionStats,
  executionProfiler,
  type ModelStats,
} from './ExecutionProfiler.js';

// =============================================================================
// UNIFIED CONFIGURATION
// =============================================================================

export interface ExecutionEngineConfig {
  enableAdaptiveRetry?: boolean;
  enablePartialCompletion?: boolean;
  enableParallelExecution?: boolean;
  enableAutoDependencies?: boolean;
  enableCheckpoints?: boolean;
  enablePrioritization?: boolean;
  enableResourceScheduling?: boolean;
  enableGracefulDegradation?: boolean;
  enableTemplating?: boolean;
  enableProfiling?: boolean;
  maxConcurrentTasks?: number;
  apiQuotaLimit?: number;
}

const DEFAULT_ENGINE_CONFIG: ExecutionEngineConfig = {
  enableAdaptiveRetry: true,
  enablePartialCompletion: true,
  enableParallelExecution: true,
  enableAutoDependencies: true,
  enableCheckpoints: true,
  enablePrioritization: true,
  enableResourceScheduling: true,
  enableGracefulDegradation: true,
  enableTemplating: true,
  enableProfiling: true,
  maxConcurrentTasks: 12,
  apiQuotaLimit: 1000,
};

// =============================================================================
// STATE
// =============================================================================

import { executionProfiler } from './ExecutionProfiler.js';
import { degradationManager } from './GracefulDegradation.js';
import { resourceScheduler } from './ResourceScheduler.js';
import { taskTemplateManager } from './TaskTemplating.js';

let engineInitialized = false;
let engineConfig: ExecutionEngineConfig = { ...DEFAULT_ENGINE_CONFIG };

// =============================================================================
// UNIFIED FUNCTIONS
// =============================================================================

/**
 * Initialize execution engine with all components
 */
export async function initExecutionEngine(config: ExecutionEngineConfig = {}): Promise<void> {
  if (engineInitialized) {
    console.log(chalk.yellow('[ExecutionEngine] Already initialized'));
    return;
  }

  engineConfig = { ...DEFAULT_ENGINE_CONFIG, ...config };

  console.log(chalk.cyan('[ExecutionEngine] Initializing...'));

  // Initialize resource scheduler
  if (engineConfig.enableResourceScheduling) {
    if (engineConfig.maxConcurrentTasks) {
      resourceScheduler.setMaxConcurrentTasks(engineConfig.maxConcurrentTasks);
    }
    if (engineConfig.apiQuotaLimit) {
      resourceScheduler.setApiQuotaLimit(engineConfig.apiQuotaLimit);
    }
    console.log(chalk.gray('  Resource Scheduler: Ready'));
  }

  // Initialize degradation manager
  if (engineConfig.enableGracefulDegradation) {
    console.log(chalk.gray('  Graceful Degradation: Ready'));
  }

  // Initialize task templating
  if (engineConfig.enableTemplating) {
    await taskTemplateManager.init();
    console.log(chalk.gray(`  Templates: ${taskTemplateManager.getTemplateCount()} loaded`));
  }

  // Initialize profiler
  if (engineConfig.enableProfiling) {
    console.log(chalk.gray('  Execution Profiler: Ready'));
  }

  engineInitialized = true;
  console.log(chalk.green('[ExecutionEngine] Ready'));
}

/**
 * Get execution engine status
 */
export function getExecutionEngineStatus(): {
  initialized: boolean;
  config: ExecutionEngineConfig;
  degradation: ReturnType<typeof degradationManager.getStatus>;
  resources: ReturnType<typeof resourceScheduler.getState>;
  profiling: ReturnType<typeof executionProfiler.getStats>;
  templates: number;
} {
  return {
    initialized: engineInitialized,
    config: engineConfig,
    degradation: degradationManager.getStatus(),
    resources: resourceScheduler.getState(),
    profiling: executionProfiler.getStats(),
    templates: taskTemplateManager.getTemplateCount(),
  };
}

/**
 * Reset execution engine
 */
export function resetExecutionEngine(): void {
  degradationManager.reset();
  resourceScheduler.resetQuota();
  resourceScheduler.clearQueue();
  executionProfiler.clear();

  console.log(chalk.cyan('[ExecutionEngine] Reset completed'));
}

/**
 * Print execution engine status
 */
export function printExecutionEngineStatus(): void {
  const status = getExecutionEngineStatus();

  console.log(chalk.cyan('\n[EXECUTION ENGINE STATUS]'));
  console.log(chalk.gray('-'.repeat(50)));

  console.log(`Initialized: ${status.initialized ? chalk.green('Yes') : chalk.red('No')}`);

  console.log(chalk.gray('\nDegradation:'));
  console.log(`  Level: ${status.degradation.level}`);
  console.log(`  Failures: ${status.degradation.failureCount}`);
  console.log(`  Recovery Attempts: ${status.degradation.recoveryAttempts}`);

  console.log(chalk.gray('\nResources:'));
  console.log(
    `  Active Tasks: ${status.resources.activeTasks}/${status.resources.maxConcurrentTasks}`,
  );
  console.log(
    `  API Quota: ${status.resources.apiQuotaRemaining}/${status.resources.apiQuotaLimit}`,
  );
  console.log(`  Memory: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`);

  console.log(chalk.gray('\nProfiling:'));
  console.log(`  Total Tasks: ${status.profiling.totalTasks}`);
  console.log(`  Success Rate: ${(status.profiling.successRate * 100).toFixed(1)}%`);
  console.log(`  Avg Duration: ${(status.profiling.avgDuration / 1000).toFixed(2)}s`);

  console.log(chalk.gray('\nTemplates:'));
  console.log(`  Loaded: ${status.templates}`);
}

/**
 * Check if engine is ready to execute
 */
export function isEngineReady(): boolean {
  if (!engineInitialized) return false;
  if (degradationManager.isOffline()) return false;

  const recommendation = resourceScheduler.getRecommendation();
  if (recommendation.shouldPause) return false;

  return true;
}

/**
 * Get engine health status
 */
export function getEngineHealth(): {
  healthy: boolean;
  issues: string[];
  recommendation: string;
} {
  const issues: string[] = [];

  if (!engineInitialized) {
    issues.push('Engine not initialized');
  }

  if (degradationManager.isDegraded()) {
    issues.push(`Degraded to ${degradationManager.getCurrentLevel()} mode`);
  }

  const resources = resourceScheduler.getState();
  if (resources.apiQuotaRemaining < resources.apiQuotaLimit * 0.1) {
    issues.push('API quota critically low');
  }

  if (resourceScheduler.isUnderPressure()) {
    issues.push('System under resource pressure');
  }

  const stats = executionProfiler.getStats();
  if (stats.totalTasks > 0 && stats.successRate < 0.5) {
    issues.push('Low success rate detected');
  }

  let recommendation = 'System operating normally';
  if (issues.length > 0) {
    if (issues.some((i) => i.includes('quota'))) {
      recommendation = 'Consider reducing concurrency or waiting for quota reset';
    } else if (issues.some((i) => i.includes('Degraded'))) {
      recommendation = 'System has auto-degraded, will recover after successful operations';
    } else if (issues.some((i) => i.includes('pressure'))) {
      recommendation = 'Reduce workload or increase resources';
    } else {
      recommendation = 'Initialize engine before executing tasks';
    }
  }

  return {
    healthy: issues.length === 0,
    issues,
    recommendation,
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Initialization
  initExecutionEngine,
  getExecutionEngineStatus,
  resetExecutionEngine,
  printExecutionEngineStatus,
  isEngineReady,
  getEngineHealth,

  // Managers (Feature #16-20)
  resourceScheduler,
  degradationManager,
  taskTemplateManager,
  executionProfiler,
};
