/**
 * Core Module Exports - GeminiHydra
 *
 * Central export point for all core modules.
 * Uses selective exports to avoid naming conflicts.
 */

// =============================================================================
// CORE INFRASTRUCTURE
// =============================================================================

export * from './GeminiCLI.js';

// TrafficControl - export selectively to avoid RateLimiter conflict with SecuritySystem
export {
  Semaphore,
  geminiSemaphore,
  llamaSemaphore,
  withRetry
} from './TrafficControl.js';
// Note: RateLimiter from TrafficControl is NOT exported - use SecuritySystem.RateLimiter instead

export * from './StreamingOutput.js';
export * from './CircuitBreaker.js';

// RequestCache - export selectively to avoid CacheEntry conflict with intelligence modules
export {
  RequestCache,
  RequestDeduplicator,
  requestCache,
  requestDeduplicator,
  type CacheEntry,
  type CacheOptions
} from './RequestCache.js';

export * from './GracefulShutdown.js';
export * from './HotReload.js';
export * from './TokenBudget.js';

// ContextWindowManager - Solution 43: Context Window Management
// Manages context window size to prevent overflow and ensure relevant context
export {
  ContextWindowManager,
  contextWindowManager,
  type ContextEntry,
  type ContextStats,
  type ContextWindowConfig,
  type PruneResult
} from './ContextWindowManager.js';

// ResponseDeduplicator - Solution 22: Prevents agents from repeating same information
export {
  ResponseDeduplicator,
  responseDeduplicator,
  isLikelyDuplicate,
  addAndWarn,
  getDeduplicationSummary,
  type DeduplicationResult,
  type DeduplicatorConfig
} from './ResponseDeduplicator.js';
export * from './SecuritySystem.js';  // Primary RateLimiter export
export * from './PluginSystem.js';

// TaskPriority - export selectively to avoid PrioritizedTask conflict with ExecutionEngine
export {
  TaskPriorityQueue,
  taskQueue,
  detectPriority,
  prioritizeTasks,
  type Priority,
  type PrioritizedTask as TaskPriorityItem
} from './TaskPriority.js';

// =============================================================================
// PHASES & EXECUTION
// =============================================================================

export * from './PhasePreA.js';
export * from './PhaseC.js';
export * from './ExecutionEngine.js';  // Primary PrioritizedTask export

// =============================================================================
// AGENTS & SWARM
// =============================================================================

// Agent - export selectively to avoid TaskType conflict with intelligence/MetaPrompting
export {
  Agent,
  TemperatureController,
  getTemperatureController,
  initializeTemperatureController,
  getAdaptiveTemperature,
  getEnhancedAdaptiveTemperature,
  initializeGeminiModels,
  detectTaskType as detectAgentTaskType,  // Renamed to avoid conflict
  TaskType as AgentTaskType,               // Renamed to avoid conflict
  DIJKSTRA_CHAIN,
  MODEL_TIERS,
  classifyTaskComplexity,
  selectModelForComplexity,
  AGENT_PERSONAS,
  DEFAULT_AGENT_PROFILES,
  type AdaptiveTemperatureConfig,
  type AgentTemperatureProfile,
  type TemperaturePerformanceRecord,
  type TemperatureContext
} from './Agent.js';

export * from './Swarm.js';

// =============================================================================
// INTELLIGENCE & REASONING
// =============================================================================

// NOTE: IntelligenceLayer.ts is now a thin re-export shim pointing to intelligence/index.js
// For new code, import directly from './intelligence/index.js' instead

// ModelIntelligence - export selectively to avoid contextManager conflict
export {
  classifyComplexity,
  selectModelForTask,
  getFallbackChain,
  modelPerformance,
  promptCache,
  scoreResponseQuality,
  getConsensus,
  contextManager as modelContextManager,  // Renamed to avoid conflict with intelligence/ContextManager
  optimizePromptForModel,
  modelHealth,
  AGENT_FALLBACK_CHAINS,
  MODEL_PROMPT_CONFIGS,
  type TaskComplexity,
  type ModelSelectionResult,
  type FallbackChainEntry,
  type ModelMetrics,
  type QualityScore,
  type ConsensusResult,
  type ContextMessage,
  type ModelPromptConfig,
  type ModelHealth
} from './ModelIntelligence.js';

export * from './ConversationLayer.js';
export * from './PromptSystem.js';
export * from './GraphProcessor.js';

// Intelligence sub-modules (primary intelligence exports)
// This includes: chainOfThought, selfReflect, treeOfThoughts, semanticChunk, contextManager, etc.
export * from './intelligence/index.js';

// =============================================================================
// ADVANCED REASONING
// =============================================================================

// MetaPrompting from core/ - Advanced meta-prompting classes
export {
  MetaPrompter,
  AdvancedMetaPrompter,
  PromptTemplateLibrary,
  metaPrompter,
  advancedMetaPrompter,
  promptTemplateLibrary,
  quickOptimize,
  quickEvolve,
  quickCompress,
  quickABTest,
  type PromptOptimization,
  type MetaPromptingConfig,
  type EvolutionConfig,
  type ABTestResult,
  type CompressionResult,
  type DomainOptimizationResult,
  type PromptTemplate,
  type TemplateCategory,
  type RecursiveOptimizationResult,
  type DomainType
} from './MetaPrompting.js';

// PromptAudit - Prompt transformation audit trail
export { promptAudit, PromptAuditTrail, PromptTransformation } from './PromptAudit.js';

// Advanced Multi-Modal Support (use MultiModalSupport, MultiModal.ts is deprecated)
export * from './MultiModalSupport.js';

// NOTE: SelfReflection, TreeOfThoughts, SemanticChunking are exported from intelligence/index.js
// Do NOT export them here to avoid duplicates

// =============================================================================
// DEVELOPER TOOLS
// =============================================================================

export * from './DeveloperTools.js';

// =============================================================================
// LIVE LOGGER - Real-time verbose logging
// =============================================================================

export * from './LiveLogger.js';

// =============================================================================
// RESULT HASH VERIFIER - Solution 26: Cryptographic Result Integrity
// =============================================================================

// Cryptographic hash verification for detecting tampering and hallucination drift
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
// TEMPERATURE CONTROLLER - Solution 21: Anti-Hallucination Temperature Control
// =============================================================================

// Phase-aware temperature controller for anti-hallucination
export {
  TemperatureController as PhaseTemperatureController,  // Renamed to avoid conflict with Agent.ts
  getPhaseTemperatureController,
  initializePhaseTemperatureController,
  resetPhaseTemperatureController,
  getOptimalTemp,
  analyzeAndGetTemp,
  detectControllerTaskType,
  DEFAULT_TASK_TYPE_RANGES,
  DEFAULT_PHASE_TEMPERATURES,
  type ControllerTaskType,
  type ExecutionPhase,
  type TemperatureControllerConfig,
  type TemperatureResult
} from './TemperatureController.js';

// =============================================================================
// ANTI-CREATIVITY MODE - Solution 25: Strict Factual Reporting
// =============================================================================

// Forces agents into factual mode when dealing with existing code/files
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
// PROMPT INJECTION DETECTOR - Solution 27: Prompt Injection Detection
// =============================================================================

// Detects and blocks prompt injection attempts in agent responses
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
  type DetectorConfig,
  type InjectionPattern
} from './PromptInjectionDetector.js';

// =============================================================================
// OUTPUT SANITIZER - Solution 28: Output Sanitization
// =============================================================================

// Sanitizes all agent outputs before final report synthesis
export {
  OutputSanitizer,
  outputSanitizer,
  sanitizeOutput,
  hasSuspiciousPatterns,
  sanitizeMultipleOutputs,
  logSanitizationResults,
  UNKNOWN_NAME_MARKER,
  type SanitizeOptions,
  type SanitizedOutput,
  type SanitizationStats
} from './OutputSanitizer.js';

// =============================================================================
// AGENT MEMORY ISOLATION - Solution 29: Prevent Cross-Task Contamination
// =============================================================================

// Ensures agents don't hallucinate or leak context from previous tasks
export {
  AgentMemoryIsolation,
  getAgentMemoryIsolation,
  initializeAgentMemoryIsolation,
  LEAK_PATTERNS,
  type IsolatedContext,
  type ContextLeakResult,
  type MemoryEntry,
  type MemoryIsolationConfig
} from './AgentMemoryIsolation.js';

// =============================================================================
// TASK SCOPE LIMITER - Solution 24: DISABLED (causes false positives)
// =============================================================================

// DISABLED: TaskScopeLimiter removed - causes false positives with normal operations
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
//   type ScopeExecutionTracker,
//   type TaskScopeLimiterConfig
// } from './TaskScopeLimiter.js';

// =============================================================================
// FINAL REPORT VALIDATOR - Solution 30: Final Report Validation
// =============================================================================

// Comprehensive validation of synthesis reports before showing to user
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
// CITATION ENFORCER - Solution 36: Citation Enforcement
// =============================================================================

// Enforces proper citations [Zadanie #X] in final reports and detects hallucinations
export {
  CitationEnforcer,
  citationEnforcer,
  enforceCitations,
  addMissingCitations,
  hasProperCitations,
  logCitationResults,
  createSourcesFromResults,
  type Source,
  type EnforcementResult,
  type HallucinationDetail
} from './CitationEnforcer.js';

// =============================================================================
// CROSS-AGENT VALIDATOR - Solution 31: Multi-Agent Consensus Validation
// =============================================================================

// Validates that multiple agents agree on key facts before accepting them
export {
  CrossAgentValidator,
  crossAgentValidator,
  type ClaimType,
  type AgentClaim,
  type ConsensusResult as CrossAgentConsensusResult,  // Renamed to avoid conflict with ModelIntelligence
  type ValidationSummary as CrossAgentValidationSummary  // Renamed to avoid conflict
} from './CrossAgentValidator.js';

// =============================================================================
// EVIDENCE CHAIN TRACKER - Solution 33: Evidence Chain Tracking
// =============================================================================

// Tracks the chain of evidence for each claim made by agents
export {
  EvidenceChainTracker,
  evidenceChainTracker,
  startEvidenceChain,
  addEvidenceToChain,
  validateEvidenceChain,
  getTaskEvidenceTrustScore,
  createFileReadEvidence,
  createFileWriteEvidence,
  createCommandEvidence,
  createMcpCallEvidence,
  createAgentOutputEvidence,
  type EvidenceType,
  type Evidence,
  type ChainValidation,
  type ChainAnalysisDetails,
  type ClaimEvidenceStatus,
  type EvidenceChainTrackerConfig
} from './EvidenceChainTracker.js';

// =============================================================================
// SEMANTIC SIMILARITY - Solution 32: Agent Response Validation
// =============================================================================

// Semantic similarity checker for validating agent responses against tasks
export {
  SemanticSimilarityChecker,
  semanticSimilarityChecker,
  checkSimilarity,
  isResponseRelevant,
  getMissingConcepts,
  validateAgentResponse,
  createSimilarityChecker,
  type SimilarityResult,
  type ScoreBreakdown,
  type SimilarityConfig
} from './SemanticSimilarity.js';

// =============================================================================
// CONFIDENCE GATE - Solution 34: Confidence Threshold Gate
// =============================================================================

// Blocks responses below a configurable confidence threshold
export {
  ConfidenceGate,
  confidenceGate,
  checkResponseConfidence,
  setGlobalThreshold,
  getGlobalThreshold,
  doesPassConfidence,
  getRecommendedAction,
  DEFAULT_THRESHOLD as CONFIDENCE_DEFAULT_THRESHOLD,
  UNCERTAINTY_WORDS,
  EVIDENCE_MARKERS,
  type GateContext,
  type GateResult,
  type ConfidenceFactor,
  type ConfidenceGateConfig
} from './ConfidenceGate.js';

// =============================================================================
// AGENT REPUTATION TRACKER - Solution 39: Agent Performance Reputation
// =============================================================================

// Tracks agent reliability based on historical performance metrics
export {
  AgentReputationTracker,
  getAgentReputationTracker,
  initializeReputationTracker,
  reputationTracker,
  recordAgentPerformance,
  getAgentReputation,
  getAgentConsensusWeight,
  selectBestAgentByReputation,
  isAgentTrusted,
  shouldAvoidAgent,
  TIER_THRESHOLDS,
  TIER_WEIGHTS,
  TREND_THRESHOLDS,
  type PerformanceMetrics,
  type AgentReputation,
  type ReliabilityTier,
  type PerformanceTrend,
  type ReputationTrackerConfig
} from './AgentReputationTracker.js';

// =============================================================================
// CLAIM VERIFICATION SYSTEM - Solution 42: Claim Verification
// =============================================================================

// Verifies agent claims against available evidence for Phase D verification
export {
  ClaimVerificationSystem,
  claimVerificationSystem,
  registerClaim,
  verifyClaim,
  getVerificationStats,
  logVerificationSummary,
  verifyTaskClaims,
  getPhaseDVerificationReport,
  ClaimType as ClaimVerificationType,  // Renamed to avoid conflict with CrossAgentValidator
  type Claim,
  type VerificationResult,
  type VerificationContext,
  type VerificationStatus,
  type VerificationStats,
  type CommandResult,
  type MCPOperation,
  type GitStatus,
  type TestResult,
  type ErrorLog,
  type ClaimVerificationConfig
} from './ClaimVerificationSystem.js';

// =============================================================================
// FACT EXTRACTION PIPELINE - Solution 37: Verifiable Fact Extraction
// =============================================================================

// Extracts verifiable facts from agent responses for validation
export {
  FactExtractionPipeline,
  extractFacts,
  extractAndVerifyFacts,
  FactType,
  type ExtractedFact,
  type VerificationResult as FactVerificationResult,  // Renamed to avoid conflict with ClaimVerificationSystem
  type VerificationMethod,
  type FactMetadata,
  type VerificationContext as FactVerificationContext,  // Renamed to avoid conflict with ClaimVerificationSystem
  type FactVerifier,
  type ExtractionStats
} from './FactExtractionPipeline.js';

// =============================================================================
// RESPONSE COHERENCE ANALYZER - Solution 41: Response Coherence Analysis
// =============================================================================

// Analyzes if response is internally coherent and logically consistent
export {
  ResponseCoherenceAnalyzer,
  responseCoherenceAnalyzer,
  isCoherent,
  getCoherenceScore,
  analyzeCoherence,
  type CoherenceIssue,
  type CoherenceAnalysis,
  type CoherenceBreakdown,
  type CoherenceAnalyzerConfig
} from './ResponseCoherenceAnalyzer.js';

// =============================================================================
// REAL-TIME FACT CHECKER - Solution 46: Real-Time Fact Verification
// =============================================================================

// Performs real-time verification of claims during agent execution
export {
  RealTimeFactChecker,
  realTimeFactChecker,
  startChecking,
  stopChecking,
  checkClaim,
  getCheckLog,
  checkResponseClaims,
  getFactCheckerStats,
  logFactCheckerSummary,
  createCheckContext,
  quickVerify,
  ClaimCategory,
  type FactCheckResult,
  type CheckContext,
  type MCPCallRecord,
  type ErrorRecord,
  type FactCheckerConfig,
  type FactCheckerStats
} from './RealTimeFactChecker.js';

// =============================================================================
// FINAL QUALITY GATE - Solution 50: Ultimate Quality Gate
// =============================================================================

// Aggregates all anti-hallucination checks for final output validation
export {
  FinalQualityGate,
  finalQualityGate,
  evaluateQuality,
  passesQualityGate,
  getQualityReport,
  setQualityThreshold,
  enableStrictMode,
  createQualityContext,
  DEFAULT_WEIGHTS as QUALITY_COMPONENT_WEIGHTS,
  type QualityContext,
  type QualityComponent,
  type QualityResult,
  type FinalQualityGateConfig
} from './FinalQualityGate.js';

// =============================================================================
// PROMPT CLARITY SCORER - Solution 44: Prompt Clarity Scoring
// =============================================================================

// Scores how clear and unambiguous a prompt is before execution
export {
  PromptClarityScorer,
  promptClarityScorer,
  getPromptClarityScore,
  isPromptActionable,
  getPromptSuggestions,
  analyzePromptClarity,
  formatClarityScore,
  validateForPhasePreA,
  VAGUE_WORDS,
  ACTION_VERBS,
  SPECIFIC_NOUNS,
  type ClarityIssueType,
  type ClarityIssue,
  type ClarityScore,
  type ClarityBreakdown,
  type PromptClarityScorerConfig
} from './PromptClarityScorer.js';

// =============================================================================
// OUTPUT FORMAT VALIDATOR - Solution 47: Output Format Validation
// =============================================================================

// Validates and auto-corrects agent outputs for expected formats (JSON, Markdown, Code, List)
export {
  OutputFormatValidator,
  outputFormatValidator,
  validateOutputFormat,
  autoCorrectOutput,
  CommonFormats,
  type FormatType,
  type FormatSpec,
  type JsonSchema,
  type FormatError,
  type FormatValidation
} from './OutputFormatValidator.js';

// =============================================================================
// CODE ANALYSIS ENGINE - Gemini 3 + Serena Integration for Phase A
// =============================================================================

// Combines Gemini 3 analytical capabilities with Serena/NativeCodeIntelligence
// for enhanced code analysis during the planning phase
export {
  CodeAnalysisEngine,
  codeAnalysisEngine,
  shouldUseCodeAnalysis,
  getCodeContext,
  type CodeAnalysisRequest,
  type CodeAnalysisResult,
  type SymbolInfo,
  type CodeSearchResult
} from './CodeAnalysisEngine.js';
