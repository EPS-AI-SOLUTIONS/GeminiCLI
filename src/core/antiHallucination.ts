/**
 * Anti-Hallucination Pipeline - Central Export Module
 *
 * GeminiHydra Anti-Hallucination System
 *
 * This module exports all anti-hallucination components (Solutions 1-30) and provides
 * a convenience function to initialize the complete anti-hallucination pipeline.
 *
 * Components included:
 * - PromptAudit (Solution 2): Tracks prompt transformations and drift
 * - HallucinationDetector (Solution 10): Pattern-based hallucination detection
 * - GenericNameDetector (Solution 14): Detects generic/placeholder names
 * - TemperatureController (Solution 21): Task-aware temperature management
 * - ResponseDeduplicator (Solution 22): Prevents duplicate responses
 * - FactualGrounding (Solution 23): Validates claims against context
 * - TaskScopeLimiter (Solution 24): Prevents scope creep
 * - AntiCreativityMode (Solution 25): Forces strict factual reporting
 * - ResultHashVerifier (Solution 26): Cryptographic result integrity
 * - PromptInjectionDetector (Solution 27): Detects prompt injection attacks
 * - OutputSanitizer (Solution 28): Sanitizes agent outputs
 * - AgentMemoryIsolation (Solution 29): Prevents memory leakage between tasks
 * - FinalReportValidator (Solution 30): Validates final synthesis reports
 *
 * @module antiHallucination
 */

// =============================================================================
// SOLUTION 2: PROMPT AUDIT
// =============================================================================

export {
  PromptAuditTrail,
  promptAudit,
  type PromptTransformation
} from './PromptAudit.js';

// =============================================================================
// SOLUTION 10: HALLUCINATION DETECTOR
// =============================================================================

export {
  detectHallucinations,
  logHallucinationResults,
  quickHallucinationCheck,
  HALLUCINATION_PATTERNS,
  type HallucinationCheck,
  type HallucinationResult
} from './HallucinationDetector.js';

// =============================================================================
// SOLUTION 14: GENERIC NAME DETECTOR
// =============================================================================

export {
  detectGenericNames,
  logGenericNameResults,
  hasGenericNames,
  type GenericNameMatch,
  type GenericNameResult
} from './GenericNameDetector.js';

// =============================================================================
// SOLUTION 21: TEMPERATURE CONTROLLER
// =============================================================================

export {
  TemperatureController,
  getPhaseTemperatureController,
  initializePhaseTemperatureController,
  resetPhaseTemperatureController,
  getOptimalTemp,
  analyzeAndGetTemp,
  detectControllerTaskType,
  DEFAULT_TASK_TYPE_RANGES,
  DEFAULT_PHASE_TEMPERATURES,
  DEFAULT_CONFIG as TEMPERATURE_DEFAULT_CONFIG,
  type ControllerTaskType,
  type ExecutionPhase,
  type TemperatureControllerConfig,
  type TemperatureResult
} from './TemperatureController.js';

// =============================================================================
// SOLUTION 22: RESPONSE DEDUPLICATOR
// =============================================================================

export {
  ResponseDeduplicator,
  responseDeduplicator,
  isLikelyDuplicate,
  addAndWarn,
  getDeduplicationSummary,
  type DeduplicationResult,
  type DeduplicatorConfig
} from './ResponseDeduplicator.js';

// =============================================================================
// SOLUTION 23: FACTUAL GROUNDING
// =============================================================================

export {
  FactualGroundingChecker,
  factualGroundingChecker,
  validateGrounding,
  analyzeGrounding,
  type GroundingResult,
  type ClaimAnalysis,
  type ClaimType,
  type GroundingCheckerOptions,
  type ClaimPattern
} from './FactualGrounding.js';

// =============================================================================
// SOLUTION 24: TASK SCOPE LIMITER - DISABLED
// =============================================================================

// DISABLED: TaskScopeLimiter removed - causes false positives
// export {
//   TaskScopeLimiter,
//   taskScopeLimiter,
//   defineTaskScope,
//   checkViolation,
//   checkFileAccess,
//   checkCommand,
//   detectCreep,
//   type TaskScope,
//   type ScopeViolationResult,
//   type TaskScopeLimiterConfig
// } from './TaskScopeLimiter.js';

// =============================================================================
// SOLUTION 25: ANTI-CREATIVITY MODE
// =============================================================================

export {
  AntiCreativityMode,
  antiCreativityMode,
  shouldEnableAntiCreativity,
  wrapPromptWithAntiCreativity,
  validateFactualResponse,
  quickFactualCheck,
  analyzeTaskForAntiCreativity,
  conditionalAntiCreativityWrap,
  ANTI_CREATIVITY_TRIGGERS,
  CREATIVITY_VIOLATION_PATTERNS,
  type AntiCreativityPattern,
  type AntiCreativityAnalysis,
  type FactualValidationResult,
  type FactualViolation
} from './AntiCreativityMode.js';

// =============================================================================
// SOLUTION 26: RESULT HASH VERIFIER
// =============================================================================

export {
  ResultHashVerifier,
  resultHashVerifier,
  hashTaskResult,
  storeTaskHash,
  verifyTaskIntegrity,
  logVerificationResult,
  type HashMetadata,
  type HashEntry,
  type IntegrityResult,
  type ChainVerificationResult,
  type BatchVerificationResult
} from './ResultHashVerifier.js';

// =============================================================================
// SOLUTION 27: PROMPT INJECTION DETECTOR
// =============================================================================

export {
  PromptInjectionDetector,
  promptInjectionDetector,
  detectInjection,
  sanitizeInjection,
  isContentSafe,
  processAgentResponse,
  type InjectionSeverity,
  type InjectionResult,
  type InjectionDetail,
  type InjectionType,
  type DetectorConfig as InjectionDetectorConfig
} from './PromptInjectionDetector.js';

// =============================================================================
// SOLUTION 28: OUTPUT SANITIZER
// =============================================================================

export {
  OutputSanitizer,
  outputSanitizer,
  sanitizeOutput,
  hasSuspiciousPatterns,
  sanitizeMultipleOutputs,
  logSanitizationResults,
  type SanitizeOptions,
  type SanitizedOutput,
  type SanitizationStats
} from './OutputSanitizer.js';

// =============================================================================
// SOLUTION 29: AGENT MEMORY ISOLATION
// =============================================================================

export {
  AgentMemoryIsolation,
  getAgentMemoryIsolation,
  initializeAgentMemoryIsolation,
  type IsolatedContext,
  type ContextLeakResult,
  type MemoryEntry
} from './AgentMemoryIsolation.js';

// =============================================================================
// SOLUTION 30: FINAL REPORT VALIDATOR
// =============================================================================

export {
  FinalReportValidator,
  finalReportValidator,
  validateFinalReport,
  isReportValid,
  type ValidationSeverity,
  type ValidationIssueType,
  type ValidationIssue,
  type ValidationResult,
  type ValidationStats
} from './FinalReportValidator.js';

// =============================================================================
// ANTI-HALLUCINATION PIPELINE
// =============================================================================

import { PromptAuditTrail } from './PromptAudit.js';
import { TemperatureController } from './TemperatureController.js';
import { ResponseDeduplicator } from './ResponseDeduplicator.js';
import { FactualGroundingChecker } from './FactualGrounding.js';
// DISABLED: import { TaskScopeLimiter } from './TaskScopeLimiter.js';
import { AntiCreativityMode } from './AntiCreativityMode.js';
import { ResultHashVerifier } from './ResultHashVerifier.js';
import { PromptInjectionDetector } from './PromptInjectionDetector.js';
import { OutputSanitizer } from './OutputSanitizer.js';
import { AgentMemoryIsolation } from './AgentMemoryIsolation.js';
import { FinalReportValidator } from './FinalReportValidator.js';

/**
 * Configuration options for the anti-hallucination pipeline
 */
export interface AntiHallucinationPipelineConfig {
  /** Enable verbose logging for all components */
  verbose?: boolean;

  /** Strictness level for anti-creativity mode (0.5 = lenient, 1.5 = strict) */
  antiCreativityStrictness?: number;

  /** Minimum grounding score to pass validation (0.0 - 1.0) */
  minGroundingScore?: number;

  /** Response deduplication similarity threshold (0.0 - 1.0) */
  deduplicationThreshold?: number;

  /** Enable hash verification for results */
  enableHashVerification?: boolean;

  /** Enable prompt injection detection */
  enableInjectionDetection?: boolean;

  /** Enable memory isolation between agents */
  enableMemoryIsolation?: boolean;

  /** Expiration time for isolated contexts in milliseconds */
  contextExpirationMs?: number;
}

/**
 * Complete anti-hallucination pipeline with all initialized modules
 */
export interface AntiHallucinationPipeline {
  /** Solution 2: Prompt transformation tracking */
  promptAudit: PromptAuditTrail;

  /** Solution 21: Temperature control for task types */
  temperatureController: TemperatureController;

  /** Solution 22: Response deduplication */
  responseDeduplicator: ResponseDeduplicator;

  /** Solution 23: Factual grounding validation */
  factualGrounding: FactualGroundingChecker;

  /** Solution 24: Task scope limitation - DISABLED */
  // taskScopeLimiter: TaskScopeLimiter;

  /** Solution 25: Anti-creativity mode enforcement */
  antiCreativityMode: AntiCreativityMode;

  /** Solution 26: Result hash verification */
  resultHashVerifier: ResultHashVerifier;

  /** Solution 27: Prompt injection detection */
  promptInjectionDetector: PromptInjectionDetector;

  /** Solution 28: Output sanitization */
  outputSanitizer: OutputSanitizer;

  /** Solution 29: Agent memory isolation */
  agentMemoryIsolation: AgentMemoryIsolation;

  /** Solution 30: Final report validation */
  finalReportValidator: FinalReportValidator;

  /** Configuration used to create this pipeline */
  config: Required<AntiHallucinationPipelineConfig>;

  /** Reset all pipeline components to their initial state */
  reset: () => void;

  /** Get statistics from all components */
  getStats: () => PipelineStats;
}

/**
 * Aggregated statistics from all pipeline components
 */
export interface PipelineStats {
  promptAudit: {
    transformations: number;
    totalDrift: number;
  };
  deduplication: {
    totalResponses: number;
    duplicatesFound: number;
  };
  hashVerification: {
    totalTasks: number;
    totalHashes: number;
  };
  memoryIsolation: {
    activeContexts: number;
    totalContextsCreated: number;
  };
}

/**
 * Default configuration for the anti-hallucination pipeline
 */
const DEFAULT_PIPELINE_CONFIG: Required<AntiHallucinationPipelineConfig> = {
  verbose: false,
  antiCreativityStrictness: 1.0,
  minGroundingScore: 0.7,
  deduplicationThreshold: 0.8,
  enableHashVerification: true,
  enableInjectionDetection: true,
  enableMemoryIsolation: true,
  contextExpirationMs: 30 * 60 * 1000, // 30 minutes
};

/**
 * Creates and initializes a complete anti-hallucination pipeline
 *
 * This convenience function creates fresh instances of all anti-hallucination
 * modules with coordinated configuration. Use this for comprehensive protection
 * against hallucinations during swarm execution.
 *
 * @param config - Optional configuration overrides
 * @returns Fully initialized anti-hallucination pipeline
 *
 * @example
 * ```typescript
 * import { createAntiHallucinationPipeline } from './antiHallucination.js';
 *
 * // Create pipeline with default settings
 * const pipeline = createAntiHallucinationPipeline();
 *
 * // Or with custom configuration
 * const strictPipeline = createAntiHallucinationPipeline({
 *   verbose: true,
 *   antiCreativityStrictness: 1.5,
 *   minGroundingScore: 0.8
 * });
 *
 * // Use components
 * pipeline.promptAudit.initialize(userPrompt);
 * const temp = pipeline.temperatureController.getOptimalTemperature('code-generation', 'B');
 *
 * // Check for hallucinations
 * const grounding = pipeline.factualGrounding.checkGrounding(response, context);
 * if (!grounding.isGrounded) {
 *   console.warn('Potential hallucination detected');
 * }
 *
 * // Validate final report
 * const validation = pipeline.finalReportValidator.validate(report, objective, agentResults);
 *
 * // Reset all components for new session
 * pipeline.reset();
 * ```
 */
export function createAntiHallucinationPipeline(
  config: AntiHallucinationPipelineConfig = {}
): AntiHallucinationPipeline {
  // Merge with defaults
  const mergedConfig: Required<AntiHallucinationPipelineConfig> = {
    ...DEFAULT_PIPELINE_CONFIG,
    ...config
  };

  // Initialize all components with coordinated configuration
  const promptAudit = new PromptAuditTrail();

  const temperatureController = new TemperatureController({
    enableAutoDetection: true,
    enablePhaseAdjustment: true
  });

  const responseDeduplicator = new ResponseDeduplicator({
    similarityThreshold: mergedConfig.deduplicationThreshold,
    normalizeWhitespace: true,
    ignoreCase: true
  });

  const factualGrounding = new FactualGroundingChecker({
    minGroundingScore: mergedConfig.minGroundingScore,
    includeDetails: true,
    debug: mergedConfig.verbose
  });

  // DISABLED: TaskScopeLimiter causes false positives
  // const taskScopeLimiter = new TaskScopeLimiter({
  //   verboseLogging: mergedConfig.verbose
  // });

  const antiCreativityMode = new AntiCreativityMode({
    strictnessLevel: mergedConfig.antiCreativityStrictness,
    logViolations: mergedConfig.verbose
  });

  const resultHashVerifier = new ResultHashVerifier(mergedConfig.verbose);

  const promptInjectionDetector = new PromptInjectionDetector({
    logDetections: mergedConfig.verbose
  });

  const outputSanitizer = new OutputSanitizer({
    verbose: mergedConfig.verbose
  });

  const agentMemoryIsolation = new AgentMemoryIsolation();

  const finalReportValidator = new FinalReportValidator({
    verbose: mergedConfig.verbose
  });

  // Create the pipeline object
  const pipeline: AntiHallucinationPipeline = {
    promptAudit,
    temperatureController,
    responseDeduplicator,
    factualGrounding,
    // taskScopeLimiter, // DISABLED
    antiCreativityMode,
    resultHashVerifier,
    promptInjectionDetector,
    outputSanitizer,
    agentMemoryIsolation,
    finalReportValidator,
    config: mergedConfig,

    reset: () => {
      // Reset PromptAudit
      promptAudit.initialize('');

      // Reset ResponseDeduplicator
      responseDeduplicator.clear();

      // Reset FactualGrounding
      factualGrounding.clearIndex();

      // Reset AntiCreativityMode
      antiCreativityMode.disable();

      // Reset ResultHashVerifier
      resultHashVerifier.clear();

      // Reset AgentMemoryIsolation
      agentMemoryIsolation.clearAllContexts();

      // Note: TemperatureController, TaskScopeLimiter, PromptInjectionDetector,
      // OutputSanitizer, and FinalReportValidator don't have explicit reset methods
      // They can be reused without reset or recreated if needed
    },

    getStats: (): PipelineStats => {
      const dedupeStats = responseDeduplicator.getStats();
      const hashStats = resultHashVerifier.getStats();
      const memoryStats = agentMemoryIsolation.getStats();

      return {
        promptAudit: {
          transformations: promptAudit.getAuditTrail().length,
          totalDrift: promptAudit.getTotalDrift()
        },
        deduplication: {
          totalResponses: dedupeStats.totalResponses,
          duplicatesFound: dedupeStats.duplicatesFound
        },
        hashVerification: {
          totalTasks: hashStats.totalTasks,
          totalHashes: hashStats.totalHashes
        },
        memoryIsolation: {
          activeContexts: memoryStats.activeContexts,
          totalContextsCreated: memoryStats.contextsCreated
        }
      };
    }
  };

  return pipeline;
}

/**
 * Global singleton pipeline instance for convenience
 * Created lazily on first access
 */
let globalPipeline: AntiHallucinationPipeline | null = null;

/**
 * Get or create the global anti-hallucination pipeline
 * Uses default configuration unless explicitly initialized
 */
export function getAntiHallucinationPipeline(): AntiHallucinationPipeline {
  if (!globalPipeline) {
    globalPipeline = createAntiHallucinationPipeline();
  }
  return globalPipeline;
}

/**
 * Initialize the global pipeline with custom configuration
 * Replaces any existing global pipeline
 */
export function initializeAntiHallucinationPipeline(
  config?: AntiHallucinationPipelineConfig
): AntiHallucinationPipeline {
  globalPipeline = createAntiHallucinationPipeline(config);
  return globalPipeline;
}

/**
 * Reset the global pipeline to its initial state
 */
export function resetAntiHallucinationPipeline(): void {
  if (globalPipeline) {
    globalPipeline.reset();
  }
}

// =============================================================================
// CONVENIENCE VALIDATORS
// =============================================================================

/**
 * Quick comprehensive hallucination check for a response
 * Runs through multiple detectors and returns combined result
 *
 * @param response - The response to validate
 * @param context - Available context for grounding check
 * @returns Combined validation result
 */
export function quickHallucinationValidation(
  response: string,
  context: string[] = []
): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  // Import functions dynamically to avoid circular dependencies
  const { detectHallucinations } = require('./HallucinationDetector.js');
  const { detectGenericNames } = require('./GenericNameDetector.js');
  const { validateGrounding } = require('./FactualGrounding.js');
  const { quickFactualCheck } = require('./AntiCreativityMode.js');
  const { isContentSafe } = require('./PromptInjectionDetector.js');

  const issues: string[] = [];
  let totalScore = 100;

  // Solution 10: Check for hallucination patterns
  const hallResult = detectHallucinations(response);
  if (hallResult.hasHallucinations) {
    issues.push(`Hallucination patterns detected (score: ${hallResult.totalScore})`);
    totalScore -= hallResult.totalScore * 0.3;
  }

  // Solution 14: Check for generic names
  const nameResult = detectGenericNames(response);
  if (nameResult.hasGenericNames) {
    issues.push(`Generic names found: ${nameResult.matches.map((m: { name: string }) => m.name).join(', ')}`);
    totalScore -= nameResult.score * 0.2;
  }

  // Solution 23: Check factual grounding (if context provided)
  if (context.length > 0) {
    const isGrounded = validateGrounding(response, context);
    if (!isGrounded) {
      issues.push('Response lacks factual grounding in context');
      totalScore -= 20;
    }
  }

  // Solution 25: Check for creative/speculative language
  if (!quickFactualCheck(response)) {
    issues.push('Response contains speculative or creative language');
    totalScore -= 15;
  }

  // Solution 27: Check for injection patterns (isContentSafe returns true if safe)
  if (!isContentSafe(response)) {
    issues.push('Potential prompt injection detected');
    totalScore -= 30;
  }

  return {
    isValid: totalScore >= 60 && issues.length < 3,
    issues,
    score: Math.max(0, Math.round(totalScore))
  };
}

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

export default {
  // Factory functions
  createAntiHallucinationPipeline,
  getAntiHallucinationPipeline,
  initializeAntiHallucinationPipeline,
  resetAntiHallucinationPipeline,

  // Quick validators
  quickHallucinationValidation
};
