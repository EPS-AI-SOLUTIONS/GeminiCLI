/**
 * CommandErrors - Enhanced error handling for CLI commands
 *
 * Provides typed error classes with error codes, suggestions,
 * and context for better error reporting and handling.
 */

import chalk from 'chalk';

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for command errors
 */
export enum CommandErrorCode {
  // Validation errors (1xx)
  VALIDATION_MISSING_ARG = 101,
  VALIDATION_INVALID_ARG = 102,
  VALIDATION_INVALID_FLAG = 103,
  VALIDATION_TYPE_MISMATCH = 104,

  // Execution errors (2xx)
  EXECUTION_FAILED = 201,
  EXECUTION_HANDLER_ERROR = 202,
  EXECUTION_PERMISSION_DENIED = 203,
  EXECUTION_NOT_FOUND = 204,

  // Timeout errors (3xx)
  TIMEOUT_EXCEEDED = 301,
  TIMEOUT_CANCELLED = 302,

  // Temporary/Retryable errors (4xx)
  TEMPORARY_NETWORK = 401,
  TEMPORARY_RESOURCE_BUSY = 402,
  TEMPORARY_RATE_LIMITED = 403,

  // Unknown errors (9xx)
  UNKNOWN = 999,
}

/**
 * Error suggestions for known error codes
 */
export const ERROR_SUGGESTIONS: Record<CommandErrorCode, string> = {
  [CommandErrorCode.VALIDATION_MISSING_ARG]: 'Check command usage with /help <command>',
  [CommandErrorCode.VALIDATION_INVALID_ARG]: 'Verify argument format and type',
  [CommandErrorCode.VALIDATION_INVALID_FLAG]: 'Use --help to see available flags',
  [CommandErrorCode.VALIDATION_TYPE_MISMATCH]: 'Check expected argument types',
  [CommandErrorCode.EXECUTION_FAILED]: 'Try again or check logs for details',
  [CommandErrorCode.EXECUTION_HANDLER_ERROR]: 'Report this error if it persists',
  [CommandErrorCode.EXECUTION_PERMISSION_DENIED]:
    'Check permissions or run with elevated privileges',
  [CommandErrorCode.EXECUTION_NOT_FOUND]: 'Verify the resource exists',
  [CommandErrorCode.TIMEOUT_EXCEEDED]: 'Increase timeout or simplify the operation',
  [CommandErrorCode.TIMEOUT_CANCELLED]: 'Operation was cancelled by user or system',
  [CommandErrorCode.TEMPORARY_NETWORK]: 'Check network connection and retry',
  [CommandErrorCode.TEMPORARY_RESOURCE_BUSY]: 'Wait and retry the operation',
  [CommandErrorCode.TEMPORARY_RATE_LIMITED]: 'Wait before retrying (rate limited)',
  [CommandErrorCode.UNKNOWN]: 'Check logs for more details',
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if an error code is retryable
 */
export function isRetryableError(code: CommandErrorCode): boolean {
  return code >= 400 && code < 500;
}

/**
 * Detect error type from generic Error
 */
export function detectErrorCode(err: Error): CommandErrorCode {
  const msg = err.message.toLowerCase();

  // Network errors
  if (
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound') ||
    msg.includes('socket')
  ) {
    return CommandErrorCode.TEMPORARY_NETWORK;
  }

  // Rate limit errors
  if (msg.includes('rate limit') || msg.includes('too many requests') || msg.includes('429')) {
    return CommandErrorCode.TEMPORARY_RATE_LIMITED;
  }

  // Resource busy
  if (msg.includes('busy') || msg.includes('locked') || msg.includes('ebusy')) {
    return CommandErrorCode.TEMPORARY_RESOURCE_BUSY;
  }

  // Permission errors
  if (
    msg.includes('permission') ||
    msg.includes('access denied') ||
    msg.includes('eacces') ||
    msg.includes('eperm')
  ) {
    return CommandErrorCode.EXECUTION_PERMISSION_DENIED;
  }

  // Not found
  if (msg.includes('not found') || msg.includes('enoent') || msg.includes('does not exist')) {
    return CommandErrorCode.EXECUTION_NOT_FOUND;
  }

  // Validation errors
  if (msg.includes('invalid') || msg.includes('validation')) {
    return CommandErrorCode.VALIDATION_INVALID_ARG;
  }

  if (msg.includes('missing') || msg.includes('required')) {
    return CommandErrorCode.VALIDATION_MISSING_ARG;
  }

  // Timeout
  if (msg.includes('timeout') || msg.includes('timed out')) {
    return CommandErrorCode.TIMEOUT_EXCEEDED;
  }

  return CommandErrorCode.EXECUTION_HANDLER_ERROR;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Base class for all command errors
 */
export class CommandError extends Error {
  public readonly code: CommandErrorCode;
  public readonly command: string;
  public readonly args: string[];
  public readonly suggestion: string;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: CommandErrorCode,
    command: string,
    args: string[] = [],
    context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CommandError';
    this.code = code;
    this.command = command;
    this.args = args;
    this.suggestion = ERROR_SUGGESTIONS[code] || ERROR_SUGGESTIONS[CommandErrorCode.UNKNOWN];
    this.timestamp = new Date();
    this.context = context;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CommandError);
    }
  }

  /**
   * Check if this error is retryable
   */
  isRetryable(): boolean {
    return isRetryableError(this.code);
  }

  /**
   * Format error for display
   */
  format(includeStack = false): string {
    const lines: string[] = [
      chalk.red(`[Error ${this.code}] ${this.message}`),
      chalk.yellow(`Command: /${this.command}`),
      chalk.gray(`Args: ${this.args.join(' ') || '(none)'}`),
      chalk.cyan(`Suggestion: ${this.suggestion}`),
    ];

    if (this.context) {
      lines.push(chalk.gray(`Context: ${JSON.stringify(this.context)}`));
    }

    if (includeStack && this.stack) {
      lines.push(chalk.gray('\nStack trace:'));
      lines.push(chalk.gray(this.stack));
    }

    return lines.join('\n');
  }

  /**
   * Format error for plain text (no colors)
   */
  formatPlain(includeStack = false): string {
    const lines: string[] = [
      `[Error ${this.code}] ${this.message}`,
      `Command: /${this.command}`,
      `Args: ${this.args.join(' ') || '(none)'}`,
      `Suggestion: ${this.suggestion}`,
    ];

    if (this.context) {
      lines.push(`Context: ${JSON.stringify(this.context)}`);
    }

    if (includeStack && this.stack) {
      lines.push('\nStack trace:');
      lines.push(this.stack);
    }

    return lines.join('\n');
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      command: this.command,
      args: this.args,
      suggestion: this.suggestion,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack,
    };
  }

  /**
   * Create CommandError from generic Error
   */
  static fromError(err: Error, command: string, args: string[] = []): CommandError {
    if (err instanceof CommandError) {
      return err;
    }

    const code = detectErrorCode(err);
    return new CommandError(err.message, code, command, args, {
      originalName: err.name,
      originalStack: err.stack,
    });
  }
}

/**
 * Validation error - thrown when command arguments are invalid
 */
export class ValidationError extends CommandError {
  public readonly invalidValue?: string;
  public readonly expectedType?: string;

  constructor(
    message: string,
    command: string,
    args: string[] = [],
    options: {
      code?: CommandErrorCode;
      invalidValue?: string;
      expectedType?: string;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(
      message,
      options.code ?? CommandErrorCode.VALIDATION_INVALID_ARG,
      command,
      args,
      options.context,
    );
    this.name = 'ValidationError';
    this.invalidValue = options.invalidValue;
    this.expectedType = options.expectedType;
  }

  /**
   * Create validation error for missing argument
   */
  static missingArg(command: string, argName: string, args: string[] = []): ValidationError {
    return new ValidationError(`Missing required argument: ${argName}`, command, args, {
      code: CommandErrorCode.VALIDATION_MISSING_ARG,
    });
  }

  /**
   * Create validation error for invalid argument type
   */
  static invalidType(
    command: string,
    argName: string,
    expectedType: string,
    receivedValue: string,
    args: string[] = [],
  ): ValidationError {
    return new ValidationError(
      `Invalid type for argument '${argName}': expected ${expectedType}, got '${receivedValue}'`,
      command,
      args,
      {
        code: CommandErrorCode.VALIDATION_TYPE_MISMATCH,
        invalidValue: receivedValue,
        expectedType,
      },
    );
  }

  /**
   * Create validation error for invalid flag
   */
  static invalidFlag(command: string, flagName: string, args: string[] = []): ValidationError {
    return new ValidationError(`Unknown flag: ${flagName}`, command, args, {
      code: CommandErrorCode.VALIDATION_INVALID_FLAG,
    });
  }
}

/**
 * Execution error - thrown when command execution fails
 */
export class ExecutionError extends CommandError {
  public readonly cause?: Error;

  constructor(
    message: string,
    command: string,
    args: string[] = [],
    options: {
      cause?: Error;
      code?: CommandErrorCode;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(
      message,
      options.code ?? CommandErrorCode.EXECUTION_FAILED,
      command,
      args,
      options.context,
    );
    this.name = 'ExecutionError';
    this.cause = options.cause;

    // Append cause stack if available
    if (options.cause?.stack) {
      this.stack = `${this.stack}\nCaused by: ${options.cause.stack}`;
    }
  }

  /**
   * Create execution error from generic error
   */
  static fromError(err: Error, command: string, args: string[] = []): ExecutionError {
    const code = detectErrorCode(err);
    return new ExecutionError(err.message, command, args, {
      cause: err,
      code,
    });
  }

  /**
   * Create permission denied error
   */
  static permissionDenied(command: string, resource: string, args: string[] = []): ExecutionError {
    return new ExecutionError(`Permission denied: cannot access '${resource}'`, command, args, {
      code: CommandErrorCode.EXECUTION_PERMISSION_DENIED,
    });
  }

  /**
   * Create not found error
   */
  static notFound(command: string, resource: string, args: string[] = []): ExecutionError {
    return new ExecutionError(`Not found: '${resource}' does not exist`, command, args, {
      code: CommandErrorCode.EXECUTION_NOT_FOUND,
    });
  }
}

/**
 * Timeout error - thrown when command exceeds time limit
 */
export class CommandTimeoutError extends CommandError {
  public readonly timeoutMs: number;

  constructor(
    command: string,
    args: string[] = [],
    timeoutMs: number,
    context?: Record<string, unknown>,
  ) {
    super(
      `Command '${command}' exceeded timeout of ${timeoutMs}ms`,
      CommandErrorCode.TIMEOUT_EXCEEDED,
      command,
      args,
      { ...context, timeoutMs },
    );
    this.name = 'CommandTimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Temporary error - retryable errors
 */
export class TemporaryError extends CommandError {
  public readonly retryAfterMs?: number;

  constructor(
    message: string,
    command: string,
    args: string[] = [],
    options: {
      code?: CommandErrorCode;
      retryAfterMs?: number;
      context?: Record<string, unknown>;
    } = {},
  ) {
    super(
      message,
      options.code ?? CommandErrorCode.TEMPORARY_RESOURCE_BUSY,
      command,
      args,
      options.context,
    );
    this.name = 'TemporaryError';
    this.retryAfterMs = options.retryAfterMs;
  }

  /**
   * Create network error
   */
  static networkError(command: string, args: string[] = [], message?: string): TemporaryError {
    return new TemporaryError(message || 'Network error occurred', command, args, {
      code: CommandErrorCode.TEMPORARY_NETWORK,
    });
  }

  /**
   * Create rate limit error
   */
  static rateLimited(command: string, args: string[] = [], retryAfterMs?: number): TemporaryError {
    return new TemporaryError(
      `Rate limit exceeded${retryAfterMs ? `. Retry after ${retryAfterMs}ms` : ''}`,
      command,
      args,
      { code: CommandErrorCode.TEMPORARY_RATE_LIMITED, retryAfterMs },
    );
  }

  /**
   * Create resource busy error
   */
  static resourceBusy(command: string, resource: string, args: string[] = []): TemporaryError {
    return new TemporaryError(`Resource '${resource}' is busy, try again later`, command, args, {
      code: CommandErrorCode.TEMPORARY_RESOURCE_BUSY,
    });
  }
}

// ============================================================================
// Error Handler Types
// ============================================================================

/**
 * Command context (simplified for error handling)
 */
export interface ErrorCommandContext {
  cwd: string;
  args: string[];
  flags: Record<string, string | boolean>;
  rawArgs: string;
}

/**
 * Error handler function type
 */
export type ErrorHandler = (
  error: CommandError,
  context: ErrorCommandContext,
) => Promise<void> | void;

/**
 * Error log entry
 */
export interface ErrorLogEntry {
  timestamp: Date;
  error: CommandError;
  context: ErrorCommandContext;
  retryCount: number;
  resolved: boolean;
}

// ============================================================================
// Error Logger
// ============================================================================

/**
 * Error logger for tracking and managing command errors
 */
export class ErrorLogger {
  private errorLog: ErrorLogEntry[] = [];
  private readonly maxLogSize: number;
  private debugMode: boolean = false;

  constructor(maxLogSize: number = 100) {
    this.maxLogSize = maxLogSize;
  }

  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * Log an error
   */
  log(error: CommandError, context: ErrorCommandContext, retryCount: number = 0): void {
    const entry: ErrorLogEntry = {
      timestamp: new Date(),
      error,
      context,
      retryCount,
      resolved: false,
    };

    this.errorLog.push(entry);

    // Trim log if too large
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Debug output
    if (this.debugMode) {
      console.log(chalk.red(`[ErrorLogger] ${error.format(true)}`));
    }
  }

  /**
   * Mark an error as resolved
   */
  markResolved(index: number): void {
    if (index >= 0 && index < this.errorLog.length) {
      this.errorLog[index].resolved = true;
    }
  }

  /**
   * Mark the last error as resolved
   */
  markLastResolved(): void {
    if (this.errorLog.length > 0) {
      this.errorLog[this.errorLog.length - 1].resolved = true;
    }
  }

  /**
   * Get error log
   */
  getLog(): ErrorLogEntry[] {
    return [...this.errorLog];
  }

  /**
   * Get unresolved errors
   */
  getUnresolved(): ErrorLogEntry[] {
    return this.errorLog.filter((e) => !e.resolved);
  }

  /**
   * Get errors by command
   */
  getByCommand(command: string): ErrorLogEntry[] {
    return this.errorLog.filter((e) => e.error.command === command);
  }

  /**
   * Get errors by code
   */
  getByCode(code: CommandErrorCode): ErrorLogEntry[] {
    return this.errorLog.filter((e) => e.error.code === code);
  }

  /**
   * Get retryable errors
   */
  getRetryable(): ErrorLogEntry[] {
    return this.errorLog.filter((e) => e.error.isRetryable());
  }

  /**
   * Clear error log
   */
  clear(): void {
    this.errorLog = [];
  }

  /**
   * Get error count
   */
  get count(): number {
    return this.errorLog.length;
  }

  /**
   * Get unresolved error count
   */
  get unresolvedCount(): number {
    return this.errorLog.filter((e) => !e.resolved).length;
  }
}

// ============================================================================
// Global Error Logger Instance
// ============================================================================

/**
 * Global error logger for the CLI
 */
export const globalErrorLogger = new ErrorLogger();

// ============================================================================
// Exports
// ============================================================================

export default {
  CommandErrorCode,
  ERROR_SUGGESTIONS,
  isRetryableError,
  detectErrorCode,
  CommandError,
  ValidationError,
  ExecutionError,
  CommandTimeoutError,
  TemporaryError,
  ErrorLogger,
  globalErrorLogger,
};
