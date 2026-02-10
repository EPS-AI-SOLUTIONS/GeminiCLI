/**
 * GeminiHydra Health Check Module
 *
 * Provides a health check function that returns system status information.
 * Can be used by any HTTP server, CLI command, or monitoring tool.
 */

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Health check response shape (#43: Extended with provider health + metrics) */
export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  nodeVersion: string;
  platform: string;
  memoryUsageMB: number;
  providers?: {
    gemini: { available: boolean; model?: string };
    ollama: { available: boolean; model?: string };
  };
  metrics?: {
    totalRequests: number;
    successRate: number;
    avgLatencyMs: number;
  };
}

const startTime = Date.now();

/**
 * Read the version from the root package.json at runtime.
 * Falls back to 'unknown' if the file cannot be read.
 */
async function getPackageVersion(): Promise<string> {
  try {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(currentDir, '..', 'package.json');
    const raw = await readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/**
 * Returns a health check snapshot of the running GeminiHydra process.
 *
 * @example
 * ```ts
 * import { healthCheck } from './health.js';
 *
 * const status = await healthCheck();
 * console.log(status);
 * // { status: 'ok', version: '14.0.0', uptime: 123.45, ... }
 * ```
 */
export async function healthCheck(): Promise<HealthCheckResult> {
  const version = await getPackageVersion();
  const mem = process.memoryUsage();

  // FIX #43: Include metrics data if available
  let metricsData: HealthCheckResult['metrics'] | undefined;
  try {
    const { metrics } = await import('./core/metrics.js');
    const stats = metrics.getSessionStats();
    metricsData = {
      totalRequests: stats.totalRequests,
      successRate:
        stats.totalRequests > 0
          ? Math.round((stats.successfulRequests / stats.totalRequests) * 100)
          : 100,
      avgLatencyMs: stats.averageLatencyMs,
    };
  } catch {
    // metrics module not loaded yet — that's fine
  }

  const memMB = Math.round(mem.rss / 1024 / 1024);
  const status: HealthCheckResult['status'] = memMB > 2048 ? 'degraded' : 'ok';

  return {
    status,
    version,
    uptime: (Date.now() - startTime) / 1000,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsageMB: memMB,
    metrics: metricsData,
  };
}

/**
 * Synchronous variant that skips the async package.json read.
 * Useful when the version is already known or not needed immediately.
 */
export function healthCheckSync(
  version = 'unknown',
): Omit<HealthCheckResult, 'version'> & { version: string } {
  const mem = process.memoryUsage();
  return {
    status: 'ok',
    version,
    uptime: (Date.now() - startTime) / 1000,
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
  };
}
