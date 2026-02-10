/**
 * CommandRegistry - Module index
 *
 * Re-exports all command registry components.
 *
 * Original CommandRegistry.ts (2196 lines) has been split into:
 * - types.ts              - Enums, interfaces, type definitions
 * - CommandRegistry.ts    - CommandRegistry class, singleton, helpers
 *
 * @module cli/commandregistry/index
 */

// Main class, singleton and helpers
export {
  CommandRegistry,
  commandRegistry,
  error,
  success,
} from './CommandRegistry.js';
export type {
  ArgType,
  Command,
  CommandArg,
  CommandContext,
  CommandHandler,
  CommandInfo,
  CommandRateLimitConfig,
  CommandResult,
  ConflictInfo,
  ConflictLogger,
  CwdChangeEvent,
  CwdChangeListener,
  CwdHistoryEntry,
  CwdManagerOptions,
  CwdValidationResult,
  FlagDefinition,
  ParsedArgs,
  RateLimitConfig,
  RateLimitStatus,
  RegisterOptions,
  Subcommand,
  SubcommandInfo,
  SubcommandOptions,
  ValidationResult,
} from './types.js';
// Types and enums
export {
  CommandPriority,
  RateLimitExceededError,
} from './types.js';
