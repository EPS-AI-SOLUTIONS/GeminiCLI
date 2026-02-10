/**
 * GeminiHydra - Temperature Configuration Module
 *
 * Centralizes all temperature-related constants and presets used throughout
 * the application. This eliminates hardcoded temperature values and provides
 * a single source of truth for temperature configuration.
 */

// =============================================================================
// TEMPERATURE PRESETS
// =============================================================================

/**
 * Core temperature presets for different operation types.
 * These are the foundational values used across the codebase.
 *
 * GEMINI 3 OPTIMIZATION (2026):
 * - Gemini 3 recommends temperature 1.0 as default (not lower!)
 * - Lowering temperature below 1.0 may cause looping/degraded performance
 * - Range is 0.0-2.0, with 1.0-1.5 being optimal for balanced output
 * - Higher values (1.5-2.0) for creative/diverse outputs
 */
export const TEMPERATURE_PRESETS = {
  /** 0.7 - For deterministic, reproducible outputs (Gemini 3 safe minimum) */
  DETERMINISTIC: 0.7,

  /** 0.8 - For high-precision tasks (classification, parsing, analysis) */
  PRECISE: 0.8,

  /** 0.9 - For focused generation (code review, security scanning) */
  FOCUSED: 0.9,

  /** 1.0 - Default for reasoning chains (Gemini 3 recommended default) */
  REASONING: 1.0,

  /** 1.0 - For balanced tasks (documentation, commit messages) */
  BALANCED: 1.0,

  /** 1.2 - For moderately creative tasks (multi-perspective analysis) */
  MODERATE: 1.2,

  /** 1.5 - For creative tasks (content generation) */
  CREATIVE: 1.5,

  /** 1.8 - For highly creative tasks (brainstorming) */
  EXPERIMENTAL: 1.8,
} as const;

export type TemperaturePreset = keyof typeof TEMPERATURE_PRESETS;

// =============================================================================
// TASK-SPECIFIC TEMPERATURES
// =============================================================================

/**
 * Temperature settings by task category.
 * Maps task types to their optimal temperature settings.
 *
 * GEMINI 3 NOTE: All values adjusted upward to respect Gemini 3's
 * recommendation of 1.0 as default. Creative tasks use higher values.
 */
export const TASK_TEMPERATURES = {
  // Code-related tasks (slightly below default for precision)
  code_review: TEMPERATURE_PRESETS.FOCUSED,
  code_generation: TEMPERATURE_PRESETS.REASONING,
  refactoring: TEMPERATURE_PRESETS.FOCUSED,
  bug_fixing: TEMPERATURE_PRESETS.FOCUSED,
  security_scan: TEMPERATURE_PRESETS.PRECISE,

  // Analysis tasks (use default for balanced analysis)
  classification: TEMPERATURE_PRESETS.PRECISE,
  parsing: TEMPERATURE_PRESETS.PRECISE,
  scoring: TEMPERATURE_PRESETS.FOCUSED,
  performance_analysis: TEMPERATURE_PRESETS.FOCUSED,

  // Documentation tasks (balanced to creative)
  documentation: TEMPERATURE_PRESETS.BALANCED,
  commit_message: TEMPERATURE_PRESETS.BALANCED,
  summary: TEMPERATURE_PRESETS.BALANCED,

  // Reasoning tasks (default to moderate for creative thinking)
  chain_of_thought: TEMPERATURE_PRESETS.REASONING,
  self_reflection: TEMPERATURE_PRESETS.BALANCED,
  meta_prompting: TEMPERATURE_PRESETS.MODERATE,
  analogical_reasoning: TEMPERATURE_PRESETS.MODERATE,
  multi_perspective: TEMPERATURE_PRESETS.CREATIVE,

  // Knowledge tasks (balanced for synthesis)
  knowledge_extraction: TEMPERATURE_PRESETS.BALANCED,
  knowledge_synthesis: TEMPERATURE_PRESETS.MODERATE,

  // Creative tasks (high temperature for diverse outputs)
  creative_writing: TEMPERATURE_PRESETS.CREATIVE,
  brainstorming: TEMPERATURE_PRESETS.EXPERIMENTAL,

  // Default (Gemini 3 recommended)
  default: TEMPERATURE_PRESETS.BALANCED,
} as const;

export type TaskType = keyof typeof TASK_TEMPERATURES;

// =============================================================================
// AGENT TEMPERATURE PROFILES
// =============================================================================

/**
 * Base temperature ranges for different operation categories.
 * Used by the adaptive temperature system.
 *
 * GEMINI 3 OPTIMIZED: Ranges shifted upward to align with
 * Gemini 3's recommendation of 1.0 default temperature.
 */
export const TEMPERATURE_RANGES = {
  code: { min: 0.8, max: 1.1 },
  analysis: { min: 0.8, max: 1.2 },
  creative: { min: 1.3, max: 1.9 },
  planning: { min: 0.9, max: 1.2 },
  research: { min: 1.0, max: 1.4 },
} as const;

export type TemperatureRange = (typeof TEMPERATURE_RANGES)[keyof typeof TEMPERATURE_RANGES];

// =============================================================================
// MODEL TEMPERATURE DEFAULTS
// =============================================================================

/**
 * Default temperatures for different model tiers.
 *
 * GEMINI 3 OPTIMIZED: All tiers use 1.0+ for optimal performance.
 * Local models (Ollama) can use lower temperatures as they have
 * different characteristics than Gemini 3.
 */
export const MODEL_TEMPERATURES = {
  flagship: 1.0, // Gemini 3 recommended default
  first_officer: 1.0, // Same as flagship for consistency
  fast_scout: 1.1, // Slightly higher for faster exploration
  last_resort: 1.2, // Higher for fallback diversity
  local: 0.7, // Local models (Ollama) - lower is OK
} as const;

// =============================================================================
// TEMPERATURE ADJUSTMENT FACTORS
// =============================================================================

/**
 * Factors for adjusting temperature dynamically.
 *
 * GEMINI 3 OPTIMIZED: Increased adjustment factors and max temp
 * to leverage full 0-2.0 temperature range.
 */
export const TEMPERATURE_ADJUSTMENTS = {
  /** How much to reduce temperature for complex tasks */
  complexity_reduction: 0.1,

  /** How much to increase temperature per retry */
  retry_increment: 0.1,

  /** Maximum temperature increment per pass in iterative refinement */
  pass_increment: 0.1,

  /** Blending factor for optimal temperature calculation */
  optimal_blend_current: 0.7,
  optimal_blend_target: 0.3,

  /** Safety margin for temperature capping (Gemini 3 max is 2.0) */
  max_adjusted_temp: 1.8,
} as const;

// =============================================================================
// ANNEALING CONFIGURATION
// =============================================================================

/**
 * Parameters for temperature annealing (simulated annealing pattern).
 *
 * GEMINI 3 OPTIMIZED: Floor values raised to respect Gemini 3's
 * recommendation against low temperatures.
 */
export const ANNEALING_CONFIG = {
  /** Rate at which temperature decreases (0.05 - 0.2) */
  rate_min: 0.05,
  rate_max: 0.2,
  rate_default: 0.1,

  /** Minimum temperature floor (0.7 - 1.0 for Gemini 3) */
  min_temp: 0.7,
  max_temp: 1.0,
  default_floor: 0.8,
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get temperature for a specific task type.
 */
export function getTemperatureForTask(taskType: TaskType): number {
  return TASK_TEMPERATURES[taskType] ?? TASK_TEMPERATURES.default;
}

/**
 * Get a temperature preset by name.
 */
export function getTemperaturePreset(preset: TemperaturePreset): number {
  return TEMPERATURE_PRESETS[preset];
}

/**
 * Clamp temperature to valid range (0.0 - 2.0).
 */
export function clampTemperature(temp: number): number {
  return Math.max(0.0, Math.min(2.0, temp));
}

/**
 * Calculate adjusted temperature for iterative refinement.
 *
 * @param baseTemp - Base temperature to start from
 * @param passIndex - Current pass index (0-based)
 * @param maxTemp - Maximum allowed temperature (default: 0.4)
 * @returns Adjusted temperature capped at maxTemp
 */
export function calculatePassTemperature(
  baseTemp: number,
  passIndex: number,
  maxTemp: number = TEMPERATURE_ADJUSTMENTS.max_adjusted_temp,
): number {
  const adjusted = baseTemp + passIndex * TEMPERATURE_ADJUSTMENTS.pass_increment;
  return Math.min(maxTemp, adjusted);
}

/**
 * Blend current temperature with optimal target.
 * Used for adaptive temperature adjustment.
 *
 * @param currentTemp - Current temperature
 * @param optimalTemp - Target optimal temperature
 * @returns Blended temperature value
 */
export function blendTemperature(currentTemp: number, optimalTemp: number): number {
  return (
    currentTemp * TEMPERATURE_ADJUSTMENTS.optimal_blend_current +
    optimalTemp * TEMPERATURE_ADJUSTMENTS.optimal_blend_target
  );
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  presets: TEMPERATURE_PRESETS,
  tasks: TASK_TEMPERATURES,
  ranges: TEMPERATURE_RANGES,
  models: MODEL_TEMPERATURES,
  adjustments: TEMPERATURE_ADJUSTMENTS,
  annealing: ANNEALING_CONFIG,
  getTemperatureForTask,
  getTemperaturePreset,
  clampTemperature,
  calculatePassTemperature,
  blendTemperature,
};
