/**
 * SSE (Server-Sent Events) Utilities for Next.js Route Handlers
 * Replaces Fastify's reply.raw.write() with Web Streams API (ReadableStream)
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type SSEEventType = 'plan' | 'chunk' | 'result' | 'error' | 'status';

// ═══════════════════════════════════════════════════════════════════════════
// SSE Stream Builder
// ═══════════════════════════════════════════════════════════════════════════

export class SSEWriter {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private encoder = new TextEncoder();
  private closed = false;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Create a ReadableStream + Response with SSE headers.
   * Usage:
   * ```ts
   * const sse = new SSEWriter();
   * const response = sse.response();
   * // ... use sse.sendChunk(), sse.sendError(), sse.close()
   * return response;
   * ```
   */
  response(): Response {
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        this.controller = controller;
      },
      cancel: () => {
        this.closed = true;
        this.stopKeepAlive();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  }

  /**
   * Send a typed event
   */
  send<T extends object>(type: SSEEventType, data: T): void {
    if (this.closed || !this.controller) return;

    try {
      const payload = JSON.stringify({ type, ...data });
      this.controller.enqueue(this.encoder.encode(`data: ${payload}\n\n`));
    } catch {
      // Stream may have been closed by client
      this.closed = true;
    }
  }

  /**
   * Send plan event
   */
  sendPlan(plan: object): void {
    this.send('plan', { plan });
  }

  /**
   * Send chunk event
   */
  sendChunk(content: string): void {
    this.send('chunk', { content });
  }

  /**
   * Send result event
   */
  sendResult(result: string, duration: number): void {
    this.send('result', { result, duration });
  }

  /**
   * Send error event
   */
  sendError(error: string): void {
    this.send('error', { error });
  }

  /**
   * Send raw data string
   */
  sendRaw(data: string): void {
    if (this.closed || !this.controller) return;

    try {
      this.controller.enqueue(this.encoder.encode(`data: ${data}\n\n`));
    } catch {
      this.closed = true;
    }
  }

  /**
   * Send SSE comment (for keep-alive)
   */
  sendComment(comment: string): void {
    if (this.closed || !this.controller) return;

    try {
      this.controller.enqueue(this.encoder.encode(`: ${comment}\n\n`));
    } catch {
      this.closed = true;
    }
  }

  /**
   * Close the stream
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopKeepAlive();

    if (this.controller) {
      try {
        this.controller.enqueue(this.encoder.encode('data: [DONE]\n\n'));
        this.controller.close();
      } catch {
        // Already closed
      }
    }
  }

  /**
   * Check if stream is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Start keep-alive timer
   */
  startKeepAlive(intervalMs: number = 15000): void {
    this.stopKeepAlive();
    this.keepAliveTimer = setInterval(() => {
      if (!this.isClosed()) {
        this.sendComment('keep-alive');
      } else {
        this.stopKeepAlive();
      }
    }, intervalMs);
  }

  /**
   * Stop keep-alive timer
   */
  private stopKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper: create SSE response with callback
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Create an SSE Response using a callback pattern.
 * Handles keep-alive and cleanup automatically.
 *
 * Usage:
 * ```ts
 * return createSSEResponse(async (sse) => {
 *   sse.sendChunk('Hello');
 *   sse.sendResult('Done', 100);
 * });
 * ```
 */
export function createSSEResponse(
  handler: (sse: SSEWriter) => Promise<void>,
  keepAliveMs: number = 15000,
): Response {
  const sse = new SSEWriter();
  const response = sse.response();

  // Run handler in background (don't await - stream starts immediately)
  (async () => {
    sse.startKeepAlive(keepAliveMs);
    try {
      await handler(sse);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      sse.sendError(msg);
    } finally {
      sse.close();
    }
  })();

  return response;
}
