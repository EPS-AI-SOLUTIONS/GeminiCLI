/**
 * Llama Models List Route Handler
 * GET /api/llama/models - List locally available GGUF models
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import type { ModelInfo } from '@/lib/llama-state';
import { getModelsDir, ensureModelsDir } from '@/lib/llama-state';

export async function GET() {
  ensureModelsDir();
  const modelsDir = getModelsDir();

  try {
    const files = fs.readdirSync(modelsDir);
    const models: ModelInfo[] = [];

    for (const file of files) {
      if (!file.endsWith('.gguf')) continue;
      const filePath = path.join(modelsDir, file);
      const stat = fs.statSync(filePath);
      models.push({
        name: file,
        path: filePath,
        size_mb: Math.round((stat.size / (1024 * 1024)) * 100) / 100,
        modified: stat.mtime.toISOString(),
      });
    }

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [] });
  }
}
