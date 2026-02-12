/**
 * Llama Recommended Models Route Handler
 * GET /api/llama/models/recommended - List recommended models for download
 */

import { NextResponse } from 'next/server';
import { RECOMMENDED_MODELS } from '@/lib/llama-state';

export async function GET() {
  return NextResponse.json({ models: RECOMMENDED_MODELS });
}
