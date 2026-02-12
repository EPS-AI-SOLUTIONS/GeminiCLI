/**
 * Llama Embeddings Route Handler
 * POST /api/llama/embeddings - Get text embeddings
 */

import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState } from '@/lib/llama-state';

interface EmbeddingsBody {
  text: string;
}

export async function POST(request: Request) {
  try {
    const { text } = (await request.json()) as EmbeddingsBody;

    if (!llamaState.isModelLoaded) {
      return NextResponse.json(
        { error: 'No model loaded. Call /api/llama/model/load first.' },
        { status: 400 },
      );
    }

    const embeddingContext = await llamaState.model.createEmbeddingContext();
    const embedding = await embeddingContext.getEmbeddingFor(text);

    return NextResponse.json({ embeddings: embedding.vector });
  } catch (error) {
    return errorResponse(error);
  }
}
