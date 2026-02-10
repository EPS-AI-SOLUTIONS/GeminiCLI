/**
 * GeminiHydra - 6-Step Swarm Protocol
 *
 * Protocol Flow:
 * 1. SPECULATE (Regis → Gemini Flash) - Gather research context
 * 2. PLAN (Dijkstra → Gemini Pro) - Create JSON task plan, assign agents
 * 3. EXECUTE (Executors → llama.cpp) - Run agents via ConnectionPool
 * 4. SYNTHESIZE (Yennefer → Gemini Flash) - Merge results
 * 5. LOG (Jaskier → Gemini Flash) - Create session summary
 * 6. ARCHIVE - Save Markdown transcript
 */

import type {
  AgentResult,
  AgentRole,
  ComplexityLevel,
  SwarmPlan,
  SwarmTask,
  SwarmTranscript,
  TaskPriority,
  TaskStatus,
} from '../../types/swarm.js';

/**
 * Protocol step validation errors (Fix #28)
 */
export class StepValidationError extends Error {
  constructor(step: string, message: string) {
    super(`[${step}] Precondition failed: ${message}`);
    this.name = 'StepValidationError';
  }
}

/**
 * Task claim manager for preventing race conditions (Fix #13)
 * Uses a Set of claimed task IDs plus a promise-based mutex to prevent
 * concurrent calls to getNextParallelGroup from returning the same tasks.
 */
class TaskClaimManager {
  private claimedIds: Set<number> = new Set();
  private lockPromise: Promise<void> = Promise.resolve();

  /**
   * Acquire exclusive lock for task claiming.
   * Returns a release function that MUST be called when done.
   */
  async acquireLock(): Promise<() => void> {
    // Wait for any existing lock to release
    await this.lockPromise;

    // Create new lock
    let releaseFn!: () => void;
    this.lockPromise = new Promise<void>((resolve) => {
      releaseFn = resolve;
    });

    return releaseFn;
  }

  /**
   * Claim a set of task IDs (must be called while holding the lock).
   * Returns true if ALL ids were successfully claimed, false if any were already claimed.
   */
  claim(ids: number[]): boolean {
    for (const id of ids) {
      if (this.claimedIds.has(id)) {
        return false;
      }
    }
    for (const id of ids) {
      this.claimedIds.add(id);
    }
    return true;
  }

  /**
   * Check if a task ID has been claimed
   */
  isClaimed(id: number): boolean {
    return this.claimedIds.has(id);
  }

  /**
   * Release claimed IDs (e.g., on task failure for retry)
   */
  release(ids: number[]): void {
    for (const id of ids) {
      this.claimedIds.delete(id);
    }
  }

  /**
   * Reset all claims (e.g., on new plan execution)
   */
  reset(): void {
    this.claimedIds.clear();
  }
}

/**
 * Singleton task claim manager instance (Fix #13)
 */
export const taskClaimManager = new TaskClaimManager();

/**
 * Protocol step names
 */
export type ProtocolStep = 'speculate' | 'plan' | 'execute' | 'synthesize' | 'log' | 'archive';

/**
 * Step configuration
 */
export interface StepConfig {
  name: ProtocolStep;
  agent: AgentRole;
  description: string;
  required: boolean;
  canSkip: boolean;
}

/**
 * Protocol step configurations
 */
export const PROTOCOL_STEPS: Record<ProtocolStep, StepConfig> = {
  speculate: {
    name: 'speculate',
    agent: 'regis',
    description: 'Gather research context and background information',
    required: false,
    canSkip: true,
  },
  plan: {
    name: 'plan',
    agent: 'dijkstra',
    description: 'Create execution plan and assign tasks to agents',
    required: true,
    canSkip: false,
  },
  execute: {
    name: 'execute',
    agent: 'geralt', // Default, actual agents assigned by plan
    description: 'Execute tasks via assigned agents',
    required: true,
    canSkip: false,
  },
  synthesize: {
    name: 'synthesize',
    agent: 'yennefer',
    description: 'Merge and synthesize execution results',
    required: true,
    canSkip: false,
  },
  log: {
    name: 'log',
    agent: 'jaskier',
    description: 'Create session summary and documentation',
    required: false,
    canSkip: true,
  },
  archive: {
    name: 'archive',
    agent: 'jaskier',
    description: 'Save transcript to file',
    required: false,
    canSkip: true,
  },
};

/**
 * Precondition validators for each protocol step (Fix #28)
 * Each validates input state before the step executes.
 */
export const STEP_PRECONDITIONS = {
  speculate: (query: string): void => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new StepValidationError('speculate', 'Query must be a non-empty string');
    }
  },

  plan: (query: string, speculationContext?: string): void => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new StepValidationError('plan', 'Query must be a non-empty string');
    }
    if (speculationContext !== undefined && typeof speculationContext !== 'string') {
      throw new StepValidationError('plan', 'speculationContext must be a string if provided');
    }
  },

  execute: (agent: AgentRole, task: string): void => {
    if (!agent || typeof agent !== 'string') {
      throw new StepValidationError('execute', 'Agent must be a non-empty string');
    }
    if (!task || typeof task !== 'string' || task.trim().length === 0) {
      throw new StepValidationError('execute', 'Task description must be a non-empty string');
    }
    const validAgents: AgentRole[] = [
      'geralt',
      'yennefer',
      'triss',
      'jaskier',
      'vesemir',
      'ciri',
      'eskel',
      'lambert',
      'zoltan',
      'regis',
      'dijkstra',
      'philippa',
      'serena',
    ];
    if (!validAgents.includes(agent)) {
      throw new StepValidationError(
        'execute',
        `Unknown agent "${agent}". Valid: ${validAgents.join(', ')}`,
      );
    }
  },

  synthesize: (query: string, results: AgentResult[]): void => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new StepValidationError('synthesize', 'Query must be a non-empty string');
    }
    if (!Array.isArray(results)) {
      throw new StepValidationError('synthesize', 'Results must be an array');
    }
    if (results.length === 0) {
      throw new StepValidationError(
        'synthesize',
        'Results array must not be empty - no execution results to synthesize',
      );
    }
  },

  log: (query: string, transcript: SwarmTranscript): void => {
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new StepValidationError('log', 'Query must be a non-empty string');
    }
    if (!transcript || typeof transcript !== 'object') {
      throw new StepValidationError('log', 'Transcript must be a valid object');
    }
    if (!transcript.sessionId) {
      throw new StepValidationError('log', 'Transcript must have a sessionId');
    }
  },
};

/**
 * Prompt templates for each step
 * Each step validates preconditions before generating the prompt (Fix #28)
 */
export const STEP_PROMPTS = {
  /**
   * STEP 1: SPECULATE (Regis)
   */
  speculate: (query: string, context?: string) => {
    STEP_PRECONDITIONS.speculate(query);
    return `
You are Regis, the Sage and Researcher of the Witcher Swarm.

Your task is to gather context and background information for the following query:

<query>
${query}
</query>

${context ? `<additional_context>\n${context}\n</additional_context>` : ''}

Please provide:
1. Key concepts and terminology relevant to this query
2. Important background information
3. Potential challenges or considerations
4. Relevant patterns or best practices

Keep your response concise but informative. Focus on information that will help the planning and execution phases.
`;
  },

  /**
   * STEP 2: PLAN (Dijkstra)
   */
  plan: (query: string, speculationContext?: string) => {
    STEP_PRECONDITIONS.plan(query, speculationContext);
    return `
You are Dijkstra, the Spymaster and Master Strategist of the Witcher Swarm.

Your task is to create an execution plan for the following query:

<query>
${query}
</query>

${speculationContext ? `<research_context>\n${speculationContext}\n</research_context>` : ''}

Available executor agents (llama.cpp local):
- geralt: Security, operations, critical systems
- triss: Testing, QA, validation
- vesemir: Code review, mentoring, best practices
- ciri: Quick tasks, speed, rapid prototyping
- eskel: DevOps, infrastructure, CI/CD
- lambert: Debugging, profiling, performance
- zoltan: Databases, data, SQL/NoSQL
- philippa: APIs, integration, external systems

Create a JSON execution plan with the following structure:
\`\`\`json
{
  "objective": "Brief description of the goal",
  "complexity": "Simple|Moderate|Complex|Advanced",
  "tasks": [
    {
      "id": 1,
      "agent": "agent_name",
      "task": "Specific task description",
      "dependencies": [],
      "priority": "high|medium|low"
    }
  ],
  "parallelGroups": [[1, 2], [3]],
  "estimatedTime": "estimated completion time"
}
\`\`\`

Guidelines:
- Break complex tasks into smaller subtasks
- Identify which tasks can run in parallel
- Assign tasks to the most appropriate agents
- Consider dependencies between tasks
- Set priorities for critical path items

Respond ONLY with the JSON plan, no additional text.
`;
  },

  /**
   * STEP 3: EXECUTE - prompt for individual executor
   */
  execute: (agent: AgentRole, task: string, context?: string) => {
    STEP_PRECONDITIONS.execute(agent, task);
    const agentPrompts: Record<AgentRole, string> = {
      geralt: `You are Geralt, the White Wolf and Security Expert. Focus on security, safe practices, and operational concerns.`,
      triss: `You are Triss, the Healer and QA Expert. Focus on testing, quality assurance, and validation.`,
      vesemir: `You are Vesemir, the Mentor and Code Reviewer. Focus on best practices, code quality, and teaching.`,
      ciri: `You are Ciri, the Prodigy and Speed Specialist. Focus on quick, efficient solutions.`,
      eskel: `You are Eskel, the Pragmatist and DevOps Engineer. Focus on infrastructure and deployment.`,
      lambert: `You are Lambert, the Skeptic and Debug Master. Focus on finding issues and performance problems.`,
      zoltan: `You are Zoltan, the Craftsman and Data Engineer. Focus on databases and data handling.`,
      philippa: `You are Philippa, the Strategist and Integration Expert. Focus on APIs and external systems.`,
      // Coordinators (if used as executors)
      regis: `You are Regis, the Sage. Focus on research and analysis.`,
      yennefer: `You are Yennefer, the Sorceress. Focus on synthesis and architecture.`,
      jaskier: `You are Jaskier, the Bard. Focus on documentation and communication.`,
      dijkstra: `You are Dijkstra, the Spymaster. Focus on strategy and planning.`,
      // Code Intelligence Agent
      serena: `You are Serena, the Code Intelligence Agent. Focus on code navigation, symbol search, and semantic analysis using LSP.`,
    };

    return `
${agentPrompts[agent]}

<task>
${task}
</task>

${context ? `<context>\n${context}\n</context>` : ''}

Complete this task according to your expertise. Be thorough but concise.
`;
  },

  /**
   * STEP 4: SYNTHESIZE (Yennefer)
   */
  synthesize: (query: string, results: AgentResult[]) => {
    STEP_PRECONDITIONS.synthesize(query, results);
    const resultsText = results
      .filter((r) => r.success && r.response)
      .map((r) => `### ${r.agent} (Task ${r.taskId})\n${r.response}`)
      .join('\n\n');

    return `
You are Yennefer, the Sorceress and Architect of the Witcher Swarm.

Your task is to synthesize the results from multiple agents into a coherent final answer.

<original_query>
${query}
</original_query>

<agent_results>
${resultsText}
</agent_results>

Please:
1. Merge the results into a unified, coherent response
2. Resolve any conflicts or contradictions
3. Ensure completeness - nothing important is missing
4. Organize the response logically
5. Provide a clear, actionable final answer

Your synthesis should directly answer the original query while incorporating insights from all agents.
`;
  },

  /**
   * STEP 5: LOG (Jaskier)
   */
  log: (query: string, transcript: SwarmTranscript) => {
    STEP_PRECONDITIONS.log(query, transcript);
    const stepsSummary = [];

    if (transcript.steps.speculate?.response) {
      stepsSummary.push(
        `**Speculation:** ${transcript.steps.speculate.response.substring(0, 200)}...`,
      );
    }
    if (transcript.steps.plan?.parsedPlan) {
      const plan = transcript.steps.plan.parsedPlan;
      stepsSummary.push(`**Plan:** ${plan.tasks.length} tasks, complexity: ${plan.complexity}`);
    }
    if (transcript.steps.execute) {
      const executed = transcript.steps.execute.filter((r) => r.success).length;
      const total = transcript.steps.execute.length;
      stepsSummary.push(`**Execution:** ${executed}/${total} tasks completed`);
    }
    if (transcript.steps.synthesize?.response) {
      stepsSummary.push(`**Synthesis:** Complete`);
    }

    return `
You are Jaskier, the Bard and Chronicler of the Witcher Swarm.

Your task is to create a brief session summary.

<session_info>
Session ID: ${transcript.sessionId}
Mode: ${transcript.mode}
Query: ${query}
Start Time: ${transcript.startTime}
</session_info>

<execution_summary>
${stepsSummary.join('\n')}
</execution_summary>

Please create a concise summary (2-3 sentences) that:
1. Describes what was accomplished
2. Notes any interesting findings or challenges
3. Provides a quick overview for future reference

Keep it brief and informative.
`;
  },
};

/**
 * Error thrown when plan validation fails
 */
export class PlanValidationError extends Error {
  constructor(
    message: string,
    public readonly details: string[],
  ) {
    super(message);
    this.name = 'PlanValidationError';
  }
}

/**
 * Validate the raw parsed JSON has the expected plan structure.
 * Accepts either a plain array of tasks or an object with a `tasks` array property.
 * Each task must have at least `id` (string|number) and a description (`task` or `description` string).
 * Optional fields: `dependencies` (array of string|number), `agent` (string).
 *
 * Returns the normalized tasks array and the container object (if any).
 * Throws PlanValidationError with descriptive messages on failure.
 */
function validatePlanStructure(parsed: unknown): {
  container: Record<string, unknown>;
  rawTasks: Record<string, unknown>[];
} {
  const errors: string[] = [];

  // Determine the container and raw tasks array
  let container: Record<string, unknown> = {};
  let rawTasks: unknown[];

  if (Array.isArray(parsed)) {
    rawTasks = parsed;
  } else if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
    container = parsed as Record<string, unknown>;
    if (Array.isArray(container.tasks)) {
      rawTasks = container.tasks;
    } else {
      errors.push(
        `Plan must be an array or an object with a "tasks" array property. ` +
          `Got object with keys: [${Object.keys(container).join(', ')}]`,
      );
      throw new PlanValidationError('Invalid plan structure', errors);
    }
  } else {
    errors.push(`Plan must be an array or object, got ${typeof parsed}`);
    throw new PlanValidationError('Invalid plan structure', errors);
  }

  if (rawTasks.length === 0) {
    errors.push('Plan tasks array is empty');
    throw new PlanValidationError('Invalid plan structure', errors);
  }

  // Validate each task
  const validatedTasks: Record<string, unknown>[] = [];

  for (let i = 0; i < rawTasks.length; i++) {
    const task = rawTasks[i];
    const taskErrors: string[] = [];

    if (task === null || typeof task !== 'object' || Array.isArray(task)) {
      errors.push(`Task at index ${i} must be an object, got ${typeof task}`);
      continue;
    }

    const t = task as Record<string, unknown>;

    // id: must be present and be a string or number
    if (t.id === undefined || t.id === null) {
      taskErrors.push(`missing "id"`);
    } else if (typeof t.id !== 'string' && typeof t.id !== 'number') {
      taskErrors.push(`"id" must be string or number, got ${typeof t.id}`);
    }

    // description: accept either "task" or "description" field
    const desc = t.task ?? t.description;
    if (desc === undefined || desc === null) {
      taskErrors.push(`missing "task" or "description"`);
    } else if (typeof desc !== 'string') {
      taskErrors.push(`"task"/"description" must be a string, got ${typeof desc}`);
    } else if ((desc as string).trim().length === 0) {
      taskErrors.push(`"task"/"description" must not be empty`);
    }

    // dependencies: optional, must be array of strings/numbers if present
    if (t.dependencies !== undefined && t.dependencies !== null) {
      if (!Array.isArray(t.dependencies)) {
        taskErrors.push(`"dependencies" must be an array, got ${typeof t.dependencies}`);
      } else {
        for (let j = 0; j < (t.dependencies as unknown[]).length; j++) {
          const dep = (t.dependencies as unknown[])[j];
          if (typeof dep !== 'string' && typeof dep !== 'number') {
            taskErrors.push(`dependencies[${j}] must be string or number, got ${typeof dep}`);
          }
        }
      }
    }

    // agent: optional, must be string if present
    if (t.agent !== undefined && t.agent !== null && typeof t.agent !== 'string') {
      taskErrors.push(`"agent" must be a string, got ${typeof t.agent}`);
    }

    if (taskErrors.length > 0) {
      errors.push(`Task at index ${i} (id=${String(t.id ?? '?')}): ${taskErrors.join('; ')}`);
    } else {
      validatedTasks.push(t);
    }
  }

  if (errors.length > 0) {
    throw new PlanValidationError(`Plan validation failed with ${errors.length} error(s)`, errors);
  }

  return { container, rawTasks: validatedTasks };
}

/**
 * Parse plan JSON from Dijkstra's response.
 *
 * Extracts JSON from markdown code fences (if present), parses it,
 * validates the structure, and returns a normalized SwarmPlan.
 *
 * Throws PlanValidationError if the structure is invalid.
 * Returns null only if JSON parsing itself fails.
 */
export function parsePlan(response: string): SwarmPlan | null {
  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) ||
    response.match(/```\s*([\s\S]*?)\s*```/) || [null, response];

  const jsonStr = (jsonMatch[1] || response).trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (parseError) {
    const message = parseError instanceof Error ? parseError.message : String(parseError);
    console.error(`Failed to parse plan JSON: ${message}`);
    return null;
  }

  // Validate structure (throws PlanValidationError on failure)
  const { container, rawTasks } = validatePlanStructure(parsed);

  // Normalize and build tasks
  const tasks: SwarmTask[] = rawTasks.map((t, index) => ({
    id: typeof t.id === 'number' ? t.id : index + 1,
    agent: (t.agent as string) ?? 'geralt',
    task: ((t.task ?? t.description) as string) ?? '',
    dependencies: Array.isArray(t.dependencies)
      ? (t.dependencies as (string | number)[]).map((d) => (typeof d === 'number' ? d : Number(d)))
      : [],
    status: 'pending' as TaskStatus,
    priority: (t.priority ?? 'medium') as TaskPriority,
    context: t.context as string | undefined,
  }));

  // Normalize parallel groups
  const parallelGroups: number[][] = Array.isArray(container.parallelGroups)
    ? (container.parallelGroups as number[][])
    : [tasks.map((t) => t.id)];

  return {
    objective: (container.objective as string) ?? tasks[0]?.task ?? 'Unknown objective',
    complexity: ((container.complexity as string) ?? 'Moderate') as ComplexityLevel,
    tasks,
    parallelGroups,
    estimatedTime: container.estimatedTime as string | undefined,
  };
}

/**
 * Create default plan for simple queries
 */
export function createSimplePlan(query: string, agent: AgentRole = 'ciri'): SwarmPlan {
  return {
    objective: query,
    complexity: 'Simple',
    tasks: [
      {
        id: 1,
        agent,
        task: query,
        dependencies: [],
        status: 'pending',
        priority: 'high',
      },
    ],
    parallelGroups: [[1]],
  };
}

/**
 * Get tasks ready to execute (dependencies met)
 */
export function getReadyTasks(plan: SwarmPlan, completedIds: number[]): SwarmTask[] {
  // Precondition check (Fix #28)
  if (!plan || !Array.isArray(plan.tasks)) {
    throw new StepValidationError('getReadyTasks', 'Plan must have a valid tasks array');
  }
  if (!Array.isArray(completedIds)) {
    throw new StepValidationError('getReadyTasks', 'completedIds must be an array');
  }

  return plan.tasks.filter(
    (task) =>
      task.status === 'pending' && task.dependencies.every((depId) => completedIds.includes(depId)),
  );
}

/**
 * Get next parallel group to execute (DEPRECATED - use getNextParallelGroupSafe)
 * This synchronous version is kept for backward compatibility but is NOT safe
 * against race conditions when called concurrently.
 */
export function getNextParallelGroup(plan: SwarmPlan, completedIds: number[]): number[] | null {
  if (!plan.parallelGroups) return null;
  for (const group of plan.parallelGroups) {
    // Check if all tasks in group are ready
    const allReady = group.every((taskId) => {
      const task = plan.tasks.find((t) => t.id === taskId);
      if (!task) return false;
      if (completedIds.includes(taskId)) return false; // Already done
      // Also skip tasks already claimed by another caller (Fix #13)
      if (taskClaimManager.isClaimed(taskId)) return false;
      return task.dependencies.every((depId) => completedIds.includes(depId));
    });

    if (
      allReady &&
      group.some((id) => !completedIds.includes(id) && !taskClaimManager.isClaimed(id))
    ) {
      const unclaimed = group.filter(
        (id) => !completedIds.includes(id) && !taskClaimManager.isClaimed(id),
      );
      if (unclaimed.length > 0) {
        // Claim synchronously (best-effort for sync callers)
        taskClaimManager.claim(unclaimed);
        return unclaimed;
      }
    }
  }

  return null;
}

/**
 * Get next parallel group to execute with race-condition protection (Fix #13)
 * Uses a promise-based mutex to ensure only one caller at a time can claim tasks.
 * This is the SAFE version that should be preferred over getNextParallelGroup.
 */
export async function getNextParallelGroupSafe(
  plan: SwarmPlan,
  completedIds: number[],
): Promise<number[] | null> {
  if (!plan.parallelGroups) return null;

  const release = await taskClaimManager.acquireLock();
  try {
    for (const group of plan.parallelGroups) {
      // Filter to tasks that are not completed AND not already claimed
      const candidates = group.filter((taskId) => {
        if (completedIds.includes(taskId)) return false;
        if (taskClaimManager.isClaimed(taskId)) return false;
        const task = plan.tasks.find((t) => t.id === taskId);
        if (!task) return false;
        return task.dependencies.every((depId) => completedIds.includes(depId));
      });

      if (candidates.length > 0) {
        // All candidates have their dependencies met; claim them atomically
        const claimed = taskClaimManager.claim(candidates);
        if (claimed) {
          return candidates;
        }
        // If claim failed (shouldn't happen under lock), try next group
      }
    }
    return null;
  } finally {
    release();
  }
}

/**
 * Update task status in plan
 */
export function updateTaskStatus(plan: SwarmPlan, taskId: number, status: TaskStatus): SwarmPlan {
  // Precondition checks (Fix #28)
  if (!plan || !Array.isArray(plan.tasks)) {
    throw new StepValidationError('updateTaskStatus', 'Plan must have a valid tasks array');
  }
  if (typeof taskId !== 'number' || Number.isNaN(taskId)) {
    throw new StepValidationError(
      'updateTaskStatus',
      `taskId must be a valid number, got: ${taskId}`,
    );
  }
  const validStatuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed'];
  if (!validStatuses.includes(status)) {
    throw new StepValidationError(
      'updateTaskStatus',
      `Invalid status "${status}". Valid: ${validStatuses.join(', ')}`,
    );
  }
  const taskExists = plan.tasks.some((t) => t.id === taskId);
  if (!taskExists) {
    throw new StepValidationError('updateTaskStatus', `Task with id ${taskId} not found in plan`);
  }

  return {
    ...plan,
    tasks: plan.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
  };
}

/**
 * Check if plan is complete
 */
export function isPlanComplete(plan: SwarmPlan): boolean {
  // Precondition check (Fix #28)
  if (!plan || !Array.isArray(plan.tasks)) {
    throw new StepValidationError('isPlanComplete', 'Plan must have a valid tasks array');
  }

  return plan.tasks.every((task) => task.status === 'completed' || task.status === 'failed');
}

/**
 * Create empty transcript
 */
export function createTranscript(sessionId: string, query: string, mode: string): SwarmTranscript {
  // Precondition checks (Fix #28)
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    throw new StepValidationError('createTranscript', 'sessionId must be a non-empty string');
  }
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    throw new StepValidationError('createTranscript', 'query must be a non-empty string');
  }
  if (!mode || typeof mode !== 'string') {
    throw new StepValidationError('createTranscript', 'mode must be a non-empty string');
  }

  return {
    sessionId,
    query,
    mode,
    startTime: new Date().toISOString(),
    steps: {},
  };
}

/**
 * Format transcript as Markdown
 */
export function formatTranscriptMarkdown(transcript: SwarmTranscript): string {
  const lines: string[] = [];

  lines.push(`# Swarm Session: ${transcript.sessionId}`);
  lines.push('');
  lines.push(`**Mode:** ${transcript.mode}`);
  lines.push(`**Started:** ${transcript.startTime}`);
  lines.push('');
  lines.push('## Query');
  lines.push('```');
  lines.push(transcript.query);
  lines.push('```');
  lines.push('');

  // Speculation
  if (transcript.steps.speculate) {
    lines.push('## Step 1: Speculation (Regis)');
    lines.push('');
    if (transcript.steps.speculate.success) {
      lines.push(transcript.steps.speculate.response || '_No response_');
    } else {
      lines.push(`**Error:** ${transcript.steps.speculate.error}`);
    }
    lines.push('');
  }

  // Plan
  if (transcript.steps.plan) {
    lines.push('## Step 2: Planning (Dijkstra)');
    lines.push('');
    if (transcript.steps.plan.parsedPlan) {
      const plan = transcript.steps.plan.parsedPlan;
      lines.push(`**Objective:** ${plan.objective}`);
      lines.push(`**Complexity:** ${plan.complexity}`);
      lines.push('');
      lines.push('### Tasks');
      for (const task of plan.tasks) {
        lines.push(
          `- [${task.status === 'completed' ? 'x' : ' '}] **${task.agent}**: ${task.task}`,
        );
      }
    } else {
      lines.push(transcript.steps.plan.result.response || '_No plan generated_');
    }
    lines.push('');
  }

  // Execution
  if (transcript.steps.execute && transcript.steps.execute.length > 0) {
    lines.push('## Step 3: Execution');
    lines.push('');
    for (const result of transcript.steps.execute) {
      lines.push(`### ${result.agent} (Task ${result.taskId})`);
      lines.push(`**Model:** ${result.model}`);
      lines.push(`**Duration:** ${result.duration}ms`);
      lines.push('');
      if (result.success) {
        lines.push(result.response || '_No response_');
      } else {
        lines.push(`**Error:** ${result.error}`);
      }
      lines.push('');
    }
  }

  // Synthesis
  if (transcript.steps.synthesize) {
    lines.push('## Step 4: Synthesis (Yennefer)');
    lines.push('');
    if (transcript.steps.synthesize.success) {
      lines.push(transcript.steps.synthesize.response || '_No synthesis_');
    } else {
      lines.push(`**Error:** ${transcript.steps.synthesize.error}`);
    }
    lines.push('');
  }

  // Log
  if (transcript.steps.log) {
    lines.push('## Step 5: Summary (Jaskier)');
    lines.push('');
    if (transcript.steps.log.success) {
      lines.push(transcript.steps.log.response || '_No summary_');
    } else {
      lines.push(`**Error:** ${transcript.steps.log.error}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Generated by GeminiHydra Witcher Swarm*`);

  return lines.join('\n');
}
