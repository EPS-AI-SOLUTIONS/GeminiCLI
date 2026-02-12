/**
 * Llama Initialize Route Handler
 * POST /api/llama/initialize - Initialize llama backend
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState } from '@/lib/llama-state';

export async function POST() {
  try {
    const mod = await llamaState.getModule();
    llamaState.instance = await mod.getLlama();
    return NextResponse.json({ message: 'node-llama-cpp backend initialized' });
  } catch (error) {
    return errorResponse(error);
  }
}
