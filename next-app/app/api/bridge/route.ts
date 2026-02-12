/**
 * Bridge Route Handler
 * GET /api/bridge - Get bridge state
 * POST /api/bridge - Update bridge state
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import type { BridgeData } from '@/lib/api-types';
import { readBridgeState, writeBridgeState } from '@/lib/memory-storage';

export async function GET() {
  try {
    const bridge = await readBridgeState();
    return NextResponse.json(bridge);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bridge = await readBridgeState();

    // Merge updates
    const updated: BridgeData = {
      ...bridge,
      ...body,
    };

    await writeBridgeState(updated);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
