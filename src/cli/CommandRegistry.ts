/**
 * CommandRegistry - Centralized command management for CLI
 *
 * Provides unified command registration, execution, and help generation.
 * Includes rate limiting with token bucket algorithm.
 */

import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

// Import enhanced argument parser
import {
  parseArgs as enhancedParseArgs,
  tokenizeInput,
  validateCommandFlags,
  generateFlagHelp,
  FlagDefinition as EnhancedFlagDefinition,
  ParsedArgs as EnhancedParsedArgs
} from './EnhancedArgParser.js';

// Re-export async utilities for convenience
export {
  CancellationToken,
  CancellationTokenSource,
  CancellationError,
  TimeoutError,
  ProgressInfo,
  ProgressCallback,
  ProgressReporter,
  isAsyncFunction,
  wrapHandler,
  withCancellation,
  withProgress,
  withCancellationAndProgress,
  executeWithTimeout,
  executeWithCancellation,
  executeWithTimeoutAndCancellation,
  delay,
  retry,
  OperationTracker,
  globalOperationTracker,
  SyncCommandHandler,
  AsyncCommandHandler,
  AnyCommandHandler,
  ExtendedCommandContext,
  ExtendedCommandHandler,
  ExecuteOptions
} from './AsyncUtils.js';

// Import and re-export enhanced error handling
import {
  CommandErrorCode,
  ERROR_SUGGESTIONS,
  isRetryableError,
  detectErrorCode,
  CommandError,
  ValidationError,
  ExecutionError,
  CommandTimeoutError,
  TemporaryError,
  ErrorHandler,
  ErrorLogEntry,
  ErrorLogger,
  globalErrorLogger
} from './CommandErrors.js';

export {
  CommandErrorCode,
  ERROR_SUGGESTIONS,
  isRetryableError,
  detectErrorCode,
  CommandError,
  ValidationError,
  ExecutionError,
  CommandTimeoutError,
  TemporaryError,
  ErrorHandler,
  ErrorLogEntry,
  ErrorLogger,
  globalErrorLogger
};

// ============================================================================
// Command Priority Types
// ============================================================================

/**
 * Command priority levels
 * Higher values = higher priority
 */
export enum CommandPriority {
  PLUGIN = 0,
  USER = 1,
  BUILTIN = 2
}

// ============================================================================
// Conflict Detection Types
// ============================================================================

/**
 * Conflict information
 */
export interface ConflictInfo {
  /** The conflicting identifier (name or alias) */
  identifier: string;
  /** Type of conflict */
  type: 'name' | 'alias';
  /** Command that owns the identifier */
  existingCommand: string;
  /** Command that tried to register */
  newCommand: string;
  /** Priority of existing command */
  existingPriority: CommandPriority;
  /** Priority of new command */
  newPriority: CommandPriority;
  /** Whether the new command would win based on priority */
  wouldOverwrite: boolean;
  /** Timestamp of conflict detection */
  timestamp: number;
}

/**
 * Options for command registration
 */
export interface RegisterOptions {
  /** Force overwrite if conflict exists */
  overwrite?: boolean;
  /** Suppress conflict warnings */
  silent?: boolean;
}

/**
 * Logger interface for conflict warnings
 */
export interface ConflictLogger {
  warn(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}

// ============================================================================
// Rate Limiting Types
// ============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxCommandsPerSecond: number;
  maxCommandsPerMinute: number;
  enabled: boolean;
}

/**
 * Per-command rate limit configuration
 */
export interface CommandRateLimitConfig {
  maxPerSecond?: number;
  maxPerMinute?: number;
}

/**
 * Rate limit status information
 */
export interface RateLimitStatus {
  enabled: boolean;
  tokensPerSecond: number;
  tokensPerMinute: number;
  maxTokensPerSecond: number;
  maxTokensPerMinute: number;
  lastRefillTime: number;
  whitelistedCommands: string[];
  perCommandLimits: Record<string, CommandRateLimitConfig>;
  recentCommands: { command: string; timestamp: number }[];
}

/**
 * Rate limit exceeded error
 */
export class RateLimitExceededError extends Error {
  public readonly retryAfterMs: number;
  public readonly limitType: 'second' | 'minute';

  constructor(limitType: 'second' | 'minute', retryAfterMs: number) {
    super(`Rate limit exceeded: too many commands per ${limitType}. Retry after ${Math.ceil(retryAfterMs)}ms`);
    this.name = 'RateLimitExceededError';
    this.limitType = limitType;
    this.retryAfterMs = retryAfterMs;
  }
}

// ============================================================================
// Subcommand Types
// ============================================================================

/**
 * Subcommand info with parent reference
 */
export interface SubcommandInfo {
  name: string;
  aliases: string[];
  description: string;
  parentCommand: string;
  usage?: string;
  args?: CommandArg[];
  hidden: boolean;
}

/**
 * Options for registering a subcommand
 */
export interface SubcommandOptions {
  /** Inherit flags from parent command (default: true) */
  inheritFlags?: boolean;
  /** Additional flags specific to this subcommand */
  additionalFlags?: FlagDefinition[];
}

/**
 * Extended subcommand with parent reference and options
 */
export interface Subcommand extends Command {
  parentName: string;
  inheritFlags: boolean;
}

// ============================================================================
// CWD (Current Working Directory) Management Types
// ============================================================================

/**
 * CWD History entry for pushd/popd functionality
 */
export interface CwdHistoryEntry {
  path: string;
  timestamp: Date;
}

/**
 * CWD Manager configuration options
 */
export interface CwdManagerOptions {
  /** Synchronize CWD with process.cwd() */
  syncWithProcess: boolean;
  /** Maximum number of entries in CWD history stack */
  maxHistorySize: number;
  /** Validate directory exists before changing CWD */
  validateOnChange: boolean;
}

/**
 * CWD change event data
 */
export interface CwdChangeEvent {
  previousCwd: string;
  newCwd: string;
  timestamp: Date;
}

/**
 * CWD change listener type
 */
export type CwdChangeListener = (event: CwdChangeEvent) => void;

/**
 * CWD validation result
 */
export interface CwdValidationResult {
  valid: boolean;
  exists: boolean;
  isDirectory: boolean;
  isAccessible: boolean;
  error?: string;
}

// ============================================================================
// Command Types
// ============================================================================

/**
 * Command info with all details including aliases
 */
export interface CommandInfo {
  name: string;
  aliases: string[];
  description: string;
  category: string;
  usage?: string;
  args?: CommandArg[];
  hidden: boolean;
  hasSubcommands: boolean;
  namespace?: string;
  priority?: CommandPriority;
}

/**
 * Argument type for validation
 */
export type ArgType = 'string' | 'number' | 'boolean' | 'path';

/**
 * Command argument definition
 */
export interface CommandArg {
  name: string;
  description: string;
  required?: boolean;
  default?: string | number | boolean;
  type?: ArgType;
  /** Custom validation function - returns true if valid, or error message string */
  validate?: (value: string) => boolean | string;
  /** Allowed values for enum-like arguments */
  choices?: string[];
}

/**
 * Validation result for argument checking
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  /** Parsed and validated arguments with types applied */
  parsedArgs: Record<string, string | number | boolean>;
}

/**
 * Flag definition for commands
 */
export interface FlagDefinition {
  /** Short flag name without dash (e.g., 'f' for -f) */
  short?: string;
  /** Long flag name without dashes (e.g., 'force' for --force) */
  long: string;
  /** Description for help text */
  description: string;
  /** Whether flag accepts a value */
  type: 'boolean' | 'string' | 'number';
  /** Default value if not provided */
  default?: string | boolean | number;
  /** Whether this flag is required */
  required?: boolean;
  /** Aliases for the flag */
  aliases?: string[];
}

/**
 * Parsed arguments result
 */
export interface ParsedArgs {
  /** Positional arguments (non-flag arguments) */
  positional: string[];
  /** Parsed flags with their values */
  flags: Record<string, string | boolean | number>;
  /** Raw input string */
  raw: string;
  /** Unknown flags that were encountered */
  unknownFlags: string[];
  /** Validation errors */
  errors: string[];
  /** Index where -- was found (-1 if not present) */
  doubleDashIndex: number;
  /** Arguments after -- (passed through as-is) */
  passthrough: string[];
}

/**
 * Command result with unified format
 */
export interface CommandResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

/**
 * Command context passed to handlers
 */
export interface CommandContext {
  cwd: string;
  args: string[];
  flags: Record<string, string | boolean>;
  rawArgs: string;
}

/**
 * Command handler function type
 */
export type CommandHandler = (ctx: CommandContext) => Promise<CommandResult>;

/**
 * Command definition
 */
export interface Command {
  name: string;
  aliases: string[];
  description: string;
  usage?: string;
  args?: CommandArg[];
  /** Flag definitions for this command */
  flags?: FlagDefinition[];
  handler: CommandHandler;
  subcommands?: Map<string, Command>;
  category?: string;
  hidden?: boolean;
  /** Namespace for the command (e.g., 'fs', 'mcp') */
  namespace?: string;
  /** Priority level for conflict resolution */
  priority?: CommandPriority;
}

/**
 * Default console logger
 */
const defaultLogger: ConflictLogger = {
  warn: (msg: string) => console.warn(chalk.yellow(`[CommandRegistry] ${msg}`)),
  info: (msg: string) => console.log(chalk.gray(`[CommandRegistry] ${msg}`)),
  debug: (msg: string) => console.log(chalk.dim(`[CommandRegistry] ${msg}`))
};

/**
 * Registry for managing CLI commands with rate limiting
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private aliasMap: Map<string, string> = new Map();
  private categories: Map<string, Set<string>> = new Map();
  private namespaces: Map<string, Set<string>> = new Map();
  private conflictHistory: ConflictInfo[] = [];
  private debugMode: boolean = false;
  private logger: ConflictLogger;

  // Rate limiting - Token Bucket state
  private rateLimitConfig: RateLimitConfig = {
    maxCommandsPerSecond: 10,
    maxCommandsPerMinute: 60,
    enabled: false
  };
  private tokensPerSecond: number = 10;
  private tokensPerMinute: number = 60;
  private lastSecondRefill: number = Date.now();
  private lastMinuteRefill: number = Date.now();

  // Sliding window for command tracking
  private commandHistory: { command: string; timestamp: number }[] = [];
  private readonly HISTORY_RETENTION_MS = 60000; // Keep 1 minute of history

  // Whitelist for commands that bypass rate limiting
  private whitelistedCommands: Set<string> = new Set(['help', 'h', '?', 'version', 'v']);

  // Per-command rate limits (stricter than global)
  private perCommandLimits: Map<string, CommandRateLimitConfig> = new Map();

  // Global error handler for all command errors
  private globalErrorHandler: ErrorHandler | null = null;

  // Default timeout for command execution (30 seconds)
  private defaultTimeout: number = 30000;

  constructor(logger?: ConflictLogger) {
    this.logger = logger || defaultLogger;
  }

  // ============================================================================
  // Error Handling Methods
  // ============================================================================

  /**
   * Set global error handler for all command errors
   * @param handler The error handler function
   */
  setErrorHandler(handler: ErrorHandler): void {
    this.globalErrorHandler = handler;
    this.debugLog('Global error handler set');
  }

  /**
   * Remove global error handler
   */
  removeErrorHandler(): void {
    this.globalErrorHandler = null;
    this.debugLog('Global error handler removed');
  }

  /**
   * Get the current error handler
   */
  getErrorHandler(): ErrorHandler | null {
    return this.globalErrorHandler;
  }

  /**
   * Set default timeout for command execution
   * @param timeoutMs Timeout in milliseconds
   */
  setDefaultTimeout(timeoutMs: number): void {
    if (timeoutMs < 0) {
      throw new Error('Timeout must be non-negative');
    }
    this.defaultTimeout = timeoutMs;
    this.debugLog(`Default timeout set to ${timeoutMs}ms`);
  }

  /**
   * Get default timeout
   */
  getDefaultTimeout(): number {
    return this.defaultTimeout;
  }

  /**
   * Get error log from global error logger
   */
  getErrorLog(): ErrorLogEntry[] {
    return globalErrorLogger.getLog();
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    globalErrorLogger.clear();
    this.debugLog('Error log cleared');
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): ErrorLogEntry[] {
    return globalErrorLogger.getUnresolved();
  }

  /**
   * Enable or disable debug mode for logging
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Set custom logger
   */
  setLogger(logger: ConflictLogger): void {
    this.logger = logger;
  }

  /**
   * Log message in debug mode
   */
  private debugLog(message: string): void {
    if (this.debugMode) {
      this.logger.debug(message);
    }
  }

  /**
   * Get full command name with namespace
   */
  private getFullName(command: Command): string {
    if (command.namespace) {
      return `${command.namespace}.${command.name}`;
    }
    return command.name;
  }

  /**
   * Parse a namespaced command identifier
   */
  parseNamespacedName(identifier: string): { namespace?: string; name: string } {
    const parts = identifier.split('.');
    if (parts.length > 1) {
      return {
        namespace: parts.slice(0, -1).join('.'),
        name: parts[parts.length - 1]
      };
    }
    return { name: identifier };
  }

  /**
   * Get human-readable priority string
   */
  getPriorityString(priority: CommandPriority): string {
    switch (priority) {
      case CommandPriority.BUILTIN:
        return 'built-in';
      case CommandPriority.USER:
        return 'user';
      case CommandPriority.PLUGIN:
        return 'plugin';
      default:
        return 'unknown';
    }
  }

  /**
   * Check for conflicts before registration
   */
  private checkConflicts(
    command: Command,
    options: RegisterOptions = {}
  ): { hasConflict: boolean; conflicts: ConflictInfo[] } {
    const conflicts: ConflictInfo[] = [];
    const fullName = this.getFullName(command);
    const newPriority = command.priority ?? CommandPriority.PLUGIN;

    // Check main name conflict
    if (this.commands.has(fullName)) {
      const existing = this.commands.get(fullName)!;
      const existingPriority = existing.priority ?? CommandPriority.PLUGIN;
      conflicts.push({
        identifier: fullName,
        type: 'name',
        existingCommand: this.getFullName(existing),
        newCommand: fullName,
        existingPriority,
        newPriority,
        wouldOverwrite: newPriority > existingPriority || options.overwrite === true,
        timestamp: Date.now()
      });
    }

    // Check alias conflicts
    for (const alias of command.aliases || []) {
      const fullAlias = command.namespace ? `${command.namespace}.${alias}` : alias;

      // Check if alias conflicts with existing alias
      if (this.aliasMap.has(fullAlias)) {
        const existingName = this.aliasMap.get(fullAlias)!;
        const existing = this.commands.get(existingName);
        if (existing) {
          const existingPriority = existing.priority ?? CommandPriority.PLUGIN;
          conflicts.push({
            identifier: fullAlias,
            type: 'alias',
            existingCommand: this.getFullName(existing),
            newCommand: fullName,
            existingPriority,
            newPriority,
            wouldOverwrite: newPriority > existingPriority || options.overwrite === true,
            timestamp: Date.now()
          });
        }
      }

      // Check if alias conflicts with existing command name
      if (this.commands.has(fullAlias)) {
        const existing = this.commands.get(fullAlias)!;
        const existingPriority = existing.priority ?? CommandPriority.PLUGIN;
        conflicts.push({
          identifier: fullAlias,
          type: 'alias',
          existingCommand: this.getFullName(existing),
          newCommand: fullName,
          existingPriority,
          newPriority,
          wouldOverwrite: newPriority > existingPriority || options.overwrite === true,
          timestamp: Date.now()
        });
      }
    }

    // Also check short name (without namespace) for potential shadowing
    if (command.namespace && this.commands.has(command.name)) {
      const existing = this.commands.get(command.name)!;
      if (!existing.namespace) {
        // Namespaced command might shadow non-namespaced one
        const existingPriority = existing.priority ?? CommandPriority.PLUGIN;
        conflicts.push({
          identifier: command.name,
          type: 'name',
          existingCommand: existing.name,
          newCommand: fullName,
          existingPriority,
          newPriority,
          wouldOverwrite: false, // Namespaced doesn't overwrite non-namespaced
          timestamp: Date.now()
        });
      }
    }

    return { hasConflict: conflicts.length > 0, conflicts };
  }

  /**
   * Log conflict warnings
   */
  private logConflicts(conflicts: ConflictInfo[], silent: boolean = false): void {
    if (silent) return;

    for (const conflict of conflicts) {
      const priorityStr = this.getPriorityString(conflict.existingPriority);
      const newPriorityStr = this.getPriorityString(conflict.newPriority);

      if (conflict.wouldOverwrite) {
        this.logger.warn(
          `Command ${conflict.type} '${conflict.identifier}' conflict: ` +
          `'${conflict.newCommand}' (${newPriorityStr}) overwrites ` +
          `'${conflict.existingCommand}' (${priorityStr})`
        );
      } else {
        this.logger.warn(
          `Command ${conflict.type} '${conflict.identifier}' conflict: ` +
          `'${conflict.newCommand}' (${newPriorityStr}) blocked by ` +
          `'${conflict.existingCommand}' (${priorityStr})`
        );
      }
    }
  }

  /**
   * Unregister a command
   */
  unregister(nameOrAlias: string): boolean {
    const command = this.get(nameOrAlias);
    if (!command) return false;

    const fullName = this.getFullName(command);

    // Remove from commands
    this.commands.delete(fullName);

    // Remove aliases
    for (const alias of command.aliases || []) {
      const fullAlias = command.namespace ? `${command.namespace}.${alias}` : alias;
      this.aliasMap.delete(fullAlias);
      if (command.namespace) {
        this.aliasMap.delete(alias);
      }
    }

    // Remove short name alias
    if (command.namespace) {
      this.aliasMap.delete(command.name);
    }

    // Remove from category
    const category = command.category || 'general';
    this.categories.get(category)?.delete(fullName);

    // Remove from namespace
    if (command.namespace) {
      this.namespaces.get(command.namespace)?.delete(fullName);
    }

    this.debugLog(`Unregistered command: ${fullName}`);
    return true;
  }

  // ============================================================================
  // Rate Limiting Methods
  // ============================================================================

  /**
   * Configure rate limiting
   */
  setRateLimit(config: Partial<RateLimitConfig>): void {
    if (config.maxCommandsPerSecond !== undefined) {
      this.rateLimitConfig.maxCommandsPerSecond = config.maxCommandsPerSecond;
      this.tokensPerSecond = config.maxCommandsPerSecond;
    }
    if (config.maxCommandsPerMinute !== undefined) {
      this.rateLimitConfig.maxCommandsPerMinute = config.maxCommandsPerMinute;
      this.tokensPerMinute = config.maxCommandsPerMinute;
    }
    if (config.enabled !== undefined) {
      this.rateLimitConfig.enabled = config.enabled;
    }
    this.debugLog(`Rate limit configured: ${JSON.stringify(this.rateLimitConfig)}`);
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(): RateLimitStatus {
    this.refillTokens();
    this.cleanupHistory();

    return {
      enabled: this.rateLimitConfig.enabled,
      tokensPerSecond: this.tokensPerSecond,
      tokensPerMinute: this.tokensPerMinute,
      maxTokensPerSecond: this.rateLimitConfig.maxCommandsPerSecond,
      maxTokensPerMinute: this.rateLimitConfig.maxCommandsPerMinute,
      lastRefillTime: Math.max(this.lastSecondRefill, this.lastMinuteRefill),
      whitelistedCommands: Array.from(this.whitelistedCommands),
      perCommandLimits: Object.fromEntries(this.perCommandLimits),
      recentCommands: [...this.commandHistory]
    };
  }

  /**
   * Add commands to the rate limit whitelist
   */
  addToWhitelist(...commands: string[]): void {
    for (const cmd of commands) {
      this.whitelistedCommands.add(cmd);
    }
    this.debugLog(`Added to whitelist: ${commands.join(', ')}`);
  }

  /**
   * Remove commands from the rate limit whitelist
   */
  removeFromWhitelist(...commands: string[]): void {
    for (const cmd of commands) {
      this.whitelistedCommands.delete(cmd);
    }
    this.debugLog(`Removed from whitelist: ${commands.join(', ')}`);
  }

  /**
   * Check if a command is whitelisted
   */
  isWhitelisted(command: string): boolean {
    // Check direct command name
    if (this.whitelistedCommands.has(command)) {
      return true;
    }
    // Check if it's an alias of a whitelisted command
    const realName = this.aliasMap.get(command);
    if (realName && this.whitelistedCommands.has(realName)) {
      return true;
    }
    return false;
  }

  /**
   * Set per-command rate limit (stricter than global)
   */
  setCommandRateLimit(command: string, config: CommandRateLimitConfig): void {
    this.perCommandLimits.set(command, config);
    this.debugLog(`Per-command rate limit set for '${command}': ${JSON.stringify(config)}`);
  }

  /**
   * Remove per-command rate limit
   */
  removeCommandRateLimit(command: string): void {
    this.perCommandLimits.delete(command);
    this.debugLog(`Per-command rate limit removed for '${command}'`);
  }

  /**
   * Refill tokens based on elapsed time (Token Bucket Algorithm)
   */
  private refillTokens(): void {
    const now = Date.now();

    // Refill second tokens
    const secondsElapsed = (now - this.lastSecondRefill) / 1000;
    if (secondsElapsed >= 1) {
      const tokensToAdd = Math.floor(secondsElapsed) * this.rateLimitConfig.maxCommandsPerSecond;
      this.tokensPerSecond = Math.min(
        this.rateLimitConfig.maxCommandsPerSecond,
        this.tokensPerSecond + tokensToAdd
      );
      this.lastSecondRefill = now - ((secondsElapsed % 1) * 1000);
    }

    // Refill minute tokens
    const minutesElapsed = (now - this.lastMinuteRefill) / 60000;
    if (minutesElapsed >= 1) {
      const tokensToAdd = Math.floor(minutesElapsed) * this.rateLimitConfig.maxCommandsPerMinute;
      this.tokensPerMinute = Math.min(
        this.rateLimitConfig.maxCommandsPerMinute,
        this.tokensPerMinute + tokensToAdd
      );
      this.lastMinuteRefill = now - ((minutesElapsed % 1) * 60000);
    }
  }

  /**
   * Clean up old command history (Sliding Window)
   */
  private cleanupHistory(): void {
    const cutoff = Date.now() - this.HISTORY_RETENTION_MS;
    this.commandHistory = this.commandHistory.filter(entry => entry.timestamp > cutoff);
  }

  /**
   * Check per-command rate limit using sliding window
   */
  private checkPerCommandLimit(command: string): { allowed: boolean; retryAfterMs?: number; limitType?: 'second' | 'minute' } {
    const config = this.perCommandLimits.get(command);
    if (!config) {
      return { allowed: true };
    }

    const now = Date.now();
    const commandEntries = this.commandHistory.filter(e => e.command === command);

    // Check per-second limit
    if (config.maxPerSecond !== undefined) {
      const oneSecondAgo = now - 1000;
      const recentCount = commandEntries.filter(e => e.timestamp > oneSecondAgo).length;
      if (recentCount >= config.maxPerSecond) {
        const oldestInWindow = commandEntries.find(e => e.timestamp > oneSecondAgo);
        const retryAfter = oldestInWindow ? (oldestInWindow.timestamp + 1000) - now : 1000;
        return { allowed: false, retryAfterMs: Math.max(retryAfter, 0), limitType: 'second' };
      }
    }

    // Check per-minute limit
    if (config.maxPerMinute !== undefined) {
      const oneMinuteAgo = now - 60000;
      const recentCount = commandEntries.filter(e => e.timestamp > oneMinuteAgo).length;
      if (recentCount >= config.maxPerMinute) {
        const oldestInWindow = commandEntries.find(e => e.timestamp > oneMinuteAgo);
        const retryAfter = oldestInWindow ? (oldestInWindow.timestamp + 60000) - now : 60000;
        return { allowed: false, retryAfterMs: Math.max(retryAfter, 0), limitType: 'minute' };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if command execution is allowed under rate limits
   * Throws RateLimitExceededError if limit exceeded
   */
  private checkRateLimit(command: string): void {
    if (!this.rateLimitConfig.enabled) {
      return;
    }

    // Skip rate limiting for whitelisted commands
    if (this.isWhitelisted(command)) {
      this.debugLog(`Command '${command}' is whitelisted, bypassing rate limit`);
      return;
    }

    // Refill tokens first
    this.refillTokens();

    // Check per-command limits first (they may be stricter)
    const perCmdCheck = this.checkPerCommandLimit(command);
    if (!perCmdCheck.allowed) {
      throw new RateLimitExceededError(perCmdCheck.limitType!, perCmdCheck.retryAfterMs!);
    }

    // Check global second limit
    if (this.tokensPerSecond <= 0) {
      const timeToRefill = 1000 - (Date.now() - this.lastSecondRefill);
      throw new RateLimitExceededError('second', Math.max(timeToRefill, 0));
    }

    // Check global minute limit
    if (this.tokensPerMinute <= 0) {
      const timeToRefill = 60000 - (Date.now() - this.lastMinuteRefill);
      throw new RateLimitExceededError('minute', Math.max(timeToRefill, 0));
    }
  }

  /**
   * Consume rate limit tokens after successful check
   */
  private consumeRateLimitToken(command: string): void {
    if (!this.rateLimitConfig.enabled || this.isWhitelisted(command)) {
      return;
    }

    this.tokensPerSecond--;
    this.tokensPerMinute--;

    // Add to history for sliding window tracking
    this.commandHistory.push({
      command,
      timestamp: Date.now()
    });

    // Periodic cleanup
    if (this.commandHistory.length > 1000) {
      this.cleanupHistory();
    }
  }

  /**
   * Reset rate limit state (useful for testing)
   */
  resetRateLimits(): void {
    this.tokensPerSecond = this.rateLimitConfig.maxCommandsPerSecond;
    this.tokensPerMinute = this.rateLimitConfig.maxCommandsPerMinute;
    this.lastSecondRefill = Date.now();
    this.lastMinuteRefill = Date.now();
    this.commandHistory = [];
    this.debugLog('Rate limits reset');
  }

  // ============================================================================
  // Command Registration Methods
  // ============================================================================

  /**
   * Register a new command
   */
  register(command: Command, options: RegisterOptions = {}): boolean {
    // Validate command
    if (!command.name) {
      throw new Error('Command must have a name');
    }
    if (!command.handler) {
      throw new Error(`Command ${command.name} must have a handler`);
    }

    const fullName = this.getFullName(command);

    // Check for conflicts
    const { hasConflict, conflicts } = this.checkConflicts(command, options);

    if (hasConflict) {
      // Store conflict history
      this.conflictHistory.push(...conflicts);

      // Log warnings
      this.logConflicts(conflicts, options.silent);

      // Determine if we should proceed
      const shouldRegister = conflicts.every(c => c.wouldOverwrite) || options.overwrite;

      if (!shouldRegister) {
        this.debugLog(`Registration blocked for: ${fullName} due to conflicts`);
        return false;
      }

      // Remove old registrations if overwriting
      for (const conflict of conflicts) {
        if (conflict.wouldOverwrite) {
          if (conflict.type === 'name') {
            this.unregister(conflict.existingCommand);
          } else {
            // Just remove the alias
            this.aliasMap.delete(conflict.identifier);
          }
        }
      }
    }

    // Register main command with full name
    this.commands.set(fullName, command);
    this.debugLog(`Registered command: ${fullName}`);

    // Also register short name if has namespace (for lookup flexibility)
    if (command.namespace && !this.commands.has(command.name) && !this.aliasMap.has(command.name)) {
      // Only if no conflict with non-namespaced command
      this.aliasMap.set(command.name, fullName);
      this.debugLog(`  - Short name alias: ${command.name} -> ${fullName}`);
    }

    // Register aliases with validation
    for (const alias of command.aliases || []) {
      const fullAlias = command.namespace ? `${command.namespace}.${alias}` : alias;
      this.aliasMap.set(fullAlias, fullName);
      this.debugLog(`  - Alias: ${fullAlias} -> ${fullName}`);

      // Also register short alias if no conflict
      if (command.namespace && !this.aliasMap.has(alias) && !this.commands.has(alias)) {
        this.aliasMap.set(alias, fullName);
        this.debugLog(`  - Short alias: ${alias} -> ${fullName}`);
      }
    }

    // Add to category
    const category = command.category || 'general';
    if (!this.categories.has(category)) {
      this.categories.set(category, new Set());
      this.debugLog(`  - Created category: ${category}`);
    }
    this.categories.get(category)!.add(fullName);
    this.debugLog(`  - Added to category: ${category}`);

    // Add to namespace
    if (command.namespace) {
      if (!this.namespaces.has(command.namespace)) {
        this.namespaces.set(command.namespace, new Set());
        this.debugLog(`  - Created namespace: ${command.namespace}`);
      }
      this.namespaces.get(command.namespace)!.add(fullName);
      this.debugLog(`  - Added to namespace: ${command.namespace}`);
    }

    return true;
  }

  /**
   * Register multiple commands at once
   */
  registerAll(commands: Command[], options: RegisterOptions = {}): { registered: number; failed: number } {
    let registered = 0;
    let failed = 0;

    for (const cmd of commands) {
      if (this.register(cmd, options)) {
        registered++;
      } else {
        failed++;
      }
    }

    return { registered, failed };
  }

  /**
   * Get a command by name or alias
   */
  get(nameOrAlias: string): Command | undefined {
    // Check direct name first
    if (this.commands.has(nameOrAlias)) {
      return this.commands.get(nameOrAlias);
    }

    // Check aliases
    const realName = this.aliasMap.get(nameOrAlias);
    if (realName) {
      return this.commands.get(realName);
    }

    return undefined;
  }

  /**
   * Check if a command exists
   */
  has(nameOrAlias: string): boolean {
    return this.commands.has(nameOrAlias) || this.aliasMap.has(nameOrAlias);
  }

  /**
   * Check if a command is registered (by exact name, not alias)
   */
  isCommandRegistered(name: string): boolean {
    return this.commands.has(name);
  }

  /**
   * List all registered commands with their full info
   */
  listAllCommands(): CommandInfo[] {
    const result: CommandInfo[] = [];

    for (const [name, cmd] of this.commands) {
      result.push({
        name: name,
        aliases: cmd.aliases || [],
        description: cmd.description,
        category: cmd.category || 'general',
        usage: cmd.usage,
        args: cmd.args,
        hidden: cmd.hidden || false,
        hasSubcommands: cmd.subcommands ? cmd.subcommands.size > 0 : false,
        namespace: cmd.namespace,
        priority: cmd.priority
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Calculate Levenshtein distance between two strings
   * Used for fuzzy command matching
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const m = s1.length;
    const n = s2.length;

    // Create a matrix
    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    // Initialize first row and column
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    // Fill the matrix using dynamic programming
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (s1[i - 1] === s2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Find similar commands using fuzzy matching (Levenshtein distance)
   * @param input - The input string to find similar commands for
   * @param maxSuggestions - Maximum number of suggestions to return (default: 3)
   * @param maxDistance - Maximum Levenshtein distance to consider (default: 3)
   * @returns Array of similar command names sorted by similarity
   */
  findSimilarCommands(input: string, maxSuggestions: number = 3, maxDistance: number = 3): string[] {
    const lowerInput = input.toLowerCase();
    const candidates: Array<{ name: string; distance: number; isAlias: boolean }> = [];

    // Check all command names
    for (const name of this.commands.keys()) {
      const distance = this.levenshteinDistance(lowerInput, name);
      if (distance <= maxDistance) {
        candidates.push({ name, distance, isAlias: false });
      }
    }

    // Check all aliases
    for (const alias of this.aliasMap.keys()) {
      const distance = this.levenshteinDistance(lowerInput, alias);
      if (distance <= maxDistance) {
        const realName = this.aliasMap.get(alias)!;
        // Avoid duplicates if the command is already suggested
        if (!candidates.some(c => c.name === realName && !c.isAlias)) {
          candidates.push({ name: alias, distance, isAlias: true });
        }
      }
    }

    // Also check for prefix matches (commands that start with the input)
    for (const name of this.commands.keys()) {
      if (name.toLowerCase().startsWith(lowerInput) && !candidates.some(c => c.name === name)) {
        candidates.push({ name, distance: 0.5, isAlias: false }); // Give prefix matches higher priority
      }
    }

    // Sort by distance (ascending) and return top suggestions
    return candidates
      .sort((a, b) => a.distance - b.distance)
      .slice(0, maxSuggestions)
      .map(c => c.name);
  }

  /**
   * Execute a command by name with enhanced error handling
   */
  async execute(
    nameOrAlias: string,
    ctx: Omit<CommandContext, 'flags'>
  ): Promise<CommandResult> {
    const command = this.get(nameOrAlias);

    if (!command) {
      // Find similar commands for helpful suggestions
      const suggestions = this.findSimilarCommands(nameOrAlias);
      let errorMsg = `Unknown command: '${nameOrAlias}'.`;

      if (suggestions.length > 0) {
        errorMsg += ` Did you mean: ${suggestions.map(s => `/${s}`).join(', ')}?`;
      } else {
        errorMsg += ' Use /help to see available commands.';
      }

      // Create and log CommandError for not found
      const cmdError = new CommandError(
        errorMsg,
        CommandErrorCode.EXECUTION_NOT_FOUND,
        nameOrAlias,
        ctx.args,
        { suggestions }
      );

      const fullCtx: CommandContext = {
        ...ctx,
        flags: {},
        rawArgs: ctx.args.join(' ')
      };

      globalErrorLogger.log(cmdError, fullCtx);
      this.debugLog(`Command not found: ${nameOrAlias}. Suggestions: ${suggestions.join(', ') || 'none'}`);

      // Call global error handler if set
      if (this.globalErrorHandler) {
        try {
          await this.globalErrorHandler(cmdError, fullCtx);
        } catch (handlerErr) {
          this.debugLog(`Error handler threw: ${handlerErr}`);
        }
      }

      return {
        success: false,
        error: errorMsg,
        data: {
          code: CommandErrorCode.EXECUTION_NOT_FOUND,
          suggestion: cmdError.suggestion,
          retryable: false
        }
      };
    }

    // Parse flags from args
    const { positional, flags } = this.parseArgs(ctx.args);

    const fullCtx: CommandContext = {
      ...ctx,
      args: positional,
      flags,
      rawArgs: ctx.args.join(' ')
    };

    try {
      // Check rate limit before execution
      this.checkRateLimit(command.name);

      // Validate arguments if command has arg definitions
      if (command.args && command.args.length > 0) {
        const validation = this.validateArgs(command, positional);
        if (!validation.valid) {
          const errorLines = validation.errors.join('\n');
          const helpHint = `\nUse /help ${command.name} to see required arguments.`;

          // Create and log ValidationError
          const valError = new ValidationError(
            validation.errors[0],
            command.name,
            positional,
            {
              code: CommandErrorCode.VALIDATION_MISSING_ARG,
              context: { allErrors: validation.errors }
            }
          );

          globalErrorLogger.log(valError, fullCtx);

          if (this.globalErrorHandler) {
            try {
              await this.globalErrorHandler(valError, fullCtx);
            } catch (handlerErr) {
              this.debugLog(`Error handler threw: ${handlerErr}`);
            }
          }

          return {
            success: false,
            error: errorLines + helpHint,
            data: {
              code: CommandErrorCode.VALIDATION_MISSING_ARG,
              suggestion: valError.suggestion,
              retryable: false
            }
          };
        }
      }

      // Consume rate limit token after successful validation
      this.consumeRateLimitToken(command.name);

      return await command.handler(fullCtx);
    } catch (err) {
      // Enhanced error handling with typed errors
      let cmdError: CommandError;

      if (err instanceof CommandError) {
        // Already a CommandError - use as-is
        cmdError = err;
      } else if (err instanceof RateLimitExceededError) {
        // Rate limit - create TemporaryError
        cmdError = new TemporaryError(
          err.message,
          command.name,
          positional,
          {
            code: CommandErrorCode.TEMPORARY_RATE_LIMITED,
            retryAfterMs: err.retryAfterMs
          }
        );
      } else if (err instanceof Error) {
        // Generic Error - detect type and wrap appropriately
        const code = detectErrorCode(err);
        if (isRetryableError(code)) {
          cmdError = new TemporaryError(err.message, command.name, positional, { code });
        } else {
          cmdError = new ExecutionError(err.message, command.name, positional, { cause: err, code });
        }
      } else {
        // Unknown error type
        cmdError = new CommandError(
          String(err),
          CommandErrorCode.UNKNOWN,
          command.name,
          positional
        );
      }

      // Log error with context
      globalErrorLogger.log(cmdError, fullCtx);

      // Call global error handler
      if (this.globalErrorHandler) {
        try {
          await this.globalErrorHandler(cmdError, fullCtx);
        } catch (handlerErr) {
          this.debugLog(`Error handler threw: ${handlerErr}`);
        }
      }

      // Format error message with suggestion and stack trace in debug mode
      let errorMessage = `Error executing /${command.name}: ${cmdError.message}`;
      if (cmdError.suggestion) {
        errorMessage += `\n${chalk.cyan('Suggestion:')} ${cmdError.suggestion}`;
      }
      if (this.debugMode && cmdError.stack) {
        errorMessage += `\n${chalk.gray(cmdError.stack)}`;
      }

      return {
        success: false,
        error: errorMessage,
        data: {
          code: cmdError.code,
          suggestion: cmdError.suggestion,
          retryable: cmdError.isRetryable(),
          context: cmdError.context
        }
      };
    }
  }

  /**
   * Execute a command with timeout
   * @param nameOrAlias Command name or alias
   * @param ctx Command context
   * @param timeoutMs Timeout in milliseconds
   * @param onProgress Optional progress callback
   * @returns Command result or timeout error
   */
  async executeWithTimeout(
    nameOrAlias: string,
    ctx: Omit<CommandContext, 'flags'>,
    timeoutMs: number,
    onProgress?: (progress: { current: number; total?: number; message?: string; percentage?: number }) => void
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      let isResolved = false;
      let timeoutId: NodeJS.Timeout | undefined;

      // Set timeout
      timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          resolve({
            success: false,
            error: `Command '${nameOrAlias}' timed out after ${timeoutMs}ms`,
            data: { timeout: true, timeoutMs }
          });
        }
      }, timeoutMs);

      // Execute command
      this.execute(nameOrAlias, ctx)
        .then((result) => {
          if (!isResolved) {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve(result);
          }
        })
        .catch((err) => {
          if (!isResolved) {
            isResolved = true;
            if (timeoutId) clearTimeout(timeoutId);
            resolve({
              success: false,
              error: err instanceof Error ? err.message : String(err)
            });
          }
        });
    });
  }

  // ============================================================================
  // Enhanced Argument Parsing (using EnhancedArgParser)
  // ============================================================================

  /**
   * Tokenize input string handling quotes and escape sequences
   * @param input - Raw input string
   * @returns Array of tokens
   */
  tokenizeInputString(input: string): string[] {
    return tokenizeInput(input);
  }

  /**
   * Parse command arguments into positional args and flags (enhanced public method)
   * Supports:
   * - Short flags: -f, -v
   * - Combined short flags: -fv (same as -f -v)
   * - Long flags: --force, --verbose
   * - Flags with values: --output=file.txt, --output file.txt, -o file.txt
   * - Boolean negation: --no-color (sets color=false)
   * - Double dash (--): stops flag parsing, rest are positional
   * - Quoted values: --message "hello world"
   * - Escape sequences: --path C:\\Users\\name
   *
   * @param input - Either string input or pre-tokenized array
   * @param flagDefs - Optional flag definitions for validation
   */
  parseArgsEnhanced(input: string | string[], flagDefs?: FlagDefinition[]): ParsedArgs {
    return enhancedParseArgs(input, flagDefs);
  }

  /**
   * Parse command arguments into positional args and flags (private simple version for backward compatibility)
   */
  private parseArgs(args: string[]): {
    positional: string[];
    flags: Record<string, string | boolean>;
  } {
    // Use enhanced parser for better compatibility
    const result = enhancedParseArgs(args);
    return {
      positional: result.positional,
      flags: result.flags as Record<string, string | boolean>
    };
  }

  /**
   * Validate flags against command definition and return warnings
   */
  validateParsedFlags(
    parsedArgs: ParsedArgs,
    command: Command
  ): { valid: boolean; warnings: string[]; errors: string[] } {
    return validateCommandFlags(parsedArgs, command);
  }

  /**
   * Generate help text for command flags
   */
  generateCommandFlagHelp(command: Command): string {
    return generateFlagHelp(command);
  }

  // ============================================================================
  // Argument Validation Methods
  // ============================================================================

  /**
   * Validate arguments for a command
   * @param command The command to validate against
   * @param providedArgs Array of provided positional arguments
   * @returns ValidationResult with validity status and any errors
   */
  validateArgs(command: Command, providedArgs: string[]): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      parsedArgs: {}
    };

    const argDefs = command.args || [];

    // Check each defined argument
    for (let i = 0; i < argDefs.length; i++) {
      const argDef = argDefs[i];
      const providedValue = providedArgs[i];

      // Check if required argument is missing
      if (argDef.required && (providedValue === undefined || providedValue === '')) {
        if (argDef.default === undefined) {
          result.valid = false;
          result.errors.push(`Komenda ${command.name} wymaga argumentu ${argDef.name}`);
          continue;
        }
      }

      // Get the value to use (provided or default)
      let valueToUse: string | undefined;
      if (providedValue !== undefined && providedValue !== '') {
        valueToUse = providedValue;
      } else if (argDef.default !== undefined) {
        valueToUse = String(argDef.default);
      }

      // Skip if no value and not required
      if (valueToUse === undefined) {
        continue;
      }

      // Validate against choices if defined
      if (argDef.choices && argDef.choices.length > 0) {
        if (!argDef.choices.includes(valueToUse)) {
          result.valid = false;
          result.errors.push(
            `Argument ${argDef.name} musi byc jednym z: ${argDef.choices.join(', ')} (podano: ${valueToUse})`
          );
          continue;
        }
      }

      // Validate and parse type
      const typeResult = this.validateAndParseType(valueToUse, argDef);
      if (typeResult.error) {
        result.valid = false;
        result.errors.push(`Argument ${argDef.name}: ${typeResult.error}`);
        continue;
      }

      // Run custom validator if provided
      if (argDef.validate) {
        const customResult = argDef.validate(valueToUse);
        if (customResult !== true) {
          result.valid = false;
          const errorMsg = typeof customResult === 'string' ? customResult : 'nieprawidlowa wartosc';
          result.errors.push(`Argument ${argDef.name}: ${errorMsg}`);
          continue;
        }
      }

      // Store the parsed value
      result.parsedArgs[argDef.name] = typeResult.value!;
    }

    return result;
  }

  /**
   * Validate and parse a value according to its type
   */
  private validateAndParseType(
    value: string,
    argDef: CommandArg
  ): { value?: string | number | boolean; error?: string } {
    const type = argDef.type || 'string';

    switch (type) {
      case 'string':
        return { value };

      case 'number': {
        const num = Number(value);
        if (isNaN(num)) {
          return { error: `oczekiwano liczby, otrzymano "${value}"` };
        }
        return { value: num };
      }

      case 'boolean': {
        const lower = value.toLowerCase();
        if (['true', '1', 'yes', 'tak', 'on'].includes(lower)) {
          return { value: true };
        }
        if (['false', '0', 'no', 'nie', 'off'].includes(lower)) {
          return { value: false };
        }
        return { error: `oczekiwano wartosci boolean (true/false), otrzymano "${value}"` };
      }

      case 'path': {
        // Basic path validation - check for invalid characters
        const invalidChars = /[<>"|?*]/;
        if (invalidChars.test(value)) {
          return { error: `sciezka zawiera nieprawidlowe znaki: ${value}` };
        }
        // Normalize path separators for cross-platform
        const normalizedPath = value.replace(/\\/g, '/');
        return { value: normalizedPath };
      }

      default:
        return { value };
    }
  }

  /**
   * Get type display string for help
   */
  private getTypeDisplay(type?: ArgType): string {
    switch (type) {
      case 'number': return 'liczba';
      case 'boolean': return 'tak/nie';
      case 'path': return 'sciezka';
      case 'string':
      default: return 'tekst';
    }
  }

  /**
   * Generate automatic argument help string for a command
   */
  generateArgHelp(command: Command): string {
    if (!command.args || command.args.length === 0) {
      return '';
    }

    const lines: string[] = [];
    lines.push(chalk.bold('Argumenty:'));

    for (const arg of command.args) {
      const reqMark = arg.required ? chalk.red('*') : chalk.gray('?');
      const typeStr = chalk.blue(`[${this.getTypeDisplay(arg.type)}]`);
      const defStr = arg.default !== undefined
        ? chalk.gray(` (domyslnie: ${arg.default})`)
        : '';
      const choicesStr = arg.choices && arg.choices.length > 0
        ? chalk.gray(` dozwolone: ${arg.choices.join('|')}`)
        : '';

      lines.push(`  ${reqMark} ${chalk.cyan(arg.name)} ${typeStr} - ${arg.description}${defStr}${choicesStr}`);
    }

    // Add legend
    lines.push('');
    lines.push(chalk.gray(`  ${chalk.red('*')} = wymagane, ${chalk.gray('?')} = opcjonalne`));

    return lines.join('\n');
  }

  /**
   * Get all commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values()).filter(cmd => !cmd.hidden);
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): Command[] {
    const names = this.categories.get(category);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.commands.get(name)!)
      .filter(cmd => !cmd.hidden);
  }

  /**
   * Get all categories
   */
  getCategories(): string[] {
    return Array.from(this.categories.keys());
  }

  /**
   * Get all commands grouped by category
   */
  getCommandsByCategory(): Map<string, Command[]> {
    const result = new Map<string, Command[]>();

    for (const category of this.categories.keys()) {
      const commands = this.getByCategory(category);
      if (commands.length > 0) {
        result.set(category, commands);
      }
    }

    return result;
  }

  /**
   * Get commands by namespace
   */
  getByNamespace(namespace: string): Command[] {
    const names = this.namespaces.get(namespace);
    if (!names) return [];

    return Array.from(names)
      .map(name => this.commands.get(name)!)
      .filter(cmd => cmd && !cmd.hidden);
  }

  /**
   * Get all namespaces
   */
  getNamespaces(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * Detect all current conflicts in the registry
   */
  detectConflicts(): ConflictInfo[] {
    return [...this.conflictHistory];
  }

  /**
   * Get conflicts for a specific command
   */
  getConflictsFor(nameOrAlias: string): ConflictInfo[] {
    return this.conflictHistory.filter(
      c => c.existingCommand === nameOrAlias || c.newCommand === nameOrAlias
    );
  }

  /**
   * Clear conflict history
   */
  clearConflictHistory(): void {
    this.conflictHistory = [];
  }

  /**
   * Generate help text for a specific command
   */
  getHelp(nameOrAlias?: string): string {
    if (nameOrAlias) {
      return this.getCommandHelp(nameOrAlias);
    }
    return this.getGeneralHelp();
  }

  /**
   * Get help for a specific command
   */
  private getCommandHelp(nameOrAlias: string): string {
    const command = this.get(nameOrAlias);
    if (!command) {
      return chalk.red(`Unknown command: ${nameOrAlias}`);
    }

    const lines: string[] = [];
    const fullName = this.getFullName(command);

    // Command header
    lines.push(chalk.bold.cyan(`\n Command: /${fullName}\n`));

    // Description
    lines.push(command.description);
    lines.push('');

    // Namespace
    if (command.namespace) {
      lines.push(chalk.bold('Namespace:'));
      lines.push(`  ${chalk.magenta(command.namespace)}`);
      lines.push('');
    }

    // Priority
    if (command.priority !== undefined) {
      lines.push(chalk.bold('Priority:'));
      lines.push(`  ${chalk.blue(this.getPriorityString(command.priority))}`);
      lines.push('');
    }

    // Usage
    if (command.usage) {
      lines.push(chalk.bold('Usage:'));
      lines.push(`  ${chalk.yellow(`/${fullName}`)} ${command.usage}`);
      lines.push('');
    }

    // Arguments - use enhanced generateArgHelp
    if (command.args && command.args.length > 0) {
      lines.push(this.generateArgHelp(command));
      lines.push('');
    }

    // Flags - use enhanced flag help generation
    if (command.flags && command.flags.length > 0) {
      lines.push(this.generateCommandFlagHelp(command));
      lines.push('');
    }

    // Aliases
    if (command.aliases && command.aliases.length > 0) {
      lines.push(chalk.bold('Aliases:'));
      const aliasDisplay = command.aliases.map(a => {
        const fullAlias = command.namespace ? `${command.namespace}.${a}` : a;
        return chalk.yellow(`/${fullAlias}`);
      }).join(', ');
      lines.push(`  ${aliasDisplay}`);
      lines.push('');
    }

    // Subcommands
    if (command.subcommands && command.subcommands.size > 0) {
      lines.push(chalk.bold('Subcommands:'));
      for (const [name, subcmd] of command.subcommands) {
        lines.push(`  ${chalk.yellow(name).padEnd(20)} ${subcmd.description}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Generate general help text
   */
  private getGeneralHelp(): string {
    const lines: string[] = [];

    lines.push(chalk.bold.cyan('\n Available Commands\n'));
    lines.push(chalk.gray('─'.repeat(50)));

    // Group by category
    for (const category of this.getCategories()) {
      const commands = this.getByCategory(category);
      if (commands.length === 0) continue;

      lines.push(chalk.bold(`\n ${category.charAt(0).toUpperCase() + category.slice(1)}:`));

      for (const cmd of commands) {
        const fullName = this.getFullName(cmd);
        const aliases = cmd.aliases.length > 0
          ? chalk.gray(` (${cmd.aliases.join(', ')})`)
          : '';
        const ns = cmd.namespace ? chalk.magenta(`[${cmd.namespace}] `) : '';
        const priority = cmd.priority !== undefined
          ? chalk.dim(` [${this.getPriorityString(cmd.priority)}]`)
          : '';
        lines.push(`  ${ns}${chalk.yellow(`/${fullName}`).padEnd(30)} ${cmd.description}${aliases}${priority}`);
      }
    }

    // Show namespaces if any
    const namespaces = this.getNamespaces();
    if (namespaces.length > 0) {
      lines.push(chalk.bold(`\n Namespaces:`));
      for (const ns of namespaces) {
        const count = this.namespaces.get(ns)?.size || 0;
        lines.push(`  ${chalk.magenta(ns)} - ${count} command(s)`);
      }
    }

    // Show conflict summary if any
    if (this.conflictHistory.length > 0) {
      lines.push(chalk.bold.yellow(`\n Conflicts: ${this.conflictHistory.length}`));
      lines.push(chalk.gray(`  Use /conflicts to see details`));
    }

    lines.push(chalk.gray('\n─'.repeat(50)));
    lines.push(chalk.gray(`Use ${chalk.white('/help <command>')} for detailed help on a specific command\n`));

    return lines.join('\n');
  }

  /**
   * Get autocomplete suggestions for a partial command
   */
  autocomplete(partial: string): string[] {
    const lowerPartial = partial.toLowerCase();
    const suggestions: string[] = [];

    // Match command names
    for (const name of this.commands.keys()) {
      if (name.toLowerCase().startsWith(lowerPartial)) {
        suggestions.push(`/${name}`);
      }
    }

    // Match aliases
    for (const alias of this.aliasMap.keys()) {
      if (alias.toLowerCase().startsWith(lowerPartial)) {
        suggestions.push(`/${alias}`);
      }
    }

    return suggestions.sort();
  }

  /**
   * Get autocomplete suggestions for subcommands
   */
  autocompleteSubcommand(commandName: string, partial: string): string[] {
    const command = this.get(commandName);
    if (!command || !command.subcommands) return [];

    const lowerPartial = partial.toLowerCase();
    const suggestions: string[] = [];

    for (const subName of command.subcommands.keys()) {
      if (subName.toLowerCase().startsWith(lowerPartial)) {
        suggestions.push(subName);
      }
    }

    return suggestions.sort();
  }

  /**
   * Clear all registered commands
   */
  clear(): void {
    this.commands.clear();
    this.aliasMap.clear();
    this.categories.clear();
    this.namespaces.clear();
    this.conflictHistory = [];
  }

  /**
   * Get command count
   */
  get size(): number {
    return this.commands.size;
  }

  /**
   * Get conflict count
   */
  get conflictCount(): number {
    return this.conflictHistory.length;
  }

  /**
   * Get namespace count
   */
  get namespaceCount(): number {
    return this.namespaces.size;
  }

  /**
   * Get registry statistics
   */
  getStats(): {
    commands: number;
    aliases: number;
    categories: number;
    namespaces: number;
    conflicts: number;
  } {
    return {
      commands: this.commands.size,
      aliases: this.aliasMap.size,
      categories: this.categories.size,
      namespaces: this.namespaces.size,
      conflicts: this.conflictHistory.length
    };
  }

  /**
   * Get alias count
   */
  get aliasCount(): number {
    return this.aliasMap.size;
  }

  /**
   * Get all aliases as a map (alias -> commandName)
   */
  getAllAliases(): Map<string, string> {
    return new Map(this.aliasMap);
  }

  // ============================================================================
  // Alias Management Methods
  // ============================================================================

  /**
   * Internal method to register an alias with validation
   */
  private registerAliasInternal(commandName: string, alias: string): boolean {
    // Check if alias conflicts with existing command name
    if (this.commands.has(alias)) {
      console.warn(
        chalk.yellow(`[CommandRegistry] Warning: Alias '${alias}' conflicts with existing command name. Alias will not be registered.`)
      );
      return false;
    }

    // Check if alias already exists for another command
    if (this.aliasMap.has(alias)) {
      const existingCommand = this.aliasMap.get(alias);
      if (existingCommand !== commandName) {
        console.warn(
          chalk.yellow(`[CommandRegistry] Warning: Alias '${alias}' already exists for command '${existingCommand}'. Overwriting with '${commandName}'.`)
        );
      }
    }

    this.aliasMap.set(alias, commandName);
    this.debugLog(`  - Alias: ${alias} -> ${commandName}`);
    return true;
  }

  /**
   * Get all aliases for a specific command
   * @param commandName The name of the command
   * @returns Array of aliases for the command
   */
  getAliasesForCommand(commandName: string): string[] {
    const aliases: string[] = [];

    // Check if command exists
    if (!this.commands.has(commandName)) {
      return aliases;
    }

    // Find all aliases that map to this command
    for (const [alias, targetCommand] of this.aliasMap.entries()) {
      if (targetCommand === commandName) {
        aliases.push(alias);
      }
    }

    return aliases;
  }

  /**
   * Get the command name for a given alias
   * @param alias The alias to look up
   * @returns The command name or null if not found
   */
  getCommandForAlias(alias: string): string | null {
    return this.aliasMap.get(alias) ?? null;
  }

  /**
   * Dynamically register a new alias for an existing command
   * @param commandName The name of the command to alias
   * @param newAlias The new alias to register
   * @returns true if alias was registered, false otherwise
   */
  registerAlias(commandName: string, newAlias: string): boolean {
    // Check if command exists
    if (!this.commands.has(commandName)) {
      console.warn(
        chalk.yellow(`[CommandRegistry] Warning: Cannot register alias '${newAlias}' - command '${commandName}' does not exist.`)
      );
      return false;
    }

    // Use internal method for validation
    const registered = this.registerAliasInternal(commandName, newAlias);

    // Also update the command's aliases array if successful
    if (registered) {
      const command = this.commands.get(commandName);
      if (command && !command.aliases.includes(newAlias)) {
        command.aliases.push(newAlias);
      }
    }

    return registered;
  }

  /**
   * Unregister (remove) an alias
   * @param alias The alias to remove
   * @returns true if alias was removed, false if it didn't exist
   */
  unregisterAlias(alias: string): boolean {
    // Check if alias exists
    if (!this.aliasMap.has(alias)) {
      this.debugLog(`Alias '${alias}' not found, nothing to unregister`);
      return false;
    }

    const commandName = this.aliasMap.get(alias)!;

    // Remove from aliasMap
    this.aliasMap.delete(alias);
    this.debugLog(`Unregistered alias: ${alias} (was mapped to ${commandName})`);

    // Also remove from command's aliases array
    const command = this.commands.get(commandName);
    if (command) {
      const aliasIndex = command.aliases.indexOf(alias);
      if (aliasIndex > -1) {
        command.aliases.splice(aliasIndex, 1);
      }
    }

    return true;
  }
}

/**
 * Create a success result
 */
export function success(data?: unknown, message?: string): CommandResult {
  return { success: true, data, message };
}

/**
 * Create an error result
 */
export function error(errorMessage: string, data?: unknown): CommandResult {
  return { success: false, error: errorMessage, data };
}

/**
 * Singleton command registry instance
 */
export const commandRegistry = new CommandRegistry();

export default commandRegistry;
