/**
 * History Route Handler
 * GET /api/history - Get message history
 * DELETE /api/history - Clear message history
 * POST /api/history - Add a message to history
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import type { Message } from '@/lib/api-types';
import { historyService } from '@/lib/services';
import { historyStore } from '@/lib/stores';
import { validateHistoryLimit } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    await historyStore.ensureReady();

    const { searchParams } = new URL(request.url);
    const limit = validateHistoryLimit(searchParams.get('limit') ?? undefined);

    return NextResponse.json({
      messages: historyService.getMessages(limit),
      total: historyService.getCount(),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  try {
    await historyStore.ensureReady();

    const cleared = historyService.clear();
    return NextResponse.json({
      success: true,
      cleared,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await historyStore.ensureReady();

    const body = await request.json();
    const { role, content } = body as { role: string; content: string };

    let message: Message;

    if (role === 'user') {
      message = historyService.addUserMessage(content);
    } else if (role === 'system') {
      message = historyService.addSystemMessage(content);
    } else {
      // For assistant or other roles, use addSystemMessage as fallback
      message = historyService.addSystemMessage(content);
    }

    return NextResponse.json(message);
  } catch (error) {
    return errorResponse(error);
  }
}
