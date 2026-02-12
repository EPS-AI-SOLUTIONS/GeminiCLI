/**
 * Env Route Handler
 * GET /api/env - Get safe environment variables
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Return only safe env vars (GEMINI/GOOGLE keys, no system secrets)
  const safeKeys = [
    'GEMINI_API_KEY',
    'GOOGLE_API_KEY',
    'API_PORT',
    'API_HOST',
    'NODE_ENV',
    'LOG_LEVEL',
  ];

  const result: Record<string, string> = {};
  for (const key of safeKeys) {
    if (process.env[key]) {
      result[key] = process.env[key] as string;
    }
  }

  return NextResponse.json(result);
}
