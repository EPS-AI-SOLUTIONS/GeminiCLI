/**
 * GeminiHydra - Base Agent Service Utilities
 * Provides AppError, withRetry, and structured logging for all services.
 */

import { logger } from './Logger.js';

// ---------------------------------------------------------------------------
// AppError — strongly-typed error with code, context and optional cause
// ---------------------------------------------------------------------------

export interface AppErrorOptions {
  /** Machine-readable error code, e.g. "HEALING_EVALUATION_FAILED" */
  code: string;
  /** Human-readable message */
  message: string;
  /** Arbitrary structured context for debugging */
  context?: Record<string, unknown>;
  /** The original error that caused this one */
  originalError?: Error;
}

export class AppError extends Error {
  readonly code: string;
  readonly context: Record<string, unknown>;
  readonly originalError?: Error;

  constructor(opts: AppErrorOptions) {
    super(opts.message);
    this.name = 'AppError';
    this.code = opts.code;
    this.context = opts.context ?? {};
    this.originalError = opts.originalError;

    // Maintain proper stack trace on V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /** Convenience: create from an unknown catch value */
  static from(err: unknown, code: string, context?: Record<string, unknown>): AppError {
    if (err instanceof AppError) {
      return err;
    }
    const original = err instanceof Error ? err : new Error(String(err));
    return new AppError({
      code,
      message: original.message,
      context: context ?? {},
      originalError: original,
    });
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      originalError: this.originalError?.message,
    };
  }
}

// ---------------------------------------------------------------------------
// withRetry — exponential-backoff retry wrapper
// ---------------------------------------------------------------------------

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 1000) */
  baseDelay?: number;
  /** Human-readable label used in log messages */
  operationName: string;
  /** Optional predicate — return false to abort retries early */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Execute `fn` with automatic retries and exponential backoff.
 *
 * On each failure the delay doubles: baseDelay, baseDelay*2, baseDelay*4 ...
 * After exhausting all retries the last error is re-thrown as an `AppError`.
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, operationName, shouldRetry } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Check if caller wants to abort retries early
      if (shouldRetry && !shouldRetry(err, attempt)) {
        break;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * 2 ** attempt;
        logger.warn(
          `[${operationName}] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${delay}ms...`,
        );
        logger.debug(
          `[${operationName}] Error: ${err instanceof Error ? err.message : String(err)}`,
        );
        await sleep(delay);
      }
    }
  }

  // All retries exhausted
  throw AppError.from(lastError, `${operationName.toUpperCase().replace(/\s+/g, '_')}_FAILED`, {
    operationName,
    maxRetries,
    baseDelay,
  });
}

// ---------------------------------------------------------------------------
// Structured service logger helpers
// ---------------------------------------------------------------------------

/**
 * Log an error with structured context then re-throw as `AppError`.
 *
 * Usage:
 * ```ts
 * catch (err) {
 *   throw logAndThrow(err, 'EVAL_FAILED', 'HealingService.evaluate', { tasks: tasks.length });
 * }
 * ```
 */
export function logAndThrow(
  err: unknown,
  code: string,
  location: string,
  context?: Record<string, unknown>,
): never {
  const appErr = AppError.from(err, code, { location, ...context });
  logger.error(`[${location}] ${appErr.code}: ${appErr.message}`);
  if (Object.keys(appErr.context).length > 0) {
    logger.debug(`[${location}] Context: ${JSON.stringify(appErr.context)}`);
  }
  throw appErr;
}

/**
 * Log a warning with context (non-fatal).
 */
export function logServiceWarning(
  location: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  logger.warn(`[${location}] ${message}`);
  if (context && Object.keys(context).length > 0) {
    logger.debug(`[${location}] Context: ${JSON.stringify(context)}`);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
