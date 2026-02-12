/**
 * Execute Status Route Handler
 * GET /api/execute/status - Check execution capability
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { executionService } from '@/lib/services';

export async function GET() {
  try {
    const status = await executionService.checkStatus();
    return NextResponse.json(status);
  } catch (error) {
    return errorResponse(error);
  }
}
