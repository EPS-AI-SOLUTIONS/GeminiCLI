/**
 * Llama Model Download Route Handler
 * POST /api/llama/models/download - Download model from HuggingFace (SSE progress)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { NextResponse } from 'next/server';
import { llamaState, getModelsDir, ensureModelsDir } from '@/lib/llama-state';
import { createSSEResponse } from '@/lib/sse';

interface DownloadModelBody {
  repoId: string;
  filename: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as DownloadModelBody;
  const { repoId, filename } = body;

  if (!repoId || !filename) {
    return NextResponse.json({ error: 'repoId and filename are required' }, { status: 400 });
  }

  ensureModelsDir();

  return createSSEResponse(async (sse) => {
    await llamaState.ensureInstance();

    const targetPath = path.join(getModelsDir(), filename);
    const url = `https://huggingface.co/${repoId}/resolve/main/${filename}`;

    // Stream download with progress updates
    const response = await fetch(url, { redirect: 'follow' });
    if (!response.ok || !response.body) {
      sse.sendError(`Download failed: HTTP ${response.status}`);
      return;
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    const reader = response.body.getReader();
    const writeStream = fs.createWriteStream(targetPath);
    let downloaded = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      writeStream.write(Buffer.from(value));
      downloaded += value.byteLength;

      const percentage = contentLength > 0 ? Math.round((downloaded / contentLength) * 100) : 0;

      sse.sendChunk(
        JSON.stringify({
          filename,
          downloaded,
          total: contentLength,
          percentage,
          complete: false,
        }),
      );
    }

    writeStream.end();

    sse.sendChunk(
      JSON.stringify({
        filename,
        downloaded,
        total: contentLength,
        percentage: 100,
        complete: true,
      }),
    );

    sse.sendResult(targetPath, 0);
  });
}
