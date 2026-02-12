/**
 * Memory Memories Route Handler
 * GET /api/memory/memories - Get agent memories
 * POST /api/memory/memories - Add agent memory
 * DELETE /api/memory/memories - Clear agent memories
 */

import { NextResponse } from 'next/server';
import { errorResponse, ValidationError } from '@/lib/api-errors';
import type { MemoryEntry } from '@/lib/api-types';
import { readMemoryStore, writeMemoryStore } from '@/lib/memory-storage';

// ═══════════════════════════════════════════════════════════════════════════
// Route Handlers
// ═══════════════════════════════════════════════════════════════════════════

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');
    const topK = searchParams.get('topK');

    if (!agent) {
      throw new ValidationError('Agent name is required');
    }

    const k = Number.parseInt(topK || '10', 10);
    const store = await readMemoryStore();

    let memories = store.memories.filter((m) => m.agent.toLowerCase() === agent.toLowerCase());

    // Sort by importance DESC, then timestamp DESC
    memories.sort((a, b) => {
      const impDiff = b.importance - a.importance;
      if (impDiff !== 0) return impDiff;
      return b.timestamp - a.timestamp;
    });

    memories = memories.slice(0, k);
    return NextResponse.json({ memories });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { agent, content, importance } = body as {
      agent: string;
      content: string;
      importance?: number;
    };

    if (!agent || !content) {
      throw new ValidationError('Agent and content cannot be empty');
    }

    if (content.length > 10000) {
      throw new ValidationError('Content too long (max 10000 chars)');
    }

    const store = await readMemoryStore();

    const entry: MemoryEntry = {
      id: `mem_${Date.now()}`,
      agent,
      content,
      timestamp: Math.floor(Date.now() / 1000),
      importance: Math.max(0, Math.min(1, importance ?? 0.5)),
    };

    store.memories.push(entry);

    // Cap at 1000 memories
    if (store.memories.length > 1000) {
      store.memories.sort((a, b) => b.timestamp - a.timestamp);
      store.memories = store.memories.slice(0, 1000);
    }

    await writeMemoryStore(store);
    return NextResponse.json(entry);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const agent = searchParams.get('agent');

    if (!agent) {
      throw new ValidationError('Agent name is required');
    }

    const store = await readMemoryStore();
    const originalLen = store.memories.length;
    store.memories = store.memories.filter((m) => m.agent.toLowerCase() !== agent.toLowerCase());
    const removed = originalLen - store.memories.length;

    await writeMemoryStore(store);
    return NextResponse.json({ removed });
  } catch (error) {
    return errorResponse(error);
  }
}
