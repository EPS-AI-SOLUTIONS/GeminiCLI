/**
 * API Errors
 * Custom error classes for Next.js Route Handlers
 * Migrated from src/api/middleware/errorHandler.ts
 */

import { NextResponse } from 'next/server';
import type { ErrorResponse } from './api-types';

// ═══════════════════════════════════════════════════════════════════════════
// Error Classes
// ═══════════════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ExecutionError extends ApiError {
  constructor(message: string) {
    super(message, 500, 'EXECUTION_ERROR');
    this.name = 'ExecutionError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Error Response Helper
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create a standardized error NextResponse
 */
export function errorResponse(error: unknown): NextResponse<ErrorResponse> {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        statusCode: error.statusCode,
        timestamp: new Date().toISOString(),
      },
      { status: error.statusCode },
    );
  }

  const message = error instanceof Error ? error.message : 'Internal server error';

  return NextResponse.json(
    {
      error: message,
      statusCode: 500,
      timestamp: new Date().toISOString(),
    },
    { status: 500 },
  );
}

/**
 * Wrap a route handler with error handling
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>,
): Promise<NextResponse<T | ErrorResponse>> {
  return handler().catch(
    (error: unknown) => errorResponse(error) as NextResponse<T | ErrorResponse>,
  );
}
