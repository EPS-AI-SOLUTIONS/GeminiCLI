/**
 * Llama Chat Route Handler
 * POST /api/llama/chat - Non-streaming chat completion
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState } from '@/lib/llama-state';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatBody {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export async function POST(request: Request) {
  try {
    const { messages, temperature, maxTokens } = (await request.json()) as ChatBody;

    if (!llamaState.isModelLoaded || !llamaState.context) {
      return NextResponse.json(
        { error: 'No model loaded. Call /api/llama/model/load first.' },
        { status: 400 },
      );
    }

    const mod = await llamaState.getModule();

    // Extract system message if present for constructor
    const systemMsg = messages.find((m) => m.role === 'system');

    const session = new mod.LlamaChatSession({
      contextSequence: llamaState.context.getSequence(),
      ...(systemMsg ? { systemPrompt: systemMsg.content } : {}),
    });

    // Send conversation messages
    let lastResponse = '';
    for (const msg of messages) {
      if (msg.role === 'system') continue;
      if (msg.role === 'user') {
        lastResponse = await session.prompt(msg.content, {
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? 2048,
        });
      }
    }

    return NextResponse.json({ output: lastResponse });
  } catch (error) {
    return errorResponse(error);
  }
}
