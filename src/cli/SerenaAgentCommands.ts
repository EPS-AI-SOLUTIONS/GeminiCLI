/**
 * SerenaAgentCommands - CLI commands for the REAL Serena MCP agent
 *
 * This is DIFFERENT from SerenaCommands.ts:
 * - SerenaCommands.ts uses NativeCodeIntelligence (deprecated approach)
 * - SerenaAgentCommands.ts uses the REAL Serena MCP server
 *
 * Invocation: @serena <command> [args]
 */

import chalk from 'chalk';
import { serenaAgent } from '../core/SerenaAgent.js';
import type { CommandContext, CommandResult } from './CommandRegistry.js';
import { commandRegistry, error, success } from './CommandRegistry.js';

// ============================================================
// Command Handlers
// ============================================================

/**
 * Show Serena MCP connection status
 */
async function handleStatus(): Promise<CommandResult> {
  const status = serenaAgent.getStatus();

  console.log(chalk.cyan('\n═══════════════════════════════════════════'));
  console.log(chalk.cyan('  SERENA AGENT STATUS (Real MCP Server)'));
  console.log(chalk.cyan('═══════════════════════════════════════════\n'));

  console.log(
    chalk.gray('Connected:    ') + (status.connected ? chalk.green('YES ✓') : chalk.red('NO ✗')),
  );
  console.log(chalk.gray('Server:       ') + chalk.white(status.serverName));
  console.log(chalk.gray('Project Root: ') + chalk.white(status.projectRoot));
  console.log(chalk.gray('Tools:        ') + chalk.white(status.tools.length));

  if (!status.connected) {
    console.log(chalk.yellow('\nTo connect, ensure serena is configured in .mcp.json'));
  } else {
    console.log(chalk.cyan('\nAvailable Serena MCP Tools:'));
    status.tools.forEach((tool) => {
      console.log(chalk.gray(`  • ${tool}`));
    });
  }

  console.log('');
  return success(status);
}

/**
 * Find symbols using LSP
 */
async function handleFind(args: string[]): Promise<CommandResult> {
  const pattern = args.join(' ');
  if (!pattern) {
    console.log(chalk.yellow('Usage: @serena find <symbol-pattern>'));
    console.log(chalk.gray('Example: @serena find Agent'));
    console.log(chalk.gray('Example: @serena find handleInput'));
    return error('Missing symbol pattern');
  }

  console.log(chalk.cyan(`[Serena MCP] Finding symbol: "${pattern}"...\n`));

  try {
    const symbols = await serenaAgent.findSymbol(pattern, {
      includeInfo: true,
      includeBody: false,
    });

    if (!symbols || symbols.length === 0) {
      console.log(chalk.yellow('No symbols found matching pattern'));
      return success([]);
    }

    console.log(chalk.green(`Found ${symbols.length} symbol(s):\n`));

    symbols.forEach((symbol: any, index: number) => {
      console.log(chalk.cyan(`${index + 1}. ${symbol.name || symbol.name_path}`));
      if (symbol.kind) {
        console.log(chalk.gray(`   Kind: ${symbol.kind}`));
      }
      if (symbol.location) {
        const loc = symbol.location;
        console.log(
          chalk.gray(`   Location: ${loc.uri || loc.file}:${loc.range?.start?.line || loc.line}`),
        );
      }
      if (symbol.info) {
        console.log(chalk.gray(`   Info: ${symbol.info.substring(0, 100)}...`));
      }
      console.log('');
    });

    return success(symbols);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * Get file structure/outline
 */
async function handleOverview(args: string[]): Promise<CommandResult> {
  const filePath = args[0];
  if (!filePath) {
    console.log(chalk.yellow('Usage: @serena overview <file-path>'));
    console.log(chalk.gray('Example: @serena overview src/core/Agent.ts'));
    return error('Missing file path');
  }

  console.log(chalk.cyan(`[Serena MCP] Getting symbols overview: ${filePath}...\n`));

  try {
    const overview = await serenaAgent.getSymbolsOverview(filePath);

    if (!overview) {
      console.log(chalk.yellow('No symbols found in file'));
      return success(null);
    }

    console.log(chalk.green(`Symbols in ${filePath}:\n`));
    console.log(JSON.stringify(overview, null, 2));

    return success(overview);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * Search for pattern in code
 */
async function handleSearch(args: string[]): Promise<CommandResult> {
  const pattern = args.join(' ');
  if (!pattern) {
    console.log(chalk.yellow('Usage: @serena search <pattern>'));
    console.log(chalk.gray('Example: @serena search TODO'));
    console.log(chalk.gray('Example: @serena search "async function"'));
    return error('Missing search pattern');
  }

  console.log(chalk.cyan(`[Serena MCP] Searching for: "${pattern}"...\n`));

  try {
    const results = await serenaAgent.searchPattern(pattern, {
      restrictToCode: true,
    });

    if (!results || Object.keys(results).length === 0) {
      console.log(chalk.yellow('No matches found'));
      return success([]);
    }

    // Results are usually grouped by file
    let totalMatches = 0;
    if (typeof results === 'object' && !Array.isArray(results)) {
      for (const [file, matches] of Object.entries(results)) {
        const matchList = matches as any[];
        console.log(chalk.cyan(`\n📁 ${file} (${matchList.length} matches)`));
        matchList.forEach((match: any) => {
          totalMatches++;
          console.log(chalk.gray(`   Line ${match.line}: ${match.text || match.match}`));
        });
      }
    } else if (Array.isArray(results)) {
      totalMatches = results.length;
      results.forEach((match: any) => {
        console.log(chalk.gray(`${match.file}:${match.line}: ${match.text || match.match}`));
      });
    }

    console.log(chalk.green(`\nTotal: ${totalMatches} matches`));
    return success(results);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * Find references to a symbol
 */
async function handleRefs(args: string[]): Promise<CommandResult> {
  if (args.length < 2) {
    console.log(chalk.yellow('Usage: @serena refs <symbol-name> <file-path>'));
    console.log(chalk.gray('Example: @serena refs handleInput bin/gemini.ts'));
    return error('Missing arguments');
  }

  const symbolName = args[0];
  const filePath = args[1];

  console.log(chalk.cyan(`[Serena MCP] Finding references to: ${symbolName} in ${filePath}...\n`));

  try {
    const refs = await serenaAgent.findReferences(symbolName, filePath);

    if (!refs || refs.length === 0) {
      console.log(chalk.yellow('No references found'));
      return success([]);
    }

    console.log(chalk.green(`Found ${refs.length} reference(s):\n`));
    refs.forEach((ref: any, index: number) => {
      console.log(chalk.cyan(`${index + 1}. ${ref.file || ref.uri}`));
      if (ref.line || ref.range?.start?.line) {
        console.log(chalk.gray(`   Line: ${ref.line || ref.range?.start?.line}`));
      }
      console.log('');
    });

    return success(refs);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * Read file contents
 */
async function handleRead(args: string[]): Promise<CommandResult> {
  const filePath = args[0];
  if (!filePath) {
    console.log(chalk.yellow('Usage: @serena read <file-path>'));
    return error('Missing file path');
  }

  console.log(chalk.cyan(`[Serena MCP] Reading: ${filePath}...\n`));

  try {
    const content = await serenaAgent.readFile(filePath);
    console.log(content);
    return success(content);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * List directory contents
 */
async function handleLs(args: string[]): Promise<CommandResult> {
  const dirPath = args[0] || '.';

  console.log(chalk.cyan(`[Serena MCP] Listing: ${dirPath}...\n`));

  try {
    const listing = await serenaAgent.listDir(dirPath);
    console.log(JSON.stringify(listing, null, 2));
    return success(listing);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * List Serena memories
 */
async function handleMemories(): Promise<CommandResult> {
  console.log(chalk.cyan('[Serena MCP] Listing memories...\n'));

  try {
    const memories = await serenaAgent.listMemories();

    if (!memories || memories.length === 0) {
      console.log(chalk.yellow('No memories found'));
      return success([]);
    }

    console.log(chalk.green(`Found ${memories.length} memory/memories:\n`));
    memories.forEach((mem: string) => {
      console.log(chalk.gray(`  • ${mem}`));
    });

    return success(memories);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * Get initial instructions from Serena
 */
async function handleInstructions(): Promise<CommandResult> {
  console.log(chalk.cyan('[Serena MCP] Getting initial instructions...\n'));

  try {
    const instructions = await serenaAgent.getInitialInstructions();
    console.log(instructions);
    return success(instructions);
  } catch (err: any) {
    console.log(chalk.red(`Error: ${err.message}`));
    return error(err.message);
  }
}

/**
 * Print help for @serena commands
 */
function printHelp(): void {
  console.log(chalk.cyan('\n═══════════════════════════════════════════════════════'));
  console.log(chalk.cyan('  SERENA AGENT - Real MCP Code Intelligence'));
  console.log(chalk.cyan('═══════════════════════════════════════════════════════\n'));

  console.log(chalk.yellow('This agent uses the REAL Serena MCP server (Python/LSP).'));
  console.log(chalk.yellow('NOT NativeCodeIntelligence.\n'));

  console.log(chalk.white('COMMANDS:\n'));

  console.log(
    chalk.cyan('  @serena status') + chalk.gray('              - Show connection status'),
  );
  console.log(
    chalk.cyan('  @serena find <pattern>') + chalk.gray('      - Find symbol by pattern (LSP)'),
  );
  console.log(
    chalk.cyan('  @serena overview <file>') + chalk.gray('     - Get file structure/outline'),
  );
  console.log(
    chalk.cyan('  @serena search <pattern>') + chalk.gray('    - Search code with regex'),
  );
  console.log(
    chalk.cyan('  @serena refs <sym> <file>') + chalk.gray('   - Find references to symbol'),
  );
  console.log(chalk.cyan('  @serena read <file>') + chalk.gray('         - Read file contents'));
  console.log(chalk.cyan('  @serena ls [dir]') + chalk.gray('            - List directory'));
  console.log(chalk.cyan('  @serena memories') + chalk.gray('            - List Serena memories'));
  console.log(
    chalk.cyan('  @serena instructions') + chalk.gray('        - Get Serena instructions'),
  );
  console.log(chalk.cyan('  @serena help') + chalk.gray('                - Show this help'));

  console.log(chalk.white('\nEXAMPLES:\n'));

  console.log(chalk.gray('  @serena find Agent'));
  console.log(chalk.gray('  @serena overview src/core/Agent.ts'));
  console.log(chalk.gray('  @serena search "async function"'));
  console.log(chalk.gray('  @serena refs handleInput bin/gemini.ts'));

  console.log('');
}

// ============================================================
// Main Command Router
// ============================================================

/**
 * Handle @serena command invocation
 */
export async function handleSerenaAgentCommand(args: string[]): Promise<CommandResult> {
  const subcommand = args[0]?.toLowerCase();

  switch (subcommand) {
    case 'status':
      return handleStatus();

    case 'find':
    case 'symbol':
      return handleFind(args.slice(1));

    case 'overview':
    case 'outline':
    case 'symbols':
      return handleOverview(args.slice(1));

    case 'search':
    case 'grep':
    case 'pattern':
      return handleSearch(args.slice(1));

    case 'refs':
    case 'references':
      return handleRefs(args.slice(1));

    case 'read':
    case 'cat':
      return handleRead(args.slice(1));

    case 'ls':
    case 'list':
    case 'dir':
      return handleLs(args.slice(1));

    case 'memories':
    case 'memory':
      return handleMemories();

    case 'instructions':
    case 'init':
      return handleInstructions();

    case 'help':
    case undefined:
      printHelp();
      return success(null);

    default:
      console.log(chalk.yellow(`Unknown subcommand: ${subcommand}`));
      printHelp();
      return error(`Unknown subcommand: ${subcommand}`);
  }
}

// ============================================================
// Command Registration
// ============================================================

/**
 * Register @serena commands with the command registry
 */
export function registerSerenaAgentCommands(): void {
  // Register main @serena command
  commandRegistry.register({
    name: 'serena-agent',
    aliases: ['@serena', 'serena-mcp'],
    description: 'Serena Agent - Real Serena MCP code intelligence (NOT NativeCodeIntelligence)',
    usage: '@serena <subcommand> [args]',
    category: 'agent',
    args: [
      {
        name: 'subcommand',
        description: 'Subcommand to execute (status, find, overview, search, refs, help)',
        required: false,
      },
    ],
    handler: async (ctx: CommandContext) => handleSerenaAgentCommand(ctx.args),
  });

  console.log(chalk.gray('[CLI] Serena Agent commands registered (@serena - real MCP)'));
}

// ============================================================
// Export
// ============================================================

export const serenaAgentCommands = {
  handleCommand: handleSerenaAgentCommand,
  status: handleStatus,
  find: handleFind,
  overview: handleOverview,
  search: handleSearch,
  refs: handleRefs,
  read: handleRead,
  ls: handleLs,
  memories: handleMemories,
  instructions: handleInstructions,
};

export default serenaAgentCommands;
