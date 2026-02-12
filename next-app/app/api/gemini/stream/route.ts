/**
 * Gemini Stream Route Handler
 * POST /api/gemini/stream - SSE streaming with Gemini API
 */

import { errorResponse, ValidationError } from '@/lib/api-errors';
import { createSSEResponse } from '@/lib/sse';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface GeminiMessage {
  role: string;
  content: string;
}

interface GeminiStreamBody {
  messages: GeminiMessage[];
  model: string;
  apiKey?: string;
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function findEnvApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

/**
 * Extract text values from Gemini streaming JSON chunks.
 * Replicates extract_text_values() from gemini_api.rs
 */
function extractTextValues(raw: string): string[] {
  const results: string[] = [];
  const regex = /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(raw)) !== null) {
    const value = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');
    results.push(value);
  }
  return results;
}

// ═══════════════════════════════════════════════════════════════════════════
// Route Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GeminiStreamBody;
    const {
      messages,
      model,
      apiKey: bodyApiKey,
      systemPrompt,
      temperature,
      maxOutputTokens,
    } = body;

    const apiKey = bodyApiKey || findEnvApiKey();
    if (!apiKey) {
      throw new ValidationError('API key required');
    }

    const modelName = model || 'gemini-3-pro-preview';

    // Build Gemini request body
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const geminiBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: temperature ?? 1.0,
        maxOutputTokens: maxOutputTokens ?? 65536,
      },
    };

    if (systemPrompt) {
      geminiBody.system_instruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse&key=${apiKey}`;

    return createSSEResponse(async (sse) => {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(geminiBody),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();
        sse.sendError(`Gemini API error ${response.status}: ${errorText}`);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            const textChunks = extractTextValues(jsonStr);
            for (const chunk of textChunks) {
              sse.sendChunk(chunk);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const textChunks = extractTextValues(buffer);
        for (const chunk of textChunks) {
          sse.sendChunk(chunk);
        }
      }
    });
  } catch (error) {
    return errorResponse(error);
  }
}
