/**
 * HelpSystem - Advanced CLI Help System
 *
 * Provides comprehensive help functionality:
 * - /help - General help overview
 * - /help <command> - Detailed command help
 * - /help --all - Full command reference
 * - /help --category <cat> - Commands by category
 * - /help --search <query> - Search help content
 * - /help --interactive - Interactive help browser
 * - /help --export [file] - Export help to markdown
 */

import chalk from 'chalk';
import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import {
  commandRegistry,
  Command,
  CommandContext,
  CommandResult,
  CommandArg,
  success,
  error
} from './CommandRegistry.js';
import {
  parseArgs,
  getBooleanFlag,
  getStringFlag,
  box,
  horizontalLine,
  truncate,
  highlightMatch,
  promptInput,
  promptSelect
} from './CommandHelpers.js';

// ============================================================
// Types and Interfaces
// ============================================================

/**
 * Extended command definition with examples
 */
export interface CommandExample {
  command: string;
  description: string;
  output?: string;
}

/**
 * Extended command metadata for help system
 */
export interface CommandHelpMeta {
  name: string;
  examples?: CommandExample[];
  notes?: string[];
  seeAlso?: string[];
  sinceVersion?: string;
  deprecated?: boolean;
  deprecatedMessage?: string;
}

/**
 * Category display configuration
 */
export interface CategoryConfig {
  name: string;
  displayName: string;
  description: string;
  icon: string;
  order: number;
}

/**
 * Help export format
 */
export type ExportFormat = 'markdown' | 'json' | 'html';

// ============================================================
// Help Metadata Registry
// ============================================================

/**
 * Registry for extended command help metadata (examples, notes, etc.)
 */
class HelpMetaRegistry {
  private meta: Map<string, CommandHelpMeta> = new Map();

  /**
   * Register help metadata for a command
   */
  register(commandName: string, meta: Partial<CommandHelpMeta>): void {
    const existing = this.meta.get(commandName) || { name: commandName };
    this.meta.set(commandName, { ...existing, ...meta });
  }

  /**
   * Get help metadata for a command
   */
  get(commandName: string): CommandHelpMeta | undefined {
    return this.meta.get(commandName);
  }

  /**
   * Check if command has extended metadata
   */
  has(commandName: string): boolean {
    return this.meta.has(commandName);
  }

  /**
   * Get all registered metadata
   */
  getAll(): Map<string, CommandHelpMeta> {
    return new Map(this.meta);
  }
}

export const helpMetaRegistry = new HelpMetaRegistry();

// ============================================================
// Category Configuration
// ============================================================

const categoryConfig: Map<string, CategoryConfig> = new Map([
  ['general', {
    name: 'general',
    displayName: 'General',
    description: 'General purpose commands',
    icon: '📌',
    order: 1
  }],
  ['session', {
    name: 'session',
    displayName: 'Session Management',
    description: 'Commands for managing chat sessions and history',
    icon: '💬',
    order: 2
  }],
  ['codebase', {
    name: 'codebase',
    displayName: 'Codebase Analysis',
    description: 'Commands for analyzing and understanding code',
    icon: '🔍',
    order: 3
  }],
  ['filesystem', {
    name: 'filesystem',
    displayName: 'File System',
    description: 'File and directory operations',
    icon: '📁',
    order: 4
  }],
  ['shell', {
    name: 'shell',
    displayName: 'Shell & Processes',
    description: 'Shell commands and process management',
    icon: '⚡',
    order: 5
  }],
  ['search', {
    name: 'search',
    displayName: 'Search',
    description: 'Search and find operations',
    icon: '🔎',
    order: 6
  }],
  ['memory', {
    name: 'memory',
    displayName: 'Memory & Knowledge',
    description: 'Knowledge graph and memory operations',
    icon: '🧠',
    order: 7
  }],
  ['ai', {
    name: 'ai',
    displayName: 'AI & Models',
    description: 'AI model management and interactions',
    icon: '🤖',
    order: 8
  }],
  ['mcp', {
    name: 'mcp',
    displayName: 'MCP Integration',
    description: 'Model Context Protocol servers',
    icon: '🔌',
    order: 9
  }],
  ['serena', {
    name: 'serena',
    displayName: 'Code Intelligence',
    description: 'LSP-powered code analysis (Serena)',
    icon: '🎯',
    order: 10
  }],
  ['git', {
    name: 'git',
    displayName: 'Git & Version Control',
    description: 'Git operations and version control',
    icon: '📚',
    order: 11
  }]
]);

// ============================================================
// Help Formatting Utilities
// ============================================================

/**
 * Format argument for display
 */
function formatArg(arg: CommandArg): string {
  const required = arg.required ? '' : '?';
  const defaultVal = arg.default !== undefined ? `=${arg.default}` : '';
  const typeHint = arg.type ? `:${arg.type}` : '';
  const choices = arg.choices ? `(${arg.choices.join('|')})` : '';

  return `<${arg.name}${required}${typeHint}${defaultVal}>${choices}`;
}

/**
 * Format command signature
 */
function formatSignature(cmd: Command): string {
  const parts = [`/${cmd.name}`];

  if (cmd.args && cmd.args.length > 0) {
    parts.push(...cmd.args.map(formatArg));
  }

  if (cmd.usage) {
    return `/${cmd.name} ${cmd.usage}`;
  }

  return parts.join(' ');
}

/**
 * Get category display info
 */
function getCategoryDisplay(categoryName: string): CategoryConfig {
  return categoryConfig.get(categoryName) || {
    name: categoryName,
    displayName: categoryName.charAt(0).toUpperCase() + categoryName.slice(1),
    description: '',
    icon: '📋',
    order: 99
  };
}

// ============================================================
// Help Content Generators
// ============================================================

/**
 * Generate general help overview
 */
function generateOverview(): string {
  const lines: string[] = [];

  // Header
  lines.push('');
  lines.push(chalk.bold.cyan('╔════════════════════════════════════════════════════════════╗'));
  lines.push(chalk.bold.cyan('║') + chalk.bold.white('           GeminiHydra CLI - Help System                   ') + chalk.bold.cyan('║'));
  lines.push(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝'));
  lines.push('');

  // Quick start
  lines.push(chalk.bold.yellow('Quick Start:'));
  lines.push(chalk.gray('  Type a message to chat with the AI'));
  lines.push(chalk.gray('  Use /commands to interact with the system'));
  lines.push('');

  // Categories overview
  lines.push(chalk.bold.yellow('Command Categories:'));
  lines.push('');

  const sortedCategories = Array.from(categoryConfig.values())
    .sort((a, b) => a.order - b.order);

  for (const cat of sortedCategories) {
    const commands = commandRegistry.getByCategory(cat.name);
    if (commands.length > 0) {
      lines.push(`  ${cat.icon} ${chalk.cyan(cat.displayName.padEnd(20))} ${chalk.gray(`(${commands.length} commands)`)}`);
    }
  }

  lines.push('');

  // Common commands
  lines.push(chalk.bold.yellow('Essential Commands:'));
  lines.push('');
  lines.push(`  ${chalk.yellow('/help')}              ${chalk.gray('Show this help')}`);
  lines.push(`  ${chalk.yellow('/help <command>')}    ${chalk.gray('Detailed help for a command')}`);
  lines.push(`  ${chalk.yellow('/help --all')}        ${chalk.gray('List all commands')}`);
  lines.push(`  ${chalk.yellow('/help --interactive')}${chalk.gray('Interactive help browser')}`);
  lines.push('');
  lines.push(`  ${chalk.yellow('/sessions')}          ${chalk.gray('Manage chat sessions')}`);
  lines.push(`  ${chalk.yellow('/history')}           ${chalk.gray('View conversation history')}`);
  lines.push(`  ${chalk.yellow('/fs')}                ${chalk.gray('File system operations')}`);
  lines.push(`  ${chalk.yellow('/shell')}             ${chalk.gray('Run shell commands')}`);
  lines.push(`  ${chalk.yellow('/search')}            ${chalk.gray('Search files and code')}`);
  lines.push('');

  // Footer
  lines.push(chalk.gray(horizontalLine(60)));
  lines.push(chalk.gray(`Use ${chalk.white('/help --category <name>')} for category-specific help`));
  lines.push(chalk.gray(`Use ${chalk.white('/help --export')} to save help to markdown file`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate detailed help for a specific command
 */
function generateCommandHelp(commandName: string): string {
  const cmd = commandRegistry.get(commandName);

  if (!cmd) {
    return chalk.red(`\nUnknown command: ${commandName}\n\n`) +
           chalk.gray(`Use /help --search ${commandName} to find related commands`);
  }

  const meta = helpMetaRegistry.get(cmd.name);
  const lines: string[] = [];

  // Command header
  lines.push('');
  lines.push(chalk.bold.cyan(`╭${'─'.repeat(58)}╮`));
  lines.push(chalk.bold.cyan('│') + chalk.bold.white(` Command: /${cmd.name}`.padEnd(58)) + chalk.bold.cyan('│'));
  lines.push(chalk.bold.cyan(`╰${'─'.repeat(58)}╯`));
  lines.push('');

  // Deprecated warning
  if (meta?.deprecated) {
    lines.push(chalk.bgYellow.black(' DEPRECATED ') + ' ' + chalk.yellow(meta.deprecatedMessage || 'This command is deprecated'));
    lines.push('');
  }

  // Description
  lines.push(chalk.bold.white('Description:'));
  lines.push(`  ${cmd.description}`);
  lines.push('');

  // Usage
  lines.push(chalk.bold.white('Usage:'));
  lines.push(`  ${chalk.yellow(formatSignature(cmd))}`);
  lines.push('');

  // Arguments
  if (cmd.args && cmd.args.length > 0) {
    lines.push(chalk.bold.white('Arguments:'));
    for (const arg of cmd.args) {
      const reqMark = arg.required ? chalk.red('*') : chalk.gray('?');
      const typeInfo = arg.type ? chalk.gray(` (${arg.type})`) : '';
      const defaultInfo = arg.default !== undefined ? chalk.gray(` [default: ${arg.default}]`) : '';
      const choicesInfo = arg.choices ? chalk.cyan(` {${arg.choices.join(', ')}}`) : '';

      lines.push(`  ${reqMark} ${chalk.cyan(arg.name)}${typeInfo}${choicesInfo}`);
      lines.push(`      ${arg.description}${defaultInfo}`);
    }
    lines.push('');
  }

  // Aliases
  if (cmd.aliases && cmd.aliases.length > 0) {
    lines.push(chalk.bold.white('Aliases:'));
    lines.push(`  ${cmd.aliases.map(a => chalk.yellow(`/${a}`)).join(', ')}`);
    lines.push('');
  }

  // Subcommands
  if (cmd.subcommands && cmd.subcommands.size > 0) {
    lines.push(chalk.bold.white('Subcommands:'));
    for (const [name, subcmd] of cmd.subcommands) {
      const subAliases = subcmd.aliases.length > 0
        ? chalk.gray(` (${subcmd.aliases.join(', ')})`)
        : '';
      lines.push(`  ${chalk.yellow(name.padEnd(15))} ${subcmd.description}${subAliases}`);
    }
    lines.push('');
  }

  // Examples
  if (meta?.examples && meta.examples.length > 0) {
    lines.push(chalk.bold.white('Examples:'));
    for (const ex of meta.examples) {
      lines.push(`  ${chalk.green('$')} ${chalk.yellow(ex.command)}`);
      lines.push(`      ${chalk.gray(ex.description)}`);
      if (ex.output) {
        lines.push(`      ${chalk.gray('→')} ${chalk.dim(ex.output)}`);
      }
    }
    lines.push('');
  }

  // Notes
  if (meta?.notes && meta.notes.length > 0) {
    lines.push(chalk.bold.white('Notes:'));
    for (const note of meta.notes) {
      lines.push(`  ${chalk.gray('•')} ${note}`);
    }
    lines.push('');
  }

  // See also
  if (meta?.seeAlso && meta.seeAlso.length > 0) {
    lines.push(chalk.bold.white('See Also:'));
    lines.push(`  ${meta.seeAlso.map(s => chalk.cyan(`/${s}`)).join(', ')}`);
    lines.push('');
  }

  // Category
  const catDisplay = getCategoryDisplay(cmd.category || 'general');
  lines.push(chalk.gray(`Category: ${catDisplay.icon} ${catDisplay.displayName}`));

  // Version info
  if (meta?.sinceVersion) {
    lines.push(chalk.gray(`Available since: v${meta.sinceVersion}`));
  }

  lines.push('');

  return lines.join('\n');
}

/**
 * Generate full command reference
 */
function generateFullReference(): string {
  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold.cyan('═'.repeat(60)));
  lines.push(chalk.bold.white('        GeminiHydra CLI - Complete Command Reference'));
  lines.push(chalk.bold.cyan('═'.repeat(60)));
  lines.push('');

  const sortedCategories = Array.from(categoryConfig.values())
    .sort((a, b) => a.order - b.order);

  for (const cat of sortedCategories) {
    const commands = commandRegistry.getByCategory(cat.name);
    if (commands.length === 0) continue;

    lines.push(chalk.bold.yellow(`\n${cat.icon} ${cat.displayName}`));
    lines.push(chalk.gray(`   ${cat.description}`));
    lines.push(chalk.gray('─'.repeat(50)));

    for (const cmd of commands) {
      const aliases = cmd.aliases.length > 0
        ? chalk.gray(` [${cmd.aliases.join(', ')}]`)
        : '';

      lines.push(`  ${chalk.yellow(`/${cmd.name}`.padEnd(20))} ${truncate(cmd.description, 35)}${aliases}`);
    }
  }

  // Summary
  const totalCommands = commandRegistry.getAll().length;
  const totalCategories = commandRegistry.getCategories().length;

  lines.push('');
  lines.push(chalk.gray('─'.repeat(60)));
  lines.push(chalk.gray(`Total: ${totalCommands} commands in ${totalCategories} categories`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate category-specific help
 */
function generateCategoryHelp(categoryName: string): string {
  const cat = getCategoryDisplay(categoryName);
  const commands = commandRegistry.getByCategory(categoryName);

  if (commands.length === 0) {
    // Try to find similar category
    const categories = commandRegistry.getCategories();
    const similar = categories.filter(c =>
      c.toLowerCase().includes(categoryName.toLowerCase()) ||
      categoryName.toLowerCase().includes(c.toLowerCase())
    );

    if (similar.length > 0) {
      return chalk.yellow(`\nCategory "${categoryName}" not found.\n`) +
             chalk.gray(`Did you mean: ${similar.map(s => chalk.cyan(s)).join(', ')}?`);
    }

    return chalk.yellow(`\nCategory "${categoryName}" not found.\n`) +
           chalk.gray(`Available categories: ${categories.join(', ')}`);
  }

  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold.cyan(`╭${'─'.repeat(58)}╮`));
  lines.push(chalk.bold.cyan('│') + chalk.bold.white(` ${cat.icon} ${cat.displayName}`.padEnd(58)) + chalk.bold.cyan('│'));
  lines.push(chalk.bold.cyan(`╰${'─'.repeat(58)}╯`));
  lines.push('');

  if (cat.description) {
    lines.push(chalk.gray(cat.description));
    lines.push('');
  }

  lines.push(chalk.bold.white('Commands:'));
  lines.push('');

  for (const cmd of commands) {
    const meta = helpMetaRegistry.get(cmd.name);
    const deprecated = meta?.deprecated ? chalk.yellow(' [DEPRECATED]') : '';
    const aliases = cmd.aliases.length > 0
      ? chalk.gray(` (${cmd.aliases.join(', ')})`)
      : '';

    lines.push(`  ${chalk.yellow(`/${cmd.name}`.padEnd(18))} ${cmd.description}${deprecated}`);

    if (cmd.usage) {
      lines.push(`  ${' '.repeat(18)} ${chalk.gray(`Usage: /${cmd.name} ${cmd.usage}`)}`);
    }

    if (aliases) {
      lines.push(`  ${' '.repeat(18)} ${chalk.gray(`Aliases:${aliases}`)}`);
    }

    lines.push('');
  }

  lines.push(chalk.gray('─'.repeat(60)));
  lines.push(chalk.gray(`Use ${chalk.white(`/help <command>`)} for detailed help on each command`));
  lines.push('');

  return lines.join('\n');
}

/**
 * Search help content
 */
function searchHelp(query: string): string {
  const lowerQuery = query.toLowerCase();
  const results: Array<{ cmd: Command; score: number; matches: string[] }> = [];

  for (const cmd of commandRegistry.getAll()) {
    let score = 0;
    const matches: string[] = [];

    // Check command name
    if (cmd.name.toLowerCase().includes(lowerQuery)) {
      score += 10;
      matches.push('name');
    }

    // Check aliases
    if (cmd.aliases.some(a => a.toLowerCase().includes(lowerQuery))) {
      score += 8;
      matches.push('alias');
    }

    // Check description
    if (cmd.description.toLowerCase().includes(lowerQuery)) {
      score += 5;
      matches.push('description');
    }

    // Check category
    if (cmd.category?.toLowerCase().includes(lowerQuery)) {
      score += 3;
      matches.push('category');
    }

    // Check subcommands
    if (cmd.subcommands) {
      for (const [subName, subcmd] of cmd.subcommands) {
        if (subName.toLowerCase().includes(lowerQuery) ||
            subcmd.description.toLowerCase().includes(lowerQuery)) {
          score += 4;
          matches.push(`subcommand:${subName}`);
        }
      }
    }

    // Check extended metadata
    const meta = helpMetaRegistry.get(cmd.name);
    if (meta) {
      if (meta.examples?.some(e =>
        e.command.toLowerCase().includes(lowerQuery) ||
        e.description.toLowerCase().includes(lowerQuery)
      )) {
        score += 2;
        matches.push('examples');
      }

      if (meta.notes?.some(n => n.toLowerCase().includes(lowerQuery))) {
        score += 2;
        matches.push('notes');
      }
    }

    if (score > 0) {
      results.push({ cmd, score, matches });
    }
  }

  // Sort by score
  results.sort((a, b) => b.score - a.score);

  if (results.length === 0) {
    return chalk.yellow(`\nNo results found for: "${query}"\n\n`) +
           chalk.gray('Tips:\n') +
           chalk.gray('  - Try broader search terms\n') +
           chalk.gray('  - Use /help --all to browse all commands\n') +
           chalk.gray('  - Use /help --category <name> to browse by category');
  }

  const lines: string[] = [];

  lines.push('');
  lines.push(chalk.bold.cyan(`Search Results for: "${query}"`));
  lines.push(chalk.gray('─'.repeat(50)));
  lines.push('');

  for (const { cmd, score, matches } of results.slice(0, 15)) {
    const matchInfo = chalk.gray(`[${matches.join(', ')}]`);
    const highlighted = highlightMatch(cmd.description, query);

    lines.push(`  ${chalk.yellow(`/${cmd.name}`.padEnd(18))} ${highlighted}`);
    lines.push(`  ${' '.repeat(18)} ${matchInfo}`);
    lines.push('');
  }

  if (results.length > 15) {
    lines.push(chalk.gray(`  ...and ${results.length - 15} more results`));
  }

  lines.push('');
  lines.push(chalk.gray(`Use ${chalk.white(`/help <command>`)} for detailed information`));
  lines.push('');

  return lines.join('\n');
}

// ============================================================
// Interactive Help Browser
// ============================================================

/**
 * Run interactive help browser
 */
async function runInteractiveHelp(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const categories = commandRegistry.getCategories()
    .map(c => getCategoryDisplay(c))
    .sort((a, b) => a.order - b.order);

  let running = true;

  const showMenu = () => {
    console.clear();
    console.log(chalk.bold.cyan('\n╔════════════════════════════════════════════════════════════╗'));
    console.log(chalk.bold.cyan('║') + chalk.bold.white('         Interactive Help Browser                          ') + chalk.bold.cyan('║'));
    console.log(chalk.bold.cyan('╚════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.bold.white('Navigation:'));
    console.log(chalk.gray('  [number] - Select category'));
    console.log(chalk.gray('  [name]   - View command help'));
    console.log(chalk.gray('  s <text> - Search'));
    console.log(chalk.gray('  q        - Quit\n'));

    console.log(chalk.bold.white('Categories:\n'));

    categories.forEach((cat, i) => {
      const cmdCount = commandRegistry.getByCategory(cat.name).length;
      if (cmdCount > 0) {
        console.log(`  ${chalk.cyan((i + 1).toString().padStart(2))}. ${cat.icon} ${cat.displayName} ${chalk.gray(`(${cmdCount})`)}`);
      }
    });

    console.log('');
  };

  const showCategory = (cat: CategoryConfig) => {
    console.clear();
    console.log(generateCategoryHelp(cat.name));
    console.log(chalk.gray('\nPress Enter to go back, or type a command name for details...'));
  };

  const prompt = (): Promise<string> => {
    return new Promise((resolve) => {
      rl.question(chalk.cyan('\n> '), (answer) => {
        resolve(answer.trim());
      });
    });
  };

  showMenu();

  while (running) {
    const input = await prompt();

    if (input === 'q' || input === 'quit' || input === 'exit') {
      running = false;
      break;
    }

    if (input === '' || input === 'menu' || input === 'm') {
      showMenu();
      continue;
    }

    // Search
    if (input.startsWith('s ') || input.startsWith('search ')) {
      const query = input.replace(/^(s|search)\s+/, '');
      console.clear();
      console.log(searchHelp(query));
      continue;
    }

    // Category by number
    const num = parseInt(input);
    if (!isNaN(num) && num >= 1 && num <= categories.length) {
      const cat = categories[num - 1];
      showCategory(cat);
      continue;
    }

    // Command by name
    const cmdName = input.replace(/^\//, '');
    if (commandRegistry.has(cmdName)) {
      console.clear();
      console.log(generateCommandHelp(cmdName));
      continue;
    }

    // Category by name
    const matchedCat = categories.find(c =>
      c.name.toLowerCase() === input.toLowerCase() ||
      c.displayName.toLowerCase() === input.toLowerCase()
    );

    if (matchedCat) {
      showCategory(matchedCat);
      continue;
    }

    // Try search
    console.clear();
    console.log(searchHelp(input));
  }

  rl.close();
  console.log(chalk.gray('\nExited help browser.\n'));
}

// ============================================================
// Export Functions
// ============================================================

/**
 * Export help to markdown format
 */
function exportToMarkdown(): string {
  const lines: string[] = [];

  lines.push('# GeminiHydra CLI Command Reference\n');
  lines.push('> Auto-generated help documentation\n');
  lines.push(`> Generated: ${new Date().toISOString()}\n`);
  lines.push('---\n');

  // Table of contents
  lines.push('## Table of Contents\n');

  const sortedCategories = Array.from(categoryConfig.values())
    .sort((a, b) => a.order - b.order);

  for (const cat of sortedCategories) {
    const commands = commandRegistry.getByCategory(cat.name);
    if (commands.length > 0) {
      const anchor = cat.name.toLowerCase().replace(/\s+/g, '-');
      lines.push(`- [${cat.icon} ${cat.displayName}](#${anchor})`);
    }
  }

  lines.push('\n---\n');

  // Commands by category
  for (const cat of sortedCategories) {
    const commands = commandRegistry.getByCategory(cat.name);
    if (commands.length === 0) continue;

    lines.push(`## ${cat.icon} ${cat.displayName}\n`);

    if (cat.description) {
      lines.push(`${cat.description}\n`);
    }

    for (const cmd of commands) {
      const meta = helpMetaRegistry.get(cmd.name);

      lines.push(`### \`/${cmd.name}\`\n`);

      if (meta?.deprecated) {
        lines.push(`> ⚠️ **DEPRECATED**: ${meta.deprecatedMessage || 'This command is deprecated'}\n`);
      }

      lines.push(`${cmd.description}\n`);

      // Usage
      lines.push('**Usage:**');
      lines.push('```');
      lines.push(formatSignature(cmd));
      lines.push('```\n');

      // Arguments
      if (cmd.args && cmd.args.length > 0) {
        lines.push('**Arguments:**\n');
        lines.push('| Name | Type | Required | Default | Description |');
        lines.push('|------|------|----------|---------|-------------|');

        for (const arg of cmd.args) {
          const required = arg.required ? 'Yes' : 'No';
          const defaultVal = arg.default !== undefined ? `\`${arg.default}\`` : '-';
          const type = arg.type || 'string';
          lines.push(`| \`${arg.name}\` | ${type} | ${required} | ${defaultVal} | ${arg.description} |`);
        }
        lines.push('');
      }

      // Aliases
      if (cmd.aliases && cmd.aliases.length > 0) {
        lines.push(`**Aliases:** ${cmd.aliases.map(a => `\`/${a}\``).join(', ')}\n`);
      }

      // Subcommands
      if (cmd.subcommands && cmd.subcommands.size > 0) {
        lines.push('**Subcommands:**\n');
        lines.push('| Subcommand | Description |');
        lines.push('|------------|-------------|');

        for (const [name, subcmd] of cmd.subcommands) {
          lines.push(`| \`${name}\` | ${subcmd.description} |`);
        }
        lines.push('');
      }

      // Examples
      if (meta?.examples && meta.examples.length > 0) {
        lines.push('**Examples:**\n');
        for (const ex of meta.examples) {
          lines.push('```bash');
          lines.push(`# ${ex.description}`);
          lines.push(ex.command);
          if (ex.output) {
            lines.push(`# Output: ${ex.output}`);
          }
          lines.push('```\n');
        }
      }

      // Notes
      if (meta?.notes && meta.notes.length > 0) {
        lines.push('**Notes:**\n');
        for (const note of meta.notes) {
          lines.push(`- ${note}`);
        }
        lines.push('');
      }

      // See also
      if (meta?.seeAlso && meta.seeAlso.length > 0) {
        lines.push(`**See Also:** ${meta.seeAlso.map(s => `[\`/${s}\`](#${s})`).join(', ')}\n`);
      }

      lines.push('---\n');
    }
  }

  // Footer
  const totalCommands = commandRegistry.getAll().length;
  lines.push(`\n*Total: ${totalCommands} commands*\n`);

  return lines.join('\n');
}

/**
 * Export help to JSON format
 */
function exportToJSON(): string {
  const data: any = {
    generated: new Date().toISOString(),
    categories: {},
    commands: {}
  };

  for (const cat of categoryConfig.values()) {
    const commands = commandRegistry.getByCategory(cat.name);
    if (commands.length > 0) {
      data.categories[cat.name] = {
        displayName: cat.displayName,
        description: cat.description,
        icon: cat.icon,
        commandCount: commands.length
      };
    }
  }

  for (const cmd of commandRegistry.getAll()) {
    const meta = helpMetaRegistry.get(cmd.name);

    data.commands[cmd.name] = {
      name: cmd.name,
      description: cmd.description,
      usage: cmd.usage,
      category: cmd.category,
      aliases: cmd.aliases,
      args: cmd.args,
      subcommands: cmd.subcommands ? Object.fromEntries(cmd.subcommands) : undefined,
      examples: meta?.examples,
      notes: meta?.notes,
      seeAlso: meta?.seeAlso,
      deprecated: meta?.deprecated,
      deprecatedMessage: meta?.deprecatedMessage
    };
  }

  return JSON.stringify(data, null, 2);
}

// ============================================================
// Main Help Handler
// ============================================================

/**
 * Main help command handler
 */
async function helpHandler(ctx: CommandContext): Promise<CommandResult> {
  const { positional, flags } = parseArgs(ctx.args);

  // Interactive mode
  if (getBooleanFlag(flags, 'interactive', 'i')) {
    await runInteractiveHelp();
    return success(null, 'Interactive help session ended');
  }

  // Export to file
  if (getBooleanFlag(flags, 'export', 'e') || getStringFlag(flags, 'export')) {
    const format = getStringFlag(flags, 'format', 'f') || 'markdown';
    const filename = typeof flags.export === 'string'
      ? flags.export
      : getStringFlag(flags, 'output', 'o') || `help-reference.${format === 'json' ? 'json' : 'md'}`;

    let content: string;
    if (format === 'json') {
      content = exportToJSON();
    } else {
      content = exportToMarkdown();
    }

    try {
      const outputPath = path.resolve(ctx.cwd, filename);
      await fs.writeFile(outputPath, content, 'utf-8');
      return success({ path: outputPath, format }, `Help exported to: ${outputPath}`);
    } catch (err: any) {
      return error(`Failed to export help: ${err.message}`);
    }
  }

  // Show all commands
  if (getBooleanFlag(flags, 'all', 'a')) {
    console.log(generateFullReference());
    return success(null, 'Full reference displayed');
  }

  // Search
  const searchQuery = getStringFlag(flags, 'search', 's');
  if (searchQuery) {
    console.log(searchHelp(searchQuery));
    return success(null, 'Search results displayed');
  }

  // Category help
  const category = getStringFlag(flags, 'category', 'c');
  if (category) {
    console.log(generateCategoryHelp(category));
    return success(null, 'Category help displayed');
  }

  // Specific command help
  if (positional.length > 0) {
    const cmdName = positional[0].replace(/^\//, '');
    console.log(generateCommandHelp(cmdName));
    return success(null, 'Command help displayed');
  }

  // General overview
  console.log(generateOverview());
  return success(null, 'Help overview displayed');
}

// ============================================================
// Command Registration
// ============================================================

/**
 * Register help command and initialize default metadata
 */
export function registerHelpCommand(): void {
  commandRegistry.register({
    name: 'help',
    aliases: ['?', 'h'],
    description: 'Show help information',
    usage: '[command] [--all] [--category <name>] [--search <query>] [--interactive] [--export]',
    category: 'general',
    args: [
      {
        name: 'command',
        description: 'Command name to get help for',
        required: false
      }
    ],
    handler: helpHandler
  });

  // Register help metadata for common commands
  initializeHelpMetadata();

  console.log(chalk.gray('[CLI] Help system registered'));
}

/**
 * Helper function to register examples for any command
 * Can be called from command files to add examples dynamically
 */
export function addCommandExamples(commandName: string, examples: CommandExample[]): void {
  const existing = helpMetaRegistry.get(commandName);
  if (existing?.examples) {
    helpMetaRegistry.register(commandName, {
      examples: [...existing.examples, ...examples]
    });
  } else {
    helpMetaRegistry.register(commandName, { examples });
  }
}

/**
 * Helper function to add notes for any command
 */
export function addCommandNotes(commandName: string, notes: string[]): void {
  const existing = helpMetaRegistry.get(commandName);
  if (existing?.notes) {
    helpMetaRegistry.register(commandName, {
      notes: [...existing.notes, ...notes]
    });
  } else {
    helpMetaRegistry.register(commandName, { notes });
  }
}

/**
 * Helper function to set see also references
 */
export function setCommandSeeAlso(commandName: string, seeAlso: string[]): void {
  helpMetaRegistry.register(commandName, { seeAlso });
}

/**
 * Mark a command as deprecated
 */
export function deprecateCommand(commandName: string, message?: string): void {
  helpMetaRegistry.register(commandName, {
    deprecated: true,
    deprecatedMessage: message || 'This command is deprecated and may be removed in future versions'
  });
}

/**
 * Initialize default help metadata for commands
 */
function initializeHelpMetadata(): void {
  // Help command examples
  helpMetaRegistry.register('help', {
    examples: [
      { command: '/help', description: 'Show general help overview' },
      { command: '/help sessions', description: 'Get help for sessions command' },
      { command: '/help --all', description: 'List all available commands' },
      { command: '/help --category ai', description: 'Show AI-related commands' },
      { command: '/help --search file', description: 'Search for file-related commands' },
      { command: '/help --interactive', description: 'Open interactive help browser' },
      { command: '/help --export docs/commands.md', description: 'Export help to markdown file' }
    ],
    notes: [
      'Use Tab for command autocompletion',
      'Commands starting with / are CLI commands',
      'Regular text is sent to the AI model'
    ],
    seeAlso: ['sessions', 'history', 'fs', 'shell']
  });

  // Sessions command examples
  helpMetaRegistry.register('sessions', {
    examples: [
      { command: '/sessions list', description: 'List all chat sessions' },
      { command: '/sessions new "My Project"', description: 'Create new named session' },
      { command: '/sessions switch abc123', description: 'Switch to session by ID' },
      { command: '/sessions branch "experiment"', description: 'Fork current session' },
      { command: '/sessions export --format json', description: 'Export session to JSON' }
    ],
    notes: [
      'Sessions are automatically saved',
      'Use /resume to quickly continue last session'
    ],
    seeAlso: ['history', 'resume']
  });

  // File system command examples
  helpMetaRegistry.register('fs', {
    examples: [
      { command: '/fs read src/index.ts', description: 'Read file contents' },
      { command: '/fs ls src --recursive', description: 'List directory recursively' },
      { command: '/fs write output.txt "Hello World"', description: 'Write to file' },
      { command: '/fs diagnose path/to/file', description: 'Diagnose path issues' },
      { command: '/fs encoding file.txt', description: 'Detect file encoding' }
    ],
    notes: [
      'Use --force to write to readonly files',
      'Use --encoding to specify file encoding',
      'Path diagnostics help troubleshoot access issues'
    ],
    seeAlso: ['shell', 'search']
  });

  // Shell command examples
  helpMetaRegistry.register('shell', {
    examples: [
      { command: '/shell run npm install', description: 'Run npm install' },
      { command: '/shell bg npm run dev', description: 'Start dev server in background' },
      { command: '/shell ps', description: 'List running processes' },
      { command: '/shell kill 1234', description: 'Kill process by PID' },
      { command: '/shell sysinfo', description: 'Show system information' }
    ],
    notes: [
      'Background processes continue after command returns',
      'Use /shell output <pid> to get process output'
    ],
    seeAlso: ['fs', 'native']
  });

  // Search command examples
  helpMetaRegistry.register('search', {
    examples: [
      { command: '/search grep "TODO" "**/*.ts"', description: 'Search for TODO comments' },
      { command: '/search symbol useState', description: 'Find symbol definitions' },
      { command: '/search file app', description: 'Fuzzy find files' },
      { command: '/search refs handleClick', description: 'Find references to function' }
    ],
    notes: [
      'grep search is text-based',
      'For LSP-powered semantic search, use /serena search'
    ],
    seeAlso: ['fs', 'serena', 'grep']
  });

  // Memory command examples
  helpMetaRegistry.register('mem', {
    examples: [
      { command: '/mem set api_key sk-xxx', description: 'Store a value' },
      { command: '/mem get api_key', description: 'Retrieve a value' },
      { command: '/mem entity User class', description: 'Create entity' },
      { command: '/mem observe User "Has email field"', description: 'Add observation' },
      { command: '/mem relate User uses Database', description: 'Create relation' }
    ],
    notes: [
      'Memory is persisted across sessions',
      'Use /mem save to force save to disk'
    ],
    seeAlso: ['context', 'analyze']
  });

  // History command examples
  helpMetaRegistry.register('history', {
    examples: [
      { command: '/history show 20', description: 'Show last 20 messages' },
      { command: '/history search "error"', description: 'Search in history' },
      { command: '/history stats', description: 'Show session statistics' }
    ],
    seeAlso: ['sessions', 'resume']
  });

  // Resume command
  helpMetaRegistry.register('resume', {
    examples: [
      { command: '/resume', description: 'Resume last session' },
      { command: '/resume abc123', description: 'Resume specific session' }
    ],
    seeAlso: ['sessions', 'history']
  });

  // Ollama commands
  helpMetaRegistry.register('ollama', {
    examples: [
      { command: '/ollama', description: 'Show Ollama status' },
      { command: '/ollama-restart', description: 'Restart Ollama server' },
      { command: '/ollama-monitor start', description: 'Start health monitoring' }
    ],
    notes: [
      'Ollama provides local AI model inference',
      'Health monitoring auto-restarts on failures'
    ],
    seeAlso: ['ollama-restart', 'ollama-monitor']
  });

  // Command diagnostics
  helpMetaRegistry.register('cmd', {
    examples: [
      { command: '/cmd list', description: 'List all commands' },
      { command: '/cmd list session', description: 'List session commands' },
      { command: '/cmd info fs', description: 'Show detailed info for /fs command' },
      { command: '/cmd diagnostics', description: 'Run full diagnostics' },
      { command: '/cmd diag validate', description: 'Validate registry consistency' },
      { command: '/cmd diag stats', description: 'Show command statistics' }
    ],
    notes: [
      'Use diagnostics to find issues with command registration',
      'Useful for debugging alias conflicts'
    ],
    seeAlso: ['help']
  });

  // Native command
  helpMetaRegistry.register('native', {
    examples: [
      { command: '/native init', description: 'Initialize native tools for current directory' },
      { command: '/native init /path/to/project', description: 'Initialize for specific directory' },
      { command: '/native status', description: 'Show native tools status' },
      { command: '/native shutdown', description: 'Cleanup and shutdown tools' }
    ],
    notes: [
      'Native tools must be initialized before using /fs, /shell, /search, /mem',
      'Tools are initialized automatically on first use'
    ],
    seeAlso: ['fs', 'shell', 'search', 'mem']
  });

  // Grep command
  helpMetaRegistry.register('grep', {
    examples: [
      { command: '/grep "TODO"', description: 'Find all TODO comments' },
      { command: '/grep "import.*React" "**/*.tsx"', description: 'Find React imports in TSX files' },
      { command: '/grep "function" "src/**/*.ts"', description: 'Find functions in source files' }
    ],
    notes: [
      'Uses ripgrep for fast searching when available',
      'Supports glob patterns for file filtering',
      'For semantic code search, use /serena search'
    ],
    seeAlso: ['search', 'fs search', 'serena']
  });

  // Serena commands
  helpMetaRegistry.register('serena', {
    examples: [
      { command: '/serena status', description: 'Show Serena connection status' },
      { command: '/serena symbols', description: 'List all symbols in project' },
      { command: '/serena search "handleClick"', description: 'Semantic search for symbol' },
      { command: '/serena refs useState', description: 'Find all references to useState' },
      { command: '/serena definition App', description: 'Go to definition of App' }
    ],
    notes: [
      'Serena provides LSP-powered code intelligence',
      'Requires Language Server Protocol support for your language',
      'Much more accurate than text-based search for code'
    ],
    seeAlso: ['search', 'analyze', 'context']
  });

  // Context command
  helpMetaRegistry.register('context', {
    examples: [
      { command: '/context show', description: 'Show current context' },
      { command: '/context add src/App.tsx', description: 'Add file to context' },
      { command: '/context clear', description: 'Clear all context' },
      { command: '/context files', description: 'List files in context' }
    ],
    notes: [
      'Context helps the AI understand your codebase better',
      'Add relevant files before asking about specific code'
    ],
    seeAlso: ['analyze', 'memory']
  });

  // Analyze command
  helpMetaRegistry.register('analyze', {
    examples: [
      { command: '/analyze', description: 'Analyze current directory' },
      { command: '/analyze src/', description: 'Analyze specific directory' },
      { command: '/analyze --deep', description: 'Run deep analysis' },
      { command: '/analyze --refresh', description: 'Refresh analysis cache' }
    ],
    notes: [
      'Creates a knowledge graph of your codebase',
      'Analysis results are cached for performance',
      'Use --refresh to update after code changes'
    ],
    seeAlso: ['context', 'memory', 'serena']
  });

  // MCP status command
  helpMetaRegistry.register('mcpstatus', {
    examples: [
      { command: '/mcpstatus', description: 'Show all MCP server status' },
      { command: '/mcp', description: 'Alias for /mcpstatus' }
    ],
    notes: [
      'Most MCP servers have native replacements',
      'Use /fs, /shell, /search, /mem for native operations'
    ],
    seeAlso: ['ollama', 'serena', 'native']
  });
}

// ============================================================
// Exports
// ============================================================

export {
  generateOverview,
  generateCommandHelp,
  generateFullReference,
  generateCategoryHelp,
  searchHelp,
  exportToMarkdown,
  exportToJSON,
  runInteractiveHelp,
  helpHandler,
  categoryConfig,
  getCategoryDisplay,
  formatSignature,
  formatArg
};

export default {
  registerHelpCommand,
  helpMetaRegistry,
  categoryConfig
};
