/**
 * TaskScopeLimiter - Solution 24: Prevents agents from exceeding their assigned task scope
 *
 * This module provides scope management for agent tasks, detecting and preventing:
 * - Scope creep (agent doing more than asked)
 * - Unauthorized file access
 * - Forbidden action execution
 * - Excessive changes beyond task requirements
 *
 * Integrates with GraphProcessor for task execution validation.
 */

import path from 'path';
import chalk from 'chalk';
import { logger } from './LiveLogger.js';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Defines the boundaries of what an agent is allowed to do for a specific task
 */
export interface TaskScope {
  /** Unique identifier for this scope */
  scopeId: string;

  /** Original task description */
  taskDescription: string;

  /** Timestamp when scope was defined */
  createdAt: number;

  /** Actions explicitly allowed for this task */
  allowedActions: string[];

  /** Actions explicitly forbidden for this task */
  forbiddenActions: string[];

  /** File patterns that can be touched (glob patterns) */
  allowedFilePatterns: string[];

  /** File patterns that must NOT be touched */
  forbiddenFilePatterns: string[];

  /** Maximum number of files that can be modified */
  maxFiles: number;

  /** Maximum number of discrete changes allowed */
  maxChanges: number;

  /** Maximum lines of code that can be modified */
  maxLinesChanged: number;

  /** Directories that are in scope */
  allowedDirectories: string[];

  /** Directories that are out of scope */
  forbiddenDirectories: string[];

  /** Whether the task allows creating new files */
  canCreateFiles: boolean;

  /** Whether the task allows deleting files */
  canDeleteFiles: boolean;

  /** Whether the task allows executing shell commands */
  canExecuteCommands: boolean;

  /** Specific shell commands that are allowed (if canExecuteCommands is true) */
  allowedCommands: string[];

  /** Shell command patterns that are forbidden */
  forbiddenCommandPatterns: string[];

  /** Whether network access is allowed */
  canAccessNetwork: boolean;

  /** Task priority level (affects strictness) */
  priority: 'low' | 'medium' | 'high' | 'critical';

  /** Optional notes about scope constraints */
  notes: string[];
}

/**
 * Result of a scope violation check
 */
export interface ScopeViolationResult {
  /** Whether a violation occurred */
  violated: boolean;

  /** Human-readable reason for the violation */
  reason: string;

  /** Severity of the violation */
  severity: 'warning' | 'error' | 'critical';

  /** Specific rule that was violated */
  violatedRule?: string;

  /** Suggested remediation */
  suggestion?: string;

  /** The action that caused the violation */
  triggeringAction?: string;

  /** Details about what was attempted */
  details?: Record<string, unknown>;
}

/**
 * Tracking of actions performed within a scope
 */
export interface ScopeExecutionTracker {
  /** Scope being tracked */
  scopeId: string;

  /** Files that have been accessed */
  filesAccessed: string[];

  /** Files that have been modified */
  filesModified: string[];

  /** Files that have been created */
  filesCreated: string[];

  /** Files that have been deleted */
  filesDeleted: string[];

  /** Commands that have been executed */
  commandsExecuted: string[];

  /** Actions that have been performed */
  actionsPerformed: string[];

  /** Total lines changed */
  linesChanged: number;

  /** Violations detected during execution */
  violations: ScopeViolationResult[];

  /** Start time of execution */
  startTime: number;

  /** Whether execution is still active */
  isActive: boolean;
}

/**
 * Configuration options for TaskScopeLimiter
 */
export interface TaskScopeLimiterConfig {
  /** Enable strict mode (fails on first violation) */
  strictMode: boolean;

  /** Log all scope checks */
  verboseLogging: boolean;

  /** Default max files if not specified */
  defaultMaxFiles: number;

  /** Default max changes if not specified */
  defaultMaxChanges: number;

  /** Default max lines changed */
  defaultMaxLinesChanged: number;

  /** Enable scope creep detection */
  detectScopeCreep: boolean;

  /** Threshold for scope creep warning (0.0 - 1.0) */
  scopeCreepThreshold: number;

  /** Project root directory for path resolution */
  projectRoot: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Keywords that indicate specific allowed actions
 */
const ACTION_KEYWORDS: Record<string, string[]> = {
  read: ['read', 'analyze', 'examine', 'review', 'check', 'inspect', 'look', 'find', 'search', 'list'],
  write: ['write', 'create', 'add', 'implement', 'generate', 'produce'],
  modify: ['modify', 'update', 'change', 'edit', 'fix', 'refactor', 'improve', 'enhance', 'optimize'],
  delete: ['delete', 'remove', 'clean', 'purge', 'drop'],
  execute: ['run', 'execute', 'test', 'build', 'compile', 'install', 'deploy'],
  document: ['document', 'comment', 'describe', 'explain', 'annotate']
};

/**
 * File type patterns for common project files
 */
const FILE_TYPE_PATTERNS: Record<string, string[]> = {
  typescript: ['**/*.ts', '**/*.tsx'],
  javascript: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
  styles: ['**/*.css', '**/*.scss', '**/*.sass', '**/*.less'],
  config: ['**/*.json', '**/*.yaml', '**/*.yml', '**/*.toml', '**/*.env*'],
  documentation: ['**/*.md', '**/*.mdx', '**/*.txt', '**/README*'],
  tests: ['**/*.test.*', '**/*.spec.*', '**/test/**', '**/tests/**', '**/__tests__/**'],
  rust: ['**/*.rs', '**/Cargo.toml', '**/Cargo.lock'],
  python: ['**/*.py', '**/requirements.txt', '**/pyproject.toml'],
  all: ['**/*']
};

/**
 * Dangerous command patterns that should be forbidden by default
 */
const DANGEROUS_COMMAND_PATTERNS = [
  'rm -rf /',
  'rm -rf ~',
  'rm -rf *',
  'format',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',  // Fork bomb
  'chmod -R 777',
  'sudo rm',
  'del /f /s /q',
  'format c:',
  'rd /s /q',
  'shutdown',
  'reboot',
  'init 0',
  'init 6'
];

/**
 * Directories that should always be protected
 */
const PROTECTED_DIRECTORIES = [
  'node_modules',
  '.git',
  '.env*',
  '**/credentials*',
  '**/secrets*',
  '**/.ssh',
  '**/private*'
];

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TaskScopeLimiterConfig = {
  strictMode: false,
  verboseLogging: true,
  defaultMaxFiles: 10,
  defaultMaxChanges: 50,
  defaultMaxLinesChanged: 1000,
  detectScopeCreep: true,
  scopeCreepThreshold: 0.3, // 30% beyond original scope triggers warning
  projectRoot: process.cwd()
};

// =============================================================================
// TASK SCOPE LIMITER CLASS
// =============================================================================

/**
 * TaskScopeLimiter - Prevents agents from exceeding their assigned task scope
 */
export class TaskScopeLimiter {
  private config: TaskScopeLimiterConfig;
  private activeScopes: Map<string, TaskScope> = new Map();
  private executionTrackers: Map<string, ScopeExecutionTracker> = new Map();
  private scopeCounter = 0;

  constructor(config: Partial<TaskScopeLimiterConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    logger.system('[TaskScopeLimiter] Initialized with config', 'info');
  }

  // ===========================================================================
  // SCOPE DEFINITION
  // ===========================================================================

  /**
   * Define a scope for a given task description
   * Parses the task to extract what files can be touched and what actions are allowed
   */
  defineScope(task: string, options: Partial<TaskScope> = {}): TaskScope {
    const scopeId = `scope-${++this.scopeCounter}-${Date.now()}`;

    // Parse task to extract intentions
    const parsedActions = this.parseTaskActions(task);
    const parsedFiles = this.parseTaskFiles(task);
    const parsedDirectories = this.parseTaskDirectories(task);
    const parsedConstraints = this.parseTaskConstraints(task);

    // Build scope from parsed data and options
    const scope: TaskScope = {
      scopeId,
      taskDescription: task,
      createdAt: Date.now(),

      // Actions
      allowedActions: options.allowedActions ?? parsedActions.allowed,
      forbiddenActions: options.forbiddenActions ?? [...parsedActions.forbidden, ...this.getDefaultForbiddenActions(parsedActions.allowed)],

      // Files
      allowedFilePatterns: options.allowedFilePatterns ?? parsedFiles.allowed,
      forbiddenFilePatterns: options.forbiddenFilePatterns ?? [...parsedFiles.forbidden, ...PROTECTED_DIRECTORIES],

      // Limits
      maxFiles: options.maxFiles ?? parsedConstraints.maxFiles ?? this.config.defaultMaxFiles,
      maxChanges: options.maxChanges ?? parsedConstraints.maxChanges ?? this.config.defaultMaxChanges,
      maxLinesChanged: options.maxLinesChanged ?? this.config.defaultMaxLinesChanged,

      // Directories
      allowedDirectories: options.allowedDirectories ?? parsedDirectories.allowed,
      forbiddenDirectories: options.forbiddenDirectories ?? [...parsedDirectories.forbidden, ...PROTECTED_DIRECTORIES],

      // Capabilities
      canCreateFiles: options.canCreateFiles ?? parsedActions.allowed.some(a => ['write', 'create', 'generate'].includes(a)),
      canDeleteFiles: options.canDeleteFiles ?? parsedActions.allowed.includes('delete'),
      canExecuteCommands: options.canExecuteCommands ?? parsedActions.allowed.some(a => ['execute', 'run', 'test', 'build'].includes(a)),

      // Commands
      allowedCommands: options.allowedCommands ?? parsedConstraints.allowedCommands,
      forbiddenCommandPatterns: options.forbiddenCommandPatterns ?? DANGEROUS_COMMAND_PATTERNS,

      // Network
      canAccessNetwork: options.canAccessNetwork ?? this.detectNetworkAccess(task),

      // Priority
      priority: options.priority ?? this.detectPriority(task),

      // Notes
      notes: options.notes ?? []
    };

    // Store scope
    this.activeScopes.set(scopeId, scope);

    // Create execution tracker
    this.executionTrackers.set(scopeId, {
      scopeId,
      filesAccessed: [],
      filesModified: [],
      filesCreated: [],
      filesDeleted: [],
      commandsExecuted: [],
      actionsPerformed: [],
      linesChanged: 0,
      violations: [],
      startTime: Date.now(),
      isActive: true
    });

    if (this.config.verboseLogging) {
      this.logScopeCreation(scope);
    }

    return scope;
  }

  /**
   * Parse task description to extract allowed and forbidden actions
   */
  private parseTaskActions(task: string): { allowed: string[]; forbidden: string[] } {
    const taskLower = task.toLowerCase();
    const allowed: Set<string> = new Set();
    const forbidden: Set<string> = new Set();

    // Check for explicit action keywords
    for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
      for (const keyword of keywords) {
        if (taskLower.includes(keyword)) {
          allowed.add(action);
        }
      }
    }

    // Check for negative patterns (don't, do not, avoid, skip)
    const negativePatterns = [
      /don['']?t\s+(\w+)/gi,
      /do\s+not\s+(\w+)/gi,
      /avoid\s+(\w+)/gi,
      /skip\s+(\w+)/gi,
      /without\s+(\w+)/gi,
      /never\s+(\w+)/gi
    ];

    for (const pattern of negativePatterns) {
      let match;
      while ((match = pattern.exec(taskLower)) !== null) {
        const word = match[1];
        for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
          if (keywords.some(k => word.includes(k))) {
            forbidden.add(action);
            allowed.delete(action);
          }
        }
      }
    }

    // Default to read-only if no actions detected
    if (allowed.size === 0) {
      allowed.add('read');
    }

    return {
      allowed: Array.from(allowed),
      forbidden: Array.from(forbidden)
    };
  }

  /**
   * Parse task description to extract file patterns
   */
  private parseTaskFiles(task: string): { allowed: string[]; forbidden: string[] } {
    const allowed: string[] = [];
    const forbidden: string[] = [];

    // Extract explicit file references
    const filePatterns = [
      /(?:file|files?)\s*[:\-]?\s*([^\s,]+(?:\.[a-z]+)?)/gi,
      /([a-zA-Z0-9_\-/]+\.(?:ts|tsx|js|jsx|py|rs|go|java|cs|cpp|c|h|json|yaml|yml|md|css|scss|html))/gi,
      /(?:in|from|at)\s+([^\s]+\/[^\s]+)/gi
    ];

    for (const pattern of filePatterns) {
      let match;
      while ((match = pattern.exec(task)) !== null) {
        const file = match[1];
        if (file && !file.startsWith('http')) {
          allowed.push(this.normalizeFilePattern(file));
        }
      }
    }

    // Extract directory references
    const dirPatterns = [
      /(?:directory|folder|dir)\s*[:\-]?\s*([^\s,]+)/gi,
      /(?:in|from|at)\s+(?:the\s+)?([a-zA-Z0-9_\-/]+)\s+(?:directory|folder)/gi,
      /src\/([^\s]+)/gi
    ];

    for (const pattern of dirPatterns) {
      let match;
      while ((match = pattern.exec(task)) !== null) {
        const dir = match[1];
        if (dir) {
          allowed.push(`${dir}/**/*`);
        }
      }
    }

    // Check for file type references
    for (const [fileType, patterns] of Object.entries(FILE_TYPE_PATTERNS)) {
      if (task.toLowerCase().includes(fileType)) {
        allowed.push(...patterns);
      }
    }

    // Default if no files specified
    if (allowed.length === 0) {
      // Be conservative - only allow reading
      allowed.push('**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx');
    }

    return { allowed, forbidden };
  }

  /**
   * Parse task description to extract directory constraints
   */
  private parseTaskDirectories(task: string): { allowed: string[]; forbidden: string[] } {
    const allowed: string[] = [];
    const forbidden: string[] = [];

    // Common directory references
    const dirMappings: Record<string, string[]> = {
      'src': ['src', 'src/**'],
      'source': ['src', 'source', 'src/**', 'source/**'],
      'test': ['test', 'tests', 'spec', 'test/**', 'tests/**'],
      'lib': ['lib', 'lib/**'],
      'core': ['src/core', 'core', 'src/core/**', 'core/**'],
      'component': ['src/components', 'components', 'src/components/**'],
      'util': ['src/utils', 'utils', 'src/util', 'util'],
      'config': ['config', 'src/config', '.config'],
      'type': ['src/types', 'types', '@types'],
      'hook': ['src/hooks', 'hooks'],
      'service': ['src/services', 'services'],
      'store': ['src/store', 'store']
    };

    const taskLower = task.toLowerCase();

    for (const [keyword, dirs] of Object.entries(dirMappings)) {
      if (taskLower.includes(keyword)) {
        allowed.push(...dirs);
      }
    }

    // Always forbid dangerous directories
    forbidden.push(...PROTECTED_DIRECTORIES);

    return { allowed, forbidden };
  }

  /**
   * Parse task description to extract numeric constraints
   */
  private parseTaskConstraints(task: string): {
    maxFiles?: number;
    maxChanges?: number;
    allowedCommands: string[];
  } {
    let maxFiles: number | undefined;
    let maxChanges: number | undefined;
    const allowedCommands: string[] = [];

    // Extract file count limits
    const fileCountPatterns = [
      /(?:max|maximum|limit|up\s+to)\s+(\d+)\s+files?/gi,
      /(\d+)\s+files?\s+(?:max|maximum|or\s+less)/gi,
      /only\s+(\d+)\s+files?/gi
    ];

    for (const pattern of fileCountPatterns) {
      const match = pattern.exec(task);
      if (match) {
        maxFiles = parseInt(match[1], 10);
        break;
      }
    }

    // Extract change count limits
    const changeCountPatterns = [
      /(?:max|maximum|limit|up\s+to)\s+(\d+)\s+(?:changes?|modifications?)/gi,
      /(\d+)\s+(?:changes?|modifications?)\s+(?:max|maximum|or\s+less)/gi
    ];

    for (const pattern of changeCountPatterns) {
      const match = pattern.exec(task);
      if (match) {
        maxChanges = parseInt(match[1], 10);
        break;
      }
    }

    // Extract allowed commands
    const commandPatterns = [
      /run\s+[`']([^`']+)[`']/gi,
      /execute\s+[`']([^`']+)[`']/gi,
      /(?:npm|yarn|pnpm)\s+(\w+)/gi,
      /(?:cargo|rustc)\s+(\w+)/gi
    ];

    for (const pattern of commandPatterns) {
      let match;
      while ((match = pattern.exec(task)) !== null) {
        allowedCommands.push(match[1]);
      }
    }

    return { maxFiles, maxChanges, allowedCommands };
  }

  /**
   * Detect if task requires network access
   */
  private detectNetworkAccess(task: string): boolean {
    const networkKeywords = [
      'api', 'http', 'https', 'fetch', 'request', 'download',
      'upload', 'server', 'endpoint', 'url', 'network', 'remote',
      'install', 'npm install', 'yarn add', 'pip install'
    ];

    const taskLower = task.toLowerCase();
    return networkKeywords.some(keyword => taskLower.includes(keyword));
  }

  /**
   * Detect task priority based on keywords
   */
  private detectPriority(task: string): 'low' | 'medium' | 'high' | 'critical' {
    const taskLower = task.toLowerCase();

    if (taskLower.includes('critical') || taskLower.includes('urgent') || taskLower.includes('emergency')) {
      return 'critical';
    }
    if (taskLower.includes('important') || taskLower.includes('high priority') || taskLower.includes('asap')) {
      return 'high';
    }
    if (taskLower.includes('low priority') || taskLower.includes('nice to have') || taskLower.includes('when possible')) {
      return 'low';
    }

    return 'medium';
  }

  /**
   * Get default forbidden actions based on allowed actions
   */
  private getDefaultForbiddenActions(allowedActions: string[]): string[] {
    const forbidden: string[] = [];

    // If only read is allowed, forbid all modifications
    if (allowedActions.length === 1 && allowedActions[0] === 'read') {
      forbidden.push('write', 'modify', 'delete', 'execute');
    }

    // If delete is not explicitly allowed, forbid it
    if (!allowedActions.includes('delete')) {
      forbidden.push('delete');
    }

    return forbidden;
  }

  /**
   * Normalize file pattern for matching
   */
  private normalizeFilePattern(pattern: string): string {
    // Remove leading ./ or /
    let normalized = pattern.replace(/^\.?\//, '');

    // Add glob if it's a directory reference without extension
    if (!normalized.includes('.') && !normalized.includes('*')) {
      normalized = `${normalized}/**/*`;
    }

    return normalized;
  }

  // ===========================================================================
  // SCOPE VIOLATION CHECKING
  // ===========================================================================

  /**
   * Quick scope check for a task - defines scope and checks for violations
   * Used by GraphProcessor to validate tasks before execution
   */
  checkScope(taskDescription: string, agentName: string, rootDir?: string): { withinScope: boolean; violations: string[] } {
    const violations: string[] = [];
    let withinScope = true;

    try {
      // Define scope for this task
      const scope = this.defineScope(taskDescription, {
        allowedDirectories: rootDir ? [rootDir, `${rootDir}/src`] : undefined
      });

      // Check task description for obvious violations
      const actionCheck = this.checkScopeViolation(taskDescription, scope);
      if (actionCheck.violated) {
        violations.push(actionCheck.reason);
        if (actionCheck.severity === 'critical' || actionCheck.severity === 'error') {
          withinScope = false;
        }
      }

      // Check for dangerous patterns in task
      const dangerousPatterns = ['rm -rf', 'format', 'delete all', 'drop database', 'sudo', '> /dev'];
      for (const pattern of dangerousPatterns) {
        if (taskDescription.toLowerCase().includes(pattern)) {
          violations.push(`Task contains critical dangerous pattern: ${pattern}`);
          withinScope = false;
        }
      }
    } catch (err: any) {
      // If scope checking fails, allow task but log warning
      console.log(chalk.yellow(`[TaskScope] Warning: Could not check scope: ${err.message}`));
    }

    return { withinScope, violations };
  }

  /**
   * Check if an action violates the given scope
   */
  checkScopeViolation(action: string, scope: TaskScope): ScopeViolationResult {
    const actionLower = action.toLowerCase();

    // Check for forbidden actions
    for (const forbidden of scope.forbiddenActions) {
      if (actionLower.includes(forbidden)) {
        return {
          violated: true,
          reason: `Action '${action}' contains forbidden operation: ${forbidden}`,
          severity: 'error',
          violatedRule: 'forbidden_action',
          suggestion: `The task scope does not allow ${forbidden} operations. Allowed: ${scope.allowedActions.join(', ')}`,
          triggeringAction: action
        };
      }
    }

    // Check if action is allowed
    const isAllowed = scope.allowedActions.some(allowed =>
      actionLower.includes(allowed) || this.isActionImplied(actionLower, allowed)
    );

    if (!isAllowed && scope.allowedActions.length > 0) {
      return {
        violated: true,
        reason: `Action '${action}' is not in the allowed actions list`,
        severity: 'warning',
        violatedRule: 'not_allowed',
        suggestion: `Only these actions are allowed: ${scope.allowedActions.join(', ')}`,
        triggeringAction: action
      };
    }

    // Check for dangerous command patterns
    for (const dangerous of scope.forbiddenCommandPatterns) {
      if (actionLower.includes(dangerous.toLowerCase())) {
        return {
          violated: true,
          reason: `Action '${action}' matches dangerous command pattern: ${dangerous}`,
          severity: 'critical',
          violatedRule: 'dangerous_command',
          suggestion: 'This command is potentially dangerous and has been blocked',
          triggeringAction: action
        };
      }
    }

    return {
      violated: false,
      reason: 'Action is within scope',
      severity: 'warning'
    };
  }

  /**
   * Check if a file operation violates the scope
   */
  checkFileViolation(
    filePath: string,
    operation: 'read' | 'write' | 'create' | 'delete',
    scope: TaskScope
  ): ScopeViolationResult {
    const normalizedPath = this.normalizePath(filePath);
    const tracker = this.executionTrackers.get(scope.scopeId);

    // Check operation-specific permissions
    if (operation === 'create' && !scope.canCreateFiles) {
      return {
        violated: true,
        reason: `File creation is not allowed in this scope: ${filePath}`,
        severity: 'error',
        violatedRule: 'no_create',
        suggestion: 'The task does not permit creating new files',
        triggeringAction: `create:${filePath}`
      };
    }

    if (operation === 'delete' && !scope.canDeleteFiles) {
      return {
        violated: true,
        reason: `File deletion is not allowed in this scope: ${filePath}`,
        severity: 'critical',
        violatedRule: 'no_delete',
        suggestion: 'The task does not permit deleting files',
        triggeringAction: `delete:${filePath}`
      };
    }

    // Check forbidden file patterns
    for (const forbidden of scope.forbiddenFilePatterns) {
      if (this.matchesPattern(normalizedPath, forbidden)) {
        return {
          violated: true,
          reason: `File '${filePath}' matches forbidden pattern: ${forbidden}`,
          severity: 'error',
          violatedRule: 'forbidden_file',
          suggestion: `This file/directory is protected and cannot be accessed`,
          triggeringAction: `${operation}:${filePath}`
        };
      }
    }

    // Check forbidden directories
    for (const forbiddenDir of scope.forbiddenDirectories) {
      if (normalizedPath.includes(forbiddenDir) || this.matchesPattern(normalizedPath, forbiddenDir)) {
        return {
          violated: true,
          reason: `File '${filePath}' is in a forbidden directory: ${forbiddenDir}`,
          severity: 'error',
          violatedRule: 'forbidden_directory',
          suggestion: `Access to ${forbiddenDir} is not permitted for this task`,
          triggeringAction: `${operation}:${filePath}`
        };
      }
    }

    // Check allowed file patterns (if specified)
    if (scope.allowedFilePatterns.length > 0 && operation !== 'read') {
      const isAllowed = scope.allowedFilePatterns.some(pattern =>
        this.matchesPattern(normalizedPath, pattern)
      );

      if (!isAllowed) {
        return {
          violated: true,
          reason: `File '${filePath}' does not match any allowed pattern`,
          severity: 'warning',
          violatedRule: 'not_allowed_file',
          suggestion: `Allowed patterns: ${scope.allowedFilePatterns.join(', ')}`,
          triggeringAction: `${operation}:${filePath}`
        };
      }
    }

    // Check file count limits (for write operations)
    if (tracker && (operation === 'write' || operation === 'create')) {
      const totalModified = new Set([
        ...tracker.filesModified,
        ...tracker.filesCreated
      ]).size;

      if (totalModified >= scope.maxFiles) {
        return {
          violated: true,
          reason: `Maximum file limit (${scope.maxFiles}) reached. Cannot modify more files.`,
          severity: 'error',
          violatedRule: 'max_files_exceeded',
          suggestion: `Task scope limits modifications to ${scope.maxFiles} files`,
          triggeringAction: `${operation}:${filePath}`,
          details: { currentCount: totalModified, maxAllowed: scope.maxFiles }
        };
      }
    }

    return {
      violated: false,
      reason: 'File access is within scope',
      severity: 'warning'
    };
  }

  /**
   * Check if a shell command violates the scope
   */
  checkCommandViolation(command: string, scope: TaskScope): ScopeViolationResult {
    // Check if commands are allowed
    if (!scope.canExecuteCommands) {
      return {
        violated: true,
        reason: `Command execution is not allowed in this scope: ${command}`,
        severity: 'error',
        violatedRule: 'no_commands',
        suggestion: 'The task does not permit executing shell commands',
        triggeringAction: command
      };
    }

    // Check against forbidden patterns
    for (const dangerous of scope.forbiddenCommandPatterns) {
      if (command.toLowerCase().includes(dangerous.toLowerCase())) {
        return {
          violated: true,
          reason: `Command '${command}' matches dangerous pattern: ${dangerous}`,
          severity: 'critical',
          violatedRule: 'dangerous_command',
          suggestion: 'This command has been blocked for safety reasons',
          triggeringAction: command
        };
      }
    }

    // Check allowed commands (if specified)
    if (scope.allowedCommands.length > 0) {
      const isAllowed = scope.allowedCommands.some(allowed =>
        command.toLowerCase().startsWith(allowed.toLowerCase())
      );

      if (!isAllowed) {
        return {
          violated: true,
          reason: `Command '${command}' is not in the allowed commands list`,
          severity: 'warning',
          violatedRule: 'not_allowed_command',
          suggestion: `Allowed commands: ${scope.allowedCommands.join(', ')}`,
          triggeringAction: command
        };
      }
    }

    return {
      violated: false,
      reason: 'Command is within scope',
      severity: 'warning'
    };
  }

  // ===========================================================================
  // SCOPE CREEP DETECTION
  // ===========================================================================

  /**
   * Detect scope creep - agent doing more than originally asked
   */
  detectScopeCreep(scope: TaskScope): ScopeViolationResult {
    if (!this.config.detectScopeCreep) {
      return { violated: false, reason: 'Scope creep detection disabled', severity: 'warning' };
    }

    const tracker = this.executionTrackers.get(scope.scopeId);
    if (!tracker) {
      return { violated: false, reason: 'No tracker found', severity: 'warning' };
    }

    const violations: string[] = [];
    let creepScore = 0;

    // Check file count creep
    const totalFilesModified = tracker.filesModified.length + tracker.filesCreated.length;
    if (totalFilesModified > scope.maxFiles * (1 + this.config.scopeCreepThreshold)) {
      violations.push(`Modified ${totalFilesModified} files (expected max: ${scope.maxFiles})`);
      creepScore += 0.3;
    }

    // Check lines changed creep
    if (tracker.linesChanged > scope.maxLinesChanged * (1 + this.config.scopeCreepThreshold)) {
      violations.push(`Changed ${tracker.linesChanged} lines (expected max: ${scope.maxLinesChanged})`);
      creepScore += 0.2;
    }

    // Check for unexpected directories
    const unexpectedDirs = new Set<string>();
    for (const file of [...tracker.filesModified, ...tracker.filesCreated]) {
      const dir = path.dirname(file);
      const isExpected = scope.allowedDirectories.some(allowed =>
        dir.includes(allowed) || this.matchesPattern(dir, allowed)
      );
      if (!isExpected && scope.allowedDirectories.length > 0) {
        unexpectedDirs.add(dir);
      }
    }

    if (unexpectedDirs.size > 0) {
      violations.push(`Accessed unexpected directories: ${Array.from(unexpectedDirs).join(', ')}`);
      creepScore += 0.3;
    }

    // Check for unexpected actions
    const unexpectedActions = tracker.actionsPerformed.filter(action => {
      return !scope.allowedActions.some(allowed =>
        action.toLowerCase().includes(allowed)
      );
    });

    if (unexpectedActions.length > 0) {
      violations.push(`Performed unexpected actions: ${unexpectedActions.join(', ')}`);
      creepScore += 0.2;
    }

    if (creepScore >= this.config.scopeCreepThreshold) {
      return {
        violated: true,
        reason: `Scope creep detected (score: ${(creepScore * 100).toFixed(0)}%)`,
        severity: creepScore >= 0.5 ? 'error' : 'warning',
        violatedRule: 'scope_creep',
        suggestion: `Agent is exceeding original task scope. Issues: ${violations.join('; ')}`,
        details: {
          creepScore,
          violations,
          filesModified: totalFilesModified,
          linesChanged: tracker.linesChanged,
          unexpectedDirectories: Array.from(unexpectedDirs),
          unexpectedActions
        }
      };
    }

    return {
      violated: false,
      reason: 'No significant scope creep detected',
      severity: 'warning'
    };
  }

  // ===========================================================================
  // EXECUTION TRACKING
  // ===========================================================================

  /**
   * Record a file access within a scope
   */
  recordFileAccess(
    scopeId: string,
    filePath: string,
    operation: 'read' | 'write' | 'create' | 'delete'
  ): void {
    const tracker = this.executionTrackers.get(scopeId);
    if (!tracker) return;

    const normalizedPath = this.normalizePath(filePath);

    switch (operation) {
      case 'read':
        if (!tracker.filesAccessed.includes(normalizedPath)) {
          tracker.filesAccessed.push(normalizedPath);
        }
        break;
      case 'write':
        if (!tracker.filesModified.includes(normalizedPath)) {
          tracker.filesModified.push(normalizedPath);
        }
        break;
      case 'create':
        if (!tracker.filesCreated.includes(normalizedPath)) {
          tracker.filesCreated.push(normalizedPath);
        }
        break;
      case 'delete':
        if (!tracker.filesDeleted.includes(normalizedPath)) {
          tracker.filesDeleted.push(normalizedPath);
        }
        break;
    }

    tracker.actionsPerformed.push(`${operation}:${normalizedPath}`);
  }

  /**
   * Record lines changed within a scope
   */
  recordLinesChanged(scopeId: string, lines: number): void {
    const tracker = this.executionTrackers.get(scopeId);
    if (tracker) {
      tracker.linesChanged += lines;
    }
  }

  /**
   * Record a command execution within a scope
   */
  recordCommandExecution(scopeId: string, command: string): void {
    const tracker = this.executionTrackers.get(scopeId);
    if (tracker) {
      tracker.commandsExecuted.push(command);
      tracker.actionsPerformed.push(`execute:${command}`);
    }
  }

  /**
   * Record a violation within a scope
   */
  recordViolation(scopeId: string, violation: ScopeViolationResult): void {
    const tracker = this.executionTrackers.get(scopeId);
    if (tracker) {
      tracker.violations.push(violation);
    }
  }

  /**
   * Get the execution tracker for a scope
   */
  getExecutionTracker(scopeId: string): ScopeExecutionTracker | undefined {
    return this.executionTrackers.get(scopeId);
  }

  /**
   * Finalize a scope (mark as inactive)
   */
  finalizeScope(scopeId: string): ScopeExecutionTracker | undefined {
    const tracker = this.executionTrackers.get(scopeId);
    if (tracker) {
      tracker.isActive = false;
    }
    return tracker;
  }

  /**
   * Get scope by ID
   */
  getScope(scopeId: string): TaskScope | undefined {
    return this.activeScopes.get(scopeId);
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Check if an action is implied by an allowed action
   */
  private isActionImplied(action: string, allowed: string): boolean {
    const implications: Record<string, string[]> = {
      'write': ['create', 'modify', 'update', 'add'],
      'modify': ['edit', 'change', 'update', 'fix'],
      'read': ['analyze', 'examine', 'inspect', 'check', 'review'],
      'execute': ['run', 'test', 'build', 'compile'],
      'delete': ['remove', 'clean', 'purge']
    };

    const impliedActions = implications[allowed] || [];
    return impliedActions.some(implied => action.includes(implied));
  }

  /**
   * Check if a path matches a glob pattern (simple implementation)
   */
  private matchesPattern(filePath: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.');

    try {
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      return regex.test(filePath);
    } catch {
      // Fallback to simple includes check
      return filePath.includes(pattern.replace(/\*/g, ''));
    }
  }

  /**
   * Normalize a file path for consistent comparison
   */
  private normalizePath(filePath: string): string {
    // Convert backslashes to forward slashes
    let normalized = filePath.replace(/\\/g, '/');

    // Remove leading ./
    normalized = normalized.replace(/^\.\//, '');

    // Remove leading /
    normalized = normalized.replace(/^\//, '');

    return normalized;
  }

  /**
   * Log scope creation for debugging
   */
  private logScopeCreation(scope: TaskScope): void {
    console.log(chalk.cyan('\n[TaskScopeLimiter] Scope Created:'));
    console.log(chalk.gray(`  ID: ${scope.scopeId}`));
    console.log(chalk.gray(`  Task: ${scope.taskDescription.substring(0, 80)}...`));
    console.log(chalk.green(`  Allowed Actions: ${scope.allowedActions.join(', ')}`));
    console.log(chalk.red(`  Forbidden Actions: ${scope.forbiddenActions.join(', ')}`));
    console.log(chalk.blue(`  Max Files: ${scope.maxFiles}, Max Changes: ${scope.maxChanges}`));
    console.log(chalk.yellow(`  Can Create: ${scope.canCreateFiles}, Can Delete: ${scope.canDeleteFiles}, Can Execute: ${scope.canExecuteCommands}`));
    console.log(chalk.gray(`  Priority: ${scope.priority}`));
  }

  /**
   * Generate a summary of scope execution
   */
  generateScopeSummary(scopeId: string): string {
    const scope = this.activeScopes.get(scopeId);
    const tracker = this.executionTrackers.get(scopeId);

    if (!scope || !tracker) {
      return 'Scope not found';
    }

    const lines = [
      `=== Scope Execution Summary ===`,
      `Scope ID: ${scopeId}`,
      `Task: ${scope.taskDescription.substring(0, 100)}...`,
      `Duration: ${((Date.now() - tracker.startTime) / 1000).toFixed(2)}s`,
      ``,
      `Files Accessed: ${tracker.filesAccessed.length}`,
      `Files Modified: ${tracker.filesModified.length}`,
      `Files Created: ${tracker.filesCreated.length}`,
      `Files Deleted: ${tracker.filesDeleted.length}`,
      `Lines Changed: ${tracker.linesChanged}`,
      `Commands Executed: ${tracker.commandsExecuted.length}`,
      ``,
      `Violations: ${tracker.violations.length}`,
      ...tracker.violations.map(v => `  - [${v.severity}] ${v.reason}`)
    ];

    return lines.join('\n');
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Global TaskScopeLimiter instance
 */
export const taskScopeLimiter = new TaskScopeLimiter();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick scope definition with defaults
 */
export function defineTaskScope(task: string, options?: Partial<TaskScope>): TaskScope {
  return taskScopeLimiter.defineScope(task, options);
}

/**
 * Quick scope violation check
 */
export function checkViolation(action: string, scope: TaskScope): ScopeViolationResult {
  return taskScopeLimiter.checkScopeViolation(action, scope);
}

/**
 * Quick file violation check
 */
export function checkFileAccess(
  filePath: string,
  operation: 'read' | 'write' | 'create' | 'delete',
  scope: TaskScope
): ScopeViolationResult {
  return taskScopeLimiter.checkFileViolation(filePath, operation, scope);
}

/**
 * Quick command violation check
 */
export function checkCommand(command: string, scope: TaskScope): ScopeViolationResult {
  return taskScopeLimiter.checkCommandViolation(command, scope);
}

/**
 * Quick scope creep detection
 */
export function detectCreep(scope: TaskScope): ScopeViolationResult {
  return taskScopeLimiter.detectScopeCreep(scope);
}

export default TaskScopeLimiter;
