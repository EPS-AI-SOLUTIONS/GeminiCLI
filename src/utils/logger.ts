/**
 * GeminiHydra - Structured Logger for Observability
 *
 * Outputs JSON-formatted log lines for machine-readable observability.
 * No external dependencies -- uses console.log + JSON.stringify.
 *
 * Usage:
 *   import { structuredLog, slog } from '../utils/logger.js';
 *
 *   slog.info('HealingService', 'Evaluation started', { taskCount: 5 });
 *   slog.error('Swarm', 'Agent crashed', { agentId: 3, error: err.message });
 *
 * Each log line is a single JSON object:
 *   { "timestamp": "...", "level": "info", "service": "HealingService", "message": "...", ...context }
 */

export type StructuredLogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface StructuredLogEntry {
  timestamp: string;
  level: StructuredLogLevel;
  service: string;
  message: string;
  [key: string]: unknown;
}

/**
 * Emit a single structured log line as JSON to stdout/stderr.
 *
 * @param level   - Severity: debug | info | warn | error
 * @param service - Originating service / module name (e.g. "HealingService")
 * @param message - Human-readable description of the event
 * @param context - Optional bag of key-value pairs merged into the JSON output
 */
export function structuredLog(
  level: StructuredLogLevel,
  service: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  const entry: StructuredLogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...context,
  };

  const line = JSON.stringify(entry);

  // Route errors to stderr, everything else to stdout
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * Convenience object with pre-bound level methods.
 *
 *   slog.info('MyService', 'hello');
 *   slog.warn('MyService', 'disk almost full', { usedPct: 92 });
 */
export const slog = {
  debug(service: string, message: string, context?: Record<string, unknown>): void {
    structuredLog('debug', service, message, context);
  },
  info(service: string, message: string, context?: Record<string, unknown>): void {
    structuredLog('info', service, message, context);
  },
  warn(service: string, message: string, context?: Record<string, unknown>): void {
    structuredLog('warn', service, message, context);
  },
  error(service: string, message: string, context?: Record<string, unknown>): void {
    structuredLog('error', service, message, context);
  },
};
