/**
 * NativeShell - Module index
 *
 * Re-exports all NativeShell components.
 *
 * Original NativeShell.ts (3007 lines) has been split into:
 * - types.ts      - All type definitions, interfaces, error classes
 * - constants.ts  - Shell paths, command translations, env profiles, sandbox
 * - helpers.ts    - analyzeStderr, createProcessResult, default config factories
 * - NativeShell.ts - NativeShell class, createShell factory
 *
 * @module native/nativeshell/index
 */

// Constants
export {
  ALLOWED_SCRIPT_EXTENSIONS,
  COMMAND_TRANSLATIONS,
  DEFAULT_BLOCKED_ENV_VARS,
  DEFAULT_MAX_OUTPUT_SIZE,
  DEFAULT_PROGRESS_PATTERNS,
  ENVIRONMENT_PROFILES,
  PYTHON_SANDBOX_BLOCKED_IMPORTS,
  SENSITIVE_ENV_PATTERNS,
  SHELL_FALLBACK_ORDER,
  SHELL_PATHS,
  TIMEOUT_PROFILES,
} from './constants.js';
// Helpers
export {
  analyzeStderr,
  createDefaultEnvironmentConfig,
  createDefaultTimeoutConfig,
  createProcessResult,
} from './helpers.js';
// Main class and factory
export { createShell, NativeShell } from './NativeShell.js';
// Types and interfaces
export type {
  CleanupStats,
  CommandMapping,
  EnvironmentConfig,
  EnvironmentProfile,
  ExecOptions,
  GracefulShutdownConfig,
  NativeShellConfig,
  OutputChunk,
  PipeOptions,
  ProcessInfo,
  ProcessResult,
  ProgressExecOptions,
  ProgressInfo,
  ScriptExecOptions,
  ScriptExecutionLog,
  ScriptValidationResult,
  ShellInfo,
  ShellSession,
  ShellTimeoutConfig,
  ShellType,
  StderrAnalysis,
  StreamingExecOptions,
  StreamingExecResult,
  TimeoutProfile,
  ZombieProcessInfo,
} from './types.js';
// Error classes
export {
  CwdValidationError,
  ScriptValidationError,
} from './types.js';
