/**
 * CodebaseCommands - CLI commands for codebase analysis and memory management
 *
 * Uses CommandRegistry for unified command registration and handling.
 */

import path from 'node:path';
import chalk from 'chalk';
import { type CodebaseAnalysis, codebaseMemory } from '../memory/CodebaseMemory.js';
import {
  formatNumber,
  formatRelativeTime,
  getNumberFlag,
  horizontalLine,
  truncate,
} from './CommandHelpers.js';
import {
  type Command,
  type CommandContext,
  type CommandResult,
  commandRegistry,
  error,
  success,
} from './CommandRegistry.js';

// ============================================================
// Command Handlers
// ============================================================

/**
 * /analyze - Analyze current or specified project
 */
async function analyzeHandler(ctx: CommandContext): Promise<CommandResult> {
  await codebaseMemory.init();

  const targetPath = ctx.args[0] || ctx.cwd;
  const resolvedPath = path.resolve(ctx.cwd, targetPath);

  console.log(chalk.cyan(`\n Analyzing project: ${resolvedPath}\n`));

  try {
    const analysis = await codebaseMemory.analyzeProject(resolvedPath, {
      maxFiles: getNumberFlag(ctx.flags, 500, 'maxFiles', 'max'),
      maxDepth: getNumberFlag(ctx.flags, 10, 'depth', 'd'),
    });

    return success(analysis, formatAnalysisReport(analysis));
  } catch (err) {
    return error(`Error analyzing project: ${err}`);
  }
}

/**
 * /memory - Show memory status and manage codebase memory
 */
async function memoryHandler(ctx: CommandContext): Promise<CommandResult> {
  await codebaseMemory.init();

  const subcommand = ctx.args[0] || 'status';

  switch (subcommand) {
    case 'status':
    case 'stats':
      return memoryStatus();

    case 'list':
      return listProjects();

    case 'current':
      return currentProject();

    case 'set':
      return setCurrentProject(ctx.args[1] || ctx.cwd, ctx.cwd);

    case 'clear':
      return clearProject(ctx.args[1] || ctx.cwd, ctx.cwd);

    case 'search':
      return searchMemory(ctx.args.slice(1).join(' '));

    default:
      return success(null, memoryHelp());
  }
}

/**
 * /context - Show or manage project context for prompts
 */
async function contextHandler(ctx: CommandContext): Promise<CommandResult> {
  await codebaseMemory.init();

  const subcommand = ctx.args[0] || 'show';

  switch (subcommand) {
    case 'show':
      return showContext();

    case 'enrich': {
      const testPrompt = ctx.args.slice(1).join(' ') || 'Example prompt';
      return showEnrichedPrompt(testPrompt);
    }

    case 'files':
      return listRelevantFiles(ctx.args.slice(1).join(' '));

    default:
      return success(null, contextHelp());
  }
}

// ============================================================
// Subcommand Implementations
// ============================================================

function formatAnalysisReport(analysis: CodebaseAnalysis): string {
  const lines: string[] = [];

  lines.push(chalk.bold.green('\n Project Analysis Complete\n'));
  lines.push(horizontalLine(60, '='));

  // Basic info
  lines.push(chalk.bold(`\n Project: ${analysis.projectName}`));
  lines.push(`   Path: ${analysis.projectPath}`);
  lines.push(
    `   Type: ${chalk.cyan(analysis.structure.type)}${analysis.structure.framework ? chalk.yellow(` (${analysis.structure.framework})`) : ''}`,
  );

  // Stats table
  lines.push(chalk.bold(`\n Statistics:`));
  lines.push(`   Files: ${chalk.cyan(formatNumber(analysis.structure.totalFiles))}`);
  lines.push(`   Lines: ${chalk.cyan(formatNumber(analysis.structure.totalLines))}`);

  // Languages
  const langs = Object.entries(analysis.structure.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  if (langs.length > 0) {
    lines.push(chalk.bold(`\n Languages:`));
    for (const [ext, count] of langs) {
      const bar = chalk.blue('|'.repeat(Math.min(20, Math.ceil(count / 5))));
      lines.push(`   ${ext.padEnd(6)} ${bar} ${count}`);
    }
  }

  // Entry points
  if (analysis.structure.entryPoints.length > 0) {
    lines.push(chalk.bold(`\n Entry Points:`));
    for (const ep of analysis.structure.entryPoints) {
      lines.push(`   ${chalk.green('->')} ${ep}`);
    }
  }

  // Key directories
  const dirs = analysis.structure.directories.slice(0, 8);
  if (dirs.length > 0) {
    lines.push(chalk.bold(`\n Key Directories:`));
    for (const dir of dirs) {
      lines.push(`   ${chalk.blue('[D]')} ${dir}`);
    }
  }

  // Dependencies summary
  if (analysis.dependencies.length > 0) {
    lines.push(
      chalk.bold(`\n Dependencies: ${chalk.cyan(formatNumber(analysis.dependencies.length))}`),
    );
    const topDeps = analysis.dependencies.slice(0, 10);
    lines.push(`   ${topDeps.join(', ')}${analysis.dependencies.length > 10 ? '...' : ''}`);
  }

  // Scripts
  const scripts = Object.keys(analysis.scripts);
  if (scripts.length > 0) {
    lines.push(chalk.bold(`\n Available Scripts:`));
    for (const script of scripts.slice(0, 8)) {
      lines.push(`   ${chalk.yellow('$')} npm run ${script}`);
    }
  }

  // Key exports
  const allExports = analysis.files.flatMap((f) => f.exports || []).slice(0, 15);
  if (allExports.length > 0) {
    lines.push(chalk.bold(`\n Key Exports:`));
    lines.push(`   ${allExports.join(', ')}`);
  }

  lines.push(horizontalLine(60, '='));
  lines.push(chalk.gray(`Analysis saved to persistent memory`));
  lines.push(
    chalk.gray(
      `Use ${chalk.white('/context show')} to see how this context will be used in prompts\n`,
    ),
  );

  return lines.join('\n');
}

function memoryStatus(): CommandResult {
  const stats = codebaseMemory.getStats();
  const current = codebaseMemory.getCurrentProject();

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n CodebaseMemory Status\n'));
  lines.push(horizontalLine(40));
  lines.push(`Total projects analyzed: ${chalk.green(formatNumber(stats.totalProjects))}`);
  lines.push(`Total files indexed: ${chalk.green(formatNumber(stats.totalFiles))}`);
  lines.push(`Total lines of code: ${chalk.green(formatNumber(stats.totalLines))}`);
  lines.push(horizontalLine(40));

  if (current) {
    lines.push(chalk.bold(`\nCurrent Project: ${chalk.cyan(current.projectName)}`));
    lines.push(`  Path: ${current.projectPath}`);
    lines.push(
      `  Type: ${current.structure.type}${current.structure.framework ? ` (${current.structure.framework})` : ''}`,
    );
    lines.push(`  Access count: ${current.accessCount}`);
  } else {
    lines.push(chalk.yellow(`\nNo current project set.`));
    lines.push(chalk.gray(`Use /memory set [path] or /analyze to set a project`));
  }

  return success({ stats, current }, lines.join('\n'));
}

function listProjects(): CommandResult {
  const projects = codebaseMemory.listProjects();

  if (projects.length === 0) {
    return success(
      [],
      chalk.yellow('\nNo projects analyzed yet.\nUse /analyze to analyze a project.'),
    );
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n Analyzed Projects\n'));

  for (const p of projects) {
    lines.push(`${chalk.green('*')} ${chalk.bold(p.name)}`);
    lines.push(`  ${chalk.gray(p.path)}`);
    lines.push(
      `  ${p.type}${p.framework ? ` (${p.framework})` : ''} - Analyzed: ${formatRelativeTime(p.analyzedAt)}`,
    );
    lines.push('');
  }

  return success(projects, lines.join('\n'));
}

function currentProject(): CommandResult {
  const current = codebaseMemory.getCurrentProject();

  if (!current) {
    return error('No current project set. Use /memory set [path] or /analyze to set a project.');
  }

  return success(current, formatAnalysisReport(current));
}

function setCurrentProject(targetPath: string, cwd: string): CommandResult {
  const resolvedPath = path.resolve(cwd, targetPath);
  const project = codebaseMemory.setCurrentProject(resolvedPath);

  if (project) {
    return success(
      { projectName: project.projectName, projectPath: project.projectPath },
      chalk.green(
        `\n Current project set to: ${chalk.bold(project.projectName)}\n  ${project.projectPath}`,
      ),
    );
  } else {
    return error(
      `Project not found in memory: ${resolvedPath}\n  Use /analyze ${targetPath} first.`,
    );
  }
}

function clearProject(targetPath: string, cwd: string): CommandResult {
  const resolvedPath = path.resolve(cwd, targetPath);
  const deleted = codebaseMemory.deleteProject(resolvedPath);

  if (deleted) {
    return success(
      { deleted: resolvedPath },
      chalk.green(`\n Project analysis deleted: ${resolvedPath}`),
    );
  } else {
    return error(`Project not found: ${resolvedPath}`);
  }
}

function searchMemory(query: string): CommandResult {
  if (!query.trim()) {
    return error('Provide a search query: /memory search <query>');
  }

  const results = codebaseMemory.searchProjects(query);

  if (results.length === 0) {
    return success([], chalk.yellow(`\nNo projects found matching: "${query}"`));
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan(`\n Search Results for: "${query}"\n`));

  for (const p of results) {
    lines.push(`${chalk.green('*')} ${chalk.bold(p.projectName)}`);
    lines.push(`  ${chalk.gray(p.projectPath)}`);
    lines.push(
      `  ${p.structure.type}${p.structure.framework ? ` (${p.structure.framework})` : ''}`,
    );
    lines.push('');
  }

  return success(results, lines.join('\n'));
}

function showContext(): CommandResult {
  const current = codebaseMemory.getCurrentProject();

  if (!current) {
    return error('No current project. Use /analyze first.');
  }

  const { context } = codebaseMemory.enrichPrompt('');

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n Context that will be added to prompts:\n'));
  lines.push(horizontalLine(60));
  lines.push(context.projectContext || 'No context available');
  lines.push(horizontalLine(60));
  lines.push(chalk.gray('\nThis context is automatically prepended to your prompts.'));

  return success(context, lines.join('\n'));
}

function showEnrichedPrompt(testPrompt: string): CommandResult {
  const { enrichedPrompt, context } = codebaseMemory.enrichPrompt(testPrompt);

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n Enriched Prompt Preview:\n'));
  lines.push(horizontalLine(60, '='));
  lines.push(enrichedPrompt);
  lines.push(horizontalLine(60, '='));

  if (context.relevantFiles.length > 0) {
    lines.push(chalk.bold('\n Relevant Files Found:'));
    for (const f of context.relevantFiles) {
      lines.push(`  ${chalk.green('->')} ${f.relativePath}`);
    }
  }

  if (context.suggestedActions.length > 0) {
    lines.push(chalk.bold('\n Suggested Actions:'));
    for (const action of context.suggestedActions) {
      lines.push(`  ${chalk.yellow('!')} ${action}`);
    }
  }

  return success({ enrichedPrompt, context }, lines.join('\n'));
}

function listRelevantFiles(query: string): CommandResult {
  if (!query.trim()) {
    return error('Provide a query: /context files <query>');
  }

  const { context } = codebaseMemory.enrichPrompt(query);

  if (context.relevantFiles.length === 0) {
    return success([], chalk.yellow(`\nNo relevant files found for: "${query}"`));
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan(`\n Files Relevant to: "${query}"\n`));

  for (const f of context.relevantFiles) {
    lines.push(`${chalk.green('*')} ${chalk.bold(f.relativePath)}`);
    if (f.classes?.length) {
      lines.push(`  Classes: ${f.classes.join(', ')}`);
    }
    if (f.exports?.length) {
      lines.push(`  Exports: ${truncate(f.exports.slice(0, 8).join(', '), 60)}`);
    }
    if (f.functions?.length && f.functions.length > (f.exports?.length || 0)) {
      lines.push(`  Functions: ${truncate(f.functions.slice(0, 8).join(', '), 60)}`);
    }
    lines.push(`  Size: ${formatNumber(f.lines ?? 0)} lines`);
    lines.push('');
  }

  return success(context.relevantFiles, lines.join('\n'));
}

function memoryHelp(): string {
  return `
${chalk.bold.cyan('CodebaseMemory Commands')}

${chalk.yellow('/memory status')}     - Show memory status and current project
${chalk.yellow('/memory list')}       - List all analyzed projects
${chalk.yellow('/memory current')}    - Show current project details
${chalk.yellow('/memory set [path]')} - Set current project
${chalk.yellow('/memory clear [path]')} - Delete project from memory
${chalk.yellow('/memory search <query>')} - Search across projects

${chalk.yellow('/analyze [path]')}    - Analyze project structure
  Options:
    --maxFiles <n>    Max files to analyze (default: 500)
    --depth <n>       Max directory depth (default: 10)

${chalk.yellow('/context show')}      - Show context for current project
${chalk.yellow('/context enrich <prompt>')} - Preview enriched prompt
${chalk.yellow('/context files <query>')}  - Find files relevant to query
`;
}

function contextHelp(): string {
  return `
${chalk.bold.cyan('Context Commands')}

${chalk.yellow('/context show')}      - Show context that will be added to prompts
${chalk.yellow('/context enrich <prompt>')} - Preview how a prompt will be enriched
${chalk.yellow('/context files <query>')}  - Find files relevant to a query

The context system automatically enriches your prompts with:
- Project structure and type
- Relevant files based on your query
- Available scripts and dependencies
- Suggested actions
`;
}

// ============================================================
// Command Registration
// ============================================================

/**
 * Register all codebase commands with the registry
 */
export function registerCodebaseCommands(): void {
  const analyzeCommand: Command = {
    name: 'analyze',
    aliases: ['scan'],
    description: 'Analyze project structure and save to memory',
    usage: '[path] [--maxFiles <n>] [--depth <n>]',
    args: [
      { name: 'path', description: 'Project path to analyze', default: 'current directory' },
      { name: '--maxFiles', description: 'Max files to analyze', default: '500' },
      { name: '--depth', description: 'Max directory depth', default: '10' },
    ],
    handler: analyzeHandler,
    category: 'codebase',
  };

  const memoryCommand: Command = {
    name: 'memory',
    aliases: ['mem'],
    description: 'Manage codebase memory and project index',
    usage: '<subcommand> [args]',
    handler: memoryHandler,
    category: 'codebase',
    subcommands: new Map([
      [
        'status',
        {
          name: 'status',
          aliases: ['stats'],
          description: 'Show memory status',
          handler: memoryHandler,
          category: 'codebase',
        },
      ],
      [
        'list',
        {
          name: 'list',
          aliases: [],
          description: 'List analyzed projects',
          handler: memoryHandler,
          category: 'codebase',
        },
      ],
      [
        'current',
        {
          name: 'current',
          aliases: [],
          description: 'Show current project',
          handler: memoryHandler,
          category: 'codebase',
        },
      ],
      [
        'set',
        {
          name: 'set',
          aliases: [],
          description: 'Set current project',
          handler: memoryHandler,
          category: 'codebase',
        },
      ],
      [
        'clear',
        {
          name: 'clear',
          aliases: [],
          description: 'Clear project from memory',
          handler: memoryHandler,
          category: 'codebase',
        },
      ],
      [
        'search',
        {
          name: 'search',
          aliases: [],
          description: 'Search projects',
          handler: memoryHandler,
          category: 'codebase',
        },
      ],
    ]),
  };

  const contextCommand: Command = {
    name: 'context',
    aliases: ['ctx'],
    description: 'Show or manage project context for prompts',
    usage: '<subcommand> [args]',
    handler: contextHandler,
    category: 'codebase',
    subcommands: new Map([
      [
        'show',
        {
          name: 'show',
          aliases: [],
          description: 'Show current context',
          handler: contextHandler,
          category: 'codebase',
        },
      ],
      [
        'enrich',
        {
          name: 'enrich',
          aliases: [],
          description: 'Preview enriched prompt',
          handler: contextHandler,
          category: 'codebase',
        },
      ],
      [
        'files',
        {
          name: 'files',
          aliases: [],
          description: 'Find relevant files',
          handler: contextHandler,
          category: 'codebase',
        },
      ],
    ]),
  };

  commandRegistry.register(analyzeCommand);
  commandRegistry.register(memoryCommand);
  commandRegistry.register(contextCommand);
}

// ============================================================
// Legacy exports for backward compatibility
// ============================================================

/**
 * Legacy command context interface
 */
export interface LegacyCommandContext {
  cwd: string;
  args: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Legacy analyze command (for backward compatibility)
 */
export async function analyzeCommand(ctx: LegacyCommandContext): Promise<string> {
  const result = await analyzeHandler({
    ...ctx,
    rawArgs: ctx.args.join(' '),
  });
  return result.message || result.error || '';
}

/**
 * Legacy memory command (for backward compatibility)
 */
export async function memoryCommand(ctx: LegacyCommandContext): Promise<string> {
  const result = await memoryHandler({
    ...ctx,
    rawArgs: ctx.args.join(' '),
  });
  return result.message || result.error || '';
}

/**
 * Legacy context command (for backward compatibility)
 */
export async function contextCommand(ctx: LegacyCommandContext): Promise<string> {
  const result = await contextHandler({
    ...ctx,
    rawArgs: ctx.args.join(' '),
  });
  return result.message || result.error || '';
}

/**
 * Automatically enrich a prompt with project context
 * Call this before sending prompts to the model
 */
export async function autoEnrichPrompt(
  prompt: string,
  options: { enabled?: boolean; maxContext?: number } = {},
): Promise<string> {
  const { enabled = true, maxContext = 3000 } = options;

  if (!enabled) return prompt;

  await codebaseMemory.init();

  const current = codebaseMemory.getCurrentProject();
  if (!current) return prompt;

  const { enrichedPrompt } = codebaseMemory.enrichPrompt(prompt, {
    maxContextLength: maxContext,
    includeStructure: true,
    includeRelevantFiles: true,
  });

  return enrichedPrompt;
}

/**
 * Initialize codebase memory for current directory
 */
export async function initCodebaseForCwd(cwd: string): Promise<void> {
  await codebaseMemory.init();

  // Try to set current project if already analyzed
  const existing = codebaseMemory.setCurrentProject(cwd);

  if (existing) {
    console.log(chalk.gray(`[CodebaseMemory] Loaded project: ${existing.projectName}`));
  }
}

// Export for backward compatibility
export const codebaseCommands = {
  analyze: analyzeCommand,
  memory: memoryCommand,
  context: contextCommand,
  autoEnrichPrompt,
  initCodebaseForCwd,
  registerCodebaseCommands,
};

export default codebaseCommands;
