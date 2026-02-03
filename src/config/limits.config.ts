/**
 * GeminiHydra - Limits and Timeouts Configuration
 * Configuration for retries, timeouts, tokens, and cache settings
 */

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

/** Maximum number of retries for API calls */
export const MAX_RETRIES = 3;

/** Maximum retries for critical operations */
export const MAX_CRITICAL_RETRIES = 5;

/** Initial delay between retries (ms) */
export const RETRY_INITIAL_DELAY_MS = 1000;

/** Maximum delay between retries (ms) */
export const RETRY_MAX_DELAY_MS = 30000;

/** Exponential backoff multiplier */
export const RETRY_BACKOFF_MULTIPLIER = 2;

// ============================================================================
// TIMEOUT CONFIGURATION
// ============================================================================

/** Default timeout for API calls (ms) */
export const TIMEOUT_MS = 60000;

/** Timeout for fast operations (ms) */
export const FAST_TIMEOUT_MS = 15000;

/** Timeout for long-running operations (ms) */
export const LONG_TIMEOUT_MS = 300000;

/** Timeout for llama.cpp local calls (ms) */
export const LLAMA_TIMEOUT_MS = 120000;

/** @deprecated Use LLAMA_TIMEOUT_MS instead */
export const OLLAMA_TIMEOUT_MS = LLAMA_TIMEOUT_MS;

/** Timeout for streaming operations (ms) */
export const STREAM_TIMEOUT_MS = 180000;

/** Connection timeout (ms) */
export const CONNECTION_TIMEOUT_MS = 10000;

// ============================================================================
// TOKEN LIMITS
// ============================================================================

/** Maximum tokens for output */
export const MAX_TOKENS = 8192;

/** Maximum tokens for fast operations */
export const MAX_TOKENS_FAST = 2048;

/** Maximum tokens for long responses */
export const MAX_TOKENS_LONG = 16384;

/** Maximum context tokens (input) */
export const MAX_CONTEXT_TOKENS = 128000;

/** Reserved tokens for system prompt */
export const RESERVED_SYSTEM_TOKENS = 4096;

/** Token buffer for safety margin */
export const TOKEN_SAFETY_BUFFER = 1000;

// ============================================================================
// CONCURRENCY LIMITS
// ============================================================================

/** Maximum concurrent tasks */
export const MAX_CONCURRENT_TASKS = 5;

/** Maximum concurrent API calls */
export const MAX_CONCURRENT_API_CALLS = 3;

/** Maximum concurrent file operations */
export const MAX_CONCURRENT_FILE_OPS = 10;

/** Maximum parallel agent operations */
export const MAX_PARALLEL_AGENTS = 4;

/** Rate limit: requests per minute */
export const RATE_LIMIT_RPM = 60;

/** Rate limit: tokens per minute */
export const RATE_LIMIT_TPM = 1000000;

// ============================================================================
// CACHE CONFIGURATION
// ============================================================================

/** Cache TTL in milliseconds (1 hour) */
export const CACHE_TTL = 3600000;

/** Short cache TTL (5 minutes) */
export const CACHE_TTL_SHORT = 300000;

/** Long cache TTL (24 hours) */
export const CACHE_TTL_LONG = 86400000;

/** Maximum cache size in entries */
export const MAX_CACHE_SIZE = 1000;

/** Maximum cache size in bytes (100MB) */
export const MAX_CACHE_SIZE_BYTES = 100 * 1024 * 1024;

/** Maximum single cache entry size (1MB) */
export const MAX_CACHE_ENTRY_SIZE = 1024 * 1024;

// ============================================================================
// MEMORY LIMITS
// ============================================================================

/** Maximum memory entries to keep */
export const MAX_MEMORY_ENTRIES = 500;

/** Maximum session history length */
export const MAX_SESSION_HISTORY = 100;

/** Maximum conversation turns to keep */
export const MAX_CONVERSATION_TURNS = 50;

/** Memory cleanup threshold (percentage) */
export const MEMORY_CLEANUP_THRESHOLD = 0.8;

// ============================================================================
// FILE LIMITS
// ============================================================================

/** Maximum file size to process (10MB) */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** Maximum files to process in batch */
export const MAX_BATCH_FILES = 50;

/** Maximum directory depth for scanning */
export const MAX_DIRECTORY_DEPTH = 10;

/** Maximum lines to read from file */
export const MAX_FILE_LINES = 10000;

// ============================================================================
// QUEUE LIMITS
// ============================================================================

/** Maximum queue size */
export const MAX_QUEUE_SIZE = 100;

/** Queue processing batch size */
export const QUEUE_BATCH_SIZE = 10;

/** Queue drain timeout (ms) */
export const QUEUE_DRAIN_TIMEOUT_MS = 60000;

// ============================================================================
// GROUPED EXPORTS (for convenient imports)
// ============================================================================

/** Retry configuration object */
export const RETRY_LIMITS = {
  MAX_RETRIES,
  MAX_CRITICAL_RETRIES,
  RETRY_INITIAL_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_BACKOFF_MULTIPLIER,
} as const;

/** Timeout configuration object */
export const TIMEOUT_LIMITS = {
  TIMEOUT_MS,
  FAST_TIMEOUT_MS,
  LONG_TIMEOUT_MS,
  LLAMA_TIMEOUT_MS,
  STREAM_TIMEOUT_MS,
  CONNECTION_TIMEOUT_MS,
} as const;

/** Token limits configuration object */
export const TOKEN_LIMITS = {
  MAX_TOKENS,
  MAX_TOKENS_FAST,
  MAX_TOKENS_LONG,
  MAX_CONTEXT_TOKENS,
  RESERVED_SYSTEM_TOKENS,
  TOKEN_SAFETY_BUFFER,
} as const;

/** Concurrency limits configuration object */
export const CONCURRENCY_LIMITS = {
  MAX_CONCURRENT_TASKS,
  MAX_CONCURRENT_API_CALLS,
  MAX_CONCURRENT_FILE_OPS,
  MAX_PARALLEL_AGENTS,
  RATE_LIMIT_RPM,
  RATE_LIMIT_TPM,
} as const;

/** Cache configuration object */
export const CACHE_LIMITS = {
  CACHE_TTL,
  CACHE_TTL_SHORT,
  CACHE_TTL_LONG,
  MAX_CACHE_SIZE,
  MAX_CACHE_SIZE_BYTES,
  MAX_CACHE_ENTRY_SIZE,
} as const;

/** Memory limits configuration object */
export const MEMORY_LIMITS = {
  MAX_MEMORY_ENTRIES,
  MAX_SESSION_HISTORY,
  MAX_CONVERSATION_TURNS,
  MEMORY_CLEANUP_THRESHOLD,
} as const;

/** File limits configuration object */
export const FILE_LIMITS = {
  MAX_FILE_SIZE,
  MAX_BATCH_FILES,
  MAX_DIRECTORY_DEPTH,
  MAX_FILE_LINES,
} as const;

/** Queue limits configuration object */
export const QUEUE_LIMITS = {
  MAX_QUEUE_SIZE,
  QUEUE_BATCH_SIZE,
  QUEUE_DRAIN_TIMEOUT_MS,
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(attempt: number): number {
  const delay = RETRY_INITIAL_DELAY_MS * Math.pow(RETRY_BACKOFF_MULTIPLIER, attempt);
  return Math.min(delay, RETRY_MAX_DELAY_MS);
}

/**
 * Calculate available context tokens
 */
export function getAvailableContextTokens(): number {
  return MAX_CONTEXT_TOKENS - RESERVED_SYSTEM_TOKENS - TOKEN_SAFETY_BUFFER;
}

/**
 * Check if cache entry is expired
 */
export function isCacheExpired(createdAt: number, ttl: number = CACHE_TTL): boolean {
  return Date.now() - createdAt > ttl;
}

/**
 * Get timeout for operation type
 */
export function getTimeoutForOperation(type: 'fast' | 'normal' | 'long' | 'llama' | 'stream'): number {
  switch (type) {
    case 'fast':
      return FAST_TIMEOUT_MS;
    case 'long':
      return LONG_TIMEOUT_MS;
    case 'llama':
      return LLAMA_TIMEOUT_MS;
    case 'stream':
      return STREAM_TIMEOUT_MS;
    default:
      return TIMEOUT_MS;
  }
}

/**
 * Get max tokens for operation type
 */
export function getMaxTokensForOperation(type: 'fast' | 'normal' | 'long'): number {
  switch (type) {
    case 'fast':
      return MAX_TOKENS_FAST;
    case 'long':
      return MAX_TOKENS_LONG;
    default:
      return MAX_TOKENS;
  }
}
