/**
 * Llama Generate Stream Route Handler
 * POST /api/llama/generate/stream - SSE streaming text generation
 */

import { NextResponse } from 'next/server';
import { llamaState } from '@/lib/llama-state';
import { createSSEResponse } from '@/lib/sse';

interface GenerateBody {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: Request) {
  const body = (await request.json()) as GenerateBody;
  const { prompt, system, temperature, maxTokens } = body;

  if (!llamaState.isModelLoaded || !llamaState.context) {
    return NextResponse.json(
      { error: 'No model loaded. Call /api/llama/model/load first.' },
      { status: 400 },
    );
  }

  return createSSEResponse(async (sse) => {
    const mod = await llamaState.getModule();
    const session = new mod.LlamaChatSession({
      contextSequence: llamaState.context.getSequence(),
      ...(system ? { systemPrompt: system } : {}),
    });

    await session.prompt(prompt, {
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2048,
      onTextChunk(chunk: string) {
        sse.sendChunk(chunk);
      },
    });

    sse.sendResult('[GENERATION COMPLETE]', 0);
  });
}
