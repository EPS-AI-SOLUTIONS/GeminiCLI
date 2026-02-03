/**
 * MCP Auto-Discovery - Automatic tool discovery and monitoring
 *
 * Extracted from MCPManager.ts for better separation of concerns.
 * Provides automatic discovery of new/removed tools across MCP servers.
 */

import chalk from 'chalk';
import { MCPTool, MCPToolDiscoveryOptions } from './MCPTypes.js';
import { logError } from '../utils/errorHandling.js';

// ============================================================
// Types
// ============================================================

export interface ToolChangeEvent {
  name: string;
  server: string;
}

export interface DiscoveryStatus {
  running: boolean;
  interval: number;
  knownToolCount: number;
  lastScanTime: number | null;
}

export type ToolProvider = () => MCPTool[];

// ============================================================
// MCPAutoDiscovery Class
// ============================================================

export class MCPAutoDiscovery {
  private discoveryInterval: NodeJS.Timeout | null = null;
  private knownTools: Set<string> = new Set();
  private options: Required<MCPToolDiscoveryOptions>;
  private toolProvider: ToolProvider | null = null;
  private lastScanTime: number | null = null;

  private defaultOptions: Required<MCPToolDiscoveryOptions> = {
    interval: 60000,
    onNewTool: (tool) => {
      console.log(chalk.green(`[MCP Discovery] New tool: ${tool.server}__${tool.name}`));
    },
    onToolRemoved: (tool) => {
      console.log(chalk.yellow(`[MCP Discovery] Tool removed: ${tool.server}__${tool.name}`));
    }
  };

  constructor(options?: MCPToolDiscoveryOptions) {
    this.options = { ...this.defaultOptions, ...options };
  }

  // ============================================================
  // Configuration
  // ============================================================

  /**
   * Set the tool provider function that returns current tools
   */
  setToolProvider(provider: ToolProvider): void {
    this.toolProvider = provider;
  }

  /**
   * Update discovery options
   */
  updateOptions(options: Partial<MCPToolDiscoveryOptions>): void {
    const wasRunning = this.isRunning();

    if (wasRunning) {
      this.stop();
    }

    this.options = { ...this.options, ...options };

    if (wasRunning) {
      this.start();
    }
  }

  // ============================================================
  // Discovery Control
  // ============================================================

  /**
   * Start automatic discovery
   */
  start(options?: MCPToolDiscoveryOptions): void {
    if (this.discoveryInterval) {
      console.log(chalk.gray('[MCP Discovery] Already running'));
      return;
    }

    if (options) {
      this.options = { ...this.options, ...options };
    }

    // Initialize known tools
    this.initializeKnownTools();

    // Start interval
    this.discoveryInterval = setInterval(() => {
      this.scan();
    }, this.options.interval);

    console.log(chalk.gray(`[MCP Discovery] Started (interval: ${this.options.interval}ms)`));
  }

  /**
   * Stop automatic discovery
   */
  stop(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
      console.log(chalk.gray('[MCP Discovery] Stopped'));
    }
  }

  /**
   * Check if discovery is running
   */
  isRunning(): boolean {
    return this.discoveryInterval !== null;
  }

  // ============================================================
  // Scanning
  // ============================================================

  /**
   * Initialize known tools from current state
   */
  private initializeKnownTools(): void {
    if (!this.toolProvider) {
      console.log(chalk.yellow('[MCP Discovery] No tool provider set'));
      return;
    }

    const currentTools = this.toolProvider();
    this.knownTools.clear();

    for (const tool of currentTools) {
      const fullName = this.formatToolName(tool.serverName, tool.name);
      this.knownTools.add(fullName);
    }

    console.log(chalk.gray(`[MCP Discovery] Initialized with ${this.knownTools.size} tools`));
  }

  /**
   * Perform a scan for tool changes
   */
  async scan(): Promise<{ added: ToolChangeEvent[]; removed: ToolChangeEvent[] }> {
    const added: ToolChangeEvent[] = [];
    const removed: ToolChangeEvent[] = [];

    try {
      if (!this.toolProvider) {
        return { added, removed };
      }

      const currentTools = this.toolProvider();
      const currentToolNames = new Set(
        currentTools.map(t => this.formatToolName(t.serverName, t.name))
      );

      // Check for new tools
      for (const tool of currentTools) {
        const fullName = this.formatToolName(tool.serverName, tool.name);
        if (!this.knownTools.has(fullName)) {
          const event = { name: tool.name, server: tool.serverName };
          added.push(event);
          this.options.onNewTool?.(event);
          this.knownTools.add(fullName);
        }
      }

      // Check for removed tools
      for (const known of this.knownTools) {
        if (!currentToolNames.has(known)) {
          const parsed = this.parseToolName(known);
          const event = { name: parsed.toolName, server: parsed.serverName };
          removed.push(event);
          this.options.onToolRemoved?.(event);
          this.knownTools.delete(known);
        }
      }

      this.lastScanTime = Date.now();

    } catch (error) {
      logError('MCP Discovery', 'Scan failed', error);
    }

    return { added, removed };
  }

  /**
   * Force a manual scan
   */
  async forceScan(): Promise<{ added: ToolChangeEvent[]; removed: ToolChangeEvent[] }> {
    console.log(chalk.gray('[MCP Discovery] Manual scan triggered'));
    return this.scan();
  }

  // ============================================================
  // Name Helpers
  // ============================================================

  private formatToolName(serverName: string, toolName: string): string {
    return `${serverName}__${toolName}`;
  }

  private parseToolName(fullName: string): { serverName: string; toolName: string } {
    const parts = fullName.split('__');
    return {
      serverName: parts[0],
      toolName: parts.slice(1).join('__')
    };
  }

  // ============================================================
  // Status
  // ============================================================

  /**
   * Get discovery status
   */
  getStatus(): DiscoveryStatus {
    return {
      running: this.isRunning(),
      interval: this.options.interval,
      knownToolCount: this.knownTools.size,
      lastScanTime: this.lastScanTime,
    };
  }

  /**
   * Get list of known tools
   */
  getKnownTools(): string[] {
    return Array.from(this.knownTools);
  }

  // ============================================================
  // Reset
  // ============================================================

  /**
   * Reset discovery state
   */
  reset(): void {
    this.stop();
    this.knownTools.clear();
    this.lastScanTime = null;
  }
}

// ============================================================
// Singleton
// ============================================================

export const mcpAutoDiscovery = new MCPAutoDiscovery();
