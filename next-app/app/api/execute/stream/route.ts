/**
 * Execute Stream Route Handler
 * POST /api/execute/stream - Execute with SSE streaming
 */

import { errorResponse } from '@/lib/api-errors';
import { executionService } from '@/lib/services';
import { createSSEResponse } from '@/lib/sse';
import { historyStore } from '@/lib/stores';
import { validateExecuteRequest } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    await historyStore.ensureReady();

    const body = await request.json();
    const { prompt, mode, options } = validateExecuteRequest(body);

    return createSSEResponse(async (sse) => {
      for await (const event of executionService.executeStream(prompt, mode, options)) {
        sse.send(event.type as 'plan' | 'chunk' | 'result' | 'error', event.data as object);
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
