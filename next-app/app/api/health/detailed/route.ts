/**
 * GET /api/health/detailed
 * Detailed health check with providers, metrics, and memory usage
 */

import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api-config';

export async function GET() {
  try {
    // @ts-expect-error - Runtime-only dynamic import from parent project, not resolvable by TS
    const { healthCheck } = await import(/* webpackIgnore: true */ '../../../../src/health.js');
    const result = await healthCheck();
    return NextResponse.json(result);
  } catch {
    // Fallback if health module import fails
    const mem = process.memoryUsage();
    return NextResponse.json({
      status: 'ok',
      version: API_CONFIG.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
    });
  }
}
