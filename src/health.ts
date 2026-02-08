/**
 * GeminiHydra Health Check Module
 *
 * Provides a health check function that returns system status information.
 * Can be used by any HTTP server, CLI command, or monitoring tool.
 */

import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Health check response shape */
export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  uptime: number;
  timestamp: string;
  nodeVersion: string;
  platform: string;
  memoryUsageMB: number;
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

/**
 * Synchronous variant that skips the async package.json read.
 * Useful when the version is already known or not needed immediately.
 */
export function healthCheckSync(version = 'unknown'): Omit<HealthCheckResult, 'version'> & { version: string } {
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
