/**
 * Memory Graph Route Handler
 * GET /api/memory/graph - Get knowledge graph
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { readMemoryStore } from '@/lib/memory-storage';

export async function GET() {
  try {
    const store = await readMemoryStore();
    return NextResponse.json(store.graph);
  } catch (error) {
    return errorResponse(error);
  }
}
