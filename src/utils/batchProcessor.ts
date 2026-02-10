/**
 * Generic Batch Processor Utility
 *
 * Provides unified batch processing with concurrency control and progress tracking.
 * Used by MCPManager and OllamaMCPServer for parallel operations.
 *
 * @module utils/batchProcessor
 */

/**
 * Options for batch processing
 */
export interface BatchProcessorOptions<T, R> {
  /** Maximum number of concurrent operations (default: 5) */
  maxConcurrency?: number;

  /** Progress callback called after each item completes */
  onProgress?: (completed: number, total: number, result: BatchItemResult<T, R>) => void;

  /** Called when a chunk starts processing */
  onChunkStart?: (chunkIndex: number, chunkSize: number) => void;

  /** Called when a chunk finishes processing */
  onChunkComplete?: (chunkIndex: number, results: BatchItemResult<T, R>[]) => void;
}

/**
 * Result for a single batch item
 */
export interface BatchItemResult<T, R> {
  /** The original item that was processed */
  item: T;

  /** Index of the item in the original array */
  index: number;

  /** Whether the processing succeeded */
  success: boolean;

  /** The result if successful */
  result?: R;

  /** The error message if failed */
  error?: string;

  /** Processing duration in milliseconds */
  durationMs: number;
}

/**
 * Aggregate result of batch processing
 */
export interface BatchProcessResult<T, R> {
  /** Total number of items processed */
  total: number;

  /** Number of successful operations */
  successful: number;

  /** Number of failed operations */
  failed: number;

  /** Total duration in milliseconds */
  totalDurationMs: number;

  /** Average duration per item in milliseconds */
  avgDurationMs: number;

  /** Individual results for each item */
  results: BatchItemResult<T, R>[];
}

/**
 * Process items in batches with concurrency control
 *
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param options - Processing options
 * @returns Aggregate results of batch processing
 *
 * @example
 * ```typescript
 * // Simple usage
 * const results = await processBatch(
 *   [1, 2, 3, 4, 5],
 *   async (num) => num * 2,
 *   { maxConcurrency: 2 }
 * );
 *
 * // With progress tracking
 * const results = await processBatch(
 *   operations,
 *   async (op) => await callTool(op.tool, op.params),
 *   {
 *     maxConcurrency: 5,
 *     onProgress: (completed, total) => {
 *       console.log(`Progress: ${completed}/${total}`);
 *     }
 *   }
 * );
 * ```
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options: BatchProcessorOptions<T, R> = {},
): Promise<BatchProcessResult<T, R>> {
  const { maxConcurrency = 5, onProgress, onChunkStart, onChunkComplete } = options;

  if (!items || items.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      results: [],
    };
  }

  const startTime = Date.now();
  const results: BatchItemResult<T, R>[] = [];

  // Split items into chunks for concurrency control
  const chunks: Array<{ items: T[]; startIndex: number }> = [];
  for (let i = 0; i < items.length; i += maxConcurrency) {
    chunks.push({
      items: items.slice(i, i + maxConcurrency),
      startIndex: i,
    });
  }

  let completedCount = 0;

  // Process chunks sequentially, items within chunk in parallel
  for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
    const chunk = chunks[chunkIndex];

    onChunkStart?.(chunkIndex, chunk.items.length);

    const chunkResults = await Promise.all(
      chunk.items.map(async (item, localIndex): Promise<BatchItemResult<T, R>> => {
        const globalIndex = chunk.startIndex + localIndex;
        const itemStartTime = Date.now();

        try {
          const result = await processor(item, globalIndex);
          const itemResult: BatchItemResult<T, R> = {
            item,
            index: globalIndex,
            success: true,
            result,
            durationMs: Date.now() - itemStartTime,
          };

          completedCount++;
          onProgress?.(completedCount, items.length, itemResult);

          return itemResult;
        } catch (error) {
          const itemResult: BatchItemResult<T, R> = {
            item,
            index: globalIndex,
            success: false,
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - itemStartTime,
          };

          completedCount++;
          onProgress?.(completedCount, items.length, itemResult);

          return itemResult;
        }
      }),
    );

    results.push(...chunkResults);
    onChunkComplete?.(chunkIndex, chunkResults);
  }

  const totalDurationMs = Date.now() - startTime;
  const successful = results.filter((r) => r.success).length;

  return {
    total: items.length,
    successful,
    failed: items.length - successful,
    totalDurationMs,
    avgDurationMs: Math.round(totalDurationMs / items.length),
    results,
  };
}

/**
 * Simplified batch processor that returns only the results array
 * Useful when you don't need aggregate statistics
 *
 * @param items - Array of items to process
 * @param processor - Async function to process each item
 * @param maxConcurrency - Maximum concurrent operations (default: 5)
 * @returns Array of results (successful values or error objects)
 */
export async function processBatchSimple<T, R>(
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  maxConcurrency: number = 5,
): Promise<Array<{ success: true; value: R } | { success: false; error: string }>> {
  const result = await processBatch(items, processor, { maxConcurrency });

  return result.results.map((r) =>
    r.success
      ? { success: true as const, value: r.result as R }
      : { success: false as const, error: r.error || 'Unknown error' },
  );
}

/**
 * Create a batch processor with pre-configured options
 * Useful for creating reusable processors with consistent settings
 *
 * @param defaultOptions - Default options for all batch operations
 * @returns Configured processBatch function
 *
 * @example
 * ```typescript
 * const mcpBatchProcessor = createBatchProcessor({ maxConcurrency: 5 });
 * const results = await mcpBatchProcessor(operations, processOperation);
 * ```
 */
export function createBatchProcessor<T, R>(
  defaultOptions: BatchProcessorOptions<T, R>,
): (
  items: T[],
  processor: (item: T, index: number) => Promise<R>,
  options?: Partial<BatchProcessorOptions<T, R>>,
) => Promise<BatchProcessResult<T, R>> {
  return (items, processor, options = {}) =>
    processBatch(items, processor, { ...defaultOptions, ...options });
}
