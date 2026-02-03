/**
 * NativeToolsServer - Virtual MCP server for native Serena-compatible tools
 *
 * Provides all native tools through the MCP interface:
 * - Registers tools in MCPToolRegistry
 * - Handles tool execution
 * - Supports full Serena alias compatibility
 */

import chalk from 'chalk';
import { MCPTool, MCPToolResult, MCPToolInputSchema } from './MCPTypes.js';
import { mcpToolRegistry } from './MCPToolRegistry.js';
import {
  NativeSerenaTools,
  createNativeSerenaTools,
  NativeToolDefinition
} from '../native/NativeSerenaTools.js';

// ============================================================
// Constants
// ============================================================

export const NATIVE_SERVER_NAME = 'native';

// ============================================================
// Native Tool Aliases (Serena-compatible)
// ============================================================

export const NATIVE_TOOL_ALIASES: Record<string, string> = {
  // === Glob (file finding) ===
  'glob': 'native__find_file',
  'find': 'native__find_file',
  'files': 'native__find_file',

  // === Grep (content search) ===
  'grep': 'native__search_for_pattern',
  'search': 'native__search_for_pattern',
  'rg': 'native__search_for_pattern',

  // === Code Operations (Serena-compatible) ===
  'code:find': 'native__find_symbol',
  'code:symbol': 'native__find_symbol',
  'code:overview': 'native__get_symbols_overview',
  'code:symbols': 'native__get_symbols_overview',
  'code:search': 'native__search_for_pattern',
  'code:pattern': 'native__search_for_pattern',
  'code:file': 'native__find_file',
  'code:refs': 'native__find_referencing_symbols',
  'code:def': 'native__go_to_definition',
  'code:replace': 'native__replace_content',

  // === Serena Full Compatibility ===
  // File Operations
  'serena:ls': 'native__list_dir',
  'serena:list': 'native__list_dir',
  'serena:read': 'native__read_file',
  'serena:cat': 'native__read_file',
  'serena:write': 'native__create_text_file',
  'serena:create': 'native__create_text_file',
  'serena:find': 'native__find_file',

  // Symbol Operations
  'serena:symbol': 'native__find_symbol',
  'serena:sym': 'native__find_symbol',
  'serena:refs': 'native__find_referencing_symbols',
  'serena:references': 'native__find_referencing_symbols',
  'serena:outline': 'native__get_symbols_overview',
  'serena:overview': 'native__get_symbols_overview',

  // Code Search
  'serena:search': 'native__search_for_pattern',
  'serena:grep': 'native__search_for_pattern',
  'serena:pattern': 'native__search_for_pattern',

  // Code Editing
  'serena:edit': 'native__replace_content',
  'serena:replace': 'native__replace_content',
  'serena:replaceSymbol': 'native__replace_symbol_body',
  'serena:insertBefore': 'native__insert_before_symbol',
  'serena:insertAfter': 'native__insert_after_symbol',

  // Navigation
  'serena:goto': 'native__go_to_definition',
  'serena:def': 'native__go_to_definition',
  'serena:rename': 'native__rename_symbol',

  // Memory
  'serena:memories': 'native__list_memories',
  'serena:memlist': 'native__list_memories',
  'serena:memread': 'native__read_memory',
  'serena:memwrite': 'native__write_memory',
  'serena:memdel': 'native__delete_memory',

  // === Native Prefix (new style) ===
  'native:find': 'native__find_symbol',
  'native:search': 'native__search_for_pattern',
  'native:glob': 'native__find_file',
  'native:grep': 'native__search_for_pattern',
  'native:ls': 'native__list_dir',
  'native:read': 'native__read_file',
  'native:write': 'native__create_text_file',
  'native:overview': 'native__get_symbols_overview',
  'native:refs': 'native__find_referencing_symbols',
  'native:replace': 'native__replace_content',
  'native:rename': 'native__rename_symbol',
  'native:mem': 'native__list_memories'
};

// ============================================================
// NativeToolsServer Class
// ============================================================

export class NativeToolsServer {
  private tools: NativeSerenaTools;
  private registered: boolean = false;
  private rootDir: string;

  constructor(rootDir?: string) {
    this.rootDir = rootDir || process.cwd();
    this.tools = createNativeSerenaTools(this.rootDir);
  }

  /**
   * Initialize the native tools server
   */
  async init(): Promise<void> {
    if (this.registered) {
      console.log(chalk.gray('[NativeToolsServer] Already initialized'));
      return;
    }

    // Initialize native tools
    await this.tools.init();

    // Register all native tools in MCPToolRegistry
    const allTools = this.tools.getAllTools();

    for (const tool of allTools) {
      const mcpTool: MCPTool = {
        name: tool.name,
        serverName: NATIVE_SERVER_NAME,
        description: `[Native] ${tool.description}`,
        inputSchema: tool.inputSchema
      };

      mcpToolRegistry.registerTool(mcpTool);
    }

    this.registered = true;

    console.log(chalk.cyan(`[NativeToolsServer] Registered ${allTools.length} native tools`));
  }

  /**
   * Execute a native tool
   */
  async callTool(toolName: string, params: Record<string, any>): Promise<MCPToolResult> {
    if (!this.registered) {
      await this.init();
    }

    const result = await this.tools.executeTool(toolName, params);

    if (result.success) {
      return {
        success: true,
        content: result.data,
        isError: false
      };
    } else {
      return {
        success: false,
        content: null,
        error: result.error,
        isError: true
      };
    }
  }

  /**
   * Get all native tools as MCP format
   */
  getAllTools(): MCPTool[] {
    return this.tools.getAllTools().map(tool => ({
      name: tool.name,
      serverName: NATIVE_SERVER_NAME,
      description: `[Native] ${tool.description}`,
      inputSchema: tool.inputSchema
    }));
  }

  /**
   * Get tool by name
   */
  getTool(name: string): MCPTool | undefined {
    const tool = this.tools.getTool(name);
    if (!tool) return undefined;

    return {
      name: tool.name,
      serverName: NATIVE_SERVER_NAME,
      description: `[Native] ${tool.description}`,
      inputSchema: tool.inputSchema
    };
  }

  /**
   * Check if tool exists
   */
  hasTool(name: string): boolean {
    return this.tools.getTool(name) !== undefined;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.registered;
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.getToolCount();
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return this.tools.getToolNames();
  }

  /**
   * Resolve alias to full native tool name
   */
  resolveAlias(alias: string): string | null {
    const normalized = alias.toLowerCase().trim();
    return NATIVE_TOOL_ALIASES[normalized] || null;
  }

  /**
   * Check if alias points to native tool
   */
  isNativeAlias(alias: string): boolean {
    const normalized = alias.toLowerCase().trim();
    return normalized in NATIVE_TOOL_ALIASES;
  }

  /**
   * Get all aliases
   */
  getAllAliases(): Record<string, string> {
    return { ...NATIVE_TOOL_ALIASES };
  }

  /**
   * Get root directory
   */
  getRootDir(): string {
    return this.rootDir;
  }

  /**
   * Set root directory (reinitializes tools)
   */
  async setRootDir(dir: string): Promise<void> {
    if (dir !== this.rootDir) {
      this.rootDir = dir;
      this.registered = false;

      // Unregister old tools
      for (const name of this.tools.getToolNames()) {
        mcpToolRegistry.unregisterTool(NATIVE_SERVER_NAME, name);
      }

      // Recreate tools with new root
      this.tools = createNativeSerenaTools(dir);
      await this.init();
    }
  }

  /**
   * Print status
   */
  printStatus(): void {
    console.log(chalk.cyan('\n=== Native Tools Server ===\n'));
    console.log(chalk.gray(`  Root: ${this.rootDir}`));
    console.log(chalk.gray(`  Initialized: ${this.registered}`));
    console.log(chalk.gray(`  Tools: ${this.getToolCount()}`));
    console.log(chalk.gray(`  Aliases: ${Object.keys(NATIVE_TOOL_ALIASES).length}`));

    console.log(chalk.gray('\n  Tools:'));
    for (const name of this.getToolNames()) {
      console.log(chalk.gray(`    - ${NATIVE_SERVER_NAME}__${name}`));
    }

    console.log(chalk.gray('\n  Sample Aliases:'));
    const sampleAliases = Object.entries(NATIVE_TOOL_ALIASES).slice(0, 10);
    for (const [alias, target] of sampleAliases) {
      console.log(chalk.gray(`    ${alias} -> ${target}`));
    }
    if (Object.keys(NATIVE_TOOL_ALIASES).length > 10) {
      console.log(chalk.gray(`    ... and ${Object.keys(NATIVE_TOOL_ALIASES).length - 10} more`));
    }
  }

  /**
   * Shutdown
   */
  async shutdown(): Promise<void> {
    if (this.registered) {
      // Unregister tools from MCPToolRegistry
      for (const name of this.getToolNames()) {
        mcpToolRegistry.unregisterTool(NATIVE_SERVER_NAME, name);
      }

      // Shutdown underlying tools
      await this.tools.shutdown();

      this.registered = false;
      console.log(chalk.cyan('[NativeToolsServer] Shutdown complete'));
    }
  }
}

// ============================================================
// Singleton Instance
// ============================================================

let _nativeToolsServerInstance: NativeToolsServer | null = null;

/**
 * Get or create singleton instance
 */
export function getNativeToolsServer(rootDir?: string): NativeToolsServer {
  if (!_nativeToolsServerInstance) {
    _nativeToolsServerInstance = new NativeToolsServer(rootDir);
  }
  return _nativeToolsServerInstance;
}

/**
 * Singleton export
 */
export const nativeToolsServer = getNativeToolsServer();

export default nativeToolsServer;
