/**
 * Memory Graph Edges Route Handler
 * POST /api/memory/graph/edges - Add knowledge edge
 */

import { NextResponse } from 'next/server';
import { errorResponse, NotFoundError, ValidationError } from '@/lib/api-errors';
import type { KnowledgeEdge } from '@/lib/api-types';
import { readMemoryStore, writeMemoryStore } from '@/lib/memory-storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source, target, label } = body as {
      source: string;
      target: string;
      label: string;
    };

    if (!source || !target || !label) {
      throw new ValidationError('Source, target, and label cannot be empty');
    }

    const store = await readMemoryStore();

    const sourceExists = store.graph.nodes.some((n) => n.id === source);
    const targetExists = store.graph.nodes.some((n) => n.id === target);

    if (!sourceExists || !targetExists) {
      throw new NotFoundError('Source or target node');
    }

    const edge: KnowledgeEdge = { source, target, label };
    store.graph.edges.push(edge);

    // Cap at 1000 edges
    if (store.graph.edges.length > 1000) {
      store.graph.edges = store.graph.edges.slice(0, 1000);
    }

    await writeMemoryStore(store);
    return NextResponse.json(edge);
  } catch (error) {
    return errorResponse(error);
  }
}
