/**
 * Execution Service
 * Handles task execution through Swarm
 * Migrated from src/api/services/ExecutionService.ts
 */

import type {
  ExecuteOptions,
  ExecutePlan,
  ExecuteStatusResponse,
  ExecutionMode,
  SSEEventType,
} from '../api-types';
import { classificationService } from './classification-service';
import { historyService } from './history-service';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecuteResult {
  plan: ExecutePlan;
  result: string;
  duration: number;
  mode: ExecutionMode;
}

export interface ExecuteStreamEvent {
  type: SSEEventType;
  data: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Module Loader
// ═══════════════════════════════════════════════════════════════════════════

async function loadCreateSwarm() {
  // Dynamic import of core module from parent directory (../src/index.ts)
  // webpackIgnore prevents Turbopack/Webpack from statically analyzing this import
  // @ts-expect-error - Runtime-only dynamic import from parent project, not resolvable by TS
  const core = await import(/* webpackIgnore: true */ '../../src/index.js');
  return core.createSwarm as () => Promise<{
    executeObjective: (prompt: string) => Promise<string>;
    cleanup?: () => Promise<void>;
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════
// Service Class
// ═══════════════════════════════════════════════════════════════════════════

export class ExecutionService {
  private isProcessing = false;
  private processingPromise: Promise<void> | null = null;
  private createSwarmFn: Awaited<ReturnType<typeof loadCreateSwarm>> | null = null;

  private async getCreateSwarm() {
    if (!this.createSwarmFn) {
      this.createSwarmFn = await loadCreateSwarm();
    }
    return this.createSwarmFn;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Swarm type varies
  private async safeCleanup(swarm: any): Promise<void> {
    if (!('cleanup' in swarm && typeof swarm.cleanup === 'function')) {
      return;
    }

    if (this.isProcessing) {
      console.warn('[ExecutionService] Cleanup requested during active processing — deferring.');
      if (this.processingPromise) {
        this.processingPromise.then(() => {
          swarm.cleanup().catch((err: unknown) => {
            console.error('[ExecutionService] Deferred cleanup error:', err);
          });
        });
      }
      return;
    }

    await swarm.cleanup();
  }

  async execute(
    prompt: string,
    mode: ExecutionMode = 'basic',
    _options: ExecuteOptions = {},
  ): Promise<ExecuteResult> {
    const startTime = Date.now();
    const plan = await classificationService.createPlan(prompt);

    historyService.addUserMessage(prompt);

    this.isProcessing = true;
    let resolveProcessing: (() => void) | undefined;
    this.processingPromise = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });

    try {
      const createSwarm = await this.getCreateSwarm();
      const swarm = await createSwarm();

      const result = await swarm.executeObjective(prompt);
      const duration = Date.now() - startTime;

      historyService.addAssistantMessage(result, plan, {
        duration,
        mode,
        streaming: false,
      });

      this.isProcessing = false;
      resolveProcessing?.();
      this.processingPromise = null;

      await this.safeCleanup(swarm);

      return { plan, result, duration, mode };
    } catch (error: unknown) {
      this.isProcessing = false;
      resolveProcessing?.();
      this.processingPromise = null;
      const errorMessage = error instanceof Error ? error.message : String(error);
      historyService.addErrorMessage(errorMessage);
      throw error;
    }
  }

  async *executeStream(
    prompt: string,
    mode: ExecutionMode = 'basic',
    _options: ExecuteOptions = {},
  ): AsyncGenerator<ExecuteStreamEvent> {
    const startTime = Date.now();
    const plan = await classificationService.createPlan(prompt);

    yield { type: 'plan', data: { plan } };

    historyService.addUserMessage(prompt);

    this.isProcessing = true;
    let resolveProcessing: (() => void) | undefined;
    this.processingPromise = new Promise<void>((resolve) => {
      resolveProcessing = resolve;
    });

    try {
      const createSwarm = await this.getCreateSwarm();
      const swarm = await createSwarm();

      const result = await swarm.executeObjective(prompt);
      const duration = Date.now() - startTime;

      yield { type: 'chunk', data: { content: result } };
      yield { type: 'result', data: { result, duration } };

      historyService.addAssistantMessage(result, plan, {
        duration,
        mode,
        streaming: false,
      });

      this.isProcessing = false;
      resolveProcessing?.();
      this.processingPromise = null;

      await this.safeCleanup(swarm);
    } catch (error: unknown) {
      this.isProcessing = false;
      resolveProcessing?.();
      this.processingPromise = null;
      const errorMessage = error instanceof Error ? error.message : String(error);
      yield { type: 'error', data: { error: errorMessage } };
      historyService.addErrorMessage(errorMessage);
    }
  }

  async checkStatus(): Promise<ExecuteStatusResponse> {
    try {
      const createSwarm = await this.getCreateSwarm();
      const swarm = await createSwarm();
      await this.safeCleanup(swarm);

      return {
        available: true,
        modes: ['basic', 'enhanced', 'swarm'],
        streaming: false,
      };
    } catch {
      return {
        available: false,
        error: 'Swarm not available - check MCP or API configuration',
      };
    }
  }
}

// Singleton
export const executionService = new ExecutionService();
