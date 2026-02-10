/**
 * ProgressTracking.ts - Feature #27: Progress Tracking
 *
 * Tracks and reports progress on multi-step tasks.
 * Provides real-time progress updates with listeners support.
 *
 * Part of ConversationLayer module extraction.
 */

import chalk from 'chalk';

// ============================================================
// Types & Interfaces
// ============================================================

export interface ProgressStep {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  startTime?: number;
  endTime?: number;
  result?: string;
  error?: string;
}

export interface ProgressReport {
  taskId: string;
  taskName: string;
  steps: ProgressStep[];
  currentStep: number;
  overallProgress: number; // 0-100
  startTime: number;
  estimatedCompletion?: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export type ProgressListener = (report: ProgressReport) => void;

// ============================================================
// ProgressTracker Class
// ============================================================

export class ProgressTracker {
  private tasks: Map<string, ProgressReport> = new Map();
  private listeners: ProgressListener[] = [];

  /**
   * Creates a new task with specified steps
   * @param taskId - Unique task identifier
   * @param name - Human-readable task name
   * @param steps - Array of step names
   * @returns ProgressReport for the created task
   */
  createTask(taskId: string, name: string, steps: string[]): ProgressReport {
    const report: ProgressReport = {
      taskId,
      taskName: name,
      steps: steps.map((s, i) => ({
        id: i + 1,
        name: s,
        status: 'pending',
      })),
      currentStep: 0,
      overallProgress: 0,
      startTime: Date.now(),
      status: 'pending',
    };

    this.tasks.set(taskId, report);
    return report;
  }

  /**
   * Marks a step as started
   * @param taskId - Task identifier
   * @param stepId - Step number (1-indexed)
   */
  startStep(taskId: string, stepId: number): void {
    const report = this.tasks.get(taskId);
    if (!report) return;

    const step = report.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'running';
      step.startTime = Date.now();
      report.currentStep = stepId;
      report.status = 'running';
      this.notifyListeners(report);
    }
  }

  /**
   * Marks a step as completed
   * @param taskId - Task identifier
   * @param stepId - Step number (1-indexed)
   * @param result - Optional result description
   */
  completeStep(taskId: string, stepId: number, result?: string): void {
    const report = this.tasks.get(taskId);
    if (!report) return;

    const step = report.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'completed';
      step.endTime = Date.now();
      step.result = result;

      // Update progress
      const completed = report.steps.filter((s) => s.status === 'completed').length;
      report.overallProgress = Math.round((completed / report.steps.length) * 100);

      // Check if all done
      if (completed === report.steps.length) {
        report.status = 'completed';
      }

      this.notifyListeners(report);
    }
  }

  /**
   * Marks a step as failed
   * @param taskId - Task identifier
   * @param stepId - Step number (1-indexed)
   * @param error - Error message
   */
  failStep(taskId: string, stepId: number, error: string): void {
    const report = this.tasks.get(taskId);
    if (!report) return;

    const step = report.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'failed';
      step.endTime = Date.now();
      step.error = error;
      report.status = 'failed';
      this.notifyListeners(report);
    }
  }

  /**
   * Marks a step as skipped
   * @param taskId - Task identifier
   * @param stepId - Step number (1-indexed)
   * @param reason - Optional reason for skipping
   */
  skipStep(taskId: string, stepId: number, reason?: string): void {
    const report = this.tasks.get(taskId);
    if (!report) return;

    const step = report.steps.find((s) => s.id === stepId);
    if (step) {
      step.status = 'skipped';
      step.endTime = Date.now();
      step.result = reason;
      this.notifyListeners(report);
    }
  }

  /**
   * Gets progress report for a task
   * @param taskId - Task identifier
   * @returns ProgressReport or undefined if not found
   */
  getProgress(taskId: string): ProgressReport | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Gets all active tasks
   * @returns Array of all progress reports
   */
  getAllTasks(): ProgressReport[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Registers a progress listener
   * @param listener - Callback function for progress updates
   */
  onProgress(listener: ProgressListener): void {
    this.listeners.push(listener);
  }

  /**
   * Removes a progress listener
   * @param listener - Listener to remove
   */
  removeListener(listener: ProgressListener): void {
    const index = this.listeners.indexOf(listener);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Clears all listeners
   */
  clearListeners(): void {
    this.listeners = [];
  }

  /**
   * Notifies all listeners of a progress update
   */
  private notifyListeners(report: ProgressReport): void {
    for (const listener of this.listeners) {
      try {
        listener(report);
      } catch (error) {
        console.error(chalk.red('[ProgressTracker] Listener error:'), error);
      }
    }
  }

  /**
   * Formats progress as a human-readable string
   * @param taskId - Task identifier
   * @returns Formatted progress string
   */
  formatProgress(taskId: string): string {
    const report = this.tasks.get(taskId);
    if (!report) return 'Task not found';

    const lines: string[] = [];
    lines.push(`[Task] ${report.taskName} [${report.overallProgress}%]`);

    for (const step of report.steps) {
      const icon =
        step.status === 'completed'
          ? '[OK]'
          : step.status === 'running'
            ? '[..]'
            : step.status === 'failed'
              ? '[X]'
              : step.status === 'skipped'
                ? '[>>]'
                : '[  ]';
      lines.push(`  ${icon} ${step.id}. ${step.name}`);
    }

    return lines.join('\n');
  }

  /**
   * Removes a task from tracking
   * @param taskId - Task identifier
   */
  removeTask(taskId: string): boolean {
    return this.tasks.delete(taskId);
  }

  /**
   * Clears all tasks
   */
  clearTasks(): void {
    this.tasks.clear();
  }

  /**
   * Gets elapsed time for a step
   * @param step - Progress step
   * @returns Elapsed time in milliseconds or undefined
   */
  getStepDuration(step: ProgressStep): number | undefined {
    if (step.startTime && step.endTime) {
      return step.endTime - step.startTime;
    }
    if (step.startTime && step.status === 'running') {
      return Date.now() - step.startTime;
    }
    return undefined;
  }
}

// ============================================================
// Singleton Instance
// ============================================================

export const progressTracker = new ProgressTracker();

// ============================================================
// Exports
// ============================================================

export default {
  ProgressTracker,
  progressTracker,
};
