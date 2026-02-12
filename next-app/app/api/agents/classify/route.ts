/**
 * POST /api/agents/classify
 * Classify a prompt to determine best agent
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import type { ClassifyResponse } from '@/lib/api-types';
import { classificationService } from '@/lib/services';
import { validateClassifyRequest } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prompt } = validateClassifyRequest(body);
    const result = await classificationService.getFullClassification(prompt);
    return NextResponse.json<ClassifyResponse>(result);
  } catch (error) {
    return errorResponse(error);
  }
}
