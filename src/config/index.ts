/**
 * GeminiHydra - Configuration Module
 * Re-exports all configuration modules
 */

// ============================================================================
// MODELS CONFIGURATION
// ============================================================================

export {
  CODING_MODEL,
  // Functions
  calculateCost,
  DEFAULT_MODEL,
  FAST_MODEL,
  // Model constants
  GEMINI_MODELS,
  // Types
  type GeminiModel,
  getModelCapabilities,
  isGeminiModel,
  isLlamaModel,
  isLocalModel,
  LLAMA_MODELS,
  type LlamaModel,
  LOCAL_MODEL,
  // Capabilities
  MODEL_CAPABILITIES,
  // Pricing
  MODEL_PRICING,
  type ModelCapabilities,
  type ModelPricing,
  OLLAMA_MODELS, // Alias for LLAMA_MODELS
  type OllamaModel, // Alias for LlamaModel
  QUALITY_MODEL,
} from './models.config.js';

// ============================================================================
// AGENTS CONFIGURATION
// ============================================================================

export {
  AGENT_COLORS,
  AGENT_DESCRIPTIONS,
  AGENT_FALLBACK_CHAINS,
  // Agent constants
  AGENT_ROLES,
  type AgentDescription,
  // Types
  type AgentRole,
  getAgentColor,
  // Functions
  getAgentDescription,
  getAgentFallbackChain,
  getAgentForTask,
  getAllAgentRoles,
  TASK_ROUTING,
  type TaskCategory,
} from './agents.config.js';

// ============================================================================
// LIMITS CONFIGURATION
// ============================================================================

export {
  CACHE_LIMITS,
  // Cache limits
  CACHE_TTL,
  CACHE_TTL_LONG,
  CACHE_TTL_SHORT,
  CONCURRENCY_LIMITS,
  CONNECTION_TIMEOUT_MS,
  // Functions
  calculateRetryDelay,
  FAST_TIMEOUT_MS,
  FILE_LIMITS,
  getAvailableContextTokens,
  getMaxTokensForOperation,
  getTimeoutForOperation,
  isCacheExpired,
  LLAMA_TIMEOUT_MS,
  LONG_TIMEOUT_MS,
  MAX_BATCH_FILES,
  MAX_CACHE_ENTRY_SIZE,
  MAX_CACHE_SIZE,
  MAX_CACHE_SIZE_BYTES,
  MAX_CONCURRENT_API_CALLS,
  MAX_CONCURRENT_FILE_OPS,
  // Concurrency limits
  MAX_CONCURRENT_TASKS,
  MAX_CONTEXT_TOKENS,
  MAX_CONVERSATION_TURNS,
  MAX_CRITICAL_RETRIES,
  MAX_DIRECTORY_DEPTH,
  MAX_FILE_LINES,
  // File limits
  MAX_FILE_SIZE,
  // Memory limits
  MAX_MEMORY_ENTRIES,
  MAX_PARALLEL_AGENTS,
  // Queue limits
  MAX_QUEUE_SIZE,
  // Retry limits
  MAX_RETRIES,
  MAX_SESSION_HISTORY,
  // Token limits
  MAX_TOKENS,
  MAX_TOKENS_FAST,
  MAX_TOKENS_LONG,
  MEMORY_CLEANUP_THRESHOLD,
  MEMORY_LIMITS,
  OLLAMA_TIMEOUT_MS, // Deprecated alias
  QUEUE_BATCH_SIZE,
  QUEUE_DRAIN_TIMEOUT_MS,
  QUEUE_LIMITS,
  RATE_LIMIT_RPM,
  RATE_LIMIT_TPM,
  RESERVED_SYSTEM_TOKENS,
  RETRY_BACKOFF_MULTIPLIER,
  RETRY_INITIAL_DELAY_MS,
  // Grouped limit objects
  RETRY_LIMITS,
  RETRY_MAX_DELAY_MS,
  STREAM_TIMEOUT_MS,
  TIMEOUT_LIMITS,
  // Timeout limits
  TIMEOUT_MS,
  TOKEN_LIMITS,
  TOKEN_SAFETY_BUFFER,
} from './limits.config.js';

// ============================================================================
// PATHS CONFIGURATION
// ============================================================================

export {
  API_KEYS_FILE,
  API_LOG_FILE,
  BACKUP_DIR,
  CACHE_DIR,
  // Configuration files
  CONFIG_FILE,
  DEBUG_LOG_FILE,
  EMBEDDING_CACHE_FILE,
  ERROR_LOG_FILE,
  ensureDirectoryPath,
  GEMINIHYDRA_DIR,
  // Directory helpers
  getAllDirectories,
  getBackupPath,
  getCachePath,
  // Path helpers
  getConfigPath,
  getKnowledgePath,
  getLogPath,
  getMemoryPath,
  getRelativePath,
  getSessionPath,
  getTempPath,
  // Base directories
  HOME_DIR,
  // Path validation
  isWithinGeminiHydra,
  KNOWLEDGE_DIR,
  KNOWLEDGE_GRAPH_FILE,
  LOGS_DIR,
  // Log files
  MAIN_LOG_FILE,
  MEMORY_DIR,
  MEMORY_INDEX_FILE,
  normalizePath,
  PREFERENCES_FILE,
  PROJECT_ROOT,
  // Cache files
  RESPONSE_CACHE_FILE,
  // Configuration directories
  SESSION_DIR,
  SESSION_INDEX_FILE,
  TEMP_DIR,
  TOKEN_CACHE_FILE,
} from './paths.config.js';

// ============================================================================
// TEMPERATURES CONFIGURATION
// ============================================================================

export {
  ANNEALING_CONFIG,
  blendTemperature,
  calculatePassTemperature,
  clampTemperature,
  // Functions
  getTemperatureForTask,
  getTemperaturePreset,
  MODEL_TEMPERATURES,
  TASK_TEMPERATURES,
  type TaskType as TemperatureTaskType,
  TEMPERATURE_ADJUSTMENTS,
  // Temperature presets
  TEMPERATURE_PRESETS,
  TEMPERATURE_RANGES,
  // Types
  type TemperaturePreset,
  type TemperatureRange,
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

import { AGENT_ROLES } from './agents.config.js';
import {
  CACHE_TTL,
  MAX_CACHE_SIZE,
  MAX_CONCURRENT_TASKS,
  MAX_CONTEXT_TOKENS,
  MAX_RETRIES,
  MAX_TOKENS,
  TIMEOUT_MS,
} from './limits.config.js';
import {
  DEFAULT_MODEL,
  FAST_MODEL,
  GEMINI_MODELS,
  OLLAMA_MODELS,
  QUALITY_MODEL,
} from './models.config.js';
import { CACHE_DIR, GEMINIHYDRA_DIR, MEMORY_DIR, SESSION_DIR } from './paths.config.js';

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
