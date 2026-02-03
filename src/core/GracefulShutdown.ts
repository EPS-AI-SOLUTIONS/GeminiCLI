/**
 * GracefulShutdown - Clean shutdown handling
 * Feature #10: Graceful Shutdown
 */

import chalk from 'chalk';
import { sessionCache } from '../memory/SessionCache.js';
import { mcpManager } from '../mcp/index.js';

export type ShutdownHandler = () => Promise<void>;

export interface ShutdownOptions {
  timeout?: number;        // Max time to wait for cleanup (ms)
  exitCode?: number;       // Exit code on completion
  forceAfter?: number;     // Force exit after this time (ms)
}

const DEFAULT_OPTIONS: ShutdownOptions = {
  timeout: 10000,          // 10 seconds
  exitCode: 0,
  forceAfter: 15000        // 15 seconds
};

/**
 * Graceful Shutdown Manager
 */
export class GracefulShutdownManager {
  private handlers: Map<string, ShutdownHandler> = new Map();
  private isShuttingDown = false;
  private currentTask: Promise<any> | null = null;

  constructor() {
    this.setupSignalHandlers();
  }

  /**
   * Register shutdown handler
   */
  register(name: string, handler: ShutdownHandler): void {
    this.handlers.set(name, handler);
  }

  /**
   * Unregister shutdown handler
   */
  unregister(name: string): void {
    this.handlers.delete(name);
  }

  /**
   * Set current task (will wait for completion on shutdown)
   */
  setCurrentTask(task: Promise<any>): void {
    this.currentTask = task;
  }

  /**
   * Clear current task
   */
  clearCurrentTask(): void {
    this.currentTask = null;
  }

  /**
   * Setup signal handlers
   */
  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

    for (const signal of signals) {
      process.on(signal, async () => {
        if (this.isShuttingDown) {
          console.log(chalk.red('\n⚠ Force exit requested'));
          process.exit(1);
        }

        console.log(chalk.yellow(`\n🛑 Received ${signal}, initiating graceful shutdown...`));
        await this.shutdown({ exitCode: signal === 'SIGTERM' ? 0 : 130 });
      });
    }

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error(chalk.red('\n💥 Uncaught Exception:'), error);
      await this.shutdown({ exitCode: 1 });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason) => {
      console.error(chalk.red('\n💥 Unhandled Rejection:'), reason);
      await this.shutdown({ exitCode: 1 });
    });
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(options: ShutdownOptions = {}): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Set force exit timer
    const forceExitTimer = setTimeout(() => {
      console.error(chalk.red('\n⚠ Shutdown timeout exceeded, forcing exit'));
      process.exit(opts.exitCode);
    }, opts.forceAfter);

    try {
      // Wait for current task if any
      if (this.currentTask) {
        console.log(chalk.gray('  Waiting for current task to complete...'));
        try {
          await Promise.race([
            this.currentTask,
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Task timeout')), opts.timeout)
            )
          ]);
        } catch (e) {
          console.log(chalk.yellow('  Current task interrupted'));
        }
      }

      // Run all registered handlers
      console.log(chalk.gray('  Running cleanup handlers...'));
      const handlerPromises = Array.from(this.handlers.entries()).map(
        async ([name, handler]) => {
          try {
            console.log(chalk.gray(`    - ${name}`));
            await handler();
          } catch (error: any) {
            console.error(chalk.yellow(`    ⚠ ${name} failed: ${error.message}`));
          }
        }
      );

      await Promise.allSettled(handlerPromises);

      console.log(chalk.green('✓ Shutdown complete'));
      clearTimeout(forceExitTimer);
      process.exit(opts.exitCode);

    } catch (error: any) {
      console.error(chalk.red(`Shutdown error: ${error.message}`));
      clearTimeout(forceExitTimer);
      process.exit(1);
    }
  }

  /**
   * Check if shutdown is in progress
   */
  isInProgress(): boolean {
    return this.isShuttingDown;
  }
}

// Global instance
export const shutdownManager = new GracefulShutdownManager();

// Register default handlers
shutdownManager.register('sessionCache', async () => {
  await sessionCache.flush();
});

shutdownManager.register('mcpServers', async () => {
  await mcpManager.disconnectAll();
});

export default shutdownManager;
