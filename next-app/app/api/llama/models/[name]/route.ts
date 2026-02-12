/**
 * Llama Model Delete Route Handler
 * DELETE /api/llama/models/[name] - Delete a local GGUF model file
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { errorResponse } from '@/lib/api-errors';
import { llamaState, getModelsDir } from '@/lib/llama-state';

export async function DELETE(_request: Request, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;
    const filePath = path.join(getModelsDir(), name);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: `Model not found: ${name}` }, { status: 404 });
    }

    // Unload if this model is currently loaded
    if (llamaState.currentModelPath?.includes(name)) {
      await llamaState.disposeModel();
    }

    fs.unlinkSync(filePath);
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
