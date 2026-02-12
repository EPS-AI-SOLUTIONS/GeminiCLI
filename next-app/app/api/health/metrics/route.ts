/**
 * GET /api/health/metrics
 * Current session metrics snapshot
 */

import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // @ts-expect-error - Runtime-only dynamic import from parent project, not resolvable by TS
    const { metrics } = await import(/* webpackIgnore: true */ '../../../../src/core/metrics.js');
    return NextResponse.json(metrics.toJSON());
  } catch {
    return NextResponse.json({ error: 'Metrics module not available' });
  }
}
