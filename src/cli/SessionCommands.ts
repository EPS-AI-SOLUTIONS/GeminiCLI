/**
 * SessionCommands - CLI commands for session and history management
 *
 * Uses CommandRegistry for unified command registration and handling.
 */

import chalk from 'chalk';
import { codebaseMemory } from '../memory/CodebaseMemory.js';
import { sessionMemory } from '../memory/SessionMemory.js';
import {
  formatDuration,
  formatNumber,
  formatRelativeTime,
  getStringFlag,
  parseArgs,
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
 * /sessions - Manage chat sessions
 */
async function sessionsHandler(ctx: CommandContext): Promise<CommandResult> {
  await sessionMemory.init();

  const subcommand = ctx.args[0] || 'list';

  switch (subcommand) {
    case 'list':
    case 'ls':
      return listSessions();

    case 'new':
    case 'create':
      return createSession(ctx.args.slice(1).join(' ') || undefined);

    case 'switch':
    case 'load':
      return switchSession(ctx.args[1]);

    case 'current':
      return currentSession();

    case 'rename':
      return renameSession(ctx.args.slice(1).join(' '));

    case 'delete':
    case 'rm':
      return deleteSession(ctx.args[1]);

    case 'branch':
    case 'fork':
      return branchSession(ctx.args.slice(1).join(' ') || 'branch');

    case 'export':
      return exportSession(ctx.args[1], getStringFlag(ctx.flags, 'format') || 'markdown');

    case 'search':
      return searchSessions(ctx.args.slice(1).join(' '));

    default:
      return success(null, sessionsHelp());
  }
}

/**
 * /history - View and search chat history
 */
async function historyHandler(ctx: CommandContext): Promise<CommandResult> {
  await sessionMemory.init();

  const subcommand = ctx.args[0] || 'show';

  switch (subcommand) {
    case 'show':
    case 'view': {
      const count = parseInt(ctx.args[1], 10) || 20;
      return showHistory(count);
    }

    case 'search':
      return searchHistory(ctx.args.slice(1).join(' '));

    case 'clear':
      return clearHistory();

    case 'stats':
      return historyStats();

    default:
      return success(null, historyHelp());
  }
}

/**
 * /resume - Resume last session or specific session
 */
async function resumeHandler(ctx: CommandContext): Promise<CommandResult> {
  await sessionMemory.init();

  const sessionId = ctx.args[0];

  const session = await sessionMemory.resumeSession(sessionId);

  if (session) {
    const messages = sessionMemory.getRecentMessages(5);
    const lines: string[] = [];

    lines.push(chalk.green(`\n Session resumed: ${chalk.bold(session.name)}`));
    lines.push(chalk.gray(`  ID: ${session.id}`));
    lines.push(chalk.gray(`  Messages: ${session.messages.length}`));
    lines.push(chalk.gray(`  Last updated: ${formatRelativeTime(session.updated)}`));

    if (messages.length > 0) {
      lines.push(chalk.bold('\n Recent conversation:'));
      for (const msg of messages.slice(-3)) {
        const icon = msg.role === 'user' ? '[U]' : '[A]';
        const preview = truncate(msg.content.replace(/\n/g, ' '), 80);
        lines.push(`  ${icon} ${preview}`);
      }
    }

    lines.push(chalk.cyan('\nYou can continue the conversation. Your context is restored.'));
    return success(session, lines.join('\n'));
  }

  return error('No session to resume. Use /sessions new to start a new session.');
}

// ============================================================
// Subcommand Implementations
// ============================================================

async function listSessions(): Promise<CommandResult> {
  const sessions = await sessionMemory.listSessions();
  const current = sessionMemory.getCurrentSession();

  if (sessions.length === 0) {
    return success([], chalk.yellow('\nNo sessions found. Use /sessions new to create one.'));
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n Chat Sessions\n'));

  for (const session of sessions.slice(0, 15)) {
    const isCurrent = current?.id === session.id;
    const marker = isCurrent ? chalk.green('>') : ' ';
    const name = isCurrent ? chalk.bold.green(session.name) : session.name;

    lines.push(`${marker} ${name}`);
    lines.push(chalk.gray(`    ID: ${session.id}`));
    lines.push(
      chalk.gray(
        `    Messages: ${session.messageCount} | Updated: ${formatRelativeTime(session.updated)}`,
      ),
    );
    lines.push('');
  }

  if (sessions.length > 15) {
    lines.push(chalk.gray(`  ...and ${sessions.length - 15} more sessions`));
  }

  return success(sessions, lines.join('\n'));
}

async function createSession(name?: string): Promise<CommandResult> {
  const id = await sessionMemory.startSession(name);
  const session = sessionMemory.getCurrentSession();

  return success(
    { id, name: session?.name },
    chalk.green(`\n New session created: ${chalk.bold(session?.name || id)}\n  ID: ${id}`),
  );
}

async function switchSession(sessionId: string): Promise<CommandResult> {
  if (!sessionId) {
    return error('Provide session ID: /sessions switch <session-id>');
  }

  const session = await sessionMemory.loadSession(sessionId);
  if (session) {
    return success(
      { id: session.id, name: session.name, messageCount: session.messages.length },
      chalk.green(
        `\n Switched to session: ${chalk.bold(session.name)}\n  Messages: ${session.messages.length}`,
      ),
    );
  }

  return error(`Session not found: ${sessionId}`);
}

function currentSession(): CommandResult {
  const session = sessionMemory.getCurrentSession();

  if (!session) {
    return error('No active session. Use /sessions new or /resume.');
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n Current Session\n'));
  lines.push(`  Name: ${chalk.bold(session.name)}`);
  lines.push(`  ID: ${session.id}`);
  lines.push(`  Created: ${formatRelativeTime(session.created)}`);
  lines.push(`  Updated: ${formatRelativeTime(session.updated)}`);
  lines.push(`  Messages: ${formatNumber(session.messages.length)}`);

  if (session.tags.length > 0) {
    lines.push(`  Tags: ${session.tags.join(', ')}`);
  }

  if (session.parentId) {
    lines.push(`  Branched from: ${session.parentId}`);
  }

  return success(session, lines.join('\n'));
}

function renameSession(newName: string): CommandResult {
  if (!newName.trim()) {
    return error('Provide new name: /sessions rename <new-name>');
  }

  const session = sessionMemory.getCurrentSession();
  if (!session) {
    return error('No active session to rename.');
  }

  const oldName = session.name;
  session.name = newName;

  return success(
    { oldName, newName },
    chalk.green(`\n Session renamed: ${oldName} -> ${chalk.bold(newName)}`),
  );
}

async function deleteSession(sessionId: string): Promise<CommandResult> {
  if (!sessionId) {
    return error('Provide session ID: /sessions delete <session-id>');
  }

  const deleted = await sessionMemory.deleteSession(sessionId);
  if (deleted) {
    return success({ deleted: sessionId }, chalk.green(`\n Session deleted: ${sessionId}`));
  }

  return error(`Session not found: ${sessionId}`);
}

async function branchSession(branchName: string): Promise<CommandResult> {
  const session = sessionMemory.getCurrentSession();
  if (!session) {
    return error('No active session to branch. Start or resume a session first.');
  }

  const newId = await sessionMemory.branchSession(branchName);
  return success(
    { newId, branchName, parentId: session.id },
    chalk.cyan(
      `\n Session branched: ${chalk.bold(branchName)}\n  New ID: ${newId}\n  Branched from: ${session.id}`,
    ),
  );
}

async function exportSession(filename: string, format: string): Promise<CommandResult> {
  const session = sessionMemory.getCurrentSession();
  if (!session) {
    return error('No active session to export.');
  }

  const fmt = format === 'json' ? 'json' : 'markdown';
  const content = await sessionMemory.exportSession(fmt);

  if (filename) {
    await sessionMemory.exportToFile(filename, fmt);
    return success({ filename, format: fmt }, chalk.green(`\n Session exported to: ${filename}`));
  }

  return success({ content, format: fmt }, content);
}

async function searchSessions(query: string): Promise<CommandResult> {
  if (!query.trim()) {
    return error('Provide search query: /sessions search <query>');
  }

  const results = await sessionMemory.searchSessions(query);

  if (results.length === 0) {
    return success([], chalk.yellow(`\nNo results found for: "${query}"`));
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan(`\n Search Results for: "${query}"\n`));

  for (const result of results.slice(0, 10)) {
    lines.push(chalk.bold(`[S] ${result.session}`));
    for (const match of result.matches.slice(0, 2)) {
      lines.push(chalk.gray(`    ...${truncate(match, 70)}`));
    }
    lines.push('');
  }

  return success(results, lines.join('\n'));
}

function showHistory(count: number): CommandResult {
  const messages = sessionMemory.getRecentMessages(count);

  if (messages.length === 0) {
    return success([], chalk.yellow('\nNo messages in current session.'));
  }

  const lines: string[] = [];
  lines.push(chalk.bold.cyan(`\n Recent Messages (${messages.length})\n`));

  for (const msg of messages) {
    const icon = msg.role === 'user' ? '[U]' : msg.role === 'assistant' ? '[A]' : '[S]';
    const time = msg.timestamp.toLocaleTimeString();
    const agentInfo = msg.agent ? chalk.cyan(` [${msg.agent}]`) : '';

    lines.push(`${icon} ${chalk.gray(time)}${agentInfo}`);

    // Truncate long messages
    const content = truncate(msg.content, 300);
    lines.push(`   ${content.replace(/\n/g, '\n   ')}`);
    lines.push('');
  }

  return success(messages, lines.join('\n'));
}

async function searchHistory(query: string): Promise<CommandResult> {
  if (!query.trim()) {
    return error('Provide search query: /history search <query>');
  }

  const results = await sessionMemory.searchSessions(query);

  // Also search current session
  const currentMessages = sessionMemory.getRecentMessages(100);
  const currentMatches = currentMessages.filter((m) =>
    m.content.toLowerCase().includes(query.toLowerCase()),
  );

  const lines: string[] = [];
  lines.push(chalk.bold.cyan(`\n Search Results for: "${query}"\n`));

  if (currentMatches.length > 0) {
    lines.push(chalk.bold('Current Session:'));
    for (const msg of currentMatches.slice(0, 5)) {
      const icon = msg.role === 'user' ? '[U]' : '[A]';
      const preview = truncate(msg.content.replace(/\n/g, ' '), 100);
      lines.push(`  ${icon} ${preview}`);
    }
    lines.push('');
  }

  if (results.length > 0) {
    lines.push(chalk.bold('Other Sessions:'));
    for (const result of results.slice(0, 5)) {
      lines.push(`  [S] ${result.session}: ${result.matches.length} matches`);
    }
  }

  if (currentMatches.length === 0 && results.length === 0) {
    return success([], chalk.yellow(`\nNo results found for: "${query}"`));
  }

  return success({ currentMatches, otherResults: results }, lines.join('\n'));
}

function clearHistory(): CommandResult {
  const session = sessionMemory.getCurrentSession();
  if (session) {
    session.messages = [];
    return success({ cleared: true }, chalk.yellow('\n History cleared for current session.'));
  }
  return error('No active session.');
}

function historyStats(): CommandResult {
  const session = sessionMemory.getCurrentSession();

  if (!session) {
    return error('No active session.');
  }

  const userMessages = session.messages.filter((m) => m.role === 'user').length;
  const assistantMessages = session.messages.filter((m) => m.role === 'assistant').length;
  const totalChars = session.messages.reduce((sum, m) => sum + m.content.length, 0);

  const stats = {
    totalMessages: session.messages.length,
    userMessages,
    assistantMessages,
    totalChars,
    estimatedTokens: Math.ceil(totalChars / 4),
    duration: 0,
  };

  const lines: string[] = [];
  lines.push(chalk.bold.cyan('\n Session Statistics\n'));
  lines.push(`  Total messages: ${formatNumber(stats.totalMessages)}`);
  lines.push(`  User messages: ${formatNumber(stats.userMessages)}`);
  lines.push(`  Assistant messages: ${formatNumber(stats.assistantMessages)}`);
  lines.push(`  Total characters: ${formatNumber(stats.totalChars)}`);
  lines.push(`  Estimated tokens: ~${formatNumber(stats.estimatedTokens)}`);

  if (session.messages.length > 0) {
    const firstMsg = session.messages[0];
    const lastMsg = session.messages[session.messages.length - 1];
    const duration = new Date(lastMsg.timestamp).getTime() - new Date(firstMsg.timestamp).getTime();
    stats.duration = duration;

    if (duration > 0) {
      lines.push(`  Session duration: ${formatDuration(duration)}`);
    }
  }

  return success(stats, lines.join('\n'));
}

function sessionsHelp(): string {
  return `
${chalk.bold.cyan('Session Commands')}

${chalk.yellow('/sessions list')}         - List all sessions
${chalk.yellow('/sessions new [name]')}   - Create new session
${chalk.yellow('/sessions switch <id>')}  - Switch to session
${chalk.yellow('/sessions current')}      - Show current session info
${chalk.yellow('/sessions rename <name>')}- Rename current session
${chalk.yellow('/sessions delete <id>')}  - Delete a session
${chalk.yellow('/sessions branch <name>')}- Fork current session
${chalk.yellow('/sessions export [file]')}- Export session (--format json|markdown)
${chalk.yellow('/sessions search <q>')}   - Search across sessions

${chalk.yellow('/resume [id]')}           - Resume last or specific session
`;
}

function historyHelp(): string {
  return `
${chalk.bold.cyan('History Commands')}

${chalk.yellow('/history show [n]')}      - Show last N messages (default: 20)
${chalk.yellow('/history search <q>')}    - Search in history
${chalk.yellow('/history stats')}         - Show session statistics
${chalk.yellow('/history clear')}         - Clear current session history
`;
}

// ============================================================
// Command Registration
// ============================================================

/**
 * Register all session commands with the registry
 */
export function registerSessionCommands(): void {
  const sessionsCommand: Command = {
    name: 'sessions',
    aliases: ['session', 's'],
    description: 'Manage chat sessions',
    usage: '<subcommand> [args]',
    handler: sessionsHandler,
    category: 'session',
    subcommands: new Map([
      [
        'list',
        {
          name: 'list',
          aliases: ['ls'],
          description: 'List all sessions',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'new',
        {
          name: 'new',
          aliases: ['create'],
          description: 'Create new session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'switch',
        {
          name: 'switch',
          aliases: ['load'],
          description: 'Switch to session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'current',
        {
          name: 'current',
          aliases: [],
          description: 'Show current session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'rename',
        {
          name: 'rename',
          aliases: [],
          description: 'Rename session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'delete',
        {
          name: 'delete',
          aliases: ['rm'],
          description: 'Delete session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'branch',
        {
          name: 'branch',
          aliases: ['fork'],
          description: 'Fork session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'export',
        {
          name: 'export',
          aliases: [],
          description: 'Export session',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
      [
        'search',
        {
          name: 'search',
          aliases: [],
          description: 'Search sessions',
          handler: sessionsHandler,
          category: 'session',
        },
      ],
    ]),
  };

  const historyCommand: Command = {
    name: 'history',
    aliases: ['hist', 'h'],
    description: 'View and search chat history',
    usage: '<subcommand> [args]',
    handler: historyHandler,
    category: 'session',
    subcommands: new Map([
      [
        'show',
        {
          name: 'show',
          aliases: ['view'],
          description: 'Show recent messages',
          handler: historyHandler,
          category: 'session',
        },
      ],
      [
        'search',
        {
          name: 'search',
          aliases: [],
          description: 'Search history',
          handler: historyHandler,
          category: 'session',
        },
      ],
      [
        'stats',
        {
          name: 'stats',
          aliases: [],
          description: 'Show statistics',
          handler: historyHandler,
          category: 'session',
        },
      ],
      [
        'clear',
        {
          name: 'clear',
          aliases: [],
          description: 'Clear history',
          handler: historyHandler,
          category: 'session',
        },
      ],
    ]),
  };

  const resumeCommand: Command = {
    name: 'resume',
    aliases: ['r'],
    description: 'Resume last or specific session',
    usage: '[session-id]',
    args: [{ name: 'session-id', description: 'Optional session ID to resume' }],
    handler: resumeHandler,
    category: 'session',
  };

  commandRegistry.register(sessionsCommand);
  commandRegistry.register(historyCommand);
  commandRegistry.register(resumeCommand);
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
}

/**
 * Legacy sessions command (for backward compatibility)
 */
export async function sessionsCommand(ctx: LegacyCommandContext): Promise<string> {
  const { positional, flags } = parseArgs(ctx.args);
  const result = await sessionsHandler({
    cwd: ctx.cwd,
    args: positional,
    flags,
    rawArgs: ctx.args.join(' '),
  });
  return result.message || result.error || '';
}

/**
 * Legacy history command (for backward compatibility)
 */
export async function historyCommand(ctx: LegacyCommandContext): Promise<string> {
  const { positional, flags } = parseArgs(ctx.args);
  const result = await historyHandler({
    cwd: ctx.cwd,
    args: positional,
    flags,
    rawArgs: ctx.args.join(' '),
  });
  return result.message || result.error || '';
}

/**
 * Legacy resume command (for backward compatibility)
 */
export async function resumeCommand(ctx: LegacyCommandContext): Promise<string> {
  const { positional, flags } = parseArgs(ctx.args);
  const result = await resumeHandler({
    cwd: ctx.cwd,
    args: positional,
    flags,
    rawArgs: ctx.args.join(' '),
  });
  return result.message || result.error || '';
}

// ============================================================
// Integration Helpers
// ============================================================

/**
 * Initialize session system and optionally resume last session
 */
export async function initSessionSystem(
  options: { autoResume?: boolean; projectPath?: string } = {},
): Promise<void> {
  const { autoResume = true, projectPath } = options;

  await sessionMemory.init();

  if (autoResume) {
    const sessions = await sessionMemory.listSessions();
    if (sessions.length > 0) {
      await sessionMemory.resumeSession();
    } else {
      await sessionMemory.startSession();
    }
  }

  // Link project context if available
  if (projectPath) {
    sessionMemory.setContext('projectPath', projectPath);
  }

  console.log(chalk.gray('[SessionSystem] Ready'));
}

/**
 * Add a message to current session (call this after each exchange)
 */
export async function recordMessage(
  role: 'user' | 'assistant',
  content: string,
  agent?: string,
): Promise<void> {
  await sessionMemory.addMessage(role, content, agent);
}

/**
 * Get context for a new prompt (recent history + project context)
 */
export async function getPromptContext(maxMessages: number = 6): Promise<{
  messages: Array<{ role: string; content: string }>;
  projectContext?: string;
}> {
  await sessionMemory.init();

  const recentMessages = sessionMemory.getRecentMessages(maxMessages);
  const messages = recentMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  // Add project context if available
  let projectContext: string | undefined;
  try {
    await codebaseMemory.init();
    const project = codebaseMemory.getCurrentProject();
    if (project) {
      projectContext = project.summary;
    }
  } catch {}

  return { messages, projectContext };
}

/**
 * Build full context for model (history + project + enrichment)
 */
export async function buildFullContext(userPrompt: string): Promise<{
  systemContext: string;
  conversationHistory: Array<{ role: string; content: string }>;
}> {
  const { messages, projectContext } = await getPromptContext();

  // Build system context
  const systemParts: string[] = [];

  if (projectContext) {
    systemParts.push(`## Project Context\n${projectContext}`);
  }

  // Add relevant codebase context
  try {
    const { context } = codebaseMemory.enrichPrompt(userPrompt);
    if (context.relevantFiles.length > 0) {
      systemParts.push(`\n## Relevant Files`);
      for (const f of context.relevantFiles.slice(0, 3)) {
        systemParts.push(`- ${f.relativePath}`);
      }
    }
  } catch {}

  return {
    systemContext: systemParts.join('\n'),
    conversationHistory: messages,
  };
}

/**
 * Save session before exit
 */
export async function saveAndClose(): Promise<void> {
  await sessionMemory.saveSnapshot();
  sessionMemory.stopAutoSave();
  console.log(chalk.gray('[SessionSystem] Session saved'));
}

// Export for backward compatibility
export const sessionCommands = {
  sessions: sessionsCommand,
  history: historyCommand,
  resume: resumeCommand,
  initSessionSystem,
  recordMessage,
  getPromptContext,
  buildFullContext,
  saveAndClose,
  registerSessionCommands,
};

export default sessionCommands;
