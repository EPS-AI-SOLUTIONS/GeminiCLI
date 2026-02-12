/**
 * Llama Model Load Route Handler
 * POST /api/llama/model/load - Load a GGUF model
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState, getModelsDir } from '@/lib/llama-state';

interface LoadModelBody {
  modelPath: string;
  gpuLayers?: number;
}

export async function POST(request: Request) {
  try {
    const { modelPath, gpuLayers } = (await request.json()) as LoadModelBody;

    if (!modelPath) {
      return NextResponse.json({ error: 'Model path is required' }, { status: 400 });
    }

    await llamaState.ensureInstance();

    // Resolve path - absolute or relative to models dir
    const fullPath = path.isAbsolute(modelPath) ? modelPath : path.join(getModelsDir(), modelPath);

    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: `Model file not found: ${fullPath}` }, { status: 404 });
    }

    // Unload previous model if any
    await llamaState.disposeModel();

    llamaState.model = await llamaState.instance!.loadModel({
      modelPath: fullPath,
      gpuLayers: gpuLayers ?? 99,
    });

    llamaState.context = await llamaState.model.createContext();
    llamaState.currentModelPath = fullPath;

    return NextResponse.json({ message: `Model loaded: ${modelPath}` });
  } catch (error) {
    return errorResponse(error);
  }
}
