/**
 * Llama Generate Route Handler
 * POST /api/llama/generate - Non-streaming text generation
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState } from '@/lib/llama-state';

interface GenerateBody {
  prompt: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: Request) {
  try {
    const { prompt, system, temperature, maxTokens } = (await request.json()) as GenerateBody;

    if (!llamaState.isModelLoaded || !llamaState.context) {
      return NextResponse.json(
        { error: 'No model loaded. Call /api/llama/model/load first.' },
        { status: 400 },
      );
    }

    const mod = await llamaState.getModule();
    const session = new mod.LlamaChatSession({
      contextSequence: llamaState.context.getSequence(),
      ...(system ? { systemPrompt: system } : {}),
    });

    const response = await session.prompt(prompt, {
      temperature: temperature ?? 0.7,
      maxTokens: maxTokens ?? 2048,
    });

    return NextResponse.json({ output: response });
  } catch (error) {
    return errorResponse(error);
  }
}
