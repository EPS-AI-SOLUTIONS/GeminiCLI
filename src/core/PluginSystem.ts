/**
 * PluginSystem - Extensible plugin architecture
 * Feature #6: Plugin System
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

import { GEMINIHYDRA_DIR } from '../config/paths.config.js';

const PLUGINS_DIR = path.join(GEMINIHYDRA_DIR, 'plugins');
const PLUGIN_REGISTRY_FILE = path.join(GEMINIHYDRA_DIR, 'plugin-registry.json');

// ============================================================
// Plugin Interfaces
// ============================================================

export type PluginHook =
  | 'beforePlan'
  | 'afterPlan'
  | 'beforeTask'
  | 'afterTask'
  | 'beforeSynthesis'
  | 'afterSynthesis'
  | 'onError'
  | 'onMcpCall'
  | 'onAgentStart'
  | 'onAgentEnd'
  | 'onInput'
  | 'onOutput';

export interface PluginContext {
  mission?: string;
  plan?: any;
  task?: any;
  result?: any;
  error?: Error;
  agent?: string;
  input?: string;
  output?: string;
  mcpTool?: string;
  mcpParams?: any;
}

export type PluginHandler = (context: PluginContext) => Promise<PluginContext | void>;

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author?: string;
  homepage?: string;
  hooks: PluginHook[];
  dependencies?: string[];
  config?: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array';
    description: string;
    default?: any;
    required?: boolean;
  }>;
}

export interface Plugin {
  manifest: PluginManifest;
  handlers: Partial<Record<PluginHook, PluginHandler>>;
  init?: (config: Record<string, any>) => Promise<void>;
  destroy?: () => Promise<void>;
}

export interface PluginRegistryEntry {
  name: string;
  version: string;
  enabled: boolean;
  config: Record<string, any>;
  installedAt: string;
  path: string;
}

// ============================================================
// Plugin Manager
// ============================================================

export class PluginManager extends EventEmitter {
  private plugins: Map<string, Plugin> = new Map();
  private registry: Map<string, PluginRegistryEntry> = new Map();
  private hookHandlers: Map<PluginHook, Array<{ plugin: string; handler: PluginHandler }>> = new Map();
  private initialized = false;

  constructor() {
    super();
  }

  /**
   * Initialize plugin system
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Ensure directories exist
    await fs.mkdir(PLUGINS_DIR, { recursive: true });

    // Load registry
    await this.loadRegistry();

    // Load enabled plugins
    for (const [name, entry] of this.registry) {
      if (entry.enabled) {
        try {
          await this.loadPlugin(entry.path);
          console.log(chalk.green(`[PluginManager] Loaded plugin: ${name}`));
        } catch (error: any) {
          console.error(chalk.red(`[PluginManager] Failed to load ${name}: ${error.message}`));
        }
      }
    }

    this.initialized = true;
  }

  /**
   * Load plugin registry from file
   */
  private async loadRegistry(): Promise<void> {
    try {
      const data = await fs.readFile(PLUGIN_REGISTRY_FILE, 'utf-8');
      const entries = JSON.parse(data) as PluginRegistryEntry[];
      for (const entry of entries) {
        this.registry.set(entry.name, entry);
      }
    } catch {
      // No registry file yet
    }
  }

  /**
   * Save plugin registry to file
   */
  private async saveRegistry(): Promise<void> {
    const entries = Array.from(this.registry.values());
    await fs.writeFile(PLUGIN_REGISTRY_FILE, JSON.stringify(entries, null, 2));
  }

  /**
   * Load a plugin from file/directory
   */
  async loadPlugin(pluginPath: string): Promise<void> {
    const absolutePath = path.isAbsolute(pluginPath)
      ? pluginPath
      : path.join(PLUGINS_DIR, pluginPath);

    // Check if it's a directory or file
    const stat = await fs.stat(absolutePath);
    let entryPoint = absolutePath;

    if (stat.isDirectory()) {
      // Look for index.js or plugin.js
      const candidates = ['index.js', 'plugin.js', 'index.ts', 'plugin.ts'];
      for (const candidate of candidates) {
        try {
          await fs.access(path.join(absolutePath, candidate));
          entryPoint = path.join(absolutePath, candidate);
          break;
        } catch {
          continue;
        }
      }
    }

    // Dynamic import
    const module = await import(`file://${entryPoint}`);
    const plugin: Plugin = module.default || module;

    // Validate manifest
    if (!plugin.manifest || !plugin.manifest.name) {
      throw new Error('Invalid plugin: missing manifest');
    }

    // Check dependencies
    if (plugin.manifest.dependencies) {
      for (const dep of plugin.manifest.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Missing dependency: ${dep}`);
        }
      }
    }

    // Get or create registry entry
    let entry = this.registry.get(plugin.manifest.name);
    if (!entry) {
      entry = {
        name: plugin.manifest.name,
        version: plugin.manifest.version,
        enabled: true,
        config: {},
        installedAt: new Date().toISOString(),
        path: absolutePath
      };

      // Set default config values
      if (plugin.manifest.config) {
        for (const [key, schema] of Object.entries(plugin.manifest.config)) {
          if (schema.default !== undefined) {
            entry.config[key] = schema.default;
          }
        }
      }

      this.registry.set(plugin.manifest.name, entry);
      await this.saveRegistry();
    }

    // Initialize plugin
    if (plugin.init) {
      await plugin.init(entry.config);
    }

    // Register handlers
    for (const hook of plugin.manifest.hooks) {
      const handler = plugin.handlers[hook];
      if (handler) {
        if (!this.hookHandlers.has(hook)) {
          this.hookHandlers.set(hook, []);
        }
        this.hookHandlers.get(hook)!.push({
          plugin: plugin.manifest.name,
          handler
        });
      }
    }

    this.plugins.set(plugin.manifest.name, plugin);
    this.emit('pluginLoaded', plugin.manifest.name);
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    // Call destroy if exists
    if (plugin.destroy) {
      await plugin.destroy();
    }

    // Remove handlers
    for (const hook of plugin.manifest.hooks) {
      const handlers = this.hookHandlers.get(hook);
      if (handlers) {
        const filtered = handlers.filter(h => h.plugin !== name);
        this.hookHandlers.set(hook, filtered);
      }
    }

    this.plugins.delete(name);
    this.emit('pluginUnloaded', name);
  }

  /**
   * Install a plugin from URL or local path
   */
  async installPlugin(source: string): Promise<string> {
    // If it's a URL, download it
    if (source.startsWith('http://') || source.startsWith('https://')) {
      throw new Error('URL installation not yet implemented');
    }

    // Local path
    const sourcePath = path.resolve(source);
    const stat = await fs.stat(sourcePath);

    if (stat.isDirectory()) {
      // Copy directory
      const pluginName = path.basename(sourcePath);
      const destPath = path.join(PLUGINS_DIR, pluginName);
      await this.copyDirectory(sourcePath, destPath);
      await this.loadPlugin(destPath);
      return pluginName;
    } else {
      // Copy single file
      const pluginName = path.basename(sourcePath, path.extname(sourcePath));
      const destPath = path.join(PLUGINS_DIR, path.basename(sourcePath));
      await fs.copyFile(sourcePath, destPath);
      await this.loadPlugin(destPath);
      return pluginName;
    }
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(name: string): Promise<void> {
    await this.unloadPlugin(name);

    const entry = this.registry.get(name);
    if (entry) {
      // Remove files
      try {
        const stat = await fs.stat(entry.path);
        if (stat.isDirectory()) {
          await fs.rm(entry.path, { recursive: true });
        } else {
          await fs.unlink(entry.path);
        }
      } catch {
        // File may not exist
      }

      this.registry.delete(name);
      await this.saveRegistry();
    }
  }

  /**
   * Enable/disable a plugin
   */
  async setEnabled(name: string, enabled: boolean): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) throw new Error(`Plugin not found: ${name}`);

    entry.enabled = enabled;
    await this.saveRegistry();

    if (enabled && !this.plugins.has(name)) {
      await this.loadPlugin(entry.path);
    } else if (!enabled && this.plugins.has(name)) {
      await this.unloadPlugin(name);
    }
  }

  /**
   * Update plugin config
   */
  async setConfig(name: string, config: Record<string, any>): Promise<void> {
    const entry = this.registry.get(name);
    if (!entry) throw new Error(`Plugin not found: ${name}`);

    const plugin = this.plugins.get(name);

    // Validate config
    if (plugin?.manifest.config) {
      for (const [key, value] of Object.entries(config)) {
        const schema = plugin.manifest.config[key];
        if (!schema) continue;

        if (schema.required && value === undefined) {
          throw new Error(`Config key '${key}' is required`);
        }

        // Type check
        if (value !== undefined) {
          const actualType = Array.isArray(value) ? 'array' : typeof value;
          if (actualType !== schema.type) {
            throw new Error(`Config key '${key}' must be ${schema.type}, got ${actualType}`);
          }
        }
      }
    }

    entry.config = { ...entry.config, ...config };
    await this.saveRegistry();

    // Reinitialize plugin with new config
    if (plugin?.init) {
      await plugin.init(entry.config);
    }
  }

  /**
   * Execute hook handlers
   */
  async executeHook(hook: PluginHook, context: PluginContext): Promise<PluginContext> {
    const handlers = this.hookHandlers.get(hook) || [];
    let currentContext = context;

    for (const { plugin, handler } of handlers) {
      try {
        const result = await handler(currentContext);
        if (result) {
          currentContext = result;
        }
      } catch (error: any) {
        console.error(chalk.red(`[PluginManager] Hook error in ${plugin}.${hook}: ${error.message}`));
        this.emit('hookError', { plugin, hook, error });
      }
    }

    return currentContext;
  }

  /**
   * Get loaded plugins
   */
  getLoadedPlugins(): Array<{ name: string; version: string; hooks: PluginHook[] }> {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.manifest.name,
      version: p.manifest.version,
      hooks: p.manifest.hooks
    }));
  }

  /**
   * Get all registered plugins
   */
  getRegisteredPlugins(): PluginRegistryEntry[] {
    return Array.from(this.registry.values());
  }

  /**
   * Get plugin info
   */
  getPluginInfo(name: string): { manifest: PluginManifest; entry: PluginRegistryEntry } | null {
    const plugin = this.plugins.get(name);
    const entry = this.registry.get(name);

    if (!entry) return null;

    return {
      manifest: plugin?.manifest || { name, version: entry.version, description: '', hooks: [] },
      entry
    };
  }

  /**
   * Print plugin status
   */
  printStatus(): void {
    console.log(chalk.cyan('\n═══ Plugin System Status ═══\n'));

    const entries = this.getRegisteredPlugins();

    if (entries.length === 0) {
      console.log(chalk.gray('No plugins installed'));
      return;
    }

    for (const entry of entries) {
      const loaded = this.plugins.has(entry.name);
      const statusIcon = entry.enabled ? (loaded ? '✓' : '!') : '○';
      const statusColor = entry.enabled ? (loaded ? chalk.green : chalk.yellow) : chalk.gray;

      console.log(statusColor(`${statusIcon} ${entry.name} v${entry.version}`));
      console.log(chalk.gray(`    Enabled: ${entry.enabled}`));
      console.log(chalk.gray(`    Loaded: ${loaded}`));

      if (loaded) {
        const plugin = this.plugins.get(entry.name)!;
        console.log(chalk.gray(`    Hooks: ${plugin.manifest.hooks.join(', ')}`));
      }
    }

    console.log('');
  }

  /**
   * Cleanup
   */
  async destroy(): Promise<void> {
    for (const name of this.plugins.keys()) {
      await this.unloadPlugin(name);
    }
    this.removeAllListeners();
  }
}

// ============================================================
// Built-in Plugin Helpers
// ============================================================

/**
 * Create a simple plugin
 */
export function createPlugin(
  manifest: PluginManifest,
  handlers: Partial<Record<PluginHook, PluginHandler>>,
  options?: {
    init?: (config: Record<string, any>) => Promise<void>;
    destroy?: () => Promise<void>;
  }
): Plugin {
  return {
    manifest,
    handlers,
    init: options?.init,
    destroy: options?.destroy
  };
}

/**
 * Example: Logging plugin
 */
export const LoggingPlugin = createPlugin(
  {
    name: 'logging',
    version: '1.0.0',
    description: 'Logs all hook events',
    hooks: ['beforeTask', 'afterTask', 'onError']
  },
  {
    beforeTask: async (ctx) => {
      console.log(chalk.gray(`[LoggingPlugin] Starting task: ${ctx.task?.id}`));
      return ctx;
    },
    afterTask: async (ctx) => {
      console.log(chalk.gray(`[LoggingPlugin] Completed task: ${ctx.task?.id}`));
      return ctx;
    },
    onError: async (ctx) => {
      console.log(chalk.red(`[LoggingPlugin] Error: ${ctx.error?.message}`));
      return ctx;
    }
  }
);

/**
 * Example: Metrics plugin
 */
export const MetricsPlugin = createPlugin(
  {
    name: 'metrics',
    version: '1.0.0',
    description: 'Collects execution metrics',
    hooks: ['beforeTask', 'afterTask'],
    config: {
      enabled: {
        type: 'boolean',
        description: 'Enable metrics collection',
        default: true
      }
    }
  },
  {
    beforeTask: async (ctx) => {
      (ctx as any)._metricsStartTime = Date.now();
      return ctx;
    },
    afterTask: async (ctx) => {
      const startTime = (ctx as any)._metricsStartTime;
      if (startTime) {
        const duration = Date.now() - startTime;
        console.log(chalk.gray(`[MetricsPlugin] Task ${ctx.task?.id} took ${duration}ms`));
      }
      return ctx;
    }
  }
);

// ============================================================
// Global Instance
// ============================================================

export const pluginManager = new PluginManager();

export default {
  PluginManager,
  pluginManager,
  createPlugin,
  LoggingPlugin,
  MetricsPlugin
};
