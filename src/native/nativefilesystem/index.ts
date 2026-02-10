/**
 * NativeFileSystem - Module index
 *
 * Re-exports all NativeFileSystem components.
 *
 * Original NativeFileSystem.ts (2572 lines) has been split into:
 * - types.ts           - All type definitions, interfaces, constants
 * - NativeFileSystem.ts - NativeFileSystem class, createFileSystem factory
 *
 * @module native/nativefilesystem/index
 */

// Main class and factory
export { createFileSystem, NativeFileSystem } from './NativeFileSystem.js';
// Types and interfaces
export type {
  DirectoryCreationError,
  DirectoryTree,
  EnsureDirectoryResult,
  NativeFileSystemConfig,
  PathDiagnosticLog,
  PathValidationResult,
  SymlinkType,
  SymlinkWarning,
  WatchEvent,
  WriteFileOptions,
} from './types.js';
// Constants
export { DEFAULT_BLOCKED_PATHS } from './types.js';
