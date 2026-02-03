/**
 * Native Tools Shared Types - GeminiHydra
 *
 * Unified type definitions shared across native modules.
 */

// ============================================================
// FileInfo Types
// ============================================================

/**
 * File type classification
 */
export type FileType = 'pdf' | 'docx' | 'image' | 'csv' | 'json' | 'yaml' | 'code' | 'text' | 'file' | 'directory' | 'unknown';

/**
 * Unified FileInfo interface combining:
 * - NativeFileSystem.ts (detailed: birthtime, atime, mtime, mode, extension)
 * - FileHandlers.ts (lightweight: path, name, type, size, extension)
 * - CodebaseMemory.ts (specialized: language, isIgnored, depth, code analysis)
 *
 * Required fields: path, name, type
 * All other fields are optional to support different use cases.
 */
export interface FileInfo {
  // === Required fields ===
  /** File path (absolute or relative depending on context) */
  path: string;

  /** File name (basename) */
  name: string;

  /** Type classification */
  type: FileType;

  // === Common optional fields ===
  /** File size in bytes */
  size?: number;

  /** File extension (without dot) */
  extension?: string;

  // === From NativeFileSystem.ts ===
  /** Is this a directory */
  isDirectory?: boolean;

  /** Is this a regular file */
  isFile?: boolean;

  /** Is this a symbolic link */
  isSymlink?: boolean;

  /** Creation time (birthtime) */
  created?: Date;

  /** Last modification time */
  modified?: Date;

  /** Last access time */
  accessed?: Date;

  /** File mode/permissions (Unix-style) */
  mode?: number;

  // === From CodebaseMemory.ts ===
  /** Relative path from project root */
  relativePath?: string;

  /** Number of lines in the file */
  lines?: number;

  /** Exported symbols (for code files) */
  exports?: string[];

  /** Imported modules/symbols (for code files) */
  imports?: string[];

  /** Class names found in the file */
  classes?: string[];

  /** Function names found in the file */
  functions?: string[];

  /** AI-generated or extracted summary */
  summary?: string;

  /** Last modified timestamp (ISO string) */
  lastModified?: string;

  /** When the file was analyzed (ISO string) */
  analyzedAt?: string;

  // === Extended fields for special use cases ===
  /** Programming language detected */
  language?: string;

  /** Whether file is in ignore list */
  isIgnored?: boolean;

  /** Depth from root directory */
  depth?: number;

  /** MIME type */
  mimeType?: string;

  /** Hash/checksum of file contents */
  hash?: string;

  /** Encoding detected */
  encoding?: string;
}

/**
 * Lightweight version for list operations
 */
export type FileInfoBasic = Pick<FileInfo, 'path' | 'name' | 'type' | 'size' | 'extension'>;

/**
 * Version with filesystem stats
 */
export type FileInfoWithStats = FileInfo & Required<Pick<FileInfo, 'size' | 'isDirectory' | 'isFile' | 'created' | 'modified' | 'accessed' | 'mode'>>;

/**
 * Version with code analysis
 */
export type FileInfoWithAnalysis = FileInfo & Required<Pick<FileInfo, 'lines' | 'exports' | 'imports' | 'classes' | 'functions'>>;

// ============================================================
// Search Types
// ============================================================

/**
 * Unified SearchMatch interface combining:
 * - NativeFileSystem.ts context format (string)
 * - NativeSearch.ts context format (string[])
 *
 * The context field supports both formats for flexibility.
 */
export interface SearchMatch {
  /** File path relative to root */
  file: string;

  /** Line number (1-indexed) */
  line: number;

  /** Column number (1-indexed) */
  column: number;

  /** The line content containing the match */
  content: string;

  /** The exact text that was matched (optional for simple searches) */
  matchedText?: string;

  /**
   * Context lines around the match
   * Supports both string (joined) and string[] (individual lines) formats
   */
  context?: {
    before: string | string[];
    after: string | string[];
  };

  /** Optional relevance score */
  score?: number;
}

// ============================================================
// Re-export common types that might be shared
// ============================================================

// Utility type for flexible context
export type SearchContext = {
  before: string | string[];
  after: string | string[];
};

// Helper function to normalize context to string array format
export function normalizeContextToArray(context: SearchContext | undefined): { before: string[]; after: string[] } | undefined {
  if (!context) return undefined;

  return {
    before: Array.isArray(context.before) ? context.before : context.before.split('\n'),
    after: Array.isArray(context.after) ? context.after : context.after.split('\n')
  };
}

// Helper function to normalize context to string format
export function normalizeContextToString(context: SearchContext | undefined): { before: string; after: string } | undefined {
  if (!context) return undefined;

  return {
    before: Array.isArray(context.before) ? context.before.join('\n') : context.before,
    after: Array.isArray(context.after) ? context.after.join('\n') : context.after
  };
}

// ============================================================
// File Attributes Types (Windows-specific with Unix fallback)
// ============================================================

/**
 * Windows file attributes structure
 * On Unix systems, provides equivalent information from fs.stat
 */
export interface FileAttributes {
  /** File is read-only (Windows: R attribute, Unix: no write permission) */
  readonly: boolean;

  /** File is hidden (Windows: H attribute, Unix: starts with dot) */
  hidden: boolean;

  /** File is a system file (Windows: S attribute, Unix: always false) */
  system: boolean;

  /** File is an archive (Windows: A attribute, Unix: always false) */
  archive?: boolean;

  /** Raw platform-specific attributes value */
  raw?: string;
}

/**
 * Options for setting file attributes
 */
export interface SetFileAttributesOptions {
  /** Set read-only attribute */
  readonly?: boolean;

  /** Set hidden attribute */
  hidden?: boolean;

  /** Set system attribute */
  system?: boolean;

  /** Set archive attribute */
  archive?: boolean;
}

/**
 * Result of setting file attributes
 */
export interface SetFileAttributesResult {
  /** Whether the operation succeeded */
  success: boolean;

  /** Previous attributes before the change */
  previousAttributes?: FileAttributes;

  /** New attributes after the change */
  newAttributes?: FileAttributes;

  /** Error message if the operation failed */
  error?: string;
}

// ============================================================
// File Lock Types
// ============================================================

/**
 * Information about a file lock
 */
export interface FileLockInfo {
  /** Whether the file is locked */
  isLocked: boolean;

  /** Path to the locked file */
  filePath: string;

  /** Process ID that holds the lock (if detectable) */
  processId?: number;

  /** Process name that holds the lock (if detectable) */
  processName?: string;

  /** Command line of the locking process (if detectable) */
  commandLine?: string;

  /** Lock type (exclusive, shared, etc.) */
  lockType?: 'exclusive' | 'shared' | 'unknown';

  /** Error message if lock detection failed */
  error?: string;

  /** Timestamp when lock was detected */
  detectedAt: Date;
}

/**
 * Options for retry operations on locked files
 */
export interface FileLockRetryOptions {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries?: number;

  /** Initial delay in milliseconds before first retry (default: 100ms) */
  initialDelayMs?: number;

  /** Maximum delay in milliseconds between retries (default: 5000ms) */
  maxDelayMs?: number;

  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier?: number;

  /** Optional callback for each retry attempt */
  onRetry?: (attempt: number, delay: number, lockInfo: FileLockInfo) => void;

  /** Whether to throw on final failure or return error result */
  throwOnFinalFailure?: boolean;
}

/**
 * Result of a write operation with retry
 */
export interface WriteWithRetryResult {
  /** Whether the write succeeded */
  success: boolean;

  /** Number of attempts made */
  attempts: number;

  /** Total time spent in milliseconds */
  totalTimeMs: number;

  /** Lock info if file was locked */
  lockInfo?: FileLockInfo;

  /** Error if write failed */
  error?: Error;
}

/**
 * Error thrown when file is locked
 */
export class FileLockError extends Error {
  constructor(
    message: string,
    public readonly lockInfo: FileLockInfo
  ) {
    super(message);
    this.name = 'FileLockError';
  }
}
