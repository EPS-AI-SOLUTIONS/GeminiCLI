/**
 * AgentSpecializationEnforcer - Solution 45: Ensures agents only work on tasks matching their specialization
 *
 * This module enforces agent specialization rules, ensuring that:
 * - Each agent is assigned tasks aligned with their expertise
 * - Task-agent mismatches are detected and flagged
 * - Suggestions for better agent assignments are provided
 * - Phase A plan validation considers agent specializations
 *
 * Integrates with GraphProcessor and Swarm for task assignment validation.
 */

import chalk from 'chalk';
import { logger } from './LiveLogger.js';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Result of validating an agent-task assignment
 */
export interface SpecializationCheck {
  /** Whether the assignment is valid */
  valid: boolean;

  /** Score indicating how well the agent matches the task (0.0 - 1.0) */
  matchScore: number;

  /** Suggested agent if the current assignment is suboptimal */
  suggestedAgent?: string;

  /** Human-readable reason for the validation result */
  reason: string;

  /** Additional details about the match */
  details?: SpecializationMatchDetails;
}

/**
 * Detailed information about specialization matching
 */
export interface SpecializationMatchDetails {
  /** Keywords from the task that matched agent specialization */
  matchedKeywords: string[];

  /** Keywords from the task that didn't match */
  unmatchedKeywords: string[];

  /** All agents that could handle this task, sorted by match score */
  alternativeAgents: AgentMatchResult[];

  /** Confidence level of the suggestion */
  confidence: 'low' | 'medium' | 'high';
}

/**
 * Result of matching a task to an agent
 */
export interface AgentMatchResult {
  /** Agent identifier */
  agentId: string;

  /** Match score (0.0 - 1.0) */
  score: number;

  /** Matched keywords */
  matchedKeywords: string[];
}

/**
 * Agent specialization definition
 */
export interface AgentSpecialization {
  /** Agent identifier */
  agentId: string;

  /** Display name for the agent */
  displayName: string;

  /** Primary domains of expertise */
  domains: string[];

  /** Keywords that indicate tasks suitable for this agent */
  keywords: string[];

  /** Task types this agent excels at */
  taskTypes: string[];

  /** Description of the agent's role */
  description: string;

  /** Priority level (higher = preferred for ties) */
  priority: number;

  /** Maximum concurrent tasks this agent should handle */
  maxConcurrentTasks: number;

  /** Tags for quick categorization */
  tags: string[];
}

/**
 * Configuration options for AgentSpecializationEnforcer
 */
export interface AgentSpecializationEnforcerConfig {
  /** Minimum match score to consider an assignment valid */
  minValidScore: number;

  /** Enable strict mode (reject invalid assignments) */
  strictMode: boolean;

  /** Enable verbose logging */
  verboseLogging: boolean;

  /** Weight for domain matching */
  domainWeight: number;

  /** Weight for keyword matching */
  keywordWeight: number;

  /** Weight for task type matching */
  taskTypeWeight: number;

  /** Enable suggestions for better assignments */
  enableSuggestions: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Default agent specializations based on the Witcher-themed agent system
 */
const AGENT_SPECIALIZATIONS: AgentSpecialization[] = [
  {
    agentId: 'dijkstra',
    displayName: 'Dijkstra (Master Planner)',
    domains: ['planning', 'strategy', 'coordination'],
    keywords: [
      'plan',
      'strategy',
      'coordinate',
      'orchestrate',
      'organize',
      'schedule',
      'prioritize',
      'allocate',
      'delegate',
      'manage',
      'overview',
      'roadmap',
      'milestone',
      'timeline',
      'dependency',
      'sequence',
      'workflow',
      'process',
      'decompose',
      'breakdown',
      'phase',
      'stage',
      'architecture',
      'design',
    ],
    taskTypes: ['planning', 'coordination', 'strategy', 'orchestration', 'decomposition'],
    description:
      'Master planner and strategist. Handles task decomposition, coordination, and strategic planning.',
    priority: 10,
    maxConcurrentTasks: 3,
    tags: ['planning', 'coordination', 'strategy', 'master'],
  },
  {
    agentId: 'geralt',
    displayName: 'Geralt (Code Warrior)',
    domains: ['file operations', 'code execution', 'security'],
    keywords: [
      'file',
      'read',
      'write',
      'create',
      'delete',
      'modify',
      'execute',
      'run',
      'script',
      'command',
      'shell',
      'terminal',
      'process',
      'system',
      'path',
      'directory',
      'folder',
      'permission',
      'access',
      'io',
      'stream',
      'buffer',
      'binary',
      'encoding',
      'format',
      'parse',
      'serialize',
    ],
    taskTypes: ['file_operation', 'execution', 'system', 'io'],
    description: 'Expert in file operations, code execution, and system-level tasks.',
    priority: 8,
    maxConcurrentTasks: 5,
    tags: ['files', 'execution', 'system', 'core'],
  },
  {
    agentId: 'yennefer',
    displayName: 'Yennefer (Architect)',
    domains: ['architecture', 'design patterns', 'refactoring'],
    keywords: [
      'architecture',
      'design',
      'pattern',
      'refactor',
      'restructure',
      'reorganize',
      'abstract',
      'interface',
      'module',
      'component',
      'layer',
      'separation',
      'concern',
      'coupling',
      'cohesion',
      'solid',
      'dry',
      'kiss',
      'yagni',
      'clean',
      'code',
      'structure',
      'organize',
      'modular',
      'scalable',
      'maintainable',
    ],
    taskTypes: ['architecture', 'design', 'refactoring', 'restructuring'],
    description:
      'Software architect specializing in design patterns, clean architecture, and refactoring.',
    priority: 9,
    maxConcurrentTasks: 4,
    tags: ['architecture', 'design', 'patterns', 'refactoring'],
  },
  {
    agentId: 'triss',
    displayName: 'Triss (Quality Guardian)',
    domains: ['testing', 'QA', 'validation'],
    keywords: [
      'test',
      'testing',
      'qa',
      'quality',
      'assurance',
      'validate',
      'verify',
      'assert',
      'expect',
      'mock',
      'stub',
      'spy',
      'fixture',
      'coverage',
      'unit',
      'integration',
      'e2e',
      'end-to-end',
      'acceptance',
      'regression',
      'smoke',
      'sanity',
      'performance',
      'load',
      'stress',
      'benchmark',
    ],
    taskTypes: ['testing', 'validation', 'qa', 'verification'],
    description: 'Testing and QA specialist. Ensures code quality through comprehensive testing.',
    priority: 7,
    maxConcurrentTasks: 6,
    tags: ['testing', 'qa', 'quality', 'validation'],
  },
  {
    agentId: 'lambert',
    displayName: 'Lambert (Bug Hunter)',
    domains: ['debugging', 'error analysis', 'diagnostics'],
    keywords: [
      'debug',
      'bug',
      'error',
      'issue',
      'problem',
      'fix',
      'diagnose',
      'investigate',
      'trace',
      'stack',
      'exception',
      'crash',
      'failure',
      'log',
      'breakpoint',
      'inspect',
      'analyze',
      'root',
      'cause',
      'symptom',
      'reproduce',
      'isolate',
      'narrow',
      'identify',
      'resolve',
      'troubleshoot',
    ],
    taskTypes: ['debugging', 'diagnostics', 'error_analysis', 'troubleshooting'],
    description: 'Expert debugger and diagnostician. Tracks down and eliminates bugs.',
    priority: 7,
    maxConcurrentTasks: 4,
    tags: ['debugging', 'errors', 'diagnostics', 'troubleshooting'],
  },
  {
    agentId: 'eskel',
    displayName: 'Eskel (DevOps Master)',
    domains: ['devops', 'builds', 'deployment', 'git'],
    keywords: [
      'devops',
      'build',
      'deploy',
      'ci',
      'cd',
      'pipeline',
      'git',
      'commit',
      'push',
      'pull',
      'merge',
      'branch',
      'release',
      'version',
      'tag',
      'docker',
      'container',
      'kubernetes',
      'k8s',
      'helm',
      'terraform',
      'ansible',
      'jenkins',
      'github',
      'actions',
      'workflow',
      'automation',
    ],
    taskTypes: ['devops', 'deployment', 'git', 'ci_cd', 'infrastructure'],
    description: 'DevOps specialist handling builds, deployments, and version control.',
    priority: 6,
    maxConcurrentTasks: 5,
    tags: ['devops', 'deployment', 'git', 'infrastructure'],
  },
  {
    agentId: 'ciri',
    displayName: 'Ciri (Swift Executor)',
    domains: ['simple tasks', 'fast tasks', 'cleanup'],
    keywords: [
      'quick',
      'fast',
      'simple',
      'easy',
      'straightforward',
      'trivial',
      'cleanup',
      'clean',
      'remove',
      'delete',
      'clear',
      'tidy',
      'organize',
      'rename',
      'move',
      'copy',
      'format',
      'lint',
      'prettify',
      'sort',
      'minor',
      'small',
      'tiny',
      'brief',
      'short',
      'immediate',
    ],
    taskTypes: ['cleanup', 'simple', 'quick', 'minor'],
    description: 'Handles simple, fast tasks and cleanup operations efficiently.',
    priority: 5,
    maxConcurrentTasks: 10,
    tags: ['quick', 'simple', 'cleanup', 'fast'],
  },
  {
    agentId: 'regis',
    displayName: 'Regis (Knowledge Keeper)',
    domains: ['research', 'synthesis', 'documentation'],
    keywords: [
      'research',
      'investigate',
      'study',
      'analyze',
      'synthesize',
      'summarize',
      'document',
      'documentation',
      'readme',
      'wiki',
      'guide',
      'tutorial',
      'explain',
      'describe',
      'clarify',
      'elaborate',
      'annotate',
      'comment',
      'knowledge',
      'learn',
      'understand',
      'explore',
      'discover',
      'insight',
    ],
    taskTypes: ['research', 'documentation', 'synthesis', 'analysis'],
    description:
      'Researcher and documentation specialist. Gathers knowledge and creates documentation.',
    priority: 6,
    maxConcurrentTasks: 4,
    tags: ['research', 'documentation', 'knowledge', 'synthesis'],
  },
  {
    agentId: 'vesemir',
    displayName: 'Vesemir (Security Mentor)',
    domains: ['security review', 'mentoring'],
    keywords: [
      'security',
      'secure',
      'vulnerability',
      'exploit',
      'attack',
      'threat',
      'audit',
      'review',
      'inspect',
      'scan',
      'penetration',
      'pentest',
      'mentor',
      'teach',
      'guide',
      'advise',
      'best',
      'practice',
      'standard',
      'compliance',
      'policy',
      'guideline',
      'recommendation',
      'wisdom',
    ],
    taskTypes: ['security', 'review', 'mentoring', 'audit'],
    description:
      'Security expert and mentor. Reviews code for vulnerabilities and guides best practices.',
    priority: 8,
    maxConcurrentTasks: 3,
    tags: ['security', 'review', 'mentoring', 'audit'],
  },
  {
    agentId: 'philippa',
    displayName: 'Philippa (Network Sorceress)',
    domains: ['API', 'network', 'integrations'],
    keywords: [
      'api',
      'rest',
      'graphql',
      'http',
      'https',
      'request',
      'response',
      'endpoint',
      'route',
      'network',
      'socket',
      'websocket',
      'tcp',
      'udp',
      'integration',
      'integrate',
      'connect',
      'interface',
      'protocol',
      'oauth',
      'authentication',
      'authorization',
      'token',
      'jwt',
      'cors',
    ],
    taskTypes: ['api', 'network', 'integration', 'communication'],
    description: 'API and networking specialist. Handles integrations and network operations.',
    priority: 7,
    maxConcurrentTasks: 5,
    tags: ['api', 'network', 'integration', 'communication'],
  },
  {
    agentId: 'jaskier',
    displayName: 'Jaskier (Chronicler)',
    domains: ['summaries', 'reports', 'communication'],
    keywords: [
      'summary',
      'summarize',
      'report',
      'changelog',
      'log',
      'history',
      'communicate',
      'message',
      'notify',
      'alert',
      'announce',
      'broadcast',
      'present',
      'presentation',
      'slide',
      'demo',
      'showcase',
      'explain',
      'narrative',
      'story',
      'chronicle',
      'record',
      'journal',
      'digest',
    ],
    taskTypes: ['reporting', 'communication', 'summary', 'presentation'],
    description:
      'Chronicler and communicator. Creates summaries, reports, and handles communication.',
    priority: 5,
    maxConcurrentTasks: 6,
    tags: ['reporting', 'communication', 'summary', 'presentation'],
  },
  {
    agentId: 'zoltan',
    displayName: 'Zoltan (Data Smith)',
    domains: ['data', 'JSON', 'CSV', 'analysis'],
    keywords: [
      'data',
      'json',
      'csv',
      'xml',
      'yaml',
      'parse',
      'serialize',
      'transform',
      'convert',
      'migrate',
      'import',
      'export',
      'extract',
      'load',
      'etl',
      'analyze',
      'analysis',
      'statistics',
      'metrics',
      'aggregate',
      'filter',
      'sort',
      'group',
      'query',
      'database',
      'sql',
      'nosql',
      'schema',
    ],
    taskTypes: ['data', 'transformation', 'analysis', 'processing'],
    description: 'Data specialist. Handles data transformation, analysis, and processing.',
    priority: 6,
    maxConcurrentTasks: 5,
    tags: ['data', 'transformation', 'analysis', 'processing'],
  },
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AgentSpecializationEnforcerConfig = {
  minValidScore: 0.3,
  strictMode: false,
  verboseLogging: true,
  domainWeight: 0.4,
  keywordWeight: 0.4,
  taskTypeWeight: 0.2,
  enableSuggestions: true,
};

// =============================================================================
// AGENT SPECIALIZATION ENFORCER CLASS
// =============================================================================

/**
 * AgentSpecializationEnforcer - Ensures agents only work on tasks matching their specialization
 */
export class AgentSpecializationEnforcer {
  private config: AgentSpecializationEnforcerConfig;
  private specializations: Map<string, AgentSpecialization> = new Map();
  private validationCache: Map<string, SpecializationCheck> = new Map();
  private assignmentHistory: Array<{
    agentId: string;
    task: string;
    score: number;
    timestamp: number;
  }> = [];

  constructor(config: Partial<AgentSpecializationEnforcerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize specializations
    for (const spec of AGENT_SPECIALIZATIONS) {
      this.specializations.set(spec.agentId, spec);
    }

    logger.system(
      `[AgentSpecializationEnforcer] Initialized with ${this.specializations.size} agent specializations`,
      'info',
    );
  }

  // ===========================================================================
  // VALIDATION METHODS
  // ===========================================================================

  /**
   * Validate if an agent assignment is appropriate for a given task
   */
  validateAssignment(agentId: string, task: string): SpecializationCheck {
    // Check cache first
    const cacheKey = `${agentId}:${this.hashTask(task)}`;
    const cached = this.validationCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const specialization = this.specializations.get(agentId);

    if (!specialization) {
      const result: SpecializationCheck = {
        valid: false,
        matchScore: 0,
        reason: `Unknown agent: ${agentId}. Available agents: ${Array.from(this.specializations.keys()).join(', ')}`,
        suggestedAgent: this.findBestAgent(task)?.agentId,
      };
      this.validationCache.set(cacheKey, result);
      return result;
    }

    // Calculate match score
    const matchResult = this.calculateMatchScore(specialization, task);
    const isValid = matchResult.score >= this.config.minValidScore;

    // Find alternatives if not valid or for suggestions
    let suggestedAgent: string | undefined;
    let alternativeAgents: AgentMatchResult[] = [];

    if (this.config.enableSuggestions || !isValid) {
      const allMatches = this.rankAgentsForTask(task);
      alternativeAgents = allMatches;

      // Suggest a better agent if available
      if (allMatches.length > 0 && allMatches[0].agentId !== agentId) {
        if (allMatches[0].score > matchResult.score + 0.1) {
          suggestedAgent = allMatches[0].agentId;
        }
      }
    }

    const result: SpecializationCheck = {
      valid: isValid,
      matchScore: matchResult.score,
      suggestedAgent,
      reason: this.generateReason(specialization, matchResult, isValid),
      details: {
        matchedKeywords: matchResult.matchedKeywords,
        unmatchedKeywords: matchResult.unmatchedKeywords,
        alternativeAgents,
        confidence: this.determineConfidence(matchResult.score, alternativeAgents),
      },
    };

    // Cache the result
    this.validationCache.set(cacheKey, result);

    // Record in history
    this.assignmentHistory.push({
      agentId,
      task: task.substring(0, 100),
      score: matchResult.score,
      timestamp: Date.now(),
    });

    // Log if verbose
    if (this.config.verboseLogging) {
      this.logValidation(agentId, task, result);
    }

    return result;
  }

  /**
   * Calculate match score between a specialization and a task
   */
  private calculateMatchScore(
    spec: AgentSpecialization,
    task: string,
  ): { score: number; matchedKeywords: string[]; unmatchedKeywords: string[] } {
    const taskLower = task.toLowerCase();
    const taskWords = this.tokenize(taskLower);

    const matchedKeywords: string[] = [];
    const unmatchedKeywords: string[] = [];

    // Calculate domain match
    let domainScore = 0;
    for (const domain of spec.domains) {
      const domainLower = domain.toLowerCase();
      if (taskLower.includes(domainLower)) {
        domainScore += 1;
        matchedKeywords.push(domain);
      }
    }
    domainScore = spec.domains.length > 0 ? domainScore / spec.domains.length : 0;

    // Calculate keyword match
    let keywordScore = 0;
    for (const keyword of spec.keywords) {
      if (taskLower.includes(keyword.toLowerCase())) {
        keywordScore += 1;
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
        }
      }
    }
    keywordScore =
      spec.keywords.length > 0 ? Math.min(1, keywordScore / (spec.keywords.length * 0.2)) : 0;

    // Calculate task type match
    let taskTypeScore = 0;
    for (const taskType of spec.taskTypes) {
      const taskTypeLower = taskType.toLowerCase().replace('_', ' ');
      if (taskLower.includes(taskTypeLower) || taskWords.some((w) => taskTypeLower.includes(w))) {
        taskTypeScore += 1;
      }
    }
    taskTypeScore = spec.taskTypes.length > 0 ? taskTypeScore / spec.taskTypes.length : 0;

    // Find unmatched keywords from task
    const significantWords = taskWords.filter((w) => w.length > 3 && !this.isStopWord(w));
    for (const word of significantWords) {
      const isMatched = spec.keywords.some(
        (k) => k.toLowerCase().includes(word) || word.includes(k.toLowerCase()),
      );
      if (!isMatched) {
        unmatchedKeywords.push(word);
      }
    }

    // Calculate weighted score
    const score =
      domainScore * this.config.domainWeight +
      keywordScore * this.config.keywordWeight +
      taskTypeScore * this.config.taskTypeWeight;

    return {
      score: Math.min(1, Math.max(0, score)),
      matchedKeywords,
      unmatchedKeywords: unmatchedKeywords.slice(0, 10), // Limit to 10 unmatched
    };
  }

  /**
   * Find the best agent for a given task
   */
  findBestAgent(task: string): AgentMatchResult | undefined {
    const ranked = this.rankAgentsForTask(task);
    return ranked.length > 0 ? ranked[0] : undefined;
  }

  /**
   * Rank all agents by suitability for a task
   */
  rankAgentsForTask(task: string): AgentMatchResult[] {
    const results: AgentMatchResult[] = [];

    for (const [agentId, spec] of this.specializations) {
      const match = this.calculateMatchScore(spec, task);
      results.push({
        agentId,
        score: match.score,
        matchedKeywords: match.matchedKeywords,
      });
    }

    // Sort by score (descending), then by priority (descending)
    return results.sort((a, b) => {
      if (Math.abs(a.score - b.score) > 0.05) {
        return b.score - a.score;
      }
      const specA = this.specializations.get(a.agentId);
      const specB = this.specializations.get(b.agentId);
      return (specB?.priority || 0) - (specA?.priority || 0);
    });
  }

  /**
   * Validate a Phase A plan (multiple agent-task assignments)
   */
  validatePlan(assignments: Array<{ agentId: string; task: string }>): {
    valid: boolean;
    overallScore: number;
    results: Array<{ agentId: string; task: string; check: SpecializationCheck }>;
    suggestions: string[];
  } {
    const results: Array<{ agentId: string; task: string; check: SpecializationCheck }> = [];
    const suggestions: string[] = [];
    let totalScore = 0;
    let validCount = 0;

    for (const assignment of assignments) {
      const check = this.validateAssignment(assignment.agentId, assignment.task);
      results.push({
        agentId: assignment.agentId,
        task: assignment.task,
        check,
      });

      totalScore += check.matchScore;
      if (check.valid) {
        validCount++;
      }

      // Collect suggestions
      if (check.suggestedAgent && check.suggestedAgent !== assignment.agentId) {
        suggestions.push(
          `Consider reassigning "${assignment.task.substring(0, 50)}..." from ${assignment.agentId} to ${check.suggestedAgent} (score: ${check.matchScore.toFixed(2)} -> ${check.details?.alternativeAgents[0]?.score.toFixed(2) || 'N/A'})`,
        );
      }
    }

    const overallScore = assignments.length > 0 ? totalScore / assignments.length : 0;
    const valid = this.config.strictMode
      ? validCount === assignments.length
      : overallScore >= this.config.minValidScore;

    return {
      valid,
      overallScore,
      results,
      suggestions,
    };
  }

  // ===========================================================================
  // SPECIALIZATION MANAGEMENT
  // ===========================================================================

  /**
   * Get specialization for an agent
   */
  getSpecialization(agentId: string): AgentSpecialization | undefined {
    return this.specializations.get(agentId);
  }

  /**
   * Get all agent IDs
   */
  getAllAgentIds(): string[] {
    return Array.from(this.specializations.keys());
  }

  /**
   * Get all specializations
   */
  getAllSpecializations(): AgentSpecialization[] {
    return Array.from(this.specializations.values());
  }

  /**
   * Add or update a specialization
   */
  setSpecialization(spec: AgentSpecialization): void {
    this.specializations.set(spec.agentId, spec);
    this.clearCache();
    logger.system(
      `[AgentSpecializationEnforcer] Updated specialization for ${spec.agentId}`,
      'info',
    );
  }

  /**
   * Remove a specialization
   */
  removeSpecialization(agentId: string): boolean {
    const removed = this.specializations.delete(agentId);
    if (removed) {
      this.clearCache();
    }
    return removed;
  }

  /**
   * Get agents suitable for a specific domain
   */
  getAgentsForDomain(domain: string): AgentSpecialization[] {
    const domainLower = domain.toLowerCase();
    return Array.from(this.specializations.values()).filter((spec) =>
      spec.domains.some((d) => d.toLowerCase().includes(domainLower)),
    );
  }

  /**
   * Get agents with a specific tag
   */
  getAgentsByTag(tag: string): AgentSpecialization[] {
    const tagLower = tag.toLowerCase();
    return Array.from(this.specializations.values()).filter((spec) =>
      spec.tags.some((t) => t.toLowerCase() === tagLower),
    );
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Generate a human-readable reason for the validation result
   */
  private generateReason(
    spec: AgentSpecialization,
    match: { score: number; matchedKeywords: string[] },
    isValid: boolean,
  ): string {
    if (isValid) {
      if (match.matchedKeywords.length > 0) {
        return `${spec.displayName} is suitable for this task. Matched: ${match.matchedKeywords.slice(0, 5).join(', ')}. Score: ${(match.score * 100).toFixed(0)}%`;
      }
      return `${spec.displayName} can handle this task with moderate confidence. Score: ${(match.score * 100).toFixed(0)}%`;
    }

    if (match.score < 0.1) {
      return `${spec.displayName} is not suited for this task. Their specialization (${spec.domains.join(', ')}) doesn't match. Score: ${(match.score * 100).toFixed(0)}%`;
    }

    return `${spec.displayName} has limited suitability for this task. Score: ${(match.score * 100).toFixed(0)}% is below threshold (${(this.config.minValidScore * 100).toFixed(0)}%)`;
  }

  /**
   * Determine confidence level based on score and alternatives
   */
  private determineConfidence(
    score: number,
    alternatives: AgentMatchResult[],
  ): 'low' | 'medium' | 'high' {
    if (score >= 0.7) {
      // High score
      if (alternatives.length > 1 && alternatives[0].score - alternatives[1].score > 0.2) {
        return 'high'; // Clear winner
      }
      return 'medium';
    }

    if (score >= 0.4) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Tokenize a string into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 0);
  }

  /**
   * Check if a word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'be',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'this',
      'that',
      'these',
      'those',
      'it',
      'its',
      'they',
      'them',
      'their',
      'we',
      'our',
      'you',
      'your',
    ]);
    return stopWords.has(word);
  }

  /**
   * Create a hash of a task for caching
   */
  private hashTask(task: string): string {
    // Simple hash for caching purposes
    let hash = 0;
    for (let i = 0; i < task.length; i++) {
      const char = task.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Clear the validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Log validation result
   */
  private logValidation(agentId: string, task: string, result: SpecializationCheck): void {
    const statusIcon = result.valid ? chalk.green('OK') : chalk.yellow('WARN');
    const scoreColor =
      result.matchScore >= 0.7 ? chalk.green : result.matchScore >= 0.4 ? chalk.yellow : chalk.red;

    console.log(chalk.cyan('\n[AgentSpecializationEnforcer] Validation:'));
    console.log(chalk.gray(`  Agent: ${agentId}`));
    console.log(chalk.gray(`  Task: ${task.substring(0, 60)}...`));
    console.log(
      `  Status: ${statusIcon} | Score: ${scoreColor(`${(result.matchScore * 100).toFixed(0)}%`)}`,
    );

    if (result.suggestedAgent) {
      console.log(chalk.yellow(`  Suggestion: Consider ${result.suggestedAgent} instead`));
    }

    if (result.details?.matchedKeywords.length) {
      console.log(
        chalk.green(`  Matched: ${result.details.matchedKeywords.slice(0, 5).join(', ')}`),
      );
    }
  }

  /**
   * Get assignment history
   */
  getAssignmentHistory(): Array<{
    agentId: string;
    task: string;
    score: number;
    timestamp: number;
  }> {
    return [...this.assignmentHistory];
  }

  /**
   * Clear assignment history
   */
  clearHistory(): void {
    this.assignmentHistory = [];
  }

  /**
   * Get statistics about agent assignments
   */
  getStatistics(): {
    totalAssignments: number;
    averageScore: number;
    assignmentsByAgent: Record<string, number>;
    lowScoreAssignments: number;
  } {
    const assignmentsByAgent: Record<string, number> = {};
    let totalScore = 0;
    let lowScoreCount = 0;

    for (const assignment of this.assignmentHistory) {
      assignmentsByAgent[assignment.agentId] = (assignmentsByAgent[assignment.agentId] || 0) + 1;
      totalScore += assignment.score;
      if (assignment.score < this.config.minValidScore) {
        lowScoreCount++;
      }
    }

    return {
      totalAssignments: this.assignmentHistory.length,
      averageScore:
        this.assignmentHistory.length > 0 ? totalScore / this.assignmentHistory.length : 0,
      assignmentsByAgent,
      lowScoreAssignments: lowScoreCount,
    };
  }

  /**
   * Generate a report of specialization coverage
   */
  generateCoverageReport(): string {
    const lines: string[] = ['=== Agent Specialization Coverage Report ===', ''];

    for (const [_agentId, spec] of this.specializations) {
      lines.push(`${spec.displayName}`);
      lines.push(`  Domains: ${spec.domains.join(', ')}`);
      lines.push(`  Task Types: ${spec.taskTypes.join(', ')}`);
      lines.push(`  Keywords: ${spec.keywords.length} defined`);
      lines.push(`  Priority: ${spec.priority} | Max Tasks: ${spec.maxConcurrentTasks}`);
      lines.push('');
    }

    const stats = this.getStatistics();
    lines.push('--- Statistics ---');
    lines.push(`Total Assignments: ${stats.totalAssignments}`);
    lines.push(`Average Score: ${(stats.averageScore * 100).toFixed(1)}%`);
    lines.push(`Low Score Assignments: ${stats.lowScoreAssignments}`);

    return lines.join('\n');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global AgentSpecializationEnforcer instance
 */
export const agentSpecializationEnforcer = new AgentSpecializationEnforcer();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick validation of agent-task assignment
 */
export function validateAgentTask(agentId: string, task: string): SpecializationCheck {
  return agentSpecializationEnforcer.validateAssignment(agentId, task);
}

/**
 * Find the best agent for a task
 */
export function findBestAgentForTask(task: string): AgentMatchResult | undefined {
  return agentSpecializationEnforcer.findBestAgent(task);
}

/**
 * Rank agents by suitability for a task
 */
export function rankAgents(task: string): AgentMatchResult[] {
  return agentSpecializationEnforcer.rankAgentsForTask(task);
}

/**
 * Validate a plan with multiple assignments
 */
export function validatePlanAssignments(assignments: Array<{ agentId: string; task: string }>): {
  valid: boolean;
  overallScore: number;
  results: Array<{ agentId: string; task: string; check: SpecializationCheck }>;
  suggestions: string[];
} {
  return agentSpecializationEnforcer.validatePlan(assignments);
}

/**
 * Get all available agent IDs
 */
export function getAvailableAgents(): string[] {
  return agentSpecializationEnforcer.getAllAgentIds();
}

/**
 * Get agent specialization details
 */
export function getAgentSpecialization(agentId: string): AgentSpecialization | undefined {
  return agentSpecializationEnforcer.getSpecialization(agentId);
}

export default AgentSpecializationEnforcer;
