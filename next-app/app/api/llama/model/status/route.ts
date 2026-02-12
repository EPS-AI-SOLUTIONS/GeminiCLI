/**
 * Llama Model Status Route Handler
 * GET /api/llama/model/status - Check if model is loaded
 */

import { NextResponse } from 'next/server';
import { llamaState } from '@/lib/llama-state';

export async function GET() {
  return NextResponse.json({
    loaded: llamaState.isModelLoaded,
    currentModel: llamaState.currentModelPath,
  });
}
