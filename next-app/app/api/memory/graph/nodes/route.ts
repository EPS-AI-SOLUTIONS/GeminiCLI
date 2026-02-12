/**
 * Memory Graph Nodes Route Handler
 * POST /api/memory/graph/nodes - Add knowledge node
 */

import { NextResponse } from 'next/server';
import { ApiError, errorResponse, ValidationError } from '@/lib/api-errors';
import type { KnowledgeNode } from '@/lib/api-types';
import { readMemoryStore, writeMemoryStore } from '@/lib/memory-storage';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, type, label } = body as { id: string; type?: string; label: string };

    if (!id || !label) {
      throw new ValidationError('Node ID and label cannot be empty');
    }

    const store = await readMemoryStore();

    if (store.graph.nodes.some((n) => n.id === id)) {
      throw new ApiError('Node with this ID already exists', 409, 'CONFLICT');
    }

    const node: KnowledgeNode = { id, type: type || 'default', label };
    store.graph.nodes.push(node);

    // Cap at 500 nodes
    if (store.graph.nodes.length > 500) {
      store.graph.nodes = store.graph.nodes.slice(0, 500);
    }

    await writeMemoryStore(store);
    return NextResponse.json(node);
  } catch (error) {
    return errorResponse(error);
  }
}
