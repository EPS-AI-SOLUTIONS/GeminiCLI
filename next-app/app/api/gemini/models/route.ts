/**
 * Gemini Models Route Handler
 * GET /api/gemini/models - List available Gemini models
 */

import { NextResponse } from 'next/server';
import { errorResponse, ValidationError } from '@/lib/api-errors';

function findEnvApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('apiKey') || findEnvApiKey();

    if (!apiKey) {
      throw new ValidationError('API key required');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const response = await fetch(url);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gemini API error: ${response.statusText}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { models?: Array<{ name: string }> };
    const models = (data.models || []).map((m) => m.name).filter((name) => name.includes('gemini'));

    return NextResponse.json({ models });
  } catch (error) {
    return errorResponse(error);
  }
}
