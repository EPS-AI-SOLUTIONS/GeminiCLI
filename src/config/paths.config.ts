/**
 * GeminiHydra - Paths Configuration
 * Configuration for file and directory paths
 */

import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';

// ============================================================================
// BASE DIRECTORIES
// ============================================================================

/** User home directory */
export const HOME_DIR = os.homedir();

/** GeminiHydra configuration directory */
export const GEMINIHYDRA_DIR = path.join(HOME_DIR, '.geminihydra');

/** Project root directory (when running from source) */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// ============================================================================
// CONFIGURATION DIRECTORIES
// ============================================================================

/** Session storage directory */
export const SESSION_DIR = path.join(GEMINIHYDRA_DIR, 'sessions');

/** Memory storage directory */
export const MEMORY_DIR = path.join(GEMINIHYDRA_DIR, 'memory');

/** Cache directory */
export const CACHE_DIR = path.join(GEMINIHYDRA_DIR, 'cache');

/** Logs directory */
export const LOGS_DIR = path.join(GEMINIHYDRA_DIR, 'logs');

/** Knowledge base directory */
export const KNOWLEDGE_DIR = path.join(GEMINIHYDRA_DIR, 'knowledge');

/** Temporary files directory */
export const TEMP_DIR = path.join(GEMINIHYDRA_DIR, 'temp');

/** Backups directory */
export const BACKUP_DIR = path.join(GEMINIHYDRA_DIR, 'backups');

// ============================================================================
// CONFIGURATION FILES
// ============================================================================

/** Main configuration file */
export const CONFIG_FILE = path.join(GEMINIHYDRA_DIR, 'config.json');

/** API keys file */
export const API_KEYS_FILE = path.join(GEMINIHYDRA_DIR, 'api-keys.json');

/** User preferences file */
export const PREFERENCES_FILE = path.join(GEMINIHYDRA_DIR, 'preferences.json');

/** Session index file */
export const SESSION_INDEX_FILE = path.join(SESSION_DIR, 'index.json');

/** Memory index file */
export const MEMORY_INDEX_FILE = path.join(MEMORY_DIR, 'index.json');

/** Knowledge graph file */
export const KNOWLEDGE_GRAPH_FILE = path.join(KNOWLEDGE_DIR, 'graph.json');

// ============================================================================
// CACHE FILES
// ============================================================================

/** Response cache file */
export const RESPONSE_CACHE_FILE = path.join(CACHE_DIR, 'responses.json');

/** Embedding cache file */
export const EMBEDDING_CACHE_FILE = path.join(CACHE_DIR, 'embeddings.json');

/** Token cache file */
export const TOKEN_CACHE_FILE = path.join(CACHE_DIR, 'tokens.json');

// ============================================================================
// LOG FILES
// ============================================================================

/** Main log file */
export const MAIN_LOG_FILE = path.join(LOGS_DIR, 'geminihydra.log');

/** Error log file */
export const ERROR_LOG_FILE = path.join(LOGS_DIR, 'error.log');

/** Debug log file */
export const DEBUG_LOG_FILE = path.join(LOGS_DIR, 'debug.log');

/** API calls log file */
export const API_LOG_FILE = path.join(LOGS_DIR, 'api.log');

// ============================================================================
// PATH HELPERS
// ============================================================================

/**
 * Get configuration path by name
 */
export function getConfigPath(name: string): string {
  const configPaths: Record<string, string> = {
    config: CONFIG_FILE,
    'api-keys': API_KEYS_FILE,
    preferences: PREFERENCES_FILE,
    'session-index': SESSION_INDEX_FILE,
    'memory-index': MEMORY_INDEX_FILE,
    'knowledge-graph': KNOWLEDGE_GRAPH_FILE,
    'response-cache': RESPONSE_CACHE_FILE,
    'embedding-cache': EMBEDDING_CACHE_FILE,
    'token-cache': TOKEN_CACHE_FILE,
    'main-log': MAIN_LOG_FILE,
    'error-log': ERROR_LOG_FILE,
    'debug-log': DEBUG_LOG_FILE,
    'api-log': API_LOG_FILE,
  };

  return configPaths[name] || path.join(GEMINIHYDRA_DIR, name);
}

/**
 * Get session file path by ID
 */
export function getSessionPath(sessionId: string): string {
  return path.join(SESSION_DIR, `${sessionId}.json`);
}

/**
 * Get memory file path by ID
 */
export function getMemoryPath(memoryId: string): string {
  return path.join(MEMORY_DIR, `${memoryId}.json`);
}

/**
 * Get knowledge file path by name
 */
export function getKnowledgePath(name: string): string {
  return path.join(KNOWLEDGE_DIR, `${name}.json`);
}

/**
 * Get cache file path by key
 */
export function getCachePath(key: string): string {
  // Sanitize key for filename
  const sanitized = key.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 100);
  return path.join(CACHE_DIR, `${sanitized}.cache`);
}

/**
 * Get temp file path
 */
export function getTempPath(filename: string): string {
  return path.join(TEMP_DIR, filename);
}

/**
 * Get backup file path with timestamp
 */
export function getBackupPath(name: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(BACKUP_DIR, `${name}_${timestamp}.bak`);
}

/**
 * Get log file path by date
 */
export function getLogPath(date: Date = new Date()): string {
  const dateStr = date.toISOString().split('T')[0];
  return path.join(LOGS_DIR, `geminihydra_${dateStr}.log`);
}

// ============================================================================
// DIRECTORY CREATION
// ============================================================================

/**
 * Get all directories that need to be created
 */
export function getAllDirectories(): string[] {
  return [
    GEMINIHYDRA_DIR,
    SESSION_DIR,
    MEMORY_DIR,
    CACHE_DIR,
    LOGS_DIR,
    KNOWLEDGE_DIR,
    TEMP_DIR,
    BACKUP_DIR,
  ];
}

/**
 * Ensure a directory exists (sync check, actual creation done elsewhere)
 */
export function ensureDirectoryPath(dirPath: string): string {
  return path.resolve(dirPath);
}

// ============================================================================
// PATH VALIDATION
// ============================================================================

/**
 * Check if path is within GeminiHydra directory
 */
export function isWithinGeminiHydra(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return resolved.startsWith(GEMINIHYDRA_DIR);
}

/**
 * Normalize and resolve a path
 */
export function normalizePath(inputPath: string): string {
  // Handle ~ for home directory
  if (inputPath.startsWith('~')) {
    inputPath = path.join(HOME_DIR, inputPath.slice(1));
  }
  return path.resolve(inputPath);
}

/**
 * Get relative path from project root
 */
export function getRelativePath(absolutePath: string): string {
  return path.relative(PROJECT_ROOT, absolutePath);
}
