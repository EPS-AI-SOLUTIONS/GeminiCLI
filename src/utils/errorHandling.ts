/**
 * Centralized error handling utilities
 *
 * Provides consistent error formatting and logging across the codebase.
 * Eliminates duplicate "Failed to X" patterns.
 */

import chalk from 'chalk';

/**
 * Extract error message from unknown error value.
 * Handles Error instances, strings, objects with message property, and fallback.
 *
 * This is the primary error extraction function - use this one.
 * @alias formatError (deprecated, use getErrorMessage)
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Unknown error';
}

/**
 * @deprecated Use getErrorMessage instead - this is an alias for backward compatibility
 */
export function formatError(error: unknown): string {
  return getErrorMessage(error);
}

/**
 * Log an error with consistent formatting
 * @param section The module/section name (e.g., "MCP", "CLI")
 * @param message The error context message
 * @param error The error object
 */
export function logError(section: string, message: string, error: unknown): void {
  console.error(chalk.red(`[${section}] ${message}: ${formatError(error)}`));
}

/**
 * Log a warning with consistent formatting
 * @param section The module/section name
 * @param message The warning message
 * @param error Optional error for additional context
 */
export function logWarning(section: string, message: string, error?: unknown): void {
  const msg = error ? `${message}: ${formatError(error)}` : message;
  console.error(chalk.yellow(`[${section}] ${msg}`));
}

/**
 * Log info with consistent formatting
 * @param section The module/section name
 * @param message The info message
 */
export function logInfo(section: string, message: string): void {
  console.log(chalk.cyan(`[${section}] ${message}`));
}

/**
 * Log success with consistent formatting
 * @param section The module/section name
 * @param message The success message
 */
export function logSuccess(section: string, message: string): void {
  console.log(chalk.green(`[${section}] ${message}`));
}

/**
 * Log debug info (gray, less prominent)
 * @param section The module/section name
 * @param message The debug message
 */
export function logDebug(section: string, message: string): void {
  console.log(chalk.gray(`[${section}] ${message}`));
}

/**
 * Create a standardized "Failed to X" error message
 * @param action The action that failed (e.g., "read file", "initialize")
 * @param error The error object
 */
export function createFailedMessage(action: string, error: unknown): string {
  return `Failed to ${action}: ${formatError(error)}`;
}

/**
 * Create a standardized error message for a specific action
 * @param action The action context (e.g., "read", "write", "connect")
 * @param target The target of the action (e.g., file path, server name)
 * @param error The error object
 */
export function createActionError(action: string, target: string, error: unknown): string {
  return `Failed to ${action} ${target}: ${formatError(error)}`;
}

/**
 * Wrap an async function with error logging
 * @param section The module/section for logging
 * @param action Description of what the function does
 * @param fn The async function to wrap
 */
export async function withErrorLogging<T>(
  section: string,
  action: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    logError(section, `Error during ${action}`, error);
    throw error;
  }
}

// Note: getErrorMessage is defined at the top of this file as the primary function
