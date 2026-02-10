/**
 * Agent - Type definitions and interfaces
 *
 * Adaptive temperature system types, task types, and complexity levels.
 *
 * CANONICAL DEFINITIONS:
 * - TaskType: Agent temperature task categories (code|fix|analysis|creative|planning|general)
 * - TaskComplexity: Task complexity for model routing (trivial|simple|medium|complex|critical)
 *
 * NOTE: MetaPrompting has a separate `MetaPromptingTaskType` for prompt classification.
 * See: core/intelligence/metaprompting/types.ts
 *
 * @module core/agent/types
 */

// ============================================================================
// TASK TYPES AND COMPLEXITY (Canonical definitions)
// ============================================================================

/**
 * Task types for adaptive temperature system.
 * Used by TemperatureController to select optimal temperature per task category.
 *
 * NOT to be confused with MetaPromptingTaskType (prompt classification).
 */
export type TaskType = 'code' | 'fix' | 'analysis' | 'creative' | 'planning' | 'general';

/**
 * Task complexity levels for model routing.
 * Used by classifyTaskComplexity() and selectModelForComplexity().
 * Also re-exported from core/models/ModelSelection.ts for backwards compatibility.
 */
export type TaskComplexity = 'trivial' | 'simple' | 'medium' | 'complex' | 'critical';

/** All valid TaskComplexity values as a const array for runtime validation (#18) */
export const TASK_COMPLEXITY_LEVELS = [
  'trivial',
  'simple',
  'medium',
  'complex',
  'critical',
] as const;

/** All valid TaskType values as a const array for runtime validation (#18) */
export const TASK_TYPES = ['code', 'fix', 'analysis', 'creative', 'planning', 'general'] as const;

/**
 * Type guard: checks if a string is a valid TaskComplexity at runtime.
 * TYPE SAFETY FIX (#18): Use this before any `as TaskComplexity` cast.
 */
export function isTaskComplexity(value: string): value is TaskComplexity {
  return (TASK_COMPLEXITY_LEVELS as readonly string[]).includes(value);
}

/**
 * Type guard: checks if a string is a valid TaskType at runtime.
 * TYPE SAFETY FIX (#18): Use this before any `as TaskType` cast.
 */
export function isTaskType(value: string): value is TaskType {
  return (TASK_TYPES as readonly string[]).includes(value);
}

/**
 * Safely resolve a string to TaskComplexity with fallback.
 */
export function resolveTaskComplexity(
  value: string | undefined,
  fallback: TaskComplexity = 'medium',
): TaskComplexity {
  if (!value) return fallback;
  const normalized = value.toLowerCase().trim();
  return isTaskComplexity(normalized) ? normalized : fallback;
}

// ============================================================================
// ADAPTIVE TEMPERATURE SYSTEM INTERFACES
// ============================================================================

/**
 * Configuration for adaptive temperature system
 */
export interface AdaptiveTemperatureConfig {
  // Per-agent temperature profiles
  agentProfiles: Record<string, AgentTemperatureProfile>;

  // Global settings
  enableDynamicAdjustment: boolean;
  enableAnnealing: boolean;
  enableContextAwareness: boolean;
  enableUncertaintyBoost: boolean;
  enableLearning: boolean;

  // Annealing settings
  annealingRate: number; // How fast temperature decreases (0.01 - 0.1)
  annealingMinTemp: number; // Minimum temperature floor (0.05 - 0.2)

  // Uncertainty settings
  uncertaintyBoostFactor: number; // How much to boost temp when uncertain (1.1 - 1.5)
  uncertaintyThreshold: number; // Confidence threshold below which to boost (0.0 - 1.0)

  // Learning settings
  learningRate: number; // How fast to adjust from results (0.01 - 0.2)
  historySize: number; // Number of past results to consider
}

/**
 * Per-agent temperature profile
 */
export interface AgentTemperatureProfile {
  name: string;
  role: string;

  // Base temperature ranges per task type
  baseRanges: Record<TaskType, [number, number]>;

  // Agent-specific modifiers
  creativityBias: number; // -0.2 to +0.2 - adjust for creative agents
  precisionBias: number; // -0.2 to +0.2 - adjust for precise agents

  // Preferred temperature for this agent's primary function
  preferredTemp: number;

  // Historical performance
  performanceHistory: TemperaturePerformanceRecord[];
}

/**
 * Record of temperature vs performance for learning
 */
export interface TemperaturePerformanceRecord {
  timestamp: number;
  temperature: number;
  taskType: TaskType;
  qualityScore: number; // 0.0 - 1.0
  responseTime: number; // milliseconds
  wasSuccessful: boolean;
}

/**
 * Context for current generation session
 */
export interface TemperatureContext {
  agentName: string;
  taskType: TaskType;
  task: string;

  // Progress tracking for annealing
  generationProgress: number; // 0.0 - 1.0
  currentStep: number;
  totalSteps: number;

  // Previous results for context awareness
  previousResults: Array<{
    temperature: number;
    quality: number;
    wasSuccessful: boolean;
  }>;

  // Uncertainty indicators
  confidenceLevel: number; // 0.0 - 1.0
  retryCount: number;
  errorCount: number;
}

/**
 * Options for Agent.think() method
 */
export interface ThinkOptions {
  /** Timeout in milliseconds (default: 60000 = 60s) */
  timeout?: number;
  /** AbortSignal for external cancellation */
  signal?: AbortSignal;
}
