/**
 * EnvironmentManager - Environment variable management for NativeShell
 *
 * Features:
 * - inheritEnv: boolean (inherit from process.env)
 * - additionalEnv: Record<string, string> (additional variables)
 * - blockedEnvVars: string[] (variables to remove, e.g., secrets)
 * - setEnvVar(name, value) - set a variable
 * - getEnvVar(name) - get a variable
 * - clearEnvVar(name) - remove a variable
 * - getEnvironment() - get all variables
 * - Filtering sensitive variables (API_KEY, SECRET, PASSWORD, TOKEN) from logs
 * - Predefined environment profiles (development, production, test)
 */

import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import chalk from 'chalk';

// ============================================================
// Types
// ============================================================

/**
 * Configuration for environment variable management
 */
export interface EnvironmentConfig {
  /** Whether to inherit environment variables from process.env (default: true) */
  inheritEnv: boolean;
  /** Additional environment variables to add */
  additionalEnv: Record<string, string>;
  /** Environment variables to block/remove (e.g., secrets) */
  blockedEnvVars: string[];
  /** Active environment profile */
  activeProfile?: EnvironmentProfile;
}

/**
 * Predefined environment profiles
 */
export type EnvironmentProfile = 'development' | 'production' | 'test';

// ============================================================
// Constants
// ============================================================

/**
 * Sensitive environment variable patterns for filtering from logs
 */
export const SENSITIVE_ENV_PATTERNS: RegExp[] = [
  /API[_-]?KEY/i,
  /SECRET/i,
  /PASSWORD/i,
  /TOKEN/i,
  /PRIVATE[_-]?KEY/i,
  /CREDENTIAL/i,
  /AUTH/i,
  /ACCESS[_-]?KEY/i,
  /SESSION[_-]?KEY/i,
  /ENCRYPT/i,
];

/**
 * Default blocked environment variables
 */
export const DEFAULT_BLOCKED_ENV_VARS: string[] = [
  'NPM_TOKEN',
  'GITHUB_TOKEN',
  'AWS_SECRET_ACCESS_KEY',
  'AWS_SESSION_TOKEN',
  'AZURE_CLIENT_SECRET',
  'GOOGLE_APPLICATION_CREDENTIALS',
  'DATABASE_PASSWORD',
  'DB_PASSWORD',
  'REDIS_PASSWORD',
  'MONGO_PASSWORD',
  'JWT_SECRET',
  'ENCRYPTION_KEY',
  'PRIVATE_KEY',
];

/**
 * Predefined environment profiles with their settings
 */
export const ENVIRONMENT_PROFILES: Record<EnvironmentProfile, Partial<EnvironmentConfig>> = {
  development: {
    inheritEnv: true,
    additionalEnv: {
      NODE_ENV: 'development',
      DEBUG: '*',
      LOG_LEVEL: 'debug',
    },
    blockedEnvVars: [],
  },
  production: {
    inheritEnv: true,
    additionalEnv: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
    },
    blockedEnvVars: [...DEFAULT_BLOCKED_ENV_VARS],
  },
  test: {
    inheritEnv: false,
    additionalEnv: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'warn',
      CI: 'true',
    },
    blockedEnvVars: [...DEFAULT_BLOCKED_ENV_VARS],
  },
};

/**
 * Create default environment configuration
 */
export function createDefaultEnvironmentConfig(): EnvironmentConfig {
  return {
    inheritEnv: true,
    additionalEnv: {},
    blockedEnvVars: [...DEFAULT_BLOCKED_ENV_VARS],
    activeProfile: undefined,
  };
}

// ============================================================
// EnvironmentManager Class
// ============================================================

/**
 * Manager for environment variables with profiles and sensitive filtering
 */
export class EnvironmentManager extends EventEmitter {
  private config: EnvironmentConfig;
  private managedEnv: Record<string, string> = {};
  private currentEnv: Record<string, string> = {};

  constructor(config?: Partial<EnvironmentConfig>) {
    super();
    this.config = {
      ...createDefaultEnvironmentConfig(),
      ...config,
    };
    this.rebuildEnvironment();
  }

  // ============================================================
  // Environment Variable Management
  // ============================================================

  /**
   * Set an environment variable
   */
  setEnvVar(name: string, value: string): void {
    this.managedEnv[name] = value;
    this.rebuildEnvironment();
    this.emit('envChanged', { name, value, action: 'set' });
  }

  /**
   * Get an environment variable
   */
  getEnvVar(name: string): string | undefined {
    return this.currentEnv[name];
  }

  /**
   * Clear/remove an environment variable
   */
  clearEnvVar(name: string): boolean {
    if (name in this.managedEnv) {
      delete this.managedEnv[name];
      this.rebuildEnvironment();
      this.emit('envChanged', { name, action: 'clear' });
      return true;
    }
    return false;
  }

  /**
   * Get the complete current environment
   */
  getEnvironment(): Record<string, string> {
    return { ...this.currentEnv };
  }

  /**
   * Get environment with sensitive values filtered (for logging)
   */
  getFilteredEnvironment(): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.currentEnv)) {
      if (this.isSensitiveEnvVar(key)) {
        filtered[key] = '***FILTERED***';
      } else {
        filtered[key] = value;
      }
    }
    return filtered;
  }

  /**
   * Check if an environment variable name is sensitive
   */
  isSensitiveEnvVar(name: string): boolean {
    return SENSITIVE_ENV_PATTERNS.some((pattern) => pattern.test(name));
  }

  // ============================================================
  // Profile Management
  // ============================================================

  /**
   * Set environment profile
   */
  setEnvironmentProfile(profile: EnvironmentProfile): void {
    const profileConfig = ENVIRONMENT_PROFILES[profile];
    if (!profileConfig) {
      throw new Error(`Unknown environment profile: ${profile}`);
    }

    this.config = {
      ...this.config,
      ...profileConfig,
      activeProfile: profile,
    };

    this.rebuildEnvironment();
    this.emit('profileChanged', { profile });
  }

  /**
   * Get current environment profile
   */
  getEnvironmentProfile(): EnvironmentProfile | undefined {
    return this.config.activeProfile;
  }

  /**
   * Update environment configuration
   */
  updateEnvironmentConfig(configUpdate: Partial<EnvironmentConfig>): void {
    this.config = {
      ...this.config,
      ...configUpdate,
    };
    this.rebuildEnvironment();
    this.emit('envConfigChanged', configUpdate);
  }

  // ============================================================
  // Blocked Variables Management
  // ============================================================

  /**
   * Add blocked environment variables
   */
  addBlockedEnvVars(vars: string[]): void {
    const blocked = new Set([...this.config.blockedEnvVars, ...vars]);
    this.config.blockedEnvVars = Array.from(blocked);
    this.rebuildEnvironment();
  }

  /**
   * Remove blocked environment variables
   */
  removeBlockedEnvVars(vars: string[]): void {
    const toRemove = new Set(vars);
    this.config.blockedEnvVars = this.config.blockedEnvVars.filter((v) => !toRemove.has(v));
    this.rebuildEnvironment();
  }

  /**
   * Get blocked environment variables
   */
  getBlockedEnvVars(): string[] {
    return [...this.config.blockedEnvVars];
  }

  // ============================================================
  // Environment Building
  // ============================================================

  /**
   * Rebuild environment from configuration
   */
  private rebuildEnvironment(): void {
    let env: Record<string, string> = {};

    // Step 1: Inherit from process.env if configured
    if (this.config.inheritEnv) {
      env = { ...process.env } as Record<string, string>;
    }

    // Step 2: Apply profile additional env vars
    if (this.config.activeProfile) {
      const profileConfig = ENVIRONMENT_PROFILES[this.config.activeProfile];
      if (profileConfig.additionalEnv) {
        env = { ...env, ...profileConfig.additionalEnv };
      }
    }

    // Step 3: Apply additional env vars from config
    env = { ...env, ...this.config.additionalEnv };

    // Step 4: Apply managed env vars (set via setEnvVar)
    env = { ...env, ...this.managedEnv };

    // Step 5: Remove blocked env vars
    for (const blocked of this.config.blockedEnvVars) {
      delete env[blocked];
    }

    this.currentEnv = env;
  }

  // ============================================================
  // Import/Export
  // ============================================================

  /**
   * Export environment to a file (.env format)
   */
  exportEnvironment(
    filePath: string,
    options?: {
      includeInherited?: boolean;
      filterSensitive?: boolean;
    },
  ): void {
    const includeInherited = options?.includeInherited ?? false;
    const filterSensitive = options?.filterSensitive ?? true;

    let envToExport: Record<string, string>;

    if (includeInherited) {
      envToExport = filterSensitive ? this.getFilteredEnvironment() : this.getEnvironment();
    } else {
      // Only export managed and additional env vars
      envToExport = {
        ...this.config.additionalEnv,
        ...this.managedEnv,
      };
      if (filterSensitive) {
        for (const key of Object.keys(envToExport)) {
          if (this.isSensitiveEnvVar(key)) {
            envToExport[key] = '***FILTERED***';
          }
        }
      }
    }

    const lines = Object.entries(envToExport)
      .map(([key, value]) => `${key}=${this.escapeEnvValue(value)}`)
      .join('\n');

    fs.writeFileSync(filePath, lines, 'utf-8');
  }

  /**
   * Import environment from a file (.env format)
   */
  importEnvironment(filePath: string): number {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Environment file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let imported = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue;

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (match) {
        const [, name, value] = match;
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, '');
        this.setEnvVar(name, cleanValue);
        imported++;
      }
    }

    return imported;
  }

  /**
   * Escape value for .env file format
   */
  private escapeEnvValue(value: string): string {
    if (value.includes(' ') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
    }
    return value;
  }

  // ============================================================
  // Status
  // ============================================================

  /**
   * Print environment status (with sensitive values filtered)
   */
  printStatus(): void {
    console.log(chalk.cyan('\n=== Environment Manager ===\n'));

    const profile = this.config.activeProfile;
    console.log(chalk.yellow(`  Active Profile: ${profile || 'none'}`));
    console.log(chalk.yellow(`  Inherit from process.env: ${this.config.inheritEnv}`));

    console.log(chalk.cyan('\n  Blocked Variables:'));
    for (const blocked of this.config.blockedEnvVars) {
      console.log(chalk.red(`    - ${blocked}`));
    }

    console.log(chalk.cyan('\n  Managed Variables:'));
    for (const [key, value] of Object.entries(this.managedEnv)) {
      const displayValue = this.isSensitiveEnvVar(key) ? '***FILTERED***' : value;
      console.log(chalk.green(`    ${key}=${displayValue}`));
    }

    console.log(chalk.cyan('\n  Additional Variables:'));
    for (const [key, value] of Object.entries(this.config.additionalEnv)) {
      const displayValue = this.isSensitiveEnvVar(key) ? '***FILTERED***' : value;
      console.log(chalk.blue(`    ${key}=${displayValue}`));
    }

    console.log(
      chalk.cyan(`\n  Total Environment Variables: ${Object.keys(this.currentEnv).length}`),
    );
  }

  /**
   * Get configuration
   */
  getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Get managed env vars
   */
  getManagedEnvVars(): Record<string, string> {
    return { ...this.managedEnv };
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = createDefaultEnvironmentConfig();
    this.managedEnv = {};
    this.rebuildEnvironment();
    this.emit('reset');
  }
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * Create an environment manager with a specific profile
 */
export function createEnvironmentManager(profile?: EnvironmentProfile): EnvironmentManager {
  const manager = new EnvironmentManager();
  if (profile) {
    manager.setEnvironmentProfile(profile);
  }
  return manager;
}

/**
 * Create environment manager for development
 */
export function createDevEnvironment(): EnvironmentManager {
  return createEnvironmentManager('development');
}

/**
 * Create environment manager for production
 */
export function createProdEnvironment(): EnvironmentManager {
  return createEnvironmentManager('production');
}

/**
 * Create environment manager for testing
 */
export function createTestEnvironment(): EnvironmentManager {
  return createEnvironmentManager('test');
}

export default EnvironmentManager;
