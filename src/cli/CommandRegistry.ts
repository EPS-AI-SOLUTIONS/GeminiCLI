/**
 * CommandRegistry - Backward-compatible re-export shim
 *
 * Original file (2196 lines) has been split into:
 * - commandregistry/types.ts          - All type definitions
 * - commandregistry/CommandRegistry.ts - Main class and singleton
 * - commandregistry/index.ts          - Re-exports
 *
 * @module cli/CommandRegistry
 */
export type {
  AnyCommandHandler,
  AsyncCommandHandler,
  CancellationToken,
  ExecuteOptions,
  ExtendedCommandContext,
  ExtendedCommandHandler,
  ProgressCallback,
  ProgressInfo,
  SyncCommandHandler,
} from './AsyncUtils.js';
// Re-export async utilities for convenience
export {
  CancellationError,
  CancellationTokenSource,
  delay,
  executeWithCancellation,
  executeWithTimeout,
  executeWithTimeoutAndCancellation,
  globalOperationTracker,
  isAsyncFunction,
  OperationTracker,
  ProgressReporter,
  retry,
  TimeoutError,
  withCancellation,
  withCancellationAndProgress,
  withProgress,
  wrapHandler,
} from './AsyncUtils.js';
export type {
  ErrorHandler,
  ErrorLogEntry,
} from './CommandErrors.js';
// Re-export error handling
export {
  CommandError,
  CommandErrorCode,
  CommandTimeoutError,
  detectErrorCode,
  ERROR_SUGGESTIONS,
  ErrorLogger,
  ExecutionError,
  globalErrorLogger,
  isRetryableError,
  TemporaryError,
  ValidationError,
} from './CommandErrors.js';
export type {
  ArgType,
  Command,
  CommandArg,
  CommandContext,
  CommandHandler,
  // Command types
  CommandInfo,
  CommandRateLimitConfig,
  CommandResult,
  // Conflict types
  ConflictInfo,
  ConflictLogger,
  CwdChangeEvent,
  CwdChangeListener,
  // CWD types
  CwdHistoryEntry,
  CwdManagerOptions,
  CwdValidationResult,
  FlagDefinition,
  ParsedArgs,
  // Rate limiting types
  RateLimitConfig,
  RateLimitStatus,
  RegisterOptions,
  Subcommand,
  // Subcommand types
  SubcommandInfo,
  SubcommandOptions,
  ValidationResult,
} from './commandregistry/index.js';
// Re-export all from commandregistry module
export {
  // Enums and classes
  CommandPriority,
  CommandRegistry,
  commandRegistry,
  error,
  RateLimitExceededError,
  success,
} from './commandregistry/index.js';

// Default export for backward compatibility
import { commandRegistry as _commandRegistry } from './commandregistry/index.js';
export default _commandRegistry;
