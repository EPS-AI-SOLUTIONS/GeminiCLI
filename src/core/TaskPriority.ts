/**
 * TaskPriority - Task prioritization system
 * Feature #7: Task Prioritization
 */

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface PrioritizedTask {
  id: number | string;
  priority: Priority;
  content?: string; // Alias for task
  task?: string;
  agent?: string;
  dependencies?: (number | string)[];
  estimatedTokens?: number;
  deadline?: Date;
  retryCount?: number;
}

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  critical: 1000,
  high: 100,
  medium: 10,
  low: 1,
};

/**
 * Priority Queue for tasks
 */
export class TaskPriorityQueue {
  private tasks: PrioritizedTask[] = [];
  private completedIds: Set<number | string> = new Set();

  /**
   * Add task to queue
   */
  add(task: PrioritizedTask): void {
    this.tasks.push(task);
    this.sortQueue();
  }

  /**
   * Add multiple tasks
   */
  addAll(tasks: PrioritizedTask[]): void {
    this.tasks.push(...tasks);
    this.sortQueue();
  }

  /**
   * Get next executable task (dependencies satisfied)
   */
  getNext(): PrioritizedTask | undefined {
    for (const task of this.tasks) {
      const deps = task.dependencies || [];
      const depsCompleted = deps.every((dep) => this.completedIds.has(dep));
      if (depsCompleted) {
        // Remove from queue
        this.tasks = this.tasks.filter((t) => t.id !== task.id);
        return task;
      }
    }
    return undefined;
  }

  /**
   * Get all executable tasks (for parallel execution)
   */
  getAllExecutable(maxCount: number = 10): PrioritizedTask[] {
    const executable: PrioritizedTask[] = [];

    for (const task of this.tasks) {
      if (executable.length >= maxCount) break;

      const deps = task.dependencies || [];
      const depsCompleted = deps.every((dep) => this.completedIds.has(dep));
      if (depsCompleted) {
        executable.push(task);
      }
    }

    // Remove from queue
    const executableIds = new Set(executable.map((t) => t.id));
    this.tasks = this.tasks.filter((t) => !executableIds.has(t.id));

    return executable;
  }

  /**
   * Mark task as completed
   */
  complete(taskId: number | string): void {
    this.completedIds.add(taskId);
  }

  /**
   * Mark task as failed (re-queue with lower priority or skip)
   */
  fail(task: PrioritizedTask, requeue: boolean = true): void {
    if (requeue) {
      task.retryCount = (task.retryCount || 0) + 1;

      // Demote priority after failures
      if (task.retryCount >= 3) {
        task.priority = 'low';
      } else if (task.retryCount >= 2 && task.priority !== 'critical') {
        task.priority = this.demotePriority(task.priority);
      }

      this.add(task);
    }
  }

  private demotePriority(priority: Priority): Priority {
    const order: Priority[] = ['critical', 'high', 'medium', 'low'];
    const idx = order.indexOf(priority);
    return order[Math.min(idx + 1, order.length - 1)];
  }

  /**
   * Sort queue by priority and other factors
   */
  private sortQueue(): void {
    this.tasks.sort((a, b) => {
      // Primary: Priority weight
      const weightA = PRIORITY_WEIGHTS[a.priority];
      const weightB = PRIORITY_WEIGHTS[b.priority];
      if (weightA !== weightB) return weightB - weightA;

      // Secondary: Deadline (if set)
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime();
      }
      if (a.deadline) return -1;
      if (b.deadline) return 1;

      // Tertiary: Fewer dependencies first
      const aDeps = a.dependencies || [];
      const bDeps = b.dependencies || [];
      const depDiff = aDeps.length - bDeps.length;
      if (depDiff !== 0) return depDiff;

      // Quaternary: Lower retry count first
      return (a.retryCount || 0) - (b.retryCount || 0);
    });
  }

  /**
   * Get next task (alias for getNext with external completed set)
   */
  next(externalCompleted?: Set<number | string>): PrioritizedTask | undefined {
    const completed = externalCompleted || this.completedIds;

    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      const deps = task.dependencies || [];
      const depsCompleted = deps.every((dep) => completed.has(dep));
      if (depsCompleted) {
        this.tasks.splice(i, 1);
        return task;
      }
    }
    return undefined;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.tasks.length;
  }

  /**
   * Check if queue is empty
   */
  isEmpty(): boolean {
    return this.tasks.length === 0;
  }

  /**
   * Peek at top task without removing
   */
  peek(): PrioritizedTask | undefined {
    return this.tasks[0];
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.tasks = [];
    this.completedIds.clear();
  }

  /**
   * Get queue stats
   */
  getStats(): {
    total: number;
    completed: number;
    byPriority: Record<Priority, number>;
  } {
    const byPriority: Record<Priority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const task of this.tasks) {
      byPriority[task.priority]++;
    }

    return {
      total: this.tasks.length,
      completed: this.completedIds.size,
      byPriority,
    };
  }
}

/**
 * Detect priority from task text
 */
export function detectPriority(taskText: string): Priority {
  const lower = taskText.toLowerCase();

  if (/critical|urgent|asap|immediately|emergency|krytyczny|pilne/i.test(lower)) {
    return 'critical';
  }

  if (/important|high.*priority|wysoki.*priorytet|ważne/i.test(lower)) {
    return 'high';
  }

  if (/low.*priority|nice.*to.*have|niski.*priorytet|opcjonalnie/i.test(lower)) {
    return 'low';
  }

  return 'medium';
}

/**
 * Prioritize tasks from plan
 */
export function prioritizeTasks<
  T extends { id: number | string; task?: string; objective?: string; content?: string },
>(tasks: T[]): (T & { priority: Priority })[] {
  return tasks
    .map((t) => {
      const text = t.task || t.objective || t.content || '';
      return {
        ...t,
        priority: detectPriority(text),
        retryCount: 0,
      };
    })
    .sort((a, b) => {
      const weightA = PRIORITY_WEIGHTS[a.priority];
      const weightB = PRIORITY_WEIGHTS[b.priority];
      return weightB - weightA;
    });
}

// Global queue
export const taskQueue = new TaskPriorityQueue();

export default {
  TaskPriorityQueue,
  detectPriority,
  prioritizeTasks,
  taskQueue,
};
