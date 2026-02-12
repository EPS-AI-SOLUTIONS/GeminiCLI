/**
 * Llama Model Unload Route Handler
 * POST /api/llama/model/unload - Unload current model
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState } from '@/lib/llama-state';

export async function POST() {
  try {
    await llamaState.disposeModel();
    return NextResponse.json({ message: 'Model unloaded' });
  } catch (error) {
    return errorResponse(error);
  }
}
