/**
 * Execute Route Handler
 * POST /api/execute - Execute task (non-streaming)
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { executionService } from '@/lib/services';
import { historyStore } from '@/lib/stores';
import { validateExecuteRequest } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    await historyStore.ensureReady();

    const body = await request.json();
    const { prompt, mode, options } = validateExecuteRequest(body);
    const result = await executionService.execute(prompt, mode, options);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
