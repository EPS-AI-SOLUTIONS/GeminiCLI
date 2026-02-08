/**
 * GeminiHydra - Planning Service
 * Handles plan creation and JSON parsing
 */

import { SwarmPlan, SwarmTask } from '../types/index.js';
import { MAX_TASKS } from '../config/constants.js';
import { AppError, logServiceWarning } from './BaseAgentService.js';

export class PlanningService {
  /**
   * Parse JSON response from planning agent
   */
  parseResponse(response: string): SwarmPlan | null {
    if (typeof response !== 'string') {
      throw new AppError({
        code: 'PLANNING_INVALID_ARGS',
        message: 'PlanningService.parseResponse: response must be a string',
        context: { method: 'parseResponse', field: 'response', type: typeof response },
      });
    }
    if (response.trim() === '') {
      logServiceWarning('PlanningService.parseResponse', 'Empty response received');
      return null;
    }

    try {
      // Clean JSON from markdown
      let json = response
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      // Find JSON object
      const start = json.indexOf('{');
      const end = json.lastIndexOf('}');
      if (start === -1 || end === -1) {
        logServiceWarning('PlanningService.parseResponse', 'No JSON object found in response', {
          responseLength: response.length,
          responsePreview: response.substring(0, 200),
        });
        return null;
      }

      json = json.substring(start, end + 1);
      return JSON.parse(json) as SwarmPlan;

    } catch (error) {
      logServiceWarning('PlanningService.parseResponse', 'Failed to parse JSON from response', {
        error: error instanceof Error ? error.message : String(error),
        responseLength: response.length,
        responsePreview: response.substring(0, 200),
      });
      return null;
    }
  }

  /**
   * Validate and normalize tasks
   */
  validateTasks(tasks: Partial<SwarmTask>[]): SwarmTask[] {
    if (!Array.isArray(tasks)) {
      throw new AppError({
        code: 'PLANNING_INVALID_ARGS',
        message: 'PlanningService.validateTasks: tasks must be an array',
        context: { method: 'validateTasks', field: 'tasks', type: typeof tasks },
      });
    }

    if (tasks.length > MAX_TASKS) {
      logServiceWarning('PlanningService.validateTasks', `Truncating task list from ${tasks.length} to ${MAX_TASKS}`, {
        originalCount: tasks.length,
        maxTasks: MAX_TASKS,
      });
    }

    return tasks.slice(0, MAX_TASKS).map((t, i) => ({
      id: t.id || i + 1,
      agent: t.agent || 'geralt',
      task: t.task || '',
      dependencies: t.dependencies || [],
      status: 'pending' as const,
      retryCount: t.retryCount ?? 0
    }));
  }

  /**
   * Create fallback plan for single task
   */
  createFallbackPlan(objective: string): SwarmPlan {
    if (typeof objective !== 'string' || objective.trim() === '') {
      throw new AppError({
        code: 'PLANNING_INVALID_ARGS',
        message: 'PlanningService.createFallbackPlan: objective is required and must be a non-empty string',
        context: { method: 'createFallbackPlan', field: 'objective' },
      });
    }

    logServiceWarning('PlanningService.createFallbackPlan', 'Using fallback single-task plan', {
      objectiveLength: objective.length,
    });
    return {
      objective,
      tasks: [{
        id: 1,
        agent: 'geralt',
        task: objective,
        dependencies: [],
        status: 'pending',
        retryCount: 0
      }]
    };
  }

  /**
   * Build planning prompt
   */
  buildPrompt(objective: string): string {
    if (typeof objective !== 'string' || objective.trim() === '') {
      throw new AppError({
        code: 'PLANNING_INVALID_ARGS',
        message: 'PlanningService.buildPrompt: objective is required and must be a non-empty string',
        context: { method: 'buildPrompt', field: 'objective' },
      });
    }

    return `
Stwórz plan wykonania zadania. Odpowiedz TYLKO w formacie JSON:

ZADANIE: ${objective}

FORMAT ODPOWIEDZI (JSON):
{
  "objective": "opis celu",
  "tasks": [
    {"id": 1, "agent": "geralt", "task": "opis zadania 1", "dependencies": []},
    {"id": 2, "agent": "philippa", "task": "opis zadania 2", "dependencies": [1]}
  ]
}

DOSTĘPNI AGENCI: dijkstra (planowanie), geralt (wykonanie), philippa (API/MCP), regis (synteza)

ZASADY:
- Maksymalnie ${MAX_TASKS} zadania
- Każde zadanie ma unikalne ID
- dependencies = lista ID zadań które muszą być wykonane wcześniej
- Odpowiedz TYLKO JSON, bez markdown
`;
  }
}

export const planningService = new PlanningService();
