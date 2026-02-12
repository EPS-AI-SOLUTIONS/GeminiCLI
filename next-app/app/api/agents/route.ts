/**
 * GET /api/agents
 * List all Witcher Swarm agents
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import type { AgentsResponse } from '@/lib/api-types';
import { classificationService } from '@/lib/services';

export async function GET() {
  try {
    const agents = await classificationService.getAgents();
    return NextResponse.json<AgentsResponse>({ agents });
  } catch (error) {
    return errorResponse(error);
  }
}
