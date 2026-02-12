/**
 * Llama Chat Stream Route Handler
 * POST /api/llama/chat/stream - SSE streaming chat completion
 */

import { NextResponse } from 'next/server';
import { llamaState } from '@/lib/llama-state';
import { createSSEResponse } from '@/lib/sse';

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
  const body = (await request.json()) as ChatBody;
  const { messages, temperature, maxTokens } = body;

  if (!llamaState.isModelLoaded || !llamaState.context) {
    return NextResponse.json(
      { error: 'No model loaded. Call /api/llama/model/load first.' },
      { status: 400 },
    );
  }

  return createSSEResponse(async (sse) => {
    const mod = await llamaState.getModule();
    const systemMsg = messages.find((m) => m.role === 'system');

    const session = new mod.LlamaChatSession({
      contextSequence: llamaState.context.getSequence(),
      ...(systemMsg ? { systemPrompt: systemMsg.content } : {}),
    });

    // Process user messages, stream the last one
    const userMessages = messages.filter((m) => m.role === 'user');
    for (let i = 0; i < userMessages.length; i++) {
      const isLast = i === userMessages.length - 1;
      if (isLast) {
        await session.prompt(userMessages[i].content, {
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? 2048,
          onTextChunk(chunk: string) {
            sse.sendChunk(chunk);
          },
        });
      } else {
        await session.prompt(userMessages[i].content, {
          temperature: temperature ?? 0.7,
          maxTokens: maxTokens ?? 2048,
        });
      }
    }

    sse.sendResult('[CHAT COMPLETE]', 0);
  });
}
