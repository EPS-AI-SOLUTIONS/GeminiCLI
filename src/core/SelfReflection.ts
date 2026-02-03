/**
 * @deprecated Import directly from './intelligence/SelfReflection.js' instead.
 *
 * SelfReflection - Re-export from consolidated intelligence module
 *
 * This file re-exports the consolidated SelfReflection implementation
 * from src/core/intelligence/SelfReflection.ts for backward compatibility.
 */

export {
  // Types
  type ReflectionResult,
  type ReflectionConfig,
  type ReflectionCriteria,
  type ReflexionLesson,
  type TrajectoryCheckpoint,
  type EvaluationResult,
  type ReflexionMemory,
  type ReflexionResult,
  type ReflexionOptions,

  // Main functions
  reflexionLoop,
  selfReflect,
  selfEvaluate,
  learnFromFailure,
  findBestCheckpoint,

  // Utility functions
  getReflexionStats,
  clearReflexionMemory,

  // Memory manager
  reflexionMemory,

  // Class
  SelfReflectionEngine,

  // Singleton
  selfReflection
} from './intelligence/SelfReflection.js';

// Default export
export { default } from './intelligence/SelfReflection.js';
