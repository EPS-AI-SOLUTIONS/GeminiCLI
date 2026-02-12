/**
 * GET /api/health
 * Basic health check endpoint
 */

import { NextResponse } from 'next/server';
import { API_CONFIG } from '@/lib/api-config';
import type { HealthResponse } from '@/lib/api-types';

export async function GET(): Promise<NextResponse<HealthResponse>> {
  return NextResponse.json({
    status: 'ok',
    version: API_CONFIG.version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
}
