/**
 * @deprecated Import directly from './intelligence/SelfReflection.js' instead.
 *
 * SelfReflection - Re-export from consolidated intelligence module
 *
 * This file re-exports the consolidated SelfReflection implementation
 * from src/core/intelligence/SelfReflection.ts for backward compatibility.
 */

// Default export
export {
  clearReflexionMemory,
  default,
  type EvaluationResult,
  findBestCheckpoint,
  // Utility functions
  getReflexionStats,
  learnFromFailure,
  type ReflectionConfig,
  type ReflectionCriteria,
  // Types
  type ReflectionResult,
  type ReflexionLesson,
  type ReflexionMemory,
  type ReflexionOptions,
  type ReflexionResult,
  // Main functions
  reflexionLoop,
  // Memory manager
  reflexionMemory,
  // Class
  SelfReflectionEngine,
  selfEvaluate,
  selfReflect,
  // Singleton
  selfReflection,
  type TrajectoryCheckpoint,
} from './intelligence/SelfReflection.js';
