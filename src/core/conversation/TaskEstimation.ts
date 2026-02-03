/**
 * TaskEstimation.ts - Feature #26: Task Estimation
 *
 * Estimates time and complexity for tasks based on keywords and patterns.
 * Provides breakdown of expected steps and resource requirements.
 *
 * Part of ConversationLayer module extraction.
 */

import chalk from 'chalk';

// ============================================================
// Types & Interfaces
// ============================================================

export interface TaskEstimate {
  complexity: 'trivial' | 'simple' | 'moderate' | 'complex' | 'massive';
  estimatedAgents: number;
  estimatedSteps: number;
  estimatedTokens: number;
  confidence: number;
  breakdown: { step: string; estimate: string }[];
}

// ============================================================
// Constants
// ============================================================

const COMPLEXITY_INDICATORS: Record<TaskEstimate['complexity'], string[]> = {
  trivial: ['rename', 'typo', 'comment', 'log', 'print'],
  simple: ['add', 'remove', 'change', 'update', 'fix simple'],
  moderate: ['implement', 'create', 'refactor small', 'test'],
  complex: ['build', 'migrate', 'integrate', 'refactor large', 'debug complex'],
  massive: ['redesign', 'architecture', 'security audit', 'full rewrite']
};

const COMPLEXITY_ESTIMATES: Record<TaskEstimate['complexity'], { agents: number; steps: number; tokens: number }> = {
  trivial: { agents: 1, steps: 1, tokens: 500 },
  simple: { agents: 1, steps: 2, tokens: 1500 },
  moderate: { agents: 2, steps: 4, tokens: 4000 },
  complex: { agents: 3, steps: 8, tokens: 10000 },
  massive: { agents: 5, steps: 15, tokens: 25000 }
};

// ============================================================
// Core Function
// ============================================================

/**
 * Estimates task complexity and resource requirements
 * @param taskDescription - Description of the task to estimate
 * @returns TaskEstimate with complexity, agents, steps, tokens and breakdown
 */
export async function estimateTask(taskDescription: string): Promise<TaskEstimate> {
  // Keyword-based complexity estimation
  let complexity: TaskEstimate['complexity'] = 'moderate';
  const lowerTask = taskDescription.toLowerCase();

  for (const [level, keywords] of Object.entries(COMPLEXITY_INDICATORS)) {
    if (keywords.some(kw => lowerTask.includes(kw))) {
      complexity = level as TaskEstimate['complexity'];
      break;
    }
  }

  // Get estimates based on complexity
  const estimate = COMPLEXITY_ESTIMATES[complexity];

  // Generate breakdown
  const breakdown: { step: string; estimate: string }[] = [];
  if (complexity !== 'trivial') {
    breakdown.push({ step: 'Analiza i planowanie', estimate: 'krotko' });
  }
  breakdown.push({ step: 'Wykonanie glowne', estimate: complexity === 'trivial' ? 'blyskawicznie' : 'srednio' });
  if (complexity === 'complex' || complexity === 'massive') {
    breakdown.push({ step: 'Weryfikacja i testy', estimate: 'srednio' });
    breakdown.push({ step: 'Poprawki i finalizacja', estimate: 'krotko' });
  }

  console.log(chalk.gray(`[TaskEstimation] Complexity: ${complexity}, Agents: ~${estimate.agents}, Steps: ~${estimate.steps}`));

  return {
    complexity,
    estimatedAgents: estimate.agents,
    estimatedSteps: estimate.steps,
    estimatedTokens: estimate.tokens,
    confidence: 0.7,
    breakdown
  };
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Determines complexity level from task description
 * @param taskDescription - Task description to analyze
 * @returns Complexity level
 */
export function determineComplexity(taskDescription: string): TaskEstimate['complexity'] {
  const lowerTask = taskDescription.toLowerCase();

  for (const [level, keywords] of Object.entries(COMPLEXITY_INDICATORS)) {
    if (keywords.some(kw => lowerTask.includes(kw))) {
      return level as TaskEstimate['complexity'];
    }
  }

  return 'moderate';
}

/**
 * Gets raw estimates for a given complexity level
 * @param complexity - Complexity level
 * @returns Estimates object with agents, steps, tokens
 */
export function getEstimatesForComplexity(complexity: TaskEstimate['complexity']): { agents: number; steps: number; tokens: number } {
  return COMPLEXITY_ESTIMATES[complexity];
}

// ============================================================
// Exports
// ============================================================

export default {
  estimateTask,
  determineComplexity,
  getEstimatesForComplexity
};
