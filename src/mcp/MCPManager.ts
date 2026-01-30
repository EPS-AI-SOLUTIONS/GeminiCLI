/**
 * MCP Manager - Unified MCP integration for GeminiHydra
 * Agent: Philippa (API Integration)
 *
 * Features:
 * - Connect to MCP servers (stdio/SSE)
 * - Discover and register tools, prompts, resources
 * - Execute tools with retry and circuit breaker
 * - Auto-discovery of new tools
 * - Parameter validation
 * - Batch operations
 * - Result caching
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

import {
  MCPServerConfig,
  MCPTool,
  MCPPrompt,
  MCPResource,
  MCPServerStatus,
  MCPServerInfo,
  MCPToolResult,
  MCPBatchOperation,
  MCPBatchResult,
  MCPValidationResult,
  MCPToolDiscoveryOptions,
  ConnectedServer
} from './MCPTypes.js';
import { resolveAlias } from './MCPAliases.js';
import { RequestCache } from '../core/RequestCache.js';
import { CircuitBreaker } from '../core/CircuitBreaker.js';

// ============================================================
// Constants
// ============================================================

const CONFIG_DIR = path.join(os.homedir(), '.geminihydra');
const MCP_CONFIG_FILE = path.join(CONFIG_DIR, 'mcp-servers.json');

// ============================================================
// MCPManager Class
// ============================================================

export class MCPManager {
  private servers: Map<string, ConnectedServer> = new Map();
  private globalTools: Map<string, MCPTool> = new Map();
  private globalPrompts: Map<string, MCPPrompt> = new Map();
  private globalResources: Map<string, MCPResource> = new Map();

  // Feature #23: Circuit breakers per server
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  // Feature #26: Result cache
  private resultCache: RequestCache<any>;

  // Feature #21: Auto-discovery
  private discoveryInterval: NodeJS.Timeout | null = null;
  private knownTools: Set<string> = new Set();
  private discoveryOptions: MCPToolDiscoveryOptions = {};

  constructor() {
    this.resultCache = new RequestCache<any>({
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 200,
      onHit: (key) => console.log(chalk.gray(`[MCP Cache] Hit: ${key}`)),
      onMiss: () => {}
    });
  }

  // ============================================================
  // Initialization & Configuration
  // ============================================================

  async init(): Promise<void> {
    await fs.mkdir(CONFIG_DIR, { recursive: true });

    const configs = await this.loadServerConfigs();
    const enabledConfigs = configs.filter(c => c.enabled !== false);

    if (enabledConfigs.length === 0) return;

    // Connect in parallel for speed
    const connectionPromises = enabledConfigs.map(async (config) => {
      try {
        await this.connectServer(config);
      } catch (error: any) {
        console.log(chalk.yellow(`[MCP] Failed to connect to ${config.name}: ${error.message}`));
      }
    });

    await Promise.all(connectionPromises);
  }

  async loadServerConfigs(): Promise<MCPServerConfig[]> {
    try {
      const data = await fs.readFile(MCP_CONFIG_FILE, 'utf-8');
      return JSON.parse(data);
    } catch {
      const defaultConfigs: MCPServerConfig[] = [];
      await this.saveServerConfigs(defaultConfigs);
      return defaultConfigs;
    }
  }

  async saveServerConfigs(configs: MCPServerConfig[]): Promise<void> {
    await fs.writeFile(MCP_CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
  }

  async addServer(config: MCPServerConfig): Promise<void> {
    const configs = await this.loadServerConfigs();
    const existing = configs.findIndex(c => c.name === config.name);

    if (existing >= 0) {
      configs[existing] = config;
    } else {
      configs.push(config);
    }

    await this.saveServerConfigs(configs);
    console.log(chalk.green(`[MCP] Server added: ${config.name}`));
  }

  async removeServer(name: string): Promise<void> {
    await this.disconnectServer(name);
    const configs = await this.loadServerConfigs();
    const filtered = configs.filter(c => c.name !== name);
    await this.saveServerConfigs(filtered);
    console.log(chalk.yellow(`[MCP] Server removed: ${name}`));
  }

  // ============================================================
  // Server Connection
  // ============================================================

  async connectServer(config: MCPServerConfig): Promise<void> {
    console.log(chalk.cyan(`[MCP] Connecting to ${config.name}...`));

    const serverInfo: ConnectedServer = {
      name: config.name,
      config,
      client: null as any,
      transport: null,
      status: 'connecting',
      tools: [],
      prompts: [],
      resources: [],
    };

    this.servers.set(config.name, serverInfo);

    try {
      let transport: any;

      if (config.command) {
        // Stdio transport
        const filteredEnv: Record<string, string> = {};
        Object.entries({ ...process.env, ...config.env }).forEach(([k, v]) => {
          if (v !== undefined) filteredEnv[k] = v;
        });

        // Disable Git Bash path conversion on Windows
        if (process.platform === 'win32') {
          filteredEnv['MSYS_NO_PATHCONV'] = '1';
          filteredEnv['MSYS2_ARG_CONV_EXCL'] = '*';
        }

        transport = new StdioClientTransport({
          command: config.command,
          args: config.args || [],
          env: filteredEnv,
        });

        // FIX #6: Ensure child process stdin doesn't interfere with parent stdin
        // The StdioClientTransport handles this internally, but we add safety
        transport.onclose = () => {
          console.log(chalk.gray(`[MCP] Transport closed for ${config.name}`));
        };
      } else if (config.url) {
        transport = new SSEClientTransport(new URL(config.url));
      } else {
        throw new Error('Server config must have either command or url');
      }

      const client = new Client({
        name: 'gemini-hydra',
        version: '13.0.0',
      });

      await client.connect(transport);

      serverInfo.client = client;
      serverInfo.transport = transport;
      serverInfo.status = 'connected';

      await this.discoverServerCapabilities(serverInfo);

      console.log(chalk.green(`[MCP] Connected to ${config.name}`));
      console.log(chalk.gray(`  Tools: ${serverInfo.tools.length}`));
      console.log(chalk.gray(`  Prompts: ${serverInfo.prompts.length}`));
      console.log(chalk.gray(`  Resources: ${serverInfo.resources.length}`));

    } catch (error: any) {
      serverInfo.status = 'error';
      throw error;
    }
  }

  async disconnectServer(name: string): Promise<void> {
    const server = this.servers.get(name);
    if (!server) return;

    try {
      if (server.client) {
        await server.client.close();
      }

      // Remove from global registries
      for (const tool of server.tools) {
        this.globalTools.delete(`${name}__${tool.name}`);
      }
      for (const prompt of server.prompts) {
        this.globalPrompts.delete(`${name}__${prompt.name}`);
      }
      for (const resource of server.resources) {
        this.globalResources.delete(resource.uri);
      }

      this.servers.delete(name);
      console.log(chalk.yellow(`[MCP] Disconnected from ${name}`));
    } catch (error: any) {
      console.error(chalk.red(`[MCP] Error disconnecting from ${name}: ${error.message}`));
    }
  }

  async disconnectAll(): Promise<void> {
    for (const name of this.servers.keys()) {
      await this.disconnectServer(name);
    }
    this.stopAutoDiscovery();
  }

  // ============================================================
  // Capability Discovery
  // ============================================================

  private async discoverServerCapabilities(server: ConnectedServer): Promise<void> {
    const client = server.client;

    // Discover tools
    try {
      const toolsResult = await client.listTools();
      server.tools = (toolsResult.tools || []).map((tool: any) => ({
        name: tool.name,
        serverName: server.name,
        description: tool.description || '',
        inputSchema: tool.inputSchema,
      }));

      for (const tool of server.tools) {
        const globalName = `${server.name}__${tool.name}`;
        this.globalTools.set(globalName, tool);
      }
    } catch {
      console.log(chalk.gray(`[MCP] ${server.name}: No tools available`));
    }

    // Discover prompts
    try {
      const promptsResult = await client.listPrompts();
      server.prompts = (promptsResult.prompts || []).map((prompt: any) => ({
        name: prompt.name,
        serverName: server.name,
        description: prompt.description,
        arguments: prompt.arguments,
      }));

      for (const prompt of server.prompts) {
        const globalName = `${server.name}__${prompt.name}`;
        this.globalPrompts.set(globalName, prompt);
      }
    } catch {
      console.log(chalk.gray(`[MCP] ${server.name}: No prompts available`));
    }

    // Discover resources
    try {
      const resourcesResult = await client.listResources();
      server.resources = (resourcesResult.resources || []).map((resource: any) => ({
        uri: resource.uri,
        serverName: server.name,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      }));

      for (const resource of server.resources) {
        this.globalResources.set(resource.uri, resource);
      }
    } catch {
      console.log(chalk.gray(`[MCP] ${server.name}: No resources available`));
    }
  }

  // ============================================================
  // Tool Execution
  // ============================================================

  async callTool(toolName: string, params: Record<string, any>): Promise<MCPToolResult> {
    // Resolve alias first
    const resolved = resolveAlias(toolName);

    // Parse tool name (format: serverName__toolName)
    const parts = resolved.split('__');
    let serverName: string;
    let actualToolName: string;

    if (parts.length === 2) {
      [serverName, actualToolName] = parts;
    } else {
      const tool = this.globalTools.get(resolved);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      serverName = tool.serverName;
      actualToolName = tool.name;
    }

    const server = this.servers.get(serverName);
    if (!server || server.status !== 'connected') {
      throw new Error(`Server not connected: ${serverName}`);
    }

    console.log(chalk.cyan(`[MCP] Calling ${serverName}/${actualToolName}...`));

    try {
      const result = await server.client.callTool({
        name: actualToolName,
        arguments: params,
      });
      return {
        success: !result.isError,
        content: result.content,
        isError: result.isError
      };
    } catch (error: any) {
      console.error(chalk.red(`[MCP] Tool call failed: ${error.message}`));
      throw error;
    }
  }

  // Feature #23: Call with retry and circuit breaker
  async callToolWithRecovery(
    toolName: string,
    params: Record<string, any>,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<MCPToolResult> {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    const resolved = resolveAlias(toolName);
    const serverName = resolved.split('__')[0];
    const breaker = this.getCircuitBreaker(serverName);

    return breaker.execute(async () => {
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await this.callTool(resolved, params);
        } catch (error: any) {
          lastError = error;
          console.log(chalk.yellow(`[MCP] Attempt ${attempt}/${maxRetries} failed: ${error.message}`));

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
          }
        }
      }

      throw lastError || new Error('MCP call failed after retries');
    });
  }

  // Feature #26: Call with caching
  async callToolCached(
    toolName: string,
    params: Record<string, any>,
    options: { bypassCache?: boolean } = {}
  ): Promise<MCPToolResult> {
    if (options.bypassCache) {
      return this.callTool(toolName, params);
    }

    const cacheKey = { tool: toolName, params };
    return this.resultCache.getOrCompute(cacheKey, async () => {
      return this.callTool(toolName, params);
    });
  }

  // ============================================================
  // Prompts & Resources
  // ============================================================

  async getPrompt(promptName: string, params: Record<string, any>): Promise<any> {
    const parts = promptName.split('__');
    let serverName: string;
    let actualPromptName: string;

    if (parts.length === 2) {
      [serverName, actualPromptName] = parts;
    } else {
      const prompt = this.globalPrompts.get(promptName);
      if (!prompt) {
        throw new Error(`Prompt not found: ${promptName}`);
      }
      serverName = prompt.serverName;
      actualPromptName = prompt.name;
    }

    const server = this.servers.get(serverName);
    if (!server || server.status !== 'connected') {
      throw new Error(`Server not connected: ${serverName}`);
    }

    return server.client.getPrompt({
      name: actualPromptName,
      arguments: params,
    });
  }

  async readResource(uri: string): Promise<any> {
    const resource = this.globalResources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    const server = this.servers.get(resource.serverName);
    if (!server || server.status !== 'connected') {
      throw new Error(`Server not connected: ${resource.serverName}`);
    }

    return server.client.readResource({ uri });
  }

  // ============================================================
  // Feature #24: Parameter Validation
  // ============================================================

  validateToolParams(toolName: string, params: Record<string, any>): MCPValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const resolved = resolveAlias(toolName);
    const tools = this.getAllTools();
    const tool = tools.find(t =>
      `${t.serverName}__${t.name}` === resolved || t.name === resolved
    );

    if (!tool) {
      errors.push(`Tool not found: ${toolName}`);
      return { valid: false, errors, warnings };
    }

    const schema = tool.inputSchema;
    if (!schema || !schema.properties) {
      return { valid: true, errors, warnings };
    }

    // Check required properties
    const required = schema.required || [];
    for (const prop of required) {
      if (params[prop] === undefined || params[prop] === null) {
        errors.push(`Missing required parameter: ${prop}`);
      }
    }

    // Check types
    for (const [key, value] of Object.entries(params)) {
      const propSchema = schema.properties[key];
      if (!propSchema) {
        warnings.push(`Unknown parameter: ${key}`);
        continue;
      }

      const expectedType = propSchema.type;
      const actualType = typeof value;

      if (expectedType === 'string' && actualType !== 'string') {
        errors.push(`Parameter ${key} should be string, got ${actualType}`);
      } else if (expectedType === 'number' && actualType !== 'number') {
        errors.push(`Parameter ${key} should be number, got ${actualType}`);
      } else if (expectedType === 'boolean' && actualType !== 'boolean') {
        errors.push(`Parameter ${key} should be boolean, got ${actualType}`);
      } else if (expectedType === 'array' && !Array.isArray(value)) {
        errors.push(`Parameter ${key} should be array, got ${actualType}`);
      } else if (expectedType === 'object' && (actualType !== 'object' || Array.isArray(value))) {
        errors.push(`Parameter ${key} should be object, got ${actualType}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  // ============================================================
  // Feature #25: Batch Operations
  // ============================================================

  async batchExecute(
    operations: MCPBatchOperation[],
    options: { maxConcurrency?: number } = {}
  ): Promise<MCPBatchResult[]> {
    const { maxConcurrency = 5 } = options;
    const results: MCPBatchResult[] = [];
    const chunks: MCPBatchOperation[][] = [];

    // Split into chunks
    for (let i = 0; i < operations.length; i += maxConcurrency) {
      chunks.push(operations.slice(i, i + maxConcurrency));
    }

    // Process chunks
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(async (op): Promise<MCPBatchResult> => {
          try {
            const result = await this.callToolWithRecovery(op.tool, op.params);
            return { id: op.id, success: true, result };
          } catch (error: any) {
            return { id: op.id, success: false, error: error.message };
          }
        })
      );
      results.push(...chunkResults);
    }

    return results;
  }

  async batchReadFiles(paths: string[]): Promise<MCPBatchResult[]> {
    return this.batchExecute(
      paths.map((filePath) => ({
        tool: 'filesystem__read_file',
        params: { path: filePath },
        id: filePath
      }))
    );
  }

  // ============================================================
  // Feature #21: Auto-Discovery
  // ============================================================

  startAutoDiscovery(options: MCPToolDiscoveryOptions = {}): void {
    if (this.discoveryInterval) return;

    this.discoveryOptions = {
      interval: options.interval ?? 60000,
      onNewTool: options.onNewTool ?? ((tool) => {
        console.log(chalk.green(`[MCP] New tool discovered: ${tool.server}__${tool.name}`));
      }),
      onToolRemoved: options.onToolRemoved ?? ((tool) => {
        console.log(chalk.yellow(`[MCP] Tool removed: ${tool.server}__${tool.name}`));
      })
    };

    this.scanForTools();
    this.discoveryInterval = setInterval(() => {
      this.scanForTools();
    }, this.discoveryOptions.interval);

    console.log(chalk.gray(`[MCP] Auto-discovery started (interval: ${this.discoveryOptions.interval}ms)`));
  }

  stopAutoDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
      console.log(chalk.gray('[MCP] Auto-discovery stopped'));
    }
  }

  private async scanForTools(): Promise<void> {
    try {
      const currentTools = this.getAllTools();
      const currentToolNames = new Set(
        currentTools.map(t => `${t.serverName}__${t.name}`)
      );

      // Check for new tools
      for (const tool of currentTools) {
        const fullName = `${tool.serverName}__${tool.name}`;
        if (!this.knownTools.has(fullName)) {
          this.discoveryOptions.onNewTool?.({ name: tool.name, server: tool.serverName });
          this.knownTools.add(fullName);
        }
      }

      // Check for removed tools
      for (const known of this.knownTools) {
        if (!currentToolNames.has(known)) {
          const [server, ...nameParts] = known.split('__');
          this.discoveryOptions.onToolRemoved?.({ name: nameParts.join('__'), server });
          this.knownTools.delete(known);
        }
      }
    } catch (error: any) {
      console.error(chalk.red(`[MCP] Auto-discovery error: ${error.message}`));
    }
  }

  // ============================================================
  // Circuit Breaker (Feature #23)
  // ============================================================

  private getCircuitBreaker(serverName: string): CircuitBreaker {
    if (!this.circuitBreakers.has(serverName)) {
      this.circuitBreakers.set(serverName, new CircuitBreaker(serverName, {
        failureThreshold: 3,
        successThreshold: 2,
        timeout: 30000,
        onStateChange: async (from, to, name) => {
          console.log(chalk.yellow(`[MCP:${name}] Circuit: ${from} -> ${to}`));

          if (to === 'HALF_OPEN') {
            try {
              const configs = await this.loadServerConfigs();
              const config = configs.find(c => c.name === name);
              if (config) {
                console.log(chalk.cyan(`[MCP:${name}] Attempting reconnection...`));
                await this.connectServer(config);
              }
            } catch (error: any) {
              console.error(chalk.red(`[MCP:${name}] Reconnection failed: ${error.message}`));
            }
          }
        }
      }));
    }
    return this.circuitBreakers.get(serverName)!;
  }

  // ============================================================
  // Cache Management (Feature #26)
  // ============================================================

  clearCache(): void {
    this.resultCache.clear();
  }

  getCacheStats() {
    return this.resultCache.getStats();
  }

  // ============================================================
  // Getters
  // ============================================================

  getAllTools(): MCPTool[] {
    return Array.from(this.globalTools.values());
  }

  getAllPrompts(): MCPPrompt[] {
    return Array.from(this.globalPrompts.values());
  }

  getAllResources(): MCPResource[] {
    return Array.from(this.globalResources.values());
  }

  getServerStatus(name: string): MCPServerStatus {
    return this.servers.get(name)?.status || 'disconnected';
  }

  getAllServers(): MCPServerInfo[] {
    return Array.from(this.servers.values()).map(s => ({
      name: s.name,
      status: s.status,
      tools: s.tools.length,
      prompts: s.prompts.length,
      resources: s.resources.length,
    }));
  }

  getToolDefinitionsForGemini(): any[] {
    return Array.from(this.globalTools.values()).map(tool => ({
      name: `mcp__${tool.serverName}__${tool.name}`,
      description: `[MCP:${tool.serverName}] ${tool.description}`,
      parameters: tool.inputSchema,
    }));
  }

  // ============================================================
  // Status Display
  // ============================================================

  printStatus(): void {
    console.log(chalk.cyan('\n=== MCP Status ===\n'));

    const servers = this.getAllServers();
    if (servers.length === 0) {
      console.log(chalk.gray('No MCP servers configured'));
      console.log(chalk.gray('Use `gemini mcp add <name> <command>` to add a server'));
      return;
    }

    for (const server of servers) {
      const statusIcon = server.status === 'connected' ? '[OK]' : server.status === 'connecting' ? '[..]' : '[X]';
      const statusColor = server.status === 'connected' ? chalk.green : server.status === 'error' ? chalk.red : chalk.yellow;

      console.log(statusColor(`${statusIcon} ${server.name}`));
      console.log(chalk.gray(`    Tools: ${server.tools} | Prompts: ${server.prompts} | Resources: ${server.resources}`));
    }

    console.log(chalk.gray(`\nTotal: ${this.globalTools.size} tools, ${this.globalPrompts.size} prompts, ${this.globalResources.size} resources`));

    const cacheStats = this.getCacheStats();
    console.log(chalk.gray(`Cache: ${cacheStats.size} entries, ${cacheStats.hits} hits, ${cacheStats.misses} misses\n`));
  }
}

// ============================================================
// Singleton
// ============================================================

export const mcpManager = new MCPManager();
