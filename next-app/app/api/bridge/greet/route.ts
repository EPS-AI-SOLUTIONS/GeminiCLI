/**
 * Bridge Greet Route Handler
 * GET /api/bridge/greet - Greet endpoint
 */

import { NextResponse } from 'next/server';

interface GreetResponse {
  message: string;
}

export async function GET(request: Request): Promise<NextResponse<GreetResponse>> {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get('name') || 'World';

  return NextResponse.json({
    message: `Hello, ${name}! Welcome to ClaudeHydra.`,
  });
}
