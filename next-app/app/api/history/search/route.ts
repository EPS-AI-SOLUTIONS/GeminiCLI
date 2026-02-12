/**
 * History Search Route Handler
 * GET /api/history/search - Search messages
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { historyService } from '@/lib/services';
import { validateSearchQuery } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = validateSearchQuery(searchParams.get('q') ?? undefined);
    const messages = historyService.search(query);

    return NextResponse.json({
      messages,
      count: messages.length,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
