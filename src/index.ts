/**
 * GeminiHydra v14.0 - Main Module Index (Refactored)
 *
 * Comprehensive exports for all 63 implemented features
 * Modular architecture with separate concerns
 */

// ============================================================
// Configuration (NEW - Centralized Config)
// ============================================================

export {
  AGENT_COLORS,
  AGENT_DESCRIPTIONS,
  // Agent configs
  AGENT_ROLES,
  API_KEYS_FILE,
  API_LOG_FILE,
  BACKUP_DIR,
  CACHE_DIR,
  CACHE_LIMITS,
  CACHE_TTL,
  CACHE_TTL_LONG,
  CACHE_TTL_SHORT,
  CODING_MODEL,
  CONCURRENCY_LIMITS,
  CONFIG_FILE,
  CONNECTION_TIMEOUT_MS,
  // Runtime config
  ConfigManager,
  calculateCost,
  // Limits (functions)
  calculateRetryDelay,
  DEBUG_LOG_FILE,
  DEFAULT_MODEL,
  EMBEDDING_CACHE_FILE,
  ERROR_LOG_FILE,
  ensureDirectoryPath,
  FAST_MODEL,
  FAST_TIMEOUT_MS,
  FILE_LIMITS,
  // Model configs
  GEMINI_MODELS,
  GEMINIHYDRA_DIR,
  getAgentColor,
  getAgentDescription,
  getAgentForTask,
  getAllAgentRoles,
  getAllDirectories,
  getAvailableContextTokens,
  getBackupPath,
  getCachePath,
  getConfig,
  getConfigPath,
  getKnowledgePath,
  getLogPath,
  getMaxTokensForOperation,
  getMemoryPath,
  getModelCapabilities,
  getRelativePath,
  getSessionPath,
  getTempPath,
  getTimeoutForOperation,
  // Paths
  HOME_DIR,
  isCacheExpired,
  isGeminiModel,
  isLlamaModel,
  isLocalModel,
  isWithinGeminiHydra,
  KNOWLEDGE_DIR,
  KNOWLEDGE_GRAPH_FILE,
  LLAMA_MODELS,
  LLAMA_TIMEOUT_MS,
  type LlamaModel,
  LOCAL_MODEL,
  LOGS_DIR,
  LONG_TIMEOUT_MS,
  MAIN_LOG_FILE,
  MAX_BATCH_FILES,
  MAX_CACHE_ENTRY_SIZE,
  MAX_CACHE_SIZE,
  MAX_CACHE_SIZE_BYTES,
  MAX_CONCURRENT_API_CALLS,
  MAX_CONCURRENT_FILE_OPS,
  MAX_CONCURRENT_TASKS,
  MAX_CONTEXT_TOKENS,
  MAX_CONVERSATION_TURNS,
  MAX_CRITICAL_RETRIES,
  MAX_DIRECTORY_DEPTH,
  MAX_FILE_LINES,
  MAX_FILE_SIZE,
  MAX_MEMORY_ENTRIES,
  MAX_PARALLEL_AGENTS,
  MAX_QUEUE_SIZE,
  // Limits (individual constants)
  MAX_RETRIES,
  MAX_SESSION_HISTORY,
  MAX_TOKENS,
  MAX_TOKENS_FAST,
  MAX_TOKENS_LONG,
  MEMORY_CLEANUP_THRESHOLD,
  MEMORY_DIR,
  MEMORY_INDEX_FILE,
  MEMORY_LIMITS,
  MODEL_CAPABILITIES,
  MODEL_PRICING,
  normalizePath,
  OLLAMA_MODELS, // Alias for LLAMA_MODELS
  type OllamaModel, // Alias for LlamaModel
  PREFERENCES_FILE,
  PROJECT_ROOT,
  QUALITY_MODEL,
  QUEUE_BATCH_SIZE,
  QUEUE_DRAIN_TIMEOUT_MS,
  QUEUE_LIMITS,
  RATE_LIMIT_RPM,
  RATE_LIMIT_TPM,
  RESERVED_SYSTEM_TOKENS,
  RESPONSE_CACHE_FILE,
  RETRY_BACKOFF_MULTIPLIER,
  RETRY_INITIAL_DELAY_MS,
  // Limits (grouped objects)
  RETRY_LIMITS,
  RETRY_MAX_DELAY_MS,
  resetConfig,
  SESSION_DIR,
  SESSION_INDEX_FILE,
  STREAM_TIMEOUT_MS,
  TASK_ROUTING,
  TEMP_DIR,
  TIMEOUT_LIMITS,
  TIMEOUT_MS,
  TOKEN_CACHE_FILE,
  TOKEN_LIMITS,
  TOKEN_SAFETY_BUFFER,
  validateEnvVars,
} from './config/index.js';

// ============================================================
// Core Systems
// ============================================================

export type { CircuitBreakerOptions, CircuitState } from './core/CircuitBreaker.js';
// Feature #8: Circuit Breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  circuitBreakerRegistry,
} from './core/CircuitBreaker.js';
export type { ShutdownHandler, ShutdownOptions } from './core/GracefulShutdown.js';
// Feature #10: Graceful Shutdown
export {
  GracefulShutdownManager,
  shutdownManager,
} from './core/GracefulShutdown.js';
export type { HotReloadOptions } from './core/HotReload.js';
// Feature #5: Hot Reload
export { HotReloadManager, hotReloadManager } from './core/HotReload.js';
export type { CacheEntry, CacheOptions } from './core/RequestCache.js';
// Feature #9: Request Cache
export {
  RequestCache,
  RequestDeduplicator,
  requestCache,
  requestDeduplicator,
} from './core/RequestCache.js';
export type { StreamingOptions } from './core/StreamingOutput.js';
// Feature #1: Real-time Streaming
export {
  StreamingChat,
  streamGeminiResponse,
  streamWithFallback,
} from './core/StreamingOutput.js';

// ============================================================
// Memory & Persistence (Refactored)
// ============================================================

export type {
  MemoryEntry as BaseMemoryEntry,
  MemoryOptions,
  MemoryStats,
  PruneOptions,
} from './memory/BaseMemory.js';
// Base Memory class
export {
  BaseMemory,
  estimateSize,
  extractTags,
  generateId,
  generateNumericId,
  getDefaultBaseDir,
  pruneOldEntries,
  sortByImportance,
  TypedBaseMemory,
} from './memory/BaseMemory.js';
export type {
  CodebaseAnalysis,
  ContextEnrichment,
  FileInfo,
  ProjectStructure,
} from './memory/CodebaseMemory.js';
// Feature #51: Codebase Memory
export {
  CodebaseMemory,
  codebaseMemory,
} from './memory/CodebaseMemory.js';
// Long-Term Memory
export { LongTermMemory, longTermMemory } from './memory/LongTermMemory.js';
export type { MemoryEntry, MemorySearchOptions } from './memory/PersistentMemory.js';
// Feature #3: Persistent Memory
export { PersistentMemory, persistentMemory } from './memory/PersistentMemory.js';
// Session Memory
export { SessionMemory, sessionMemory } from './memory/SessionMemory.js';

// ============================================================
// CLI Commands (Refactored)
// ============================================================

// Codebase Commands
export {
  autoEnrichPrompt,
  codebaseCommands,
  initCodebaseForCwd,
  registerCodebaseCommands,
} from './cli/CodebaseCommands.js';
export type { ParsedArgs, TableColumn } from './cli/CommandHelpers.js';

// Command Helpers
export {
  box,
  confirmAction,
  formatBytes,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatSimpleTable,
  formatTable,
  highlightMatch,
  horizontalLine,
  indent,
  parseArgs,
  promptInput,
  promptSelect,
  Spinner,
  showProgress,
  statusIndicator,
  truncate,
} from './cli/CommandHelpers.js';
export type {
  Command,
  CommandArg,
  CommandContext,
  CommandHandler,
  CommandResult,
} from './cli/CommandRegistry.js';
// Command Registry
export {
  CommandRegistry,
  commandRegistry,
  error,
  success,
} from './cli/CommandRegistry.js';
// Initialize all commands
export { initializeCommands } from './cli/index.js';
// Session Commands
export {
  buildFullContext,
  getPromptContext,
  initSessionSystem,
  recordMessage,
  registerSessionCommands,
  saveAndClose,
  sessionCommands,
} from './cli/SessionCommands.js';

// ============================================================
// Knowledge System
// ============================================================

export type { PrioritizedTask, Priority } from './core/TaskPriority.js';
// Feature #7: Task Priority
export {
  detectPriority,
  prioritizeTasks,
  TaskPriorityQueue,
  taskQueue,
} from './core/TaskPriority.js';
export type { BudgetConfig, BudgetState, TokenUsage } from './core/TokenBudget.js';
// Feature #4: Token Budget
export { TokenBudgetManager, tokenBudget } from './core/TokenBudget.js';
export type {
  AgentContext,
  AgentResponse,
  KnowledgeEntry as KnowledgeBankEntry,
  KnowledgeSource,
  KnowledgeType,
  LearnedKnowledge,
  RAGContext,
  SearchResult,
} from './knowledge/index.js';
// Feature #52: Knowledge Bank & Agent
export {
  KnowledgeAgent,
  KnowledgeBank,
  knowledgeAgent,
  knowledgeBank,
  knowledgeCommands,
} from './knowledge/index.js';

// ============================================================
// Model Intelligence (Refactored)
// ============================================================

export type {
  ConsensusResult,
  ContextMessage,
  FallbackChainEntry,
  ModelHealth,
  ModelMetrics,
  ModelPromptConfig,
  ModelSelectionResult,
  QualityScore,
  TaskComplexity,
} from './core/models/index.js';
export {
  AGENT_FALLBACK_CHAINS,
  // Feature #11: Dynamic Model Selection
  classifyComplexity,
  // Feature #18: Context Window
  contextManager as modelContextManager,
  // Feature #17: Multi-model Consensus
  getConsensus,
  // Feature #12: Fallback Chains
  getFallbackChain,
  MODEL_PROMPT_CONFIGS,
  // Feature #20: Model Health
  modelHealth,
  // Feature #14: Performance Tracking
  modelPerformance,
  // Feature #19: Prompt Optimization
  optimizePromptForModel,
  // Feature #15: Prompt Caching
  promptCache,
  // Feature #16: Response Quality
  scoreResponseQuality,
  selectModelForTask,
} from './core/models/index.js';

// ============================================================
// Git Integration
// ============================================================

export type { CommitOptions, GitStatus, PROptions } from './cli/GitIntegration.js';
// Feature #27
export { GitIntegration, git, gitCommands } from './cli/GitIntegration.js';

// ============================================================
// CLI Enhancements
// ============================================================

export type {
  AutocompleteOptions,
  EditableTask,
  NotificationOptions,
  OutputFormat,
  ProgressBarOptions,
  TaskTemplate,
} from './cli/CLIEnhancements.js';
// Features #31-39
export {
  // Feature #36: Autocomplete
  createCompleter,
  // Feature #37: History Search
  HistorySearch,
  // Feature #35: Syntax Highlighting
  highlightCode,
  historySearch,
  // Feature #34: Output Formats
  OutputFormatter,
  // Feature #38: Pagination
  OutputPaginator,
  outputFormatter,
  // Feature #31: Progress Bar
  ProgressBar,
  paginator,
  // Feature #39: Notifications
  sendNotification,
  // Feature #32: Task Editor
  TaskEditor,
  // Feature #33: Templates
  TemplateManager,
  templateManager,
} from './cli/CLIEnhancements.js';

// ============================================================
// Monitoring & Debug
// ============================================================

export type {
  DryRunResult,
  LogEntry,
  LogLevel,
  Metric,
  MetricPoint,
  ReplayEntry,
  ReplaySession,
  TraceSpan,
} from './debug/index.js';
// Features #41, #42, #43, #44, #45
export {
  // Feature #45: Agent Trace
  AgentTrace,
  agentTrace,
  // Debug Loop
  DebugLoop,
  // Feature #44: Dry Run
  DryRunMode,
  debugWithScreenshot,
  dryRun,
  // Feature #41: Logging
  Logger,
  logger,
  // Feature #42: Metrics
  MetricsDashboard,
  metrics,
  // Feature #43: Task Replay
  TaskReplay,
  taskReplay,
} from './debug/index.js';

// ============================================================
// Security
// ============================================================

export type {
  SanitizationOptions,
  SanitizationResult,
  SecureConfigData,
} from './core/SecuritySystem.js';
// Features #48, #50
export {
  generateSecureToken,
  hashSensitive,
  InputSanitizer,
  maskSensitive,
  RateLimiter,
  rateLimiter,
  SecureConfig,
  sanitizer,
  secureConfig,
} from './core/SecuritySystem.js';

// ============================================================
// Plugin System
// ============================================================

export type {
  Plugin,
  PluginContext,
  PluginHandler,
  PluginHook,
  PluginManifest,
  PluginRegistryEntry,
} from './core/PluginSystem.js';
// Feature #6
export {
  createPlugin,
  LoggingPlugin,
  MetricsPlugin,
  PluginManager,
  pluginManager,
} from './core/PluginSystem.js';

// ============================================================
// Core Exports
// ============================================================

export { Agent } from './core/agent/Agent.js';
export { GraphProcessor } from './core/GraphProcessor.js';
export type {
  SearchStrategy,
  ThoughtNode,
  ToTOptions,
  TreeOfThoughtsResult,
} from './core/intelligence/index.js';

// Feature #64: Tree of Thoughts (ToT) - exported from intelligence layer
// NOTE: Advanced ToT (MCTS, BFS, parallel) is available from ./core/intelligence/index.js
// Legacy export for backwards compatibility:
export {
  bfsTreeOfThoughts,
  mctsTreeOfThoughts,
  parallelTreeOfThoughts,
  quickTreeOfThoughts,
  treeOfThoughts,
} from './core/intelligence/index.js';
export { Swarm } from './core/swarm/Swarm.js';

// ============================================================
// Intelligence Layer (Refactored)
// ============================================================

export type {
  Analogy,
  ChainOfThoughtResult,
  ConfidenceScore,
  DecomposedQuery,
  IntelligenceConfig,
  MultiPerspectiveResult,
  Perspective,
  ReflectionResult,
} from './core/intelligence/index.js';
export {
  // Core intelligence functions
  chainOfThought,
  contextManager as intelligenceContextManager,
  decomposeQuery,
  enhanceWithIntelligence,
  findAnalogies,
  knowledgeGraph,
  multiPerspectiveAnalysis,
  scoreConfidence,
  selfReflect,
  // Managers and caches
  semanticCache,
} from './core/intelligence/index.js';

// ============================================================
// Execution Engine (Refactored)
// ============================================================

export type {
  Checkpoint,
  DegradationLevel,
  ErrorType,
  ExecutionEngineConfig,
  ExecutionProfile,
  ParallelExecutionResult,
  PartialResult,
  PrioritizedTask as ExecutionPrioritizedTask,
  ResourceState,
  RetryConfig,
  SubTask,
  TaskPriority as ExecutionTaskPriority,
  TaskTemplate as ExecutionTaskTemplate,
} from './core/execution/index.js';
export {
  // #11 Adaptive Retry
  adaptiveRetry,
  // #14 Auto Dependencies
  autoDetectDependencies,
  calculatePriorityScore,
  // #15 Checkpoints
  checkpointManager,
  classifyError,
  // #18 Graceful Degradation
  degradationManager,
  // #13 Parallel Execution
  detectParallelGroups,
  // #16 Prioritization
  detectTaskPriority,
  executeParallelGroups,
  // #20 Execution Profiling
  executionProfiler,
  getEngineHealth,
  getExecutionEngineStatus,
  // Engine
  initExecutionEngine,
  isEngineReady,
  // #12 Partial Completion
  partialManager,
  printExecutionEngineStatus,
  resetExecutionEngine,
  // #17 Resource Scheduling
  resourceScheduler,
  sortByPriority,
  // #19 Task Templating
  taskTemplateManager,
} from './core/execution/index.js';

// ============================================================
// Conversation Layer (Refactored)
// ============================================================

export type {
  ConversationSession,
  ConversationTurn,
  Correction,
  DetectedIntent,
  DryRunAction,
  DryRunPreview,
  Explanation,
  ExplanationStep,
  IntentCategory,
  LearnedPattern,
  ProgressReport,
  ProgressStep,
  PrunedContext,
  PruningStrategy,
  RollbackPoint,
  Suggestion,
  TaskEstimate,
} from './core/conversation/index.js';
export {
  // #21 Conversation Memory
  ConversationMemory,
  // #25 Learning from Corrections
  CorrectionLearner,
  contextPruner,
  conversationMemory,
  correctionLearner,
  // #23 Intent Detection
  detectIntent,
  // #30 Explanation Mode
  ExplanationMode,
  // #26 Task Estimation
  estimateTask,
  explanationMode,
  formatDryRunPreview,
  // #29 Dry-Run Preview
  generateDryRunPreview,
  // Init
  initConversationSubsystems,
  // #24 Proactive Suggestions
  ProactiveSuggestions,
  // #27 Progress Tracking
  ProgressTracker,
  persistConversationData,
  proactiveSuggestions,
  progressTracker,
  // #28 Rollback Capability
  RollbackManager,
  rollbackManager,
  // #22 Smart Context Pruning
  SmartContextPruner,
} from './core/conversation/index.js';

// ============================================================
// Developer Tools (Refactored)
// ============================================================

export type {
  CodeReviewIssue,
  CodeReviewResult,
  DependencyAnalysis,
  DependencyInfo,
  DocEntry,
  DocumentationResult,
  EnvironmentConfig,
  GeneratedTest,
  MockApiConfig,
  MockEndpoint,
  PerformanceIssue,
  PerformanceProfile,
  ProjectInfo,
  ProjectWorkspace,
  RefactoringAnalysis,
  RefactoringSuggestion,
  SecurityScanResult,
  SecurityVulnerability,
  TestGenerationResult,
} from './core/developer/index.js';
export {
  // #37 Dependency Analysis
  analyzeDependencies,
  // #34 Refactoring Suggestions
  analyzeRefactoring,
  detectLanguage,
  // #39 Environment Management
  EnvManager,
  envManager,
  formatCodeReview,
  formatDependencyAnalysis,
  formatDocumentation,
  formatGeneratedTests,
  formatPerformanceProfile,
  formatRefactoringAnalysis,
  formatSecurityScan,
  // #33 Documentation Generation
  generateDocumentation,
  generateMockData,
  // #38 API Mocking
  generateMockEndpoints,
  generateMockServer,
  // #32 Test Generation
  generateTests,
  // Init
  initDeveloperModules,
  // #40 Multi-Project Support
  MultiProjectManager,
  // #35 Performance Profiling
  profilePerformance,
  projectManager,
  // #31 Code Review Agent
  reviewCode,
  // #36 Security Scanning
  scanSecurity,
} from './core/developer/index.js';

// ============================================================
// Swarm Agents & Classification
// ============================================================

export { createSwarm } from './core/swarm/Swarm.js';
export {
  analyzeComplexity,
  classifyPrompt,
} from './swarm/agents/classifier.js';
export {
  AGENT_SPECS,
  getAgentRoles,
  getAgentSpec,
  getAgentSummaries,
  getAgentsByTier,
  getCommanders,
  getCoordinators,
  getExecutors,
  MODEL_TIERS,
} from './swarm/agents/definitions.js';

// ============================================================
// Version Info
// ============================================================

// ============================================================
// Health Check
// ============================================================

export type { HealthCheckResult } from './health.js';
export { healthCheck, healthCheckSync } from './health.js';

export const VERSION = '14.1.0';
export const FEATURE_COUNT = 64;
export const REFACTORED = true;

/**
 * Initialize all GeminiHydra subsystems
 */
export async function initGeminiHydra(): Promise<void> {
  const { initExecutionEngine } = await import('./core/execution/index.js');
  const { initConversationSubsystems } = await import('./core/conversation/index.js');
  const { initDeveloperModules } = await import('./core/developer/index.js');
  const { initializeCommands } = await import('./cli/index.js');
  const { getAllDirectories, validateEnvVars: validate } = await import('./config/index.js');
  const fs = await import('node:fs/promises');

  // Validate environment variables at startup
  validate();

  // Ensure all directories exist
  for (const dir of getAllDirectories()) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }

  // Initialize subsystems
  await initExecutionEngine();
  await initConversationSubsystems();
  await initDeveloperModules();
  initializeCommands();
}
