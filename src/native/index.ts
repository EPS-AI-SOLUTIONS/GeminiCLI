/**
 * Native Tools Index - GeminiHydra Native Implementations
 *
 * These native modules replace external MCP servers with optimized,
 * integrated implementations that run directly in the GeminiHydra process.
 *
 * Benefits:
 * - No external dependencies/processes
 * - Lower latency (no IPC overhead)
 * - Better integration with CLI
 * - Full TypeScript type safety
 * - Customized for GeminiHydra workflows
 */

import path from 'node:path';
import chalk from 'chalk';
import { GEMINIHYDRA_DIR } from '../config/paths.config.js';

// ============================================================
// Shared Types
// ============================================================

// Unified types from shared types module (canonical source)
export type {
  // File attributes types (Windows/Unix)
  FileAttributes,
  // File types - FileInfo is the canonical unified type
  FileInfo,
  FileInfoBasic,
  FileInfoWithAnalysis,
  FileInfoWithStats,
  // File lock types
  FileLockInfo,
  FileLockRetryOptions,
  FileType,
  SearchContext,
  // Search types - ONE canonical SearchMatch export
  SearchMatch,
  SetFileAttributesOptions,
  SetFileAttributesResult,
  WriteWithRetryResult,
} from './types.js';

export {
  // File lock error class
  FileLockError,
  normalizeContextToArray,
  normalizeContextToString,
} from './types.js';

// ============================================================
// Module Exports
// ============================================================

export type {
  // NOTE: FileInfo is now exported from types.ts as the canonical unified type
  // NativeFileSystem.FileInfo re-exports from types.ts, so they're compatible
  DirectoryTree,
  NativeFileSystemConfig,
  WatchEvent,
} from './nativefilesystem/index.js';
// FileSystem - replaces @modelcontextprotocol/server-filesystem
export {
  createFileSystem,
  NativeFileSystem,
} from './nativefilesystem/NativeFileSystem.js';
export type {
  LoadOptions,
  Persistable,
  PersistenceResult,
  SaveOptions,
} from './persistence.js';
// Persistence - shared save/load utilities
export {
  createDateReviver,
  deleteFile,
  fileExists,
  loadFromFile,
  loadPersistable,
  loadWithReviver,
  savePersistable,
  saveToFile,
  tryLoadFromFile,
  trySaveToFile,
} from './persistence.js';

// NOTE: FileSearchMatch alias REMOVED - use SearchMatch directly from types.ts
// The old alias (SearchMatch as FileSearchMatch) was confusing and redundant

export type {
  EncodingInfo,
  ReadFileWithEncodingOptions,
  SupportedEncoding,
  WriteFileWithEncodingOptions,
} from './EncodingUtils.js';
// Encoding Utils - file encoding detection and conversion
export {
  BOM_SIGNATURES,
  convertBufferEncoding,
  decodeBuffer,
  detectBOM,
  detectEncoding,
  encodeBuffer,
  getBOMBytes,
  getEncodingDisplayName,
  isSupportedEncoding,
  normalizeEncoding,
} from './EncodingUtils.js';
export type {
  DiagnosticResult,
  PathValidationResult,
  PermissionResult,
  SystemInfo,
} from './FileSystemDiagnostics.js';
// FileSystem Diagnostics - comprehensive path and permission diagnostics
export {
  createDiagnostics,
  FileSystemDiagnostics,
} from './FileSystemDiagnostics.js';
export type {
  InteractivePrompt,
  InteractivePromptCallback,
  InteractivePromptConfig,
  InteractivePromptLog,
  InteractivePromptType,
} from './InteractivePromptHandler.js';

// Interactive Prompt Handler - for handling interactive shell prompts
export {
  AUTO_RESPOND_PRESETS,
  createDefaultInteractiveConfig,
  createInteractiveHandler,
  createInteractiveHandlerWithPreset,
  createPromptDetector,
  INTERACTIVE_PROMPT_PATTERNS,
  InteractivePromptDetector,
  InteractivePromptHandler,
} from './InteractivePromptHandler.js';
export type {
  CodeEdit,
  ProjectMemory,
  // CodeSearchResult is intentionally different from SearchMatch:
  // - Uses 'text' instead of 'content'
  // - Has simpler 'context' (string vs {before, after})
  // - Designed for code intelligence results, not general file search
  SearchResult as CodeSearchResult,
  SymbolOverview,
  SymbolSummary,
} from './NativeCodeIntelligence.js';
// Code Intelligence - replaces Serena MCP
export {
  NativeCodeIntelligence,
  nativeCodeIntelligence,
} from './NativeCodeIntelligence.js';
// Document Tools - Word, Excel, PDF creation and editing
export { createDocumentToolDefinitions } from './NativeDocumentTools.js';
export type {
  FileSizeLimitPreset,
  StreamingConfig,
  StreamingDataGenerator,
  StreamingProgress,
  StreamingReadOptions,
  StreamingReadResult,
  StreamingWriteOptions,
  StreamingWriteResult,
} from './NativeFileSystemStreaming.js';
// FileSystem Streaming - streaming support for large files (>50MB)
export {
  addStreamingMethods,
  createStreamingFileSystem,
  DEFAULT_CHUNK_SIZE,
  FileSizeLimits,
  formatBytes,
  NativeFileSystemStreaming,
} from './NativeFileSystemStreaming.js';
export type {
  GlobOptions,
  GlobResult,
} from './NativeGlob.js';
// Glob - fast file pattern matching (replaces external glob tools)
export {
  createGlob,
  createGlob as createNativeGlob, // Alias for convenience
  NativeGlob,
  nativeGlob,
} from './NativeGlob.js';
export type {
  GrepMatch,
  GrepOptions,
  GrepResult,
} from './NativeGrep.js';
// Grep - fast content search (ripgrep-like interface)
export {
  createGrep,
  createGrep as createNativeGrep, // Alias for convenience
  NativeGrep,
  nativeGrep,
} from './NativeGrep.js';
export type {
  CompletionItem,
  Diagnostic,
  DocumentSymbol,
  LanguageServerDefinition,
  Location,
  LSPServerConfig,
  Position,
  Range,
  SymbolInformation,
} from './NativeLSP.js';
// LSP - Language Server Protocol client
export {
  CompletionItemKind,
  DiagnosticSeverity,
  LSPClient,
  NativeLSP,
  nativeLSP,
  SymbolKind,
} from './NativeLSP.js';
export type { LanguageServerConfig } from './NativeLSPLanguages.js';
// LSP Languages - language server configurations (~30 languages)
export {
  detectLanguageFromPath,
  getAllLanguageIds,
  getAllSupportedExtensions,
  getLanguageByExtension,
  getLanguageById,
  getLanguageStats,
  getLanguagesWithCapability,
  isExtensionSupported,
  LANGUAGE_SERVERS,
} from './NativeLSPLanguages.js';
export type {
  Entity,
  GraphQuery,
  MemorySnapshot,
  NativeMemoryConfig,
  Observation,
  Relation,
} from './NativeMemory.js';
// Memory - replaces @modelcontextprotocol/server-memory
export {
  createMemory,
  NativeMemory,
} from './NativeMemory.js';
export type {
  FileSearchOptions,
  FuzzyMatch,
  NativeSearchConfig,
  SymbolMatch,
  SymbolSearchOptions,
} from './NativeSearch.js';
// Search - advanced search capabilities
export {
  createSearch,
  NativeSearch,
} from './NativeSearch.js';
export type {
  NativeToolDefinition,
  NativeToolResult,
} from './NativeSerenaTools.js';
// Serena Tools - unified native implementation of Serena tools
export {
  createNativeSerenaTools,
  NativeSerenaTools,
  nativeSerenaTools,
} from './NativeSerenaTools.js';
export type {
  NativeShellConfig,
  ProcessInfo,
  ProcessResult,
  ShellInfo,
  ShellSession,
  ShellTimeoutConfig,
  ShellType,
  TimeoutProfile,
} from './nativeshell/index.js';
export { CwdValidationError, TIMEOUT_PROFILES } from './nativeshell/index.js';
// Shell - replaces @wonderwhy-er/desktop-commander
export {
  createShell,
  NativeShell,
} from './nativeshell/NativeShell.js';
export type {
  PathTraversalDetectionResult,
  SecurityAuditEntry,
  ValidateSecurePathOptions,
} from './PathTraversalProtection.js';
// Path Traversal Protection - comprehensive security against path traversal attacks
export {
  detectPathTraversal,
  getPathTraversalPatterns,
  hasTraversalPatterns,
  isPathSafe,
  PathTraversalError,
  sanitizePath,
  securityAuditLogger,
  validateSecurePath,
} from './PathTraversalProtection.js';
export type {
  ScriptExecOptions,
  ScriptExecutionLog,
  ScriptResult,
  ScriptValidationResult,
} from './SecureScriptExecutor.js';
// Secure Script Executor - secure Python/Node execution without shell=true
export {
  ALLOWED_SCRIPT_EXTENSIONS,
  createSecureScriptExecutor,
  PYTHON_SANDBOX_BLOCKED_IMPORTS,
  ScriptValidationError,
  SecureScriptExecutor,
} from './SecureScriptExecutor.js';
export type {
  ExecutionRecord,
  HealthCheckResult,
  PerformanceReport,
  ProcessStats,
  ShellInstallInfo,
  SystemShellInfo,
} from './ShellDiagnostics.js';
// Shell Diagnostics - comprehensive shell and process diagnostics
export {
  createShellDiagnostics,
  ShellDiagnostics,
} from './ShellDiagnostics.js';
export type {
  ShellPlatform,
  WindowsShellType,
} from './ShellEscape.js';
// Shell Escape - shell argument and command escaping utilities
export {
  buildCommand,
  createEnvAssignment,
  escapeForCmd,
  escapeForPowerShell,
  escapeGlobPattern,
  escapePathForShell,
  escapeRegex,
  escapeShellArg,
  escapeShellArgUnix,
  escapeShellArgWindows,
  escapeShellCommand,
  escapeShellCommandUnix,
  escapeShellCommandWindows,
  getCurrentPlatform,
  isCommandSafe,
  isWindowsPlatform,
  parseCommand,
  quoteArg,
  quoteArgUnix,
  quoteArgWindows,
  sanitizeCommand,
} from './ShellEscape.js';
export type {
  EscapeOptions,
  ExecuteOptions,
  HistoryEntry,
  ShellAvailability,
  ShellConfigProfile,
  ShellManagerConfig,
  TrackedProcess,
} from './ShellManager.js';
// ShellManager - Unified Shell Management Facade
export {
  createShellManager,
  createShellManagerWithProfile,
  getShellManager,
  initShellManager,
  resetShellManager,
  SHELL_PROFILES,
  ShellManager,
  shellManager,
} from './ShellManager.js';

// ============================================================
// NativeTools - Unified API
// ============================================================

import { type NativeCodeIntelligence, nativeCodeIntelligence } from './NativeCodeIntelligence.js';
import { createMemory, type NativeMemory } from './NativeMemory.js';
import { createSearch, type NativeSearch } from './NativeSearch.js';
import { createFileSystem, type NativeFileSystem } from './nativefilesystem/NativeFileSystem.js';
import { createShell, type NativeShell } from './nativeshell/NativeShell.js';
import { createSecureScriptExecutor, type SecureScriptExecutor } from './SecureScriptExecutor.js';
import { createShellManager, type ShellManager } from './ShellManager.js';

export interface NativeToolsConfig {
  rootDir: string;
  memoryPath?: string;
  autoSaveMemory?: boolean;
  defaultShell?: string;
}

export class NativeTools {
  readonly fs: NativeFileSystem;
  readonly memory: NativeMemory;
  readonly shell: NativeShell;
  readonly shellManager: ShellManager;
  readonly search: NativeSearch;
  readonly code: NativeCodeIntelligence;
  readonly scripts: SecureScriptExecutor;

  private config: NativeToolsConfig;

  constructor(config: NativeToolsConfig) {
    this.config = config;

    this.fs = createFileSystem(config.rootDir);

    this.memory = createMemory({
      persistPath: config.memoryPath || path.join(GEMINIHYDRA_DIR, 'memory.json'),
      autoSave: config.autoSaveMemory ?? true,
    });

    // Create both NativeShell (for backward compatibility) and ShellManager
    this.shell = createShell({
      cwd: config.rootDir,
      defaultShell: config.defaultShell,
    });

    // ShellManager provides unified, enhanced shell management
    this.shellManager = createShellManager({
      cwd: config.rootDir,
      defaultShell: config.defaultShell,
      profile: 'default',
    });

    this.search = createSearch(config.rootDir);

    this.code = nativeCodeIntelligence;

    // SecureScriptExecutor for safe Python/Node execution (no shell=true)
    this.scripts = createSecureScriptExecutor({
      cwd: config.rootDir,
      sandbox: false, // Default to non-sandboxed, can be enabled per-call
    });
  }

  /**
   * Initialize all tools (load persisted data, etc.)
   */
  async init(): Promise<void> {
    try {
      await this.memory.load();
      console.log(chalk.green('[NativeTools] Memory loaded'));
    } catch {
      console.log(chalk.gray('[NativeTools] No existing memory found'));
    }

    // Initialize code intelligence
    await this.code.init(this.config.rootDir);
    console.log(chalk.green('[NativeTools] Code intelligence initialized'));
  }

  /**
   * Save state and cleanup
   */
  async shutdown(): Promise<void> {
    await this.memory.save();
    this.memory.destroy();
    this.shell.destroy();
    this.shellManager.destroy();
    this.fs.stopAllWatchers();
    await this.code.shutdown();
    console.log(chalk.yellow('[NativeTools] Shutdown complete'));
  }

  /**
   * Print status of all tools
   */
  printStatus(): void {
    console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════'));
    console.log(chalk.cyan('                    NATIVE TOOLS STATUS'));
    console.log(chalk.cyan('═══════════════════════════════════════════════════════════════'));

    this.fs.printStatus();
    this.memory.printStatus();
    this.shell.printStatus();
    this.search.printStatus();

    console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════════\n'));
  }
}

// ============================================================
// Factory Function
// ============================================================

let instance: NativeTools | null = null;

export function createNativeTools(config: NativeToolsConfig): NativeTools {
  instance = new NativeTools(config);
  return instance;
}

export function getNativeTools(): NativeTools | null {
  return instance;
}

// ============================================================
// Singleton for Current Project
// ============================================================

let projectTools: NativeTools | null = null;

export async function initProjectTools(rootDir: string): Promise<NativeTools> {
  if (projectTools) {
    await projectTools.shutdown();
  }

  projectTools = createNativeTools({ rootDir });
  await projectTools.init();

  console.log(chalk.green(`[NativeTools] Initialized for: ${rootDir}`));
  return projectTools;
}

export function getProjectTools(): NativeTools | null {
  return projectTools;
}

// Default export
export { NativeTools as default };
