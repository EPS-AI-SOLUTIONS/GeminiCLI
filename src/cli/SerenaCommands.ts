/**
 * SerenaCommands - CLI commands for code intelligence (Native Implementation)
 *
 * Commands:
 * - /serena status     - Show code intelligence status
 * - /serena activate   - Activate project
 * - /serena find       - Find symbol (LSP-powered)
 * - /serena search     - LSP-powered symbol/code search (uses language server)
 * - /serena memory     - Manage memories
 * - /code <pattern>    - Quick symbol search (alias for /serena find)
 *
 * NOTE: This is now backed by NativeCodeIntelligence instead of Serena MCP.
 *
 * IMPORTANT - Search command distinction:
 * - /serena search = LSP-powered symbol/code search (uses language server for semantic search)
 * - /fs search = Simple grep-like text search (plain text pattern matching)
 * - /grep = Alias for /fs search (simple text search, NOT LSP)
 */

import * as path from 'node:path';
import chalk from 'chalk';
import { nativeCodeIntelligence } from '../native/NativeCodeIntelligence.js';
import { nativeLSP } from '../native/NativeLSP.js';
import { createFailedMessage } from '../utils/errorHandling.js';
import { box, truncate } from './CommandHelpers.js';
import { type CommandResult, commandRegistry, error, success } from './CommandRegistry.js';

// ============================================================
// Command Handlers
// ============================================================

/**
 * Show code intelligence status
 */
async function handleStatus(): Promise<CommandResult> {
  if (!nativeCodeIntelligence.isInitialized()) {
    return error('Code intelligence not initialized. Use /serena activate <project-path>');
  }

  const project = nativeCodeIntelligence.getProjectInfo();
  const runningClients = nativeLSP.getRunningClients();
  const availableServers = nativeLSP.getAvailableServers();

  const lines: string[] = [];
  lines.push(chalk.cyan('=== Code Intelligence Status (Native) ==='));
  lines.push('');

  lines.push(chalk.green(`Project: ${project.name}`));
  lines.push(chalk.gray(`  Path: ${project.rootDir}`));
  lines.push('');

  lines.push(chalk.cyan('LSP Servers:'));
  for (const server of availableServers) {
    const isRunning = runningClients.includes(server.languages[0]);
    const status = isRunning ? chalk.green('[RUNNING]') : chalk.gray('[available]');
    lines.push(`  ${status} ${server.name}`);
    lines.push(chalk.gray(`    Languages: ${server.languages.join(', ')}`));
  }

  // Show memories
  const memories = await nativeCodeIntelligence.listMemories();
  if (memories.length > 0) {
    lines.push('');
    lines.push(chalk.cyan('Project Memories:'));
    for (const mem of memories) {
      lines.push(chalk.gray(`  - ${mem.key}`));
    }
  }

  console.log(lines.join('\n'));
  return success(project);
}

/**
 * Activate a project
 */
async function handleActivate(args: string[]): Promise<CommandResult> {
  const projectPath = args[0] || process.cwd();

  const fullPath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(process.cwd(), projectPath);

  try {
    await nativeCodeIntelligence.init(fullPath);

    const project = nativeCodeIntelligence.getProjectInfo();
    console.log(chalk.green(`✓ Project activated: ${project.name}`));
    console.log(chalk.gray(`  Path: ${project.rootDir}`));

    return success(project);
  } catch (err) {
    return error(createFailedMessage('activate project', err));
  }
}

/**
 * Find symbol in codebase
 */
async function handleFindSymbol(args: string[]): Promise<CommandResult> {
  const pattern = args.join(' ');

  if (!pattern) {
    return error('Usage: /serena find <symbol-pattern> or /code <symbol-pattern>');
  }

  if (!nativeCodeIntelligence.isInitialized()) {
    // Auto-initialize with current directory
    await nativeCodeIntelligence.init(process.cwd());
  }

  console.log(chalk.cyan(`Searching for symbol: ${pattern}...`));

  const symbols = await nativeCodeIntelligence.findSymbol(pattern);

  if (!symbols || symbols.length === 0) {
    console.log(chalk.yellow('No symbols found'));
    return success([]);
  }

  console.log(chalk.green(`\nFound ${symbols.length} symbol(s):\n`));

  for (const sym of symbols.slice(0, 20)) {
    const kindColor = getKindColor(sym.kind.toString());
    const filePath = nativeLSP.uriToPath(sym.location.uri);
    const relativePath = path.relative(process.cwd(), filePath);
    const line = sym.location.range.start.line + 1;

    console.log(`  ${kindColor(getSymbolKindName(sym.kind).padEnd(12))} ${chalk.white(sym.name)}`);
    console.log(chalk.gray(`    ${relativePath}:${line}`));
  }

  if (symbols.length > 20) {
    console.log(chalk.gray(`\n  ... and ${symbols.length - 20} more`));
  }

  return success(symbols);
}

/**
 * Search pattern in codebase
 */
async function handleSearch(args: string[]): Promise<CommandResult> {
  const pattern = args.join(' ');

  if (!pattern) {
    return error('Usage: /serena search <pattern>');
  }

  if (!nativeCodeIntelligence.isInitialized()) {
    await nativeCodeIntelligence.init(process.cwd());
  }

  console.log(chalk.cyan(`Searching for: ${pattern}...`));

  const results = await nativeCodeIntelligence.searchPattern(pattern, {
    maxResults: 50,
  });

  if (!results || results.length === 0) {
    console.log(chalk.yellow('No matches found'));
    return success([]);
  }

  // Group by file
  const byFile = new Map<string, typeof results>();
  for (const result of results) {
    const existing = byFile.get(result.file) || [];
    existing.push(result);
    byFile.set(result.file, existing);
  }

  console.log(chalk.green(`\nFound ${results.length} matches in ${byFile.size} file(s):\n`));

  let fileCount = 0;
  for (const [file, matches] of byFile) {
    if (fileCount >= 10) break;
    fileCount++;

    console.log(chalk.cyan(`  ${file}`));
    for (const match of matches.slice(0, 3)) {
      console.log(chalk.gray(`    ${match.line}: ${truncate(match.text, 80)}`));
    }
    if (matches.length > 3) {
      console.log(chalk.gray(`    ... +${matches.length - 3} more matches`));
    }
    console.log('');
  }

  if (byFile.size > 10) {
    console.log(chalk.gray(`... and ${byFile.size - 10} more files`));
  }

  return success(results);
}

/**
 * List directory
 */
async function handleList(args: string[]): Promise<CommandResult> {
  const relativePath = args[0] || '.';

  if (!nativeCodeIntelligence.isInitialized()) {
    await nativeCodeIntelligence.init(process.cwd());
  }

  try {
    const entries = await nativeCodeIntelligence.listDir(relativePath);

    const dirs = entries.filter((e) => e.type === 'directory').map((e) => e.name);
    const files = entries.filter((e) => e.type === 'file').map((e) => e.name);

    console.log(chalk.cyan(`\nDirectory: ${relativePath}\n`));

    if (dirs.length > 0) {
      console.log(chalk.yellow('Directories:'));
      for (const dir of dirs.slice(0, 30)) {
        console.log(chalk.blue(`  📁 ${dir}`));
      }
      if (dirs.length > 30) {
        console.log(chalk.gray(`  ... +${dirs.length - 30} more`));
      }
    }

    if (files.length > 0) {
      console.log(chalk.yellow('\nFiles:'));
      for (const file of files.slice(0, 50)) {
        console.log(chalk.white(`  📄 ${file}`));
      }
      if (files.length > 50) {
        console.log(chalk.gray(`  ... +${files.length - 50} more`));
      }
    }

    console.log(chalk.gray(`\nTotal: ${dirs.length} dirs, ${files.length} files`));

    return success({ dirs, files });
  } catch (err) {
    return error(createFailedMessage('list directory', err));
  }
}

/**
 * Memory operations
 */
async function handleMemory(args: string[]): Promise<CommandResult> {
  const subcommand = args[0];

  if (!nativeCodeIntelligence.isInitialized()) {
    await nativeCodeIntelligence.init(process.cwd());
  }

  switch (subcommand) {
    case 'list':
    case 'ls': {
      const memories = await nativeCodeIntelligence.listMemories();
      console.log(chalk.cyan('\nProject Memories:\n'));
      if (memories.length === 0) {
        console.log(chalk.gray('  (no memories)'));
      } else {
        for (const mem of memories) {
          console.log(chalk.white(`  - ${mem.key}`));
          console.log(chalk.gray(`      Updated: ${mem.updatedAt.toLocaleString()}`));
        }
      }
      return success(memories);
    }

    case 'read':
    case 'get': {
      const name = args[1];
      if (!name) {
        return error('Usage: /serena memory read <name>');
      }
      const content = await nativeCodeIntelligence.readMemory(name);
      if (!content) {
        return error(`Memory not found: ${name}`);
      }
      console.log(chalk.cyan(`\nMemory: ${name}\n`));
      console.log(box(content, name));
      return success({ name, content });
    }

    case 'write':
    case 'set': {
      const name = args[1];
      const content = args.slice(2).join(' ');
      if (!name || !content) {
        return error('Usage: /serena memory write <name> <content>');
      }
      await nativeCodeIntelligence.writeMemory(name, content);
      console.log(chalk.green(`✓ Memory '${name}' saved`));
      return success({ name, content });
    }

    case 'delete':
    case 'rm': {
      const name = args[1];
      if (!name) {
        return error('Usage: /serena memory delete <name>');
      }
      const deleted = await nativeCodeIntelligence.deleteMemory(name);
      if (deleted) {
        console.log(chalk.yellow(`✓ Memory '${name}' deleted`));
        return success({ name });
      }
      return error(`Memory not found: ${name}`);
    }

    default:
      console.log(chalk.cyan('Memory Commands:'));
      console.log(chalk.gray('  /serena memory list          - List all memories'));
      console.log(chalk.gray('  /serena memory read <name>   - Read a memory'));
      console.log(chalk.gray('  /serena memory write <n> <c> - Write a memory'));
      console.log(chalk.gray('  /serena memory delete <name> - Delete a memory'));
      return success(null);
  }
}

/**
 * Get symbols overview for a file
 */
async function handleSymbols(args: string[]): Promise<CommandResult> {
  const relativePath = args[0];

  if (!relativePath) {
    return error('Usage: /serena symbols <file-path>');
  }

  if (!nativeCodeIntelligence.isInitialized()) {
    await nativeCodeIntelligence.init(process.cwd());
  }

  try {
    const overviews = await nativeCodeIntelligence.getSymbolsOverview([relativePath]);

    if (overviews.length === 0) {
      console.log(chalk.yellow('No symbols found in file'));
      return success([]);
    }

    const symbols = overviews[0].symbols;

    console.log(chalk.cyan(`\nSymbols in ${relativePath}:\n`));

    function printSymbols(syms: typeof symbols, indent: number = 0): void {
      for (const sym of syms) {
        const kindColor = getKindColor(sym.kind);
        const prefix = '  '.repeat(indent);
        console.log(
          `${prefix}${kindColor(sym.kind.padEnd(12))} ${chalk.white(sym.name)} ${chalk.gray(`(line ${sym.line})`)}`,
        );
        if (sym.children) {
          printSymbols(sym.children, indent + 1);
        }
      }
    }

    printSymbols(symbols);

    return success(symbols);
  } catch (err) {
    return error(createFailedMessage('get symbols', err));
  }
}

/**
 * Read file
 */
async function handleReadFile(args: string[]): Promise<CommandResult> {
  const relativePath = args[0];

  if (!relativePath) {
    return error('Usage: /serena read <file-path>');
  }

  if (!nativeCodeIntelligence.isInitialized()) {
    await nativeCodeIntelligence.init(process.cwd());
  }

  try {
    const content = await nativeCodeIntelligence.readFile(relativePath);

    console.log(chalk.cyan(`\nFile: ${relativePath}\n`));
    console.log(content);

    return success({ path: relativePath, content });
  } catch (err) {
    return error(createFailedMessage('read file', err));
  }
}

// ============================================================
// Main Command Router
// ============================================================

async function handleSerenaCommand(args: string[]): Promise<CommandResult> {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'status':
    case 'info':
      return handleStatus();

    case 'activate':
    case 'project':
      return handleActivate(args.slice(1));

    case 'find':
    case 'symbol':
      return handleFindSymbol(args.slice(1));

    case 'search':
    case 'grep':
      return handleSearch(args.slice(1));

    case 'list':
    case 'ls':
      return handleList(args.slice(1));

    case 'memory':
    case 'mem':
      return handleMemory(args.slice(1));

    case 'symbols':
    case 'outline':
      return handleSymbols(args.slice(1));

    case 'read':
    case 'cat':
      return handleReadFile(args.slice(1));
    default:
      printHelp();
      return success(null);
  }
}

// ============================================================
// Helper Functions
// ============================================================

function getKindColor(kind: string): (text: string) => string {
  const kindLower = kind.toLowerCase();
  if (kindLower.includes('class')) return chalk.yellow;
  if (kindLower.includes('function') || kindLower.includes('method')) return chalk.cyan;
  if (kindLower.includes('interface')) return chalk.green;
  if (kindLower.includes('variable') || kindLower.includes('const')) return chalk.magenta;
  if (kindLower.includes('type')) return chalk.blue;
  return chalk.white;
}

function getSymbolKindName(kind: number): string {
  const names: Record<number, string> = {
    1: 'File',
    2: 'Module',
    3: 'Namespace',
    4: 'Package',
    5: 'Class',
    6: 'Method',
    7: 'Property',
    8: 'Field',
    9: 'Constructor',
    10: 'Enum',
    11: 'Interface',
    12: 'Function',
    13: 'Variable',
    14: 'Constant',
    15: 'String',
    16: 'Number',
    17: 'Boolean',
    18: 'Array',
    19: 'Object',
    20: 'Key',
    21: 'Null',
    22: 'EnumMember',
    23: 'Struct',
    24: 'Event',
    25: 'Operator',
    26: 'TypeParameter',
  };
  return names[kind] || 'Unknown';
}

function printHelp(): void {
  console.log(chalk.cyan('\n=== Code Intelligence Commands (Native) ===\n'));
  console.log(chalk.yellow('Project:'));
  console.log(chalk.gray('  /serena status              - Show current status'));
  console.log(chalk.gray('  /serena activate [path]     - Activate project'));
  console.log('');
  console.log(chalk.yellow('Code Intelligence:'));
  console.log(chalk.gray('  /serena find <pattern>      - Find symbols by name'));
  console.log(chalk.gray('  /serena search <pattern>    - Search code pattern'));
  console.log(chalk.gray('  /serena symbols <file>      - Show file outline'));
  console.log(chalk.gray('  /code <pattern>             - Quick symbol search'));
  console.log('');
  console.log(chalk.yellow('Files:'));
  console.log(chalk.gray('  /serena list [path]         - List directory'));
  console.log(chalk.gray('  /serena read <file>         - Read file'));
  console.log('');
  console.log(chalk.yellow('Memory:'));
  console.log(chalk.gray('  /serena memory list         - List memories'));
  console.log(chalk.gray('  /serena memory read <name>  - Read memory'));
  console.log(chalk.gray('  /serena memory write <n> <c>- Write memory'));
  console.log('');
  console.log(chalk.gray('NOTE: This now uses native TypeScript implementation instead of MCP.'));
}

// ============================================================
// Register Commands
// ============================================================

export function registerSerenaCommands(): void {
  // Main /serena command
  // NOTE: Removed 's' alias to avoid conflict with /search in NativeCommands.ts
  commandRegistry.register({
    name: 'serena',
    aliases: ['sna', 'ci'],
    description: 'Code intelligence commands (native LSP-powered)',
    usage: '/serena <subcommand> [args]',
    category: 'code',
    handler: async (ctx) => handleSerenaCommand(ctx.args),
  });

  // Quick /code command (alias for /serena find)
  // LSP-powered symbol search - finds definitions using language server
  commandRegistry.register({
    name: 'code',
    aliases: ['c', 'sym'],
    description: 'Quick LSP symbol search (alias for /serena find)',
    usage: '/code <symbol-pattern>',
    category: 'code',
    handler: async (ctx) => handleFindSymbol(ctx.args),
  });

  // NOTE: /grep and /search are registered in NativeCommands.ts as simple text search
  // Use /serena search for LSP-powered semantic code search

  console.log(chalk.gray('[CLI] Code intelligence commands registered (native)'));
}

// ============================================================
// Exports
// ============================================================

export const serenaCommands = {
  status: handleStatus,
  activate: handleActivate,
  find: handleFindSymbol,
  search: handleSearch,
  list: handleList,
  memory: handleMemory,
  symbols: handleSymbols,
  readFile: handleReadFile,
};
