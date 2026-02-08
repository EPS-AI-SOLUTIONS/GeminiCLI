/**
 * GeminiHydra - Configuration Module
 * Re-exports all configuration modules
 */

// ============================================================================
// MODELS CONFIGURATION
// ============================================================================

export {
  // Model constants
  GEMINI_MODELS,
  LLAMA_MODELS,
  OLLAMA_MODELS,  // Alias for LLAMA_MODELS
  DEFAULT_MODEL,
  FAST_MODEL,
  QUALITY_MODEL,
  LOCAL_MODEL,
  CODING_MODEL,
  // Pricing
  MODEL_PRICING,
  // Capabilities
  MODEL_CAPABILITIES,
  // Types
  type GeminiModel,
  type LlamaModel,
  type OllamaModel,  // Alias for LlamaModel
  type ModelPricing,
  type ModelCapabilities,
  // Functions
  calculateCost,
  getModelCapabilities,
  isLocalModel,
  isLlamaModel,
  isGeminiModel,
} from './models.config.js';

// ============================================================================
// AGENTS CONFIGURATION
// ============================================================================

export {
  // Agent constants
  AGENT_ROLES,
  AGENT_DESCRIPTIONS,
  AGENT_COLORS,
  AGENT_FALLBACK_CHAINS,
  TASK_ROUTING,
  // Types
  type AgentRole,
  type AgentDescription,
  type TaskCategory,
  // Functions
  getAgentDescription,
  getAgentColor,
  getAgentFallbackChain,
  getAgentForTask,
  getAllAgentRoles,
} from './agents.config.js';

// ============================================================================
// LIMITS CONFIGURATION
// ============================================================================

export {
  // Retry limits
  MAX_RETRIES,
  MAX_CRITICAL_RETRIES,
  RETRY_INITIAL_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_BACKOFF_MULTIPLIER,
  // Timeout limits
  TIMEOUT_MS,
  FAST_TIMEOUT_MS,
  LONG_TIMEOUT_MS,
  LLAMA_TIMEOUT_MS,
  OLLAMA_TIMEOUT_MS,  // Deprecated alias
  STREAM_TIMEOUT_MS,
  CONNECTION_TIMEOUT_MS,
  // Token limits
  MAX_TOKENS,
  MAX_TOKENS_FAST,
  MAX_TOKENS_LONG,
  MAX_CONTEXT_TOKENS,
  RESERVED_SYSTEM_TOKENS,
  TOKEN_SAFETY_BUFFER,
  // Concurrency limits
  MAX_CONCURRENT_TASKS,
  MAX_CONCURRENT_API_CALLS,
  MAX_CONCURRENT_FILE_OPS,
  MAX_PARALLEL_AGENTS,
  RATE_LIMIT_RPM,
  RATE_LIMIT_TPM,
  // Cache limits
  CACHE_TTL,
  CACHE_TTL_SHORT,
  CACHE_TTL_LONG,
  MAX_CACHE_SIZE,
  MAX_CACHE_SIZE_BYTES,
  MAX_CACHE_ENTRY_SIZE,
  // Memory limits
  MAX_MEMORY_ENTRIES,
  MAX_SESSION_HISTORY,
  MAX_CONVERSATION_TURNS,
  MEMORY_CLEANUP_THRESHOLD,
  // File limits
  MAX_FILE_SIZE,
  MAX_BATCH_FILES,
  MAX_DIRECTORY_DEPTH,
  MAX_FILE_LINES,
  // Queue limits
  MAX_QUEUE_SIZE,
  QUEUE_BATCH_SIZE,
  QUEUE_DRAIN_TIMEOUT_MS,
  // Grouped limit objects
  RETRY_LIMITS,
  TIMEOUT_LIMITS,
  TOKEN_LIMITS,
  CONCURRENCY_LIMITS,
  CACHE_LIMITS,
  MEMORY_LIMITS,
  FILE_LIMITS,
  QUEUE_LIMITS,
  // Functions
  calculateRetryDelay,
  getAvailableContextTokens,
  isCacheExpired,
  getTimeoutForOperation,
  getMaxTokensForOperation,
} from './limits.config.js';

// ============================================================================
// PATHS CONFIGURATION
// ============================================================================

export {
  // Base directories
  HOME_DIR,
  GEMINIHYDRA_DIR,
  PROJECT_ROOT,
  // Configuration directories
  SESSION_DIR,
  MEMORY_DIR,
  CACHE_DIR,
  LOGS_DIR,
  KNOWLEDGE_DIR,
  TEMP_DIR,
  BACKUP_DIR,
  // Configuration files
  CONFIG_FILE,
  API_KEYS_FILE,
  PREFERENCES_FILE,
  SESSION_INDEX_FILE,
  MEMORY_INDEX_FILE,
  KNOWLEDGE_GRAPH_FILE,
  // Cache files
  RESPONSE_CACHE_FILE,
  EMBEDDING_CACHE_FILE,
  TOKEN_CACHE_FILE,
  // Log files
  MAIN_LOG_FILE,
  ERROR_LOG_FILE,
  DEBUG_LOG_FILE,
  API_LOG_FILE,
  // Path helpers
  getConfigPath,
  getSessionPath,
  getMemoryPath,
  getKnowledgePath,
  getCachePath,
  getTempPath,
  getBackupPath,
  getLogPath,
  // Directory helpers
  getAllDirectories,
  ensureDirectoryPath,
  // Path validation
  isWithinGeminiHydra,
  normalizePath,
  getRelativePath,
} from './paths.config.js';

// ============================================================================
// TEMPERATURES CONFIGURATION
// ============================================================================

export {
  // Temperature presets
  TEMPERATURE_PRESETS,
  TASK_TEMPERATURES,
  TEMPERATURE_RANGES,
  MODEL_TEMPERATURES,
  TEMPERATURE_ADJUSTMENTS,
  ANNEALING_CONFIG,
  // Types
  type TemperaturePreset,
  type TaskType as TemperatureTaskType,
  type TemperatureRange,
  // Functions
  getTemperatureForTask,
  getTemperaturePreset,
  clampTemperature,
  calculatePassTemperature,
  blendTemperature,
} from './temperatures.config.js';

// ============================================================================
// RUNTIME CONFIGURATION (ConfigManager, env validation)
// ============================================================================

export {
  ConfigManager,
  getConfig,
  resetConfig,
  validateEnvVars,
} from './config.js';

// ============================================================================
// COMBINED CONFIG OBJECT
// ============================================================================

import { GEMINI_MODELS, OLLAMA_MODELS, DEFAULT_MODEL, FAST_MODEL, QUALITY_MODEL } from './models.config.js';
import { AGENT_ROLES } from './agents.config.js';
import { MAX_RETRIES, TIMEOUT_MS, MAX_TOKENS, MAX_CONTEXT_TOKENS, MAX_CONCURRENT_TASKS, CACHE_TTL, MAX_CACHE_SIZE } from './limits.config.js';
import { GEMINIHYDRA_DIR, SESSION_DIR, MEMORY_DIR, CACHE_DIR } from './paths.config.js';

/**
 * Combined configuration object for quick access
 */
export const CONFIG = {
  models: {
    gemini: GEMINI_MODELS,
    ollama: OLLAMA_MODELS,
    default: DEFAULT_MODEL,
    fast: FAST_MODEL,
    quality: QUALITY_MODEL,
  },
  agents: AGENT_ROLES,
  limits: {
    maxRetries: MAX_RETRIES,
    timeoutMs: TIMEOUT_MS,
    maxTokens: MAX_TOKENS,
    maxContextTokens: MAX_CONTEXT_TOKENS,
    maxConcurrentTasks: MAX_CONCURRENT_TASKS,
    cacheTtl: CACHE_TTL,
    maxCacheSize: MAX_CACHE_SIZE,
  },
  paths: {
    root: GEMINIHYDRA_DIR,
    sessions: SESSION_DIR,
    memory: MEMORY_DIR,
    cache: CACHE_DIR,
  },
} as const;

export default CONFIG;
