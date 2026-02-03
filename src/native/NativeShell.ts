/**
 * NativeShell - Native shell/process execution for GeminiHydra
 * Replaces @wonderwhy-er/desktop-commander
 *
 * Features:
 * - Process spawning with streaming output
 * - Interactive process support
 * - Session management
 * - Process monitoring
 * - Environment management
 */

import { spawn, ChildProcess, SpawnOptions, execSync } from 'child_process';
import { EventEmitter } from 'events';
import chalk from 'chalk';
import os from 'os';
import fs from 'fs';
import path from 'path';

// ============================================================
// Types
// ============================================================

/**
 * Supported shell types across platforms
 */
export type ShellType = 'cmd' | 'powershell' | 'pwsh' | 'bash' | 'sh' | 'zsh';

/**
 * Shell availability info
 */
export interface ShellInfo {
  type: ShellType;
  path: string;
  available: boolean;
  version?: string;
}

/**
 * Command translation mapping between shells
 */
export interface CommandMapping {
  cmd: string;
  powershell: string;
  bash: string;
}

// ============================================================
// Shell Constants and Mappings
// ============================================================

/**
 * Default shell paths for different platforms
 */
export const SHELL_PATHS: Record<ShellType, { windows: string[]; unix: string[] }> = {
  cmd: {
    windows: ['C:\\Windows\\System32\\cmd.exe', 'cmd.exe'],
    unix: []
  },
  powershell: {
    windows: [
      'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
      'powershell.exe'
    ],
    unix: []
  },
  pwsh: {
    windows: [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
      'pwsh.exe'
    ],
    unix: ['/usr/local/bin/pwsh', '/usr/bin/pwsh', 'pwsh']
  },
  bash: {
    windows: [
      'C:\\Program Files\\Git\\bin\\bash.exe',
      'C:\\Program Files (x86)\\Git\\bin\\bash.exe',
      'C:\\Windows\\System32\\bash.exe',
      'bash.exe'
    ],
    unix: ['/bin/bash', '/usr/bin/bash', '/usr/local/bin/bash']
  },
  sh: {
    windows: [],
    unix: ['/bin/sh', '/usr/bin/sh']
  },
  zsh: {
    windows: [],
    unix: ['/bin/zsh', '/usr/bin/zsh', '/usr/local/bin/zsh']
  }
};

/**
 * Command translation map between shells
 * Maps common operations from one shell syntax to another
 */
export const COMMAND_TRANSLATIONS: CommandMapping[] = [
  // Directory listing
  { cmd: 'dir', powershell: 'Get-ChildItem', bash: 'ls' },
  { cmd: 'dir /b', powershell: 'Get-ChildItem -Name', bash: 'ls -1' },
  { cmd: 'dir /s', powershell: 'Get-ChildItem -Recurse', bash: 'ls -R' },
  { cmd: 'dir /a', powershell: 'Get-ChildItem -Force', bash: 'ls -la' },

  // File operations
  { cmd: 'copy', powershell: 'Copy-Item', bash: 'cp' },
  { cmd: 'xcopy', powershell: 'Copy-Item -Recurse', bash: 'cp -r' },
  { cmd: 'del', powershell: 'Remove-Item', bash: 'rm' },
  { cmd: 'del /q', powershell: 'Remove-Item -Force', bash: 'rm -f' },
  { cmd: 'rmdir', powershell: 'Remove-Item -Recurse', bash: 'rm -rf' },
  { cmd: 'rd /s /q', powershell: 'Remove-Item -Recurse -Force', bash: 'rm -rf' },
  { cmd: 'move', powershell: 'Move-Item', bash: 'mv' },
  { cmd: 'ren', powershell: 'Rename-Item', bash: 'mv' },
  { cmd: 'mkdir', powershell: 'New-Item -ItemType Directory', bash: 'mkdir' },
  { cmd: 'md', powershell: 'New-Item -ItemType Directory', bash: 'mkdir -p' },

  // File content
  { cmd: 'type', powershell: 'Get-Content', bash: 'cat' },
  { cmd: 'more', powershell: 'Get-Content | Out-Host -Paging', bash: 'less' },
  { cmd: 'find', powershell: 'Select-String', bash: 'grep' },
  { cmd: 'findstr', powershell: 'Select-String', bash: 'grep' },

  // Navigation
  { cmd: 'cd', powershell: 'Set-Location', bash: 'cd' },
  { cmd: 'chdir', powershell: 'Set-Location', bash: 'cd' },
  { cmd: 'pushd', powershell: 'Push-Location', bash: 'pushd' },
  { cmd: 'popd', powershell: 'Pop-Location', bash: 'popd' },

  // Environment
  { cmd: 'set', powershell: '$env:', bash: 'export' },
  { cmd: 'echo', powershell: 'Write-Output', bash: 'echo' },
  { cmd: 'cls', powershell: 'Clear-Host', bash: 'clear' },

  // Process
  { cmd: 'tasklist', powershell: 'Get-Process', bash: 'ps' },
  { cmd: 'taskkill', powershell: 'Stop-Process', bash: 'kill' },
  { cmd: 'taskkill /f', powershell: 'Stop-Process -Force', bash: 'kill -9' },

  // Network
  { cmd: 'ipconfig', powershell: 'Get-NetIPConfiguration', bash: 'ifconfig' },
  { cmd: 'ping', powershell: 'Test-Connection', bash: 'ping' },
  { cmd: 'netstat', powershell: 'Get-NetTCPConnection', bash: 'netstat' },

  // System info
  { cmd: 'hostname', powershell: '$env:COMPUTERNAME', bash: 'hostname' },
  { cmd: 'whoami', powershell: '$env:USERNAME', bash: 'whoami' },
  { cmd: 'ver', powershell: '$PSVersionTable', bash: 'uname -a' },

  // File attributes
  { cmd: 'attrib', powershell: 'Get-ItemProperty', bash: 'stat' },

  // Help
  { cmd: 'help', powershell: 'Get-Help', bash: 'man' }
];

/**
 * Shell fallback order for each platform
 */
export const SHELL_FALLBACK_ORDER: Record<'windows' | 'unix', ShellType[]> = {
  windows: ['powershell', 'pwsh', 'cmd', 'bash'],
  unix: ['bash', 'zsh', 'sh', 'pwsh']
};

export interface ProcessInfo {
  pid: number;
  command: string;
  args: string[];
  status: 'running' | 'completed' | 'error' | 'killed' | 'zombie';
  exitCode?: number;
  startTime: Date;
  endTime?: Date;
  output: string[];
  errors: string[];
  // Extended tracking fields for zombie/orphan detection
  parentPid?: number;
  childPids: number[];
  processRef?: ChildProcess;
  killSignal?: NodeJS.Signals;
  isOrphaned?: boolean;
  lastHealthCheck?: Date;
}

/**
 * Extended process tracking for zombie detection
 */
export interface ZombieProcessInfo {
  pid: number;
  command: string;
  detectedAt: Date;
  reason: 'no_response' | 'orphaned' | 'stuck' | 'timeout';
}

/**
 * Graceful shutdown configuration
 */
export interface GracefulShutdownConfig {
  /** Time to wait for SIGTERM before SIGKILL (ms) */
  gracePeriod: number;
  /** Whether to kill entire process tree */
  killProcessTree: boolean;
  /** Callback when process doesn't respond to SIGTERM */
  onForceKill?: (pid: number) => void;
}

/**
 * Process cleanup statistics
 */
export interface CleanupStats {
  zombiesKilled: number;
  orphansKilled: number;
  processesTerminated: number;
  errors: string[];
}

/**
 * Output chunk with timestamp for combined stream ordering
 */
export interface OutputChunk {
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: number;
}

/**
 * Stderr analysis result
 */
export interface StderrAnalysis {
  hasErrors: boolean;
  hasWarnings: boolean;
  errorLines: string[];
  warningLines: string[];
  errorCount: number;
  warningCount: number;
}

/**
 * Extended process result with separate streams
 */
export interface ProcessResult {
  pid: number;
  exitCode: number;
  signal: string | null;
  stdout: string;
  stderr: string;
  /** Combined output in order of arrival */
  combined: string;
  /** Raw chunks with timestamps for precise ordering */
  chunks: OutputChunk[];
  duration: number;
  /** Analysis of stderr for errors/warnings */
  stderrAnalysis: StderrAnalysis;

  /**
   * Check if stderr contains errors
   */
  hasErrors(): boolean;

  /**
   * Check if stderr contains warnings
   */
  hasWarnings(): boolean;

  /**
   * Get colorized output (stderr in red)
   */
  getColorizedOutput(): string;
}

/**
 * Execution options for exec/run commands
 */
export interface ExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
  /** Keep stdout and stderr separate (default: true) */
  separateStreams?: boolean;
  /** Redirect stderr to stdout stream (default: false) */
  stderrToStdout?: boolean;
  /** Callback for stdout data */
  onStdout?: (data: string, timestamp: number) => void;
  /** Callback for stderr data */
  onStderr?: (data: string, timestamp: number) => void;
  /** Colorize stderr in logs (default: true) */
  colorizeStderr?: boolean;
}

// ============================================================
// Streaming Types
// ============================================================

/**
 * Progress information extracted from output
 */
export interface ProgressInfo {
  percent?: number;
  current?: number;
  total?: number;
  message?: string;
  raw: string;
}

/**
 * Options for streaming execution
 */
export interface StreamingExecOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
  /** Callback for each output chunk */
  onOutput?: (chunk: OutputChunk) => void;
  /** Whether to buffer all output (default: true) */
  bufferOutput?: boolean;
  /** Maximum output buffer size in bytes (default: 10MB) */
  maxOutputSize?: number;
}

/**
 * Options for progress execution
 */
export interface ProgressExecOptions extends StreamingExecOptions {
  /** Custom progress patterns to detect */
  progressPatterns?: RegExp[];
}

/**
 * Result from streaming execution
 */
export interface StreamingExecResult {
  pid: number;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  chunks: OutputChunk[];
  truncated: boolean;
}

/**
 * Pipe options for command chaining
 */
export interface PipeOptions {
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  shell?: string;
  /** Callback for intermediate output */
  onIntermediateOutput?: (stage: number, chunk: OutputChunk) => void;
  /** Maximum output buffer size in bytes */
  maxOutputSize?: number;
}

/**
 * Default maximum output buffer size (10MB)
 */
export const DEFAULT_MAX_OUTPUT_SIZE = 10 * 1024 * 1024;

/**
 * Default progress patterns for common tools
 */
export const DEFAULT_PROGRESS_PATTERNS: RegExp[] = [
  // Percentage patterns: "50%", "50.5%", "Progress: 50%"
  /(\d+(?:\.\d+)?)\s*%/,
  // Progress bar patterns: "[=====>    ]", "[#####     ]"
  /\[([=>#\-]+)\s*\]/,
  // Fraction patterns: "5/10", "5 of 10", "5 / 10"
  /(\d+)\s*(?:\/|of)\s*(\d+)/i,
  // Download patterns: "Downloading...", "downloading file.zip"
  /downloading\s+(.+)/i,
  // npm/yarn patterns: "added 100 packages"
  /added\s+(\d+)\s+packages?/i,
  // Git patterns: "Receiving objects: 50%"
  /(?:Receiving|Resolving|Compressing)\s+\w+:\s*(\d+)%/,
  // Pip patterns: "Installing collected packages"
  /Installing\s+(.+)/i,
  // Generic progress: "Step 1/5", "Stage 2 of 4"
  /(?:Step|Stage)\s+(\d+)\s*(?:\/|of)\s*(\d+)/i
];

export interface ShellSession {
  id: string;
  shell: string;
  cwd: string;
  env: Record<string, string>;
  process?: ChildProcess;
  history: string[];
  created: Date;
}

export interface NativeShellConfig {
  defaultShell?: string;
  /** Preferred shell type */
  preferredShell?: ShellType;
  defaultTimeout?: number;
  maxProcesses?: number;
  cwd?: string;
  env?: Record<string, string>;
  timeoutConfig?: ShellTimeoutConfig;
  /** Whether to inherit cwd from parent process (default: true if cwd not specified) */
  inheritCwd?: boolean;
  /** Environment variable configuration */
  environmentConfig?: EnvironmentConfig;
  /** Enable automatic shell fallback when preferred shell is unavailable */
  autoFallback?: boolean;
}

// ============================================================
// Environment Configuration
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
  /ENCRYPT/i
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
  'PRIVATE_KEY'
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
      LOG_LEVEL: 'debug'
    },
    blockedEnvVars: []
  },
  production: {
    inheritEnv: true,
    additionalEnv: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info'
    },
    blockedEnvVars: [...DEFAULT_BLOCKED_ENV_VARS]
  },
  test: {
    inheritEnv: false,
    additionalEnv: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'warn',
      CI: 'true'
    },
    blockedEnvVars: [...DEFAULT_BLOCKED_ENV_VARS]
  }
};

/**
 * Create default environment configuration
 */
function createDefaultEnvironmentConfig(): EnvironmentConfig {
  return {
    inheritEnv: true,
    additionalEnv: {},
    blockedEnvVars: [...DEFAULT_BLOCKED_ENV_VARS],
    activeProfile: undefined
  };
}

// ============================================================
// Script Execution Types
// ============================================================

/**
 * Options for secure script execution
 */
export interface ScriptExecOptions {
  /** Working directory */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Execution timeout in milliseconds */
  timeout?: number;
  /** Enable sandbox mode (restricted imports for Python) */
  sandbox?: boolean;
  /** Log execution details */
  logExecution?: boolean;
}

/**
 * Script validation result
 */
export interface ScriptValidationResult {
  valid: boolean;
  error?: string;
  scriptPath?: string;
  interpreter?: string;
  extension?: string;
}

/**
 * Execution log entry
 */
export interface ScriptExecutionLog {
  timestamp: Date;
  interpreter: string;
  scriptPath?: string;
  inlineScript?: boolean;
  args: string[];
  cwd: string;
  sandbox: boolean;
  exitCode?: number;
  duration?: number;
  error?: string;
}

/**
 * Allowed file extensions for script validation
 */
export const ALLOWED_SCRIPT_EXTENSIONS: Record<string, string[]> = {
  python: ['.py', '.pyw'],
  node: ['.js', '.mjs', '.cjs'],
  bash: ['.sh', '.bash'],
  powershell: ['.ps1', '.psm1', '.psd1']
};

/**
 * Python sandbox - restricted imports
 * These modules are blocked in sandbox mode
 */
export const PYTHON_SANDBOX_BLOCKED_IMPORTS = [
  'os',
  'subprocess',
  'sys',
  'shutil',
  'socket',
  'ctypes',
  'multiprocessing',
  'threading',
  '_thread',
  'asyncio.subprocess',
  'importlib',
  '__import__',
  'builtins',
  'code',
  'codeop',
  'pty',
  'pdb',
  'pickle',
  'shelve',
  'tempfile',
  'pathlib',
  'glob',
  'fnmatch',
  'linecache',
  'zipimport',
  'pkgutil',
  'modulefinder',
  'runpy'
];

// ============================================================
// CWD Validation Error
// ============================================================

export class CwdValidationError extends Error {
  constructor(
    public readonly requestedCwd: string,
    public readonly reason: 'not_exists' | 'not_directory' | 'no_access'
  ) {
    const messages = {
      not_exists: `Working directory does not exist: ${requestedCwd}`,
      not_directory: `Path is not a directory: ${requestedCwd}`,
      no_access: `Cannot access working directory: ${requestedCwd}`
    };
    super(messages[reason]);
    this.name = 'CwdValidationError';
  }
}

/**
 * Script validation error
 */
export class ScriptValidationError extends Error {
  constructor(
    public readonly scriptPath: string,
    public readonly reason: 'not_exists' | 'invalid_extension' | 'no_read_access' | 'sandbox_violation'
  ) {
    const messages = {
      not_exists: `Script file does not exist: ${scriptPath}`,
      invalid_extension: `Invalid script extension: ${scriptPath}`,
      no_read_access: `Cannot read script file: ${scriptPath}`,
      sandbox_violation: `Script contains blocked imports (sandbox mode): ${scriptPath}`
    };
    super(messages[reason]);
    this.name = 'ScriptValidationError';
  }
}

// ============================================================
// Timeout Configuration
// ============================================================

/**
 * Timeout configuration for shell commands
 */
export interface ShellTimeoutConfig {
  /** Default timeout in milliseconds (default: 120000 = 2 minutes) */
  defaultTimeout: number;
  /** Maximum allowed timeout in milliseconds (default: 600000 = 10 minutes) */
  maxTimeout: number;
  /** Per-command timeout overrides */
  perCommandTimeouts: Map<string, number>;
}

/**
 * Predefined timeout profiles
 */
export type TimeoutProfile = 'quick' | 'normal' | 'long' | 'build';

/**
 * Timeout profile values in milliseconds
 */
export const TIMEOUT_PROFILES: Record<TimeoutProfile, number> = {
  quick: 10000,    // 10 seconds - for simple commands
  normal: 120000,  // 2 minutes - default for most operations
  long: 300000,    // 5 minutes - for longer operations
  build: 600000    // 10 minutes - for build processes
};

/**
 * Create default timeout configuration
 */
function createDefaultTimeoutConfig(): ShellTimeoutConfig {
  return {
    defaultTimeout: TIMEOUT_PROFILES.normal,  // 120s default
    maxTimeout: TIMEOUT_PROFILES.build,       // 600s max
    perCommandTimeouts: new Map()
  };
}

// ============================================================
// Stderr Analysis Utilities
// ============================================================

/**
 * Error patterns for detecting errors in stderr
 */
const ERROR_PATTERNS: RegExp[] = [
  /\berror\b/i,
  /\bfailed\b/i,
  /\bfailure\b/i,
  /\bexception\b/i,
  /\bfatal\b/i,
  /\bcritical\b/i,
  /\baborted\b/i,
  /\bpanic\b/i,
  /\bsegmentation fault\b/i,
  /\bsegfault\b/i,
  /\baccess denied\b/i,
  /\bpermission denied\b/i,
  /\bnot found\b/i,
  /\bcommand not found\b/i,
  /\bno such file\b/i,
  /\bsyntax error\b/i,
  /\btype error\b/i,
  /\breference error\b/i,
  /^E:/i,          // npm-style errors
  /^ERR!/i,        // npm errors
  /^\[ERROR\]/i,   // bracketed errors
  /^error\[/i,     // Rust-style errors
];

/**
 * Warning patterns for detecting warnings in stderr
 */
const WARNING_PATTERNS: RegExp[] = [
  /\bwarning\b/i,
  /\bwarn\b/i,
  /\bdeprecated\b/i,
  /\bdeprecation\b/i,
  /\bcaution\b/i,
  /\battention\b/i,
  /^W:/i,          // npm-style warnings
  /^WARN/i,        // npm warnings
  /^\[WARN/i,      // bracketed warnings
  /^\[WARNING\]/i, // bracketed warnings
  /^warning\[/i,   // Rust-style warnings
];

/**
 * Analyze stderr content for errors and warnings
 */
export function analyzeStderr(stderr: string): StderrAnalysis {
  const lines = stderr.split('\n').filter(line => line.trim().length > 0);
  const errorLines: string[] = [];
  const warningLines: string[] = [];

  for (const line of lines) {
    const isError = ERROR_PATTERNS.some(pattern => pattern.test(line));
    const isWarning = WARNING_PATTERNS.some(pattern => pattern.test(line));

    if (isError) {
      errorLines.push(line);
    } else if (isWarning) {
      warningLines.push(line);
    }
  }

  return {
    hasErrors: errorLines.length > 0,
    hasWarnings: warningLines.length > 0,
    errorLines,
    warningLines,
    errorCount: errorLines.length,
    warningCount: warningLines.length
  };
}

/**
 * Create a ProcessResult object with methods
 */
function createProcessResult(
  pid: number,
  exitCode: number,
  signal: string | null,
  stdout: string,
  stderr: string,
  combined: string,
  chunks: OutputChunk[],
  duration: number,
  stderrAnalysis: StderrAnalysis
): ProcessResult {
  return {
    pid,
    exitCode,
    signal,
    stdout,
    stderr,
    combined,
    chunks,
    duration,
    stderrAnalysis,

    hasErrors(): boolean {
      return this.stderrAnalysis.hasErrors || this.exitCode !== 0;
    },

    hasWarnings(): boolean {
      return this.stderrAnalysis.hasWarnings;
    },

    getColorizedOutput(): string {
      return this.chunks.map(chunk => {
        if (chunk.type === 'stderr') {
          return chalk.red(chunk.data);
        }
        return chunk.data;
      }).join('');
    }
  };
}

// ============================================================
// NativeShell Class
// ============================================================

export class NativeShell extends EventEmitter {
  private processes: Map<number, ProcessInfo> = new Map();
  private sessions: Map<string, ShellSession> = new Map();
  private config: Required<Omit<NativeShellConfig, 'timeoutConfig' | 'inheritCwd' | 'environmentConfig' | 'preferredShell'>> & { environmentConfig: EnvironmentConfig; preferredShell?: ShellType };
  private timeoutConfig: ShellTimeoutConfig;
  private processCounter = 0;
  private activeTimeoutWarnings: Map<number, NodeJS.Timeout> = new Map();

  // Environment variables managed by this shell instance
  private managedEnv: Record<string, string> = {};

  // Working directory management
  private _defaultCwd: string = process.cwd();
  private _inheritCwd: boolean = true;

  // Zombie/orphan process tracking
  private zombieProcesses: Map<number, ZombieProcessInfo> = new Map();
  private zombieCleanupInterval: NodeJS.Timeout | null = null;
  private readonly ZOMBIE_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly ZOMBIE_TIMEOUT = 60000; // 1 minute without activity = zombie
  private readonly GRACEFUL_SHUTDOWN_TIMEOUT = 5000; // 5 seconds grace period
  private isShuttingDown = false;

  constructor(config: NativeShellConfig = {}) {
    super();

    const isWindows = os.platform() === 'win32';

    // Initialize timeout configuration
    this.timeoutConfig = config.timeoutConfig || createDefaultTimeoutConfig();

    // Override defaultTimeout if provided at top level (backward compatibility)
    if (config.defaultTimeout !== undefined) {
      this.timeoutConfig.defaultTimeout = config.defaultTimeout;
    }

    // Initialize environment configuration
    const envConfig = config.environmentConfig || createDefaultEnvironmentConfig();

    // Initialize working directory management
    this._inheritCwd = config.inheritCwd ?? (config.cwd === undefined);
    const initialCwd = config.cwd || process.cwd();
    this._defaultCwd = initialCwd;

    this.config = {
      defaultShell: config.defaultShell || (isWindows ? 'powershell.exe' : '/bin/bash'),
      defaultTimeout: this.timeoutConfig.defaultTimeout,  // Use 120s default now
      maxProcesses: config.maxProcesses || 50,
      cwd: initialCwd,
      env: {},  // Will be built dynamically
      preferredShell: config.preferredShell,
      autoFallback: config.autoFallback ?? true,
      environmentConfig: envConfig
    };

    // Build initial environment
    this.rebuildEnvironment();

    // Log initial cwd
    this.logCwdChange(undefined, this.config.cwd, 'initialization');

    // Start periodic zombie cleanup
    this.startZombieCleanup();

    // Setup graceful shutdown handlers
    this.setupShutdownHandlers();
  }

  // ============================================================
  // Working Directory Management
  // ============================================================

  /**
   * Validate that a path exists and is a directory
   * @throws CwdValidationError if validation fails
   */
  private validateCwd(cwdPath: string): void {
    try {
      const resolvedPath = path.resolve(cwdPath);

      if (!fs.existsSync(resolvedPath)) {
        throw new CwdValidationError(cwdPath, 'not_exists');
      }

      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        throw new CwdValidationError(cwdPath, 'not_directory');
      }

      // Try to access the directory (read permissions)
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch (error) {
      if (error instanceof CwdValidationError) {
        throw error;
      }
      throw new CwdValidationError(cwdPath, 'no_access');
    }
  }

  /**
   * Log working directory change
   */
  private logCwdChange(oldCwd: string | undefined, newCwd: string, reason: string): void {
    const timestamp = new Date().toISOString();
    const message = oldCwd
      ? `[${timestamp}] CWD changed: "${oldCwd}" -> "${newCwd}" (${reason})`
      : `[${timestamp}] CWD set: "${newCwd}" (${reason})`;

    this.emit('cwd-change', { oldCwd, newCwd, reason, timestamp });

    // Also log to console in debug mode
    if (process.env.DEBUG || process.env.NATIVE_SHELL_DEBUG) {
      console.log(chalk.yellow('[NativeShell]'), message);
    }
  }

  /**
   * Resolve cwd for command execution
   * Validates and returns the effective cwd
   */
  private resolveCwd(optionsCwd?: string): string {
    let effectiveCwd: string;

    if (optionsCwd) {
      effectiveCwd = path.resolve(optionsCwd);
    } else if (this._inheritCwd) {
      // If inheritCwd is enabled, always use current process.cwd()
      effectiveCwd = process.cwd();
    } else {
      effectiveCwd = this.config.cwd;
    }

    // Validate the cwd
    this.validateCwd(effectiveCwd);

    return effectiveCwd;
  }

  /**
   * Set the default working directory
   * @param cwdPath - Path to set as default working directory
   * @throws CwdValidationError if path is invalid
   */
  setDefaultCwd(cwdPath: string): void {
    const resolvedPath = path.resolve(cwdPath);
    this.validateCwd(resolvedPath);

    const oldCwd = this._defaultCwd;
    this._defaultCwd = resolvedPath;
    this.config.cwd = resolvedPath;

    this.logCwdChange(oldCwd, resolvedPath, 'setDefaultCwd');
  }

  /**
   * Get the current working directory
   * @returns Current effective working directory (respects inheritCwd setting)
   */
  getCwd(): string {
    if (this._inheritCwd) {
      return process.cwd();
    }
    return this._defaultCwd;
  }

  /**
   * Get the configured default cwd (ignoring inheritCwd)
   */
  getConfiguredCwd(): string {
    return this._defaultCwd;
  }

  /**
   * Check if cwd inheritance is enabled
   */
  isInheritCwdEnabled(): boolean {
    return this._inheritCwd;
  }

  /**
   * Enable or disable cwd inheritance from parent process
   * @param inherit - Whether to inherit cwd from parent process
   */
  setInheritCwd(inherit: boolean): void {
    const oldValue = this._inheritCwd;
    this._inheritCwd = inherit;

    if (oldValue !== inherit) {
      const effectiveCwd = inherit ? process.cwd() : this._defaultCwd;
      this.logCwdChange(
        oldValue ? process.cwd() : this._defaultCwd,
        effectiveCwd,
        `inheritCwd ${inherit ? 'enabled' : 'disabled'}`
      );
    }
  }

  /**
   * Execute an async function in the context of a specific working directory
   * Temporarily changes the default cwd, executes the function, then restores
   * @param cwdPath - Working directory to use
   * @param fn - Async function to execute
   * @returns Result of the function
   */
  async withCwd<T>(cwdPath: string, fn: () => Promise<T>): Promise<T> {
    const resolvedPath = path.resolve(cwdPath);
    this.validateCwd(resolvedPath);

    const previousCwd = this._defaultCwd;
    const previousInheritCwd = this._inheritCwd;

    try {
      // Temporarily set cwd and disable inherit
      this._defaultCwd = resolvedPath;
      this.config.cwd = resolvedPath;
      this._inheritCwd = false;

      this.logCwdChange(previousCwd, resolvedPath, 'withCwd enter');

      // Execute the function
      return await fn();
    } finally {
      // Restore previous cwd settings
      this._defaultCwd = previousCwd;
      this.config.cwd = previousCwd;
      this._inheritCwd = previousInheritCwd;

      this.logCwdChange(resolvedPath, previousCwd, 'withCwd exit');
    }
  }

  /**
   * Synchronous version of withCwd for non-async operations
   * @param cwdPath - Working directory to use
   * @param fn - Sync function to execute
   * @returns Result of the function
   */
  withCwdSync<T>(cwdPath: string, fn: () => T): T {
    const resolvedPath = path.resolve(cwdPath);
    this.validateCwd(resolvedPath);

    const previousCwd = this._defaultCwd;
    const previousInheritCwd = this._inheritCwd;

    try {
      this._defaultCwd = resolvedPath;
      this.config.cwd = resolvedPath;
      this._inheritCwd = false;

      this.logCwdChange(previousCwd, resolvedPath, 'withCwdSync enter');

      return fn();
    } finally {
      this._defaultCwd = previousCwd;
      this.config.cwd = previousCwd;
      this._inheritCwd = previousInheritCwd;

      this.logCwdChange(resolvedPath, previousCwd, 'withCwdSync exit');
    }
  }

  /**
   * Check if a directory exists and is accessible
   * @param cwdPath - Path to check
   * @returns true if directory exists and is accessible
   */
  cwdExists(cwdPath: string): boolean {
    try {
      this.validateCwd(cwdPath);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================================
  // Timeout Configuration Methods
  // ============================================================

  /**
   * Set default timeout for all commands
   * @param ms Timeout in milliseconds
   */
  setDefaultTimeout(ms: number): void {
    const clampedTimeout = Math.min(ms, this.timeoutConfig.maxTimeout);
    this.timeoutConfig.defaultTimeout = clampedTimeout;
    this.config.defaultTimeout = clampedTimeout;

    if (ms > this.timeoutConfig.maxTimeout) {
      console.warn(chalk.yellow(
        `[NativeShell] Timeout clamped to max: ${ms}ms -> ${this.timeoutConfig.maxTimeout}ms`
      ));
    }
  }

  /**
   * Set timeout for a specific command pattern
   * @param commandPattern Command or pattern to match (supports basic globbing with *)
   * @param ms Timeout in milliseconds
   */
  setCommandTimeout(commandPattern: string, ms: number): void {
    const clampedTimeout = Math.min(ms, this.timeoutConfig.maxTimeout);
    this.timeoutConfig.perCommandTimeouts.set(commandPattern, clampedTimeout);

    if (ms > this.timeoutConfig.maxTimeout) {
      console.warn(chalk.yellow(
        `[NativeShell] Timeout for "${commandPattern}" clamped to max: ${ms}ms -> ${this.timeoutConfig.maxTimeout}ms`
      ));
    }
  }

  /**
   * Get timeout for a specific command
   * @param command The command to get timeout for
   */
  getTimeoutForCommand(command: string): number {
    // Check per-command timeouts first
    for (const [pattern, timeout] of this.timeoutConfig.perCommandTimeouts.entries()) {
      if (this.matchCommandPattern(command, pattern)) {
        return timeout;
      }
    }
    return this.timeoutConfig.defaultTimeout;
  }

  /**
   * Apply a predefined timeout profile
   * @param profile The profile name
   */
  applyTimeoutProfile(profile: TimeoutProfile): void {
    const timeout = TIMEOUT_PROFILES[profile];
    this.setDefaultTimeout(timeout);
    console.log(chalk.gray(`[NativeShell] Applied timeout profile: ${profile} (${timeout}ms)`));
  }

  /**
   * Set maximum allowed timeout
   * @param ms Maximum timeout in milliseconds
   */
  setMaxTimeout(ms: number): void {
    this.timeoutConfig.maxTimeout = ms;

    // Clamp existing timeouts if they exceed new max
    if (this.timeoutConfig.defaultTimeout > ms) {
      this.timeoutConfig.defaultTimeout = ms;
      this.config.defaultTimeout = ms;
    }

    for (const [pattern, timeout] of this.timeoutConfig.perCommandTimeouts.entries()) {
      if (timeout > ms) {
        this.timeoutConfig.perCommandTimeouts.set(pattern, ms);
      }
    }
  }

  /**
   * Get current timeout configuration
   */
  getTimeoutConfig(): Readonly<ShellTimeoutConfig> {
    return { ...this.timeoutConfig };
  }

  /**
   * Clear command-specific timeouts
   */
  clearCommandTimeouts(): void {
    this.timeoutConfig.perCommandTimeouts.clear();
  }

  /**
   * Match command against a pattern (supports * wildcard)
   */
  private matchCommandPattern(command: string, pattern: string): boolean {
    // Simple wildcard matching
    if (pattern === '*') return true;

    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')  // Escape special regex chars
      .replace(/\*/g, '.*');                    // Convert * to .*

    return new RegExp(`^${regexPattern}`, 'i').test(command);
  }

  /**
   * Setup timeout warning when approaching threshold (80%)
   */
  private setupTimeoutWarning(pid: number, command: string, timeout: number): NodeJS.Timeout {
    const warningThreshold = 0.8;  // 80%
    const warningTime = timeout * warningThreshold;

    const warningTimer = setTimeout(() => {
      const info = this.processes.get(pid);
      if (info && info.status === 'running') {
        const remainingMs = timeout - warningTime;
        console.warn(chalk.yellow(
          `[NativeShell] WARNING: Process ${pid} (${command.substring(0, 50)}${command.length > 50 ? '...' : ''}) ` +
          `approaching timeout - ${Math.round(remainingMs / 1000)}s remaining`
        ));
        this.emit('timeout-warning', {
          pid,
          command,
          elapsed: warningTime,
          remaining: remainingMs,
          timeout
        });
      }
      this.activeTimeoutWarnings.delete(pid);
    }, warningTime);

    this.activeTimeoutWarnings.set(pid, warningTimer);
    return warningTimer;
  }

  /**
   * Clear timeout warning for a process
   */
  private clearTimeoutWarning(pid: number): void {
    const timer = this.activeTimeoutWarnings.get(pid);
    if (timer) {
      clearTimeout(timer);
      this.activeTimeoutWarnings.delete(pid);
    }
  }

  // ============================================================
  // Command Execution
  // ============================================================

  /**
   * Execute command and wait for completion with extended stream handling
   */
  async exec(command: string, options?: ExecOptions): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      // Use command-specific timeout or provided timeout or default
      const timeout = options?.timeout || this.getTimeoutForCommand(command);
      const shell = options?.shell || this.config.defaultShell;

      // Use resolveCwd for proper cwd handling with validation
      let cwd: string;
      try {
        cwd = this.resolveCwd(options?.cwd);
      } catch (error) {
        return reject(error);
      }

      const env = { ...this.config.env, ...options?.env };
      const separateStreams = options?.separateStreams ?? true;
      const stderrToStdout = options?.stderrToStdout ?? false;
      const colorizeStderr = options?.colorizeStderr ?? true;

      const isWindows = os.platform() === 'win32';
      let proc: ChildProcess;

      if (isWindows) {
        // Windows: use cmd or powershell
        if (shell.includes('powershell')) {
          proc = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
            cwd,
            env,
            shell: false
          });
        } else {
          proc = spawn('cmd.exe', ['/c', command], {
            cwd,
            env,
            shell: false
          });
        }
      } else {
        // Unix: use bash
        proc = spawn(shell, ['-c', command], {
          cwd,
          env,
          shell: false
        });
      }

      const pid = proc.pid || ++this.processCounter;
      const stdoutChunks: string[] = [];
      const stderrChunks: string[] = [];
      const allChunks: OutputChunk[] = [];
      let processSignal: string | null = null;

      // Track process with extended info
      const info: ProcessInfo = {
        pid,
        command,
        args: [],
        status: 'running',
        startTime: new Date(),
        output: [],
        errors: [],
        childPids: [],
        processRef: proc,
        lastHealthCheck: new Date()
      };
      this.processes.set(pid, info);

      // Setup timeout warning at 80%
      this.setupTimeoutWarning(pid, command, timeout);

      // Timeout handler with process tree kill
      const timeoutId = setTimeout(async () => {
        this.clearTimeoutWarning(pid);
        this.emit('timeout', { pid, command, timeout });
        await this.killProcessTree(pid, 'SIGKILL');
        info.status = 'killed';
        info.killSignal = 'SIGKILL';
        info.endTime = new Date();
        reject(new Error(`Process timeout after ${timeout}ms`));
      }, timeout);

      proc.stdout?.on('data', (data) => {
        const text = data.toString();
        const timestamp = Date.now();

        stdoutChunks.push(text);
        allChunks.push({ type: 'stdout', data: text, timestamp });
        info.output.push(text);
        info.lastHealthCheck = new Date();

        // Call user callback
        options?.onStdout?.(text, timestamp);

        this.emit('stdout', { pid, data: text, timestamp });
      });

      proc.stderr?.on('data', (data) => {
        const text = data.toString();
        const timestamp = Date.now();

        if (stderrToStdout) {
          // Redirect stderr to stdout
          stdoutChunks.push(text);
          allChunks.push({ type: 'stdout', data: text, timestamp });
          info.output.push(text);
        } else {
          stderrChunks.push(text);
          allChunks.push({ type: 'stderr', data: text, timestamp });
          info.errors.push(text);
        }

        info.lastHealthCheck = new Date();

        // Call user callback
        options?.onStderr?.(text, timestamp);

        // Emit with optional coloring
        const emitData = colorizeStderr ? chalk.red(text) : text;
        this.emit('stderr', { pid, data: text, colorized: emitData, timestamp });
      });

      proc.on('error', (error) => {
        clearTimeout(timeoutId);
        this.clearTimeoutWarning(pid);
        info.status = 'error';
        info.endTime = new Date();
        info.processRef = undefined;
        reject(error);
      });

      proc.on('close', (code, signal) => {
        clearTimeout(timeoutId);
        this.clearTimeoutWarning(pid);
        processSignal = signal;
        info.status = code === 0 ? 'completed' : 'error';
        info.exitCode = code || 0;
        info.endTime = new Date();
        info.processRef = undefined;

        const stdout = stdoutChunks.join('');
        const stderr = stderrChunks.join('');

        // Build combined output in order of arrival
        const combined = allChunks
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(chunk => chunk.data)
          .join('');

        // Analyze stderr for errors/warnings
        const stderrAnalysis = analyzeStderr(stderr);

        resolve(createProcessResult(
          pid,
          code || 0,
          processSignal,
          stdout,
          stderr,
          combined,
          allChunks,
          Date.now() - startTime,
          stderrAnalysis
        ));
      });
    });
  }

  // ============================================================
  // Streaming Execution
  // ============================================================

  /**
   * Execute command with streaming output as AsyncIterable
   */
  async *execStreaming(command: string, options?: StreamingExecOptions): AsyncIterable<OutputChunk> {
    const timeout = options?.timeout || this.config.defaultTimeout;
    const shell = options?.shell || this.config.defaultShell;
    const cwd = options?.cwd || this.config.cwd;
    const env = { ...this.config.env, ...options?.env };
    const bufferOutput = options?.bufferOutput ?? true;
    const maxOutputSize = options?.maxOutputSize ?? DEFAULT_MAX_OUTPUT_SIZE;
    const onOutput = options?.onOutput;
    const isWindows = os.platform() === 'win32';
    const proc: ChildProcess = isWindows
      ? (shell.includes('powershell') ? spawn('powershell.exe', ['-NoProfile', '-Command', command], { cwd, env, shell: false }) : spawn('cmd.exe', ['/c', command], { cwd, env, shell: false }))
      : spawn(shell, ['-c', command], { cwd, env, shell: false });
    const pid = proc.pid || ++this.processCounter;
    let totalSize = 0;
    const info: ProcessInfo = { pid, command, args: [], status: 'running', startTime: new Date(), output: [], errors: [], childPids: [], processRef: proc, lastHealthCheck: new Date() };
    this.processes.set(pid, info);
    const chunkQueue: OutputChunk[] = [];
    let resolveNext: ((value: IteratorResult<OutputChunk>) => void) | null = null;
    let done = false, error: Error | null = null;
    const pushChunk = (chunk: OutputChunk) => {
      if (bufferOutput && totalSize < maxOutputSize) { totalSize += chunk.data.length; if (totalSize > maxOutputSize) chunk.data = chunk.data.slice(0, maxOutputSize - (totalSize - chunk.data.length)); chunk.type === 'stdout' ? info.output.push(chunk.data) : info.errors.push(chunk.data); }
      info.lastHealthCheck = new Date(); onOutput?.(chunk); this.emit(chunk.type, { pid, data: chunk.data });
      resolveNext ? (resolveNext({ value: chunk, done: false }), resolveNext = null) : chunkQueue.push(chunk);
    };
    const timeoutId = setTimeout(async () => { error = new Error(`Process timeout after ${timeout}ms`); this.emit('timeout', { pid, command, timeout }); await this.killProcessTree(pid, 'SIGKILL'); info.status = 'killed'; info.killSignal = 'SIGKILL'; info.endTime = new Date(); done = true; resolveNext && resolveNext({ value: undefined as any, done: true }); }, timeout);
    proc.stdout?.on('data', (data) => pushChunk({ type: 'stdout', data: data.toString(), timestamp: Date.now() }));
    proc.stderr?.on('data', (data) => pushChunk({ type: 'stderr', data: data.toString(), timestamp: Date.now() }));
    proc.on('error', (err) => { clearTimeout(timeoutId); error = err; info.status = 'error'; info.endTime = new Date(); done = true; resolveNext && resolveNext({ value: undefined as any, done: true }); });
    proc.on('close', (code) => { clearTimeout(timeoutId); info.status = code === 0 ? 'completed' : 'error'; info.exitCode = code || 0; info.endTime = new Date(); done = true; resolveNext && resolveNext({ value: undefined as any, done: true }); });
    while (!done || chunkQueue.length > 0) { if (chunkQueue.length > 0) yield chunkQueue.shift()!; else if (!done) { const result = await new Promise<IteratorResult<OutputChunk>>((r) => { resolveNext = r; }); if (!result.done) yield result.value; } }
    if (error) throw error;
  }

  /** Execute command with progress tracking */
  async execWithProgress(command: string, onProgress: (progress: ProgressInfo) => void, options?: ProgressExecOptions): Promise<StreamingExecResult> {
    const patterns = options?.progressPatterns || DEFAULT_PROGRESS_PATTERNS;
    const chunks: OutputChunk[] = []; const startTime = Date.now(); let truncated = false; const maxOutputSize = options?.maxOutputSize ?? DEFAULT_MAX_OUTPUT_SIZE; let totalSize = 0;
    const detectProgress = (text: string): ProgressInfo | null => { for (const pattern of patterns) { if (pattern.test(text)) { const p: ProgressInfo = { raw: text }; const pct = text.match(/(\d+(?:\.\d+)?)\s*%/); if (pct) p.percent = parseFloat(pct[1]); const frac = text.match(/(\d+)\s*(?:\/|of)\s*(\d+)/i); if (frac) { p.current = parseInt(frac[1]); p.total = parseInt(frac[2]); if (!p.percent && p.total > 0) p.percent = (p.current / p.total) * 100; } const msg = text.match(/(?:downloading|installing|processing|building)\s+(.+)/i); if (msg) p.message = msg[1].trim(); return p; } } return null; };
    const processChunk = (chunk: OutputChunk) => { if (totalSize < maxOutputSize) { totalSize += chunk.data.length; if (totalSize > maxOutputSize) { truncated = true; chunk.data = chunk.data.slice(0, maxOutputSize - (totalSize - chunk.data.length)); } chunks.push(chunk); } else truncated = true; for (const line of chunk.data.split(/\r?\n/)) { if (line.trim()) { const prog = detectProgress(line); if (prog) onProgress(prog); } } };
    let exitCode = 0, pid = 0; const stdout: string[] = [], stderr: string[] = [];
    try { for await (const chunk of this.execStreaming(command, { ...options, onOutput: processChunk, bufferOutput: false })) chunk.type === 'stdout' ? stdout.push(chunk.data) : stderr.push(chunk.data); } catch (err: any) { if (err.message?.includes('timeout')) exitCode = -1; else throw err; }
    const last = Array.from(this.processes.values()).filter(p => p.command === command).pop(); if (last) { pid = last.pid; exitCode = last.exitCode ?? exitCode; }
    return { pid, exitCode, stdout: stdout.join(''), stderr: stderr.join(''), duration: Date.now() - startTime, chunks, truncated };
  }

  /** Pipe multiple commands together */
  async pipe(commands: string[], options?: PipeOptions): Promise<StreamingExecResult> {
    if (commands.length === 0) throw new Error('At least one command is required');
    const pipedCommand = commands.join(os.platform() === 'win32' ? ' | ' : ' | '); const chunks: OutputChunk[] = []; const startTime = Date.now(); let truncated = false; const maxOutputSize = options?.maxOutputSize ?? DEFAULT_MAX_OUTPUT_SIZE; let totalSize = 0;
    const processChunk = (chunk: OutputChunk) => { if (totalSize < maxOutputSize) { totalSize += chunk.data.length; if (totalSize > maxOutputSize) { truncated = true; chunk.data = chunk.data.slice(0, maxOutputSize - (totalSize - chunk.data.length)); } chunks.push(chunk); } else truncated = true; options?.onIntermediateOutput?.(0, chunk); };
    const stdout: string[] = [], stderr: string[] = []; let exitCode = 0, pid = 0;
    try { for await (const chunk of this.execStreaming(pipedCommand, { cwd: options?.cwd, env: options?.env, timeout: options?.timeout, shell: options?.shell, onOutput: processChunk, bufferOutput: false })) chunk.type === 'stdout' ? stdout.push(chunk.data) : stderr.push(chunk.data); } catch (err: any) { if (err.message?.includes('timeout')) exitCode = -1; else throw err; }
    const last = Array.from(this.processes.values()).filter(p => p.command === pipedCommand).pop(); if (last) { pid = last.pid; exitCode = last.exitCode ?? exitCode; }
    return { pid, exitCode, stdout: stdout.join(''), stderr: stderr.join(''), duration: Date.now() - startTime, chunks, truncated };
  }

  /**
   * Execute command and stream output
   */
  spawn(command: string, args: string[] = [], options?: {
    cwd?: string;
    env?: Record<string, string>;
    shell?: boolean | string;
  }): { pid: number; process: ChildProcess } {
    // Use resolveCwd for proper cwd handling with validation
    const cwd = this.resolveCwd(options?.cwd);
    const env = { ...this.config.env, ...options?.env };

    const spawnOptions: SpawnOptions = {
      cwd,
      env,
      shell: options?.shell ?? true
    };

    const proc = spawn(command, args, spawnOptions);
    const pid = proc.pid || ++this.processCounter;

    const info: ProcessInfo = {
      pid,
      command,
      args,
      status: 'running',
      startTime: new Date(),
      output: [],
      errors: [],
      childPids: [],
      processRef: proc,
      lastHealthCheck: new Date()
    };
    this.processes.set(pid, info);

    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      info.output.push(text);
      info.lastHealthCheck = new Date();
      this.emit('stdout', { pid, data: text });
    });

    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      info.errors.push(text);
      info.lastHealthCheck = new Date();
      this.emit('stderr', { pid, data: text });
    });

    proc.on('close', (code) => {
      info.status = code === 0 ? 'completed' : 'error';
      info.exitCode = code || 0;
      info.endTime = new Date();
      info.processRef = undefined; // Clear reference
      this.emit('close', { pid, code });
    });

    proc.on('error', (error) => {
      info.status = 'error';
      info.endTime = new Date();
      info.processRef = undefined;
      this.emit('error', { pid, error });
    });

    return { pid, process: proc };
  }

  /**
   * Run command in background
   */
  async background(command: string, options?: {
    cwd?: string;
    env?: Record<string, string>;
  }): Promise<number> {
    const { pid } = this.spawn(command, [], {
      ...options,
      shell: true
    });
    return pid;
  }

  // ============================================================
  // Process Management
  // ============================================================

  /**
   * Kill process by PID
   */
  kill(pid: number, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const info = this.processes.get(pid);
    if (!info) return false;

    try {
      process.kill(pid, signal);
      info.status = 'killed';
      info.endTime = new Date();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get process info
   */
  getProcess(pid: number): ProcessInfo | undefined {
    return this.processes.get(pid);
  }

  /**
   * Get process output
   */
  getOutput(pid: number): string {
    const info = this.processes.get(pid);
    return info ? info.output.join('') : '';
  }

  /**
   * Get process errors
   */
  getErrors(pid: number): string {
    const info = this.processes.get(pid);
    return info ? info.errors.join('') : '';
  }

  /**
   * List all processes
   */
  listProcesses(filter?: { status?: ProcessInfo['status'] }): ProcessInfo[] {
    let results = Array.from(this.processes.values());

    if (filter?.status) {
      results = results.filter(p => p.status === filter.status);
    }

    return results;
  }

  /**
   * Clean up old processes
   */
  cleanup(maxAge: number = 3600000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [pid, info] of this.processes.entries()) {
      if (info.status !== 'running' && info.endTime) {
        if (now - info.endTime.getTime() > maxAge) {
          this.processes.delete(pid);
          cleaned++;
        }
      }
    }

    return cleaned;
  }

  // ============================================================
  // Extended Process Management - Zombie & Orphan Handling
  // ============================================================

  /**
   * Get all currently running processes
   */
  getRunningProcesses(): ProcessInfo[] {
    return Array.from(this.processes.values()).filter(p => p.status === 'running');
  }

  /**
   * Check if a process is still running (OS-level check)
   */
  isProcessRunning(pid: number): boolean {
    try {
      // Sending signal 0 checks if process exists without killing it
      process.kill(pid, 0);
      return true;
    } catch (error: any) {
      // ESRCH = No such process, EPERM = Permission denied (process exists)
      return error.code === 'EPERM';
    }
  }

  /**
   * Kill a process with optional signal (SIGTERM by default)
   * Returns true if process was successfully killed
   */
  killProcess(pid: number, signal: NodeJS.Signals = 'SIGTERM'): boolean {
    const info = this.processes.get(pid);

    try {
      process.kill(pid, signal);

      if (info) {
        info.status = 'killed';
        info.killSignal = signal;
        info.endTime = new Date();
        info.processRef = undefined;
      }

      this.emit('processKilled', { pid, signal });
      return true;
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        // Process already dead
        if (info) {
          info.status = 'completed';
          info.endTime = new Date();
          info.processRef = undefined;
        }
        return true;
      }
      this.emit('killError', { pid, signal, error: error.message });
      return false;
    }
  }

  /**
   * Kill process with graceful shutdown (SIGTERM first, then SIGKILL after timeout)
   */
  async gracefulKill(pid: number, gracePeriod: number = this.GRACEFUL_SHUTDOWN_TIMEOUT): Promise<boolean> {
    const info = this.processes.get(pid);

    if (!this.isProcessRunning(pid)) {
      if (info) {
        info.status = 'completed';
        info.endTime = new Date();
      }
      return true;
    }

    // First try SIGTERM
    this.emit('gracefulShutdown', { pid, phase: 'SIGTERM' });
    this.killProcess(pid, 'SIGTERM');

    // Wait for grace period
    await new Promise(resolve => setTimeout(resolve, gracePeriod));

    // Check if still running
    if (this.isProcessRunning(pid)) {
      this.emit('gracefulShutdown', { pid, phase: 'SIGKILL', reason: 'timeout' });
      console.log(chalk.yellow(`[NativeShell] Process ${pid} did not respond to SIGTERM, forcing SIGKILL`));
      return this.killProcess(pid, 'SIGKILL');
    }

    return true;
  }

  /**
   * Kill entire process tree (parent and all children)
   */
  async killProcessTree(pid: number, signal: NodeJS.Signals = 'SIGTERM'): Promise<boolean> {
    const info = this.processes.get(pid);
    const isWindows = os.platform() === 'win32';

    try {
      if (isWindows) {
        // Windows: use taskkill with /T flag to kill process tree
        const { exec } = await import('child_process');
        return new Promise((resolve) => {
          exec(`taskkill /PID ${pid} /T /F`, (error) => {
            if (info) {
              info.status = 'killed';
              info.killSignal = signal;
              info.endTime = new Date();
              info.processRef = undefined;
            }
            this.emit('processTreeKilled', { pid, signal });
            resolve(!error);
          });
        });
      } else {
        // Unix: kill process group
        try {
          process.kill(-pid, signal); // Negative PID kills process group
        } catch {
          // If process group kill fails, try individual kill
          process.kill(pid, signal);
        }

        if (info) {
          info.status = 'killed';
          info.killSignal = signal;
          info.endTime = new Date();
          info.processRef = undefined;

          // Also kill tracked children
          for (const childPid of info.childPids) {
            this.killProcess(childPid, signal);
          }
        }

        this.emit('processTreeKilled', { pid, signal });
        return true;
      }
    } catch (error: any) {
      this.emit('killError', { pid, signal, error: error.message });
      return false;
    }
  }

  /**
   * Kill all child processes spawned by this shell
   */
  async killAllChildren(): Promise<CleanupStats> {
    const stats: CleanupStats = {
      zombiesKilled: 0,
      orphansKilled: 0,
      processesTerminated: 0,
      errors: []
    };

    const runningProcesses = this.getRunningProcesses();
    this.emit('killAllChildren', { count: runningProcesses.length });

    for (const info of runningProcesses) {
      try {
        const success = await this.gracefulKill(info.pid);
        if (success) {
          stats.processesTerminated++;
          if (info.isOrphaned) {
            stats.orphansKilled++;
          }
        }
      } catch (error: any) {
        stats.errors.push(`Failed to kill PID ${info.pid}: ${error.message}`);
      }
    }

    console.log(chalk.cyan(`[NativeShell] Killed ${stats.processesTerminated} child processes`));
    return stats;
  }

  /**
   * Detect zombie processes (running but not responsive)
   */
  private detectZombieProcesses(): ZombieProcessInfo[] {
    const zombies: ZombieProcessInfo[] = [];
    const now = Date.now();

    for (const [pid, info] of this.processes.entries()) {
      if (info.status !== 'running') continue;

      // Check if process is actually running at OS level
      const isActuallyRunning = this.isProcessRunning(pid);

      if (!isActuallyRunning) {
        // Process marked as running but actually dead = zombie
        zombies.push({
          pid,
          command: info.command,
          detectedAt: new Date(),
          reason: 'no_response'
        });
        info.status = 'zombie';
        this.logOrphanedProcess(pid, info, 'zombie_detected');
        continue;
      }

      // Check for stuck processes (no activity for ZOMBIE_TIMEOUT)
      if (info.lastHealthCheck) {
        const timeSinceLastActivity = now - info.lastHealthCheck.getTime();
        if (timeSinceLastActivity > this.ZOMBIE_TIMEOUT) {
          zombies.push({
            pid,
            command: info.command,
            detectedAt: new Date(),
            reason: 'stuck'
          });
          info.status = 'zombie';
          this.logOrphanedProcess(pid, info, 'stuck_process');
        }
      }
    }

    return zombies;
  }

  /**
   * Start periodic zombie process cleanup
   */
  private startZombieCleanup(): void {
    if (this.zombieCleanupInterval) {
      clearInterval(this.zombieCleanupInterval);
    }

    this.zombieCleanupInterval = setInterval(() => {
      this.performZombieCleanup();
    }, this.ZOMBIE_CHECK_INTERVAL);

    // Don't block process exit
    this.zombieCleanupInterval.unref();
  }

  /**
   * Stop periodic zombie cleanup
   */
  private stopZombieCleanup(): void {
    if (this.zombieCleanupInterval) {
      clearInterval(this.zombieCleanupInterval);
      this.zombieCleanupInterval = null;
    }
  }

  /**
   * Perform zombie process cleanup
   */
  async performZombieCleanup(): Promise<CleanupStats> {
    const stats: CleanupStats = {
      zombiesKilled: 0,
      orphansKilled: 0,
      processesTerminated: 0,
      errors: []
    };

    const zombies = this.detectZombieProcesses();

    if (zombies.length > 0) {
      console.log(chalk.yellow(`[NativeShell] Detected ${zombies.length} zombie processes`));
      this.emit('zombiesDetected', { zombies });
    }

    for (const zombie of zombies) {
      this.zombieProcesses.set(zombie.pid, zombie);

      try {
        const killed = await this.gracefulKill(zombie.pid);
        if (killed) {
          stats.zombiesKilled++;
          stats.processesTerminated++;
          this.zombieProcesses.delete(zombie.pid);
          console.log(chalk.green(`[NativeShell] Cleaned up zombie process ${zombie.pid}`));
        }
      } catch (error: any) {
        stats.errors.push(`Failed to kill zombie ${zombie.pid}: ${error.message}`);
      }
    }

    // Also clean up orphaned processes
    const orphaned = this.detectOrphanedProcesses();
    for (const info of orphaned) {
      try {
        const killed = await this.gracefulKill(info.pid);
        if (killed) {
          stats.orphansKilled++;
          stats.processesTerminated++;
          console.log(chalk.green(`[NativeShell] Cleaned up orphaned process ${info.pid}`));
        }
      } catch (error: any) {
        stats.errors.push(`Failed to kill orphan ${info.pid}: ${error.message}`);
      }
    }

    if (stats.processesTerminated > 0) {
      this.emit('cleanupCompleted', stats);
    }

    return stats;
  }

  /**
   * Detect orphaned processes (parent process died)
   */
  private detectOrphanedProcesses(): ProcessInfo[] {
    const orphaned: ProcessInfo[] = [];

    for (const [_pid, info] of this.processes.entries()) {
      if (info.status !== 'running') continue;
      if (!info.parentPid) continue;

      // Check if parent is still alive
      if (!this.isProcessRunning(info.parentPid)) {
        info.isOrphaned = true;
        orphaned.push(info);
        this.logOrphanedProcess(info.pid, info, 'parent_died');
      }
    }

    return orphaned;
  }

  /**
   * Log orphaned/zombie process for debugging
   */
  private logOrphanedProcess(pid: number, info: ProcessInfo, reason: string): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      pid,
      command: info.command,
      reason,
      startTime: info.startTime.toISOString(),
      lastHealthCheck: info.lastHealthCheck?.toISOString(),
      parentPid: info.parentPid,
      childPids: info.childPids
    };

    console.log(chalk.red(`[NativeShell] Orphaned process detected: ${JSON.stringify(logEntry)}`));
    this.emit('orphanedProcess', logEntry);
  }

  /**
   * Setup graceful shutdown handlers for process exit
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(chalk.yellow(`[NativeShell] Received ${signal}, starting graceful shutdown...`));
      this.emit('shutdown', { signal });

      try {
        // Stop zombie cleanup
        this.stopZombieCleanup();

        // Kill all children gracefully
        const stats = await this.killAllChildren();
        console.log(chalk.cyan(`[NativeShell] Shutdown complete: ${stats.processesTerminated} processes terminated`));

        // Clean up sessions
        for (const sessionId of this.sessions.keys()) {
          this.closeSession(sessionId);
        }
      } catch (error) {
        console.error(chalk.red(`[NativeShell] Error during shutdown: ${error}`));
      }
    };

    // Handle various shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error(chalk.red(`[NativeShell] Uncaught exception: ${error}`));
      shutdown('uncaughtException');
    });

    // Handle before exit
    process.on('beforeExit', () => {
      if (!this.isShuttingDown) {
        shutdown('beforeExit');
      }
    });
  }

  /**
   * Get zombie process statistics
   */
  getZombieStats(): { active: number; history: ZombieProcessInfo[] } {
    return {
      active: this.zombieProcesses.size,
      history: Array.from(this.zombieProcesses.values())
    };
  }

  /**
   * Manual trigger for zombie cleanup (for testing or explicit cleanup)
   */
  async triggerZombieCleanup(): Promise<CleanupStats> {
    return this.performZombieCleanup();
  }

  /**
   * Set parent-child relationship for processes
   */
  setProcessParent(childPid: number, parentPid: number): void {
    const childInfo = this.processes.get(childPid);
    const parentInfo = this.processes.get(parentPid);

    if (childInfo) {
      childInfo.parentPid = parentPid;
    }

    if (parentInfo) {
      if (!parentInfo.childPids.includes(childPid)) {
        parentInfo.childPids.push(childPid);
      }
    }
  }

  // ============================================================
  // Interactive Sessions
  // ============================================================

  /**
   * Create interactive shell session
   */
  createSession(options?: {
    shell?: string;
    cwd?: string;
    env?: Record<string, string>;
  }): ShellSession {
    const id = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const shell = options?.shell || this.config.defaultShell;
    // Use resolveCwd for proper cwd handling with validation
    const cwd = this.resolveCwd(options?.cwd);
    const env = { ...this.config.env, ...options?.env };

    const session: ShellSession = {
      id,
      shell,
      cwd,
      env,
      history: [],
      created: new Date()
    };

    // Start shell process
    const isWindows = os.platform() === 'win32';
    const proc = spawn(shell, isWindows ? [] : ['-i'], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    session.process = proc;
    this.sessions.set(id, session);

    return session;
  }

  /**
   * Send input to session
   */
  async sendToSession(sessionId: string, input: string): Promise<string> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.process) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    return new Promise((resolve, reject) => {
      const output: string[] = [];
      const timeout = setTimeout(() => {
        resolve(output.join(''));
      }, 2000);

      const onData = (data: Buffer) => {
        output.push(data.toString());
      };

      session.process!.stdout?.on('data', onData);

      session.process!.stdin?.write(input + '\n', (err) => {
        if (err) {
          clearTimeout(timeout);
          session.process!.stdout?.off('data', onData);
          reject(err);
        }
      });

      session.history.push(input);
    });
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.process?.kill();
    this.sessions.delete(sessionId);
    return true;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): ShellSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * List sessions
   */
  listSessions(): ShellSession[] {
    return Array.from(this.sessions.values());
  }

  // ============================================================
  // Convenience Methods
  // ============================================================

  /**
   * Run and get stdout
   */
  async run(command: string, cwd?: string): Promise<string> {
    const result = await this.exec(command, { cwd });
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`);
    }
    return result.stdout;
  }

  /**
   * Run Python script (SECURE - uses spawn without shell)
   * @deprecated Use SecureScriptExecutor.python() for enhanced security features
   */
  async python(script: string, args: string[] = []): Promise<string> {
    const pythonExe = os.platform() === 'win32' ? 'python' : 'python3';
    const spawnArgs = ['-c', script, ...args];

    return new Promise((resolve, reject) => {
      const proc = spawn(pythonExe, spawnArgs, {
        cwd: this.config.cwd,
        env: this.config.env,
        shell: false  // SECURITY: Never use shell=true to prevent injection
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Python exited with code ${code}`));
        }
      });

      proc.on('error', (err: Error) => reject(err));
    });
  }

  /**
   * Run Node.js script (SECURE - uses spawn without shell)
   * @deprecated Use SecureScriptExecutor.node() for enhanced security features
   */
  async node(script: string, args: string[] = []): Promise<string> {
    const spawnArgs = ['-e', script, ...args];

    return new Promise((resolve, reject) => {
      const proc = spawn('node', spawnArgs, {
        cwd: this.config.cwd,
        env: this.config.env,
        shell: false  // SECURITY: Never use shell=true to prevent injection
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `Node exited with code ${code}`));
        }
      });

      proc.on('error', (err: Error) => reject(err));
    });
  }

  /**
   * Check if command exists
   */
  async which(command: string): Promise<string | null> {
    try {
      const cmd = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
      const result = await this.run(cmd);
      return result.trim().split('\n')[0];
    } catch {
      return null;
    }
  }

  /**
   * Get system info
   */
  getSystemInfo(): Record<string, any> {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem()
      },
      uptime: os.uptime(),
      shell: this.config.defaultShell,
      preferredShell: this.config.preferredShell,
      availableShells: this.detectAvailableShells()
    };
  }

  // ============================================================
  // Shell Detection and Management
  // ============================================================

  /** Cache for detected shells */
  private shellCache: Map<ShellType, ShellInfo> = new Map();
  private shellCacheTime: number = 0;
  private readonly SHELL_CACHE_TTL = 60000; // 1 minute cache

  /**
   * Detect all available shells on the system
   * @returns Array of available shell types
   */
  detectAvailableShells(): ShellType[] {
    const available: ShellType[] = [];
    const isWindows = os.platform() === 'win32';
    const shellTypes: ShellType[] = ['cmd', 'powershell', 'pwsh', 'bash', 'sh', 'zsh'];

    for (const shellType of shellTypes) {
      const shellPath = this.getShellCommand(shellType);
      if (shellPath) {
        available.push(shellType);
      }
    }

    // Sort by platform-specific fallback order
    const fallbackOrder = isWindows ? SHELL_FALLBACK_ORDER.windows : SHELL_FALLBACK_ORDER.unix;
    available.sort((a, b) => {
      const aIndex = fallbackOrder.indexOf(a);
      const bIndex = fallbackOrder.indexOf(b);
      return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
    });

    return available;
  }

  /**
   * Get detailed information about all available shells
   * @returns Array of ShellInfo objects
   */
  getAvailableShellsInfo(): ShellInfo[] {
    const now = Date.now();

    // Check cache validity
    if (this.shellCache.size > 0 && (now - this.shellCacheTime) < this.SHELL_CACHE_TTL) {
      return Array.from(this.shellCache.values());
    }

    // Refresh cache
    this.shellCache.clear();
    const shellTypes: ShellType[] = ['cmd', 'powershell', 'pwsh', 'bash', 'sh', 'zsh'];

    for (const shellType of shellTypes) {
      const shellPath = this.getShellCommand(shellType);
      const info: ShellInfo = {
        type: shellType,
        path: shellPath || '',
        available: !!shellPath,
        version: shellPath ? this.getShellVersion(shellType, shellPath) : undefined
      };
      this.shellCache.set(shellType, info);
    }

    this.shellCacheTime = now;
    return Array.from(this.shellCache.values());
  }

  /**
   * Get shell version string
   */
  private getShellVersion(shellType: ShellType, shellPath: string): string | undefined {
    try {
      let versionCmd: string;

      switch (shellType) {
        case 'cmd':
          // CMD doesn't have a simple version command
          return 'Windows CMD';
        case 'powershell':
          versionCmd = `"${shellPath}" -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"`;
          break;
        case 'pwsh':
          versionCmd = `"${shellPath}" -NoProfile -Command "$PSVersionTable.PSVersion.ToString()"`;
          break;
        case 'bash':
          versionCmd = `"${shellPath}" --version`;
          break;
        case 'sh':
          return 'POSIX shell';
        case 'zsh':
          versionCmd = `"${shellPath}" --version`;
          break;
        default:
          return undefined;
      }

      const output = execSync(versionCmd, {
        encoding: 'utf-8',
        timeout: 5000,
        windowsHide: true
      }).trim();

      // Extract just the version number for cleaner output
      const versionMatch = output.match(/(\d+\.\d+(?:\.\d+)?)/);
      return versionMatch ? versionMatch[1] : output.split('\n')[0];
    } catch {
      return undefined;
    }
  }

  /**
   * Set preferred shell for command execution
   * @param shell - Shell type to set as preferred
   * @returns true if shell is available and set, false otherwise
   */
  setPreferredShell(shell: ShellType): boolean {
    const shellPath = this.getShellCommand(shell);

    if (!shellPath) {
      if (this.config.autoFallback) {
        // Try to find a fallback shell
        const fallbackShell = this.findFallbackShell(shell);
        if (fallbackShell) {
          console.log(chalk.yellow(
            `[NativeShell] Shell '${shell}' not available, using fallback: ${fallbackShell}`
          ));
          this.config.preferredShell = fallbackShell;
          this.config.defaultShell = this.getShellCommand(fallbackShell) || this.config.defaultShell;
          this.emit('shellFallback', { requested: shell, fallback: fallbackShell });
          return true;
        }
      }

      console.warn(chalk.red(`[NativeShell] Shell '${shell}' not available and no fallback found`));
      this.emit('shellNotFound', { shell });
      return false;
    }

    this.config.preferredShell = shell;
    this.config.defaultShell = shellPath;
    this.emit('shellChanged', { shell, path: shellPath });
    console.log(chalk.green(`[NativeShell] Preferred shell set to: ${shell} (${shellPath})`));
    return true;
  }

  /**
   * Find a fallback shell when preferred is unavailable
   */
  private findFallbackShell(unavailableShell: ShellType): ShellType | null {
    const isWindows = os.platform() === 'win32';
    const fallbackOrder = isWindows ? SHELL_FALLBACK_ORDER.windows : SHELL_FALLBACK_ORDER.unix;

    for (const shell of fallbackOrder) {
      if (shell !== unavailableShell && this.getShellCommand(shell)) {
        return shell;
      }
    }

    return null;
  }

  /**
   * Get the executable path for a shell type
   * @param shell - Shell type
   * @returns Path to shell executable or null if not found
   */
  getShellCommand(shell: ShellType): string | null {
    const isWindows = os.platform() === 'win32';
    const paths = isWindows ? SHELL_PATHS[shell].windows : SHELL_PATHS[shell].unix;

    // Check cached result first
    const cached = this.shellCache.get(shell);
    if (cached && cached.available) {
      return cached.path;
    }

    // Check each potential path
    for (const shellPath of paths) {
      // Check if it's an absolute path and exists
      if (path.isAbsolute(shellPath) && fs.existsSync(shellPath)) {
        return shellPath;
      }

      // Try using 'where' (Windows) or 'which' (Unix) to find in PATH
      try {
        const findCmd = isWindows ? `where ${shellPath}` : `which ${shellPath}`;
        const result = execSync(findCmd, {
          encoding: 'utf-8',
          timeout: 5000,
          windowsHide: true,
          stdio: ['pipe', 'pipe', 'pipe']
        }).trim();

        if (result) {
          return result.split('\n')[0]; // Return first match
        }
      } catch {
        // Shell not found via where/which, continue
      }
    }

    return null;
  }

  /**
   * Get currently preferred shell
   * @returns Current preferred shell type or null if using default
   */
  getPreferredShell(): ShellType | null {
    return this.config.preferredShell || null;
  }

  /**
   * Determine shell type from executable path
   * @param shellPath - Path to shell executable
   * @returns Shell type or null if unknown
   */
  getShellTypeFromPath(shellPath: string): ShellType | null {
    const normalizedPath = shellPath.toLowerCase();

    if (normalizedPath.includes('pwsh')) return 'pwsh';
    if (normalizedPath.includes('powershell')) return 'powershell';
    if (normalizedPath.includes('cmd')) return 'cmd';
    if (normalizedPath.includes('zsh')) return 'zsh';
    if (normalizedPath.includes('bash')) return 'bash';
    if (normalizedPath.endsWith('sh') || normalizedPath.includes('/sh')) return 'sh';

    return null;
  }

  /**
   * Translate command from one shell syntax to another
   * @param command - Command to translate
   * @param fromShell - Source shell type
   * @param toShell - Target shell type
   * @returns Translated command
   */
  translateCommand(command: string, fromShell: ShellType, toShell: ShellType): string {
    if (fromShell === toShell) return command;

    let translatedCommand = command;

    // Normalize shell types for lookup (cmd, powershell, bash)
    const sourceKey = this.normalizeShellForTranslation(fromShell);
    const targetKey = this.normalizeShellForTranslation(toShell);

    if (sourceKey === targetKey) return command;

    // Apply translations
    for (const mapping of COMMAND_TRANSLATIONS) {
      const sourceCmd = mapping[sourceKey as keyof CommandMapping];
      const targetCmd = mapping[targetKey as keyof CommandMapping];

      if (sourceCmd && targetCmd) {
        // Create regex to match the source command at word boundaries
        const regex = new RegExp(`\\b${this.escapeRegex(sourceCmd)}\\b`, 'gi');
        translatedCommand = translatedCommand.replace(regex, targetCmd);
      }
    }

    return translatedCommand;
  }

  /**
   * Normalize shell type for translation lookup
   */
  private normalizeShellForTranslation(shell: ShellType): 'cmd' | 'powershell' | 'bash' {
    switch (shell) {
      case 'cmd':
        return 'cmd';
      case 'powershell':
      case 'pwsh':
        return 'powershell';
      case 'bash':
      case 'sh':
      case 'zsh':
        return 'bash';
      default:
        return 'bash';
    }
  }

  /**
   * Escape string for use in regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get command translated for current preferred shell
   * @param command - Command in source syntax
   * @param sourceShell - Source shell type (default: cmd on Windows, bash on Unix)
   * @returns Translated command for current shell
   */
  getCommandForCurrentShell(command: string, sourceShell?: ShellType): string {
    const isWindows = os.platform() === 'win32';
    const from = sourceShell || (isWindows ? 'cmd' : 'bash');
    const to = this.config.preferredShell || this.getShellTypeFromPath(this.config.defaultShell) || (isWindows ? 'powershell' : 'bash');

    return this.translateCommand(command, from, to);
  }

  /**
   * Check if a specific shell is available
   * @param shell - Shell type to check
   * @returns true if shell is available
   */
  isShellAvailable(shell: ShellType): boolean {
    return this.getShellCommand(shell) !== null;
  }

  /**
   * Execute command using a specific shell (regardless of preferred)
   * @param command - Command to execute
   * @param shell - Shell to use
   * @param options - Execution options
   * @returns Process result
   */
  async execWithShell(command: string, shell: ShellType, options?: ExecOptions): Promise<ProcessResult> {
    const shellPath = this.getShellCommand(shell);
    if (!shellPath) {
      throw new Error(`Shell '${shell}' is not available on this system`);
    }

    return this.exec(command, {
      ...options,
      shell: shellPath
    });
  }

  // ============================================================
  // Status
  // ============================================================

  printStatus(): void {
    const running = this.listProcesses({ status: 'running' });
    const completed = this.listProcesses({ status: 'completed' });
    const zombies = this.listProcesses({ status: 'zombie' });
    const killed = this.listProcesses({ status: 'killed' });
    const zombieStats = this.getZombieStats();
    const availableShells = this.detectAvailableShells();
    const preferredShell = this.getPreferredShell();

    console.log(chalk.cyan('\n=== Native Shell ===\n'));
    console.log(chalk.gray(`  Default Shell: ${this.config.defaultShell}`));
    console.log(chalk.gray(`  Preferred Shell: ${preferredShell || 'auto'}`));
    console.log(chalk.gray(`  Available Shells: ${availableShells.join(', ')}`));
    console.log(chalk.gray(`  Auto Fallback: ${this.config.autoFallback}`));
    console.log(chalk.gray(`  Working Dir: ${this.getCwd()}`));
    console.log(chalk.gray(`  Inherit CWD: ${this._inheritCwd}`));
    console.log(chalk.gray(`  Timeout: ${this.config.defaultTimeout}ms`));
    console.log(chalk.gray(`  Running Processes: ${running.length}`));
    console.log(chalk.gray(`  Completed Processes: ${completed.length}`));
    console.log(chalk.gray(`  Killed Processes: ${killed.length}`));
    console.log(chalk.yellow(`  Zombie Processes: ${zombies.length}`));
    console.log(chalk.yellow(`  Zombies Detected (history): ${zombieStats.history.length}`));
    console.log(chalk.gray(`  Active Sessions: ${this.sessions.size}`));
    console.log(chalk.gray(`  Zombie Cleanup Active: ${this.zombieCleanupInterval !== null}`));
    console.log(chalk.gray(`  Shutting Down: ${this.isShuttingDown}`));

    // Show available shells with details
    console.log(chalk.cyan('\n  Shell Details:'));
    const shellsInfo = this.getAvailableShellsInfo();
    for (const shell of shellsInfo) {
      if (shell.available) {
        const marker = shell.type === preferredShell ? chalk.green(' *') : '';
        console.log(chalk.gray(`    ${shell.type}${marker}: ${shell.path} (${shell.version || 'unknown'})`));
      }
    }

    // Show running processes details
    if (running.length > 0) {
      console.log(chalk.cyan('\n  Running Processes:'));
      for (const proc of running) {
        const runtime = Date.now() - proc.startTime.getTime();
        console.log(chalk.gray(`    PID ${proc.pid}: ${proc.command.slice(0, 50)}... (${Math.round(runtime / 1000)}s)`));
      }
    }

    // Show zombie processes details
    if (zombies.length > 0) {
      console.log(chalk.yellow('\n  Zombie Processes:'));
      for (const proc of zombies) {
        console.log(chalk.yellow(`    PID ${proc.pid}: ${proc.command.slice(0, 50)}...`));
      }
    }
  }

  /**
   * Cleanup and destroy (async version with graceful shutdown)
   */
  async destroy(): Promise<CleanupStats> {
    console.log(chalk.yellow('[NativeShell] Starting destroy sequence...'));

    // Stop zombie cleanup interval
    this.stopZombieCleanup();

    // Gracefully kill all running processes
    const stats = await this.killAllChildren();

    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    // Clear all tracking
    this.processes.clear();
    this.sessions.clear();
    this.zombieProcesses.clear();

    console.log(chalk.green(`[NativeShell] Destroy complete. Terminated ${stats.processesTerminated} processes.`));
    this.emit('destroyed', stats);

    return stats;
  }

  /**
   * Synchronous destroy (for backwards compatibility)
   */
  destroySync(): void {
    console.log(chalk.yellow('[NativeShell] Starting synchronous destroy...'));

    // Stop zombie cleanup
    this.stopZombieCleanup();

    // Kill all running processes immediately with SIGKILL
    for (const [pid, info] of this.processes.entries()) {
      if (info.status === 'running') {
        this.killProcess(pid, 'SIGKILL');
      }
    }

    // Close all sessions
    for (const sessionId of this.sessions.keys()) {
      this.closeSession(sessionId);
    }

    this.processes.clear();
    this.sessions.clear();
    this.zombieProcesses.clear();

    console.log(chalk.green('[NativeShell] Synchronous destroy complete.'));
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
    return this.config.env[name];
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
    return { ...this.config.env };
  }

  /**
   * Get environment with sensitive values filtered (for logging)
   */
  getFilteredEnvironment(): Record<string, string> {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(this.config.env)) {
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
    return SENSITIVE_ENV_PATTERNS.some(pattern => pattern.test(name));
  }

  /**
   * Set environment profile
   */
  setEnvironmentProfile(profile: EnvironmentProfile): void {
    const profileConfig = ENVIRONMENT_PROFILES[profile];
    if (!profileConfig) {
      throw new Error(`Unknown environment profile: ${profile}`);
    }

    this.config.environmentConfig = {
      ...this.config.environmentConfig,
      ...profileConfig,
      activeProfile: profile
    };

    this.rebuildEnvironment();
    this.emit('profileChanged', { profile });
  }

  /**
   * Get current environment profile
   */
  getEnvironmentProfile(): EnvironmentProfile | undefined {
    return this.config.environmentConfig.activeProfile;
  }

  /**
   * Update environment configuration
   */
  updateEnvironmentConfig(configUpdate: Partial<EnvironmentConfig>): void {
    this.config.environmentConfig = {
      ...this.config.environmentConfig,
      ...configUpdate
    };
    this.rebuildEnvironment();
    this.emit('envConfigChanged', configUpdate);
  }

  /**
   * Add blocked environment variables
   */
  addBlockedEnvVars(vars: string[]): void {
    const blocked = new Set([...this.config.environmentConfig.blockedEnvVars, ...vars]);
    this.config.environmentConfig.blockedEnvVars = Array.from(blocked);
    this.rebuildEnvironment();
  }

  /**
   * Remove blocked environment variables
   */
  removeBlockedEnvVars(vars: string[]): void {
    const toRemove = new Set(vars);
    this.config.environmentConfig.blockedEnvVars =
      this.config.environmentConfig.blockedEnvVars.filter(v => !toRemove.has(v));
    this.rebuildEnvironment();
  }

  /**
   * Get blocked environment variables
   */
  getBlockedEnvVars(): string[] {
    return [...this.config.environmentConfig.blockedEnvVars];
  }

  /**
   * Rebuild environment from configuration
   */
  private rebuildEnvironment(): void {
    const envConfig = this.config.environmentConfig;
    let env: Record<string, string> = {};

    // Step 1: Inherit from process.env if configured
    if (envConfig.inheritEnv) {
      env = { ...process.env } as Record<string, string>;
    }

    // Step 2: Apply profile additional env vars
    if (envConfig.activeProfile) {
      const profileConfig = ENVIRONMENT_PROFILES[envConfig.activeProfile];
      if (profileConfig.additionalEnv) {
        env = { ...env, ...profileConfig.additionalEnv };
      }
    }

    // Step 3: Apply additional env vars from config
    env = { ...env, ...envConfig.additionalEnv };

    // Step 4: Apply managed env vars (set via setEnvVar)
    env = { ...env, ...this.managedEnv };

    // Step 5: Remove blocked env vars
    for (const blocked of envConfig.blockedEnvVars) {
      delete env[blocked];
    }

    this.config.env = env;
  }

  /**
   * Export environment to a file (.env format)
   */
  exportEnvironment(filePath: string, options?: {
    includeInherited?: boolean;
    filterSensitive?: boolean
  }): void {
    const includeInherited = options?.includeInherited ?? false;
    const filterSensitive = options?.filterSensitive ?? true;

    let envToExport: Record<string, string>;

    if (includeInherited) {
      envToExport = filterSensitive ? this.getFilteredEnvironment() : this.getEnvironment();
    } else {
      // Only export managed and additional env vars
      envToExport = {
        ...this.config.environmentConfig.additionalEnv,
        ...this.managedEnv
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

  /**
   * Print environment status (with sensitive values filtered)
   */
  printEnvironmentStatus(): void {
    console.log(chalk.cyan('\n=== Environment Manager ===\n'));

    const profile = this.config.environmentConfig.activeProfile;
    console.log(chalk.yellow(`  Active Profile: ${profile || 'none'}`));
    console.log(chalk.yellow(`  Inherit from process.env: ${this.config.environmentConfig.inheritEnv}`));

    console.log(chalk.cyan('\n  Blocked Variables:'));
    for (const blocked of this.config.environmentConfig.blockedEnvVars) {
      console.log(chalk.red(`    - ${blocked}`));
    }

    console.log(chalk.cyan('\n  Managed Variables:'));
    for (const [key, value] of Object.entries(this.managedEnv)) {
      const displayValue = this.isSensitiveEnvVar(key) ? '***FILTERED***' : value;
      console.log(chalk.green(`    ${key}=${displayValue}`));
    }

    console.log(chalk.cyan('\n  Additional Variables:'));
    for (const [key, value] of Object.entries(this.config.environmentConfig.additionalEnv)) {
      const displayValue = this.isSensitiveEnvVar(key) ? '***FILTERED***' : value;
      console.log(chalk.blue(`    ${key}=${displayValue}`));
    }

    console.log(chalk.cyan(`\n  Total Environment Variables: ${Object.keys(this.config.env).length}`));
  }

  /**
   * Get environment configuration
   */
  getEnvironmentConfig(): EnvironmentConfig {
    return { ...this.config.environmentConfig };
  }

  /**
   * Get managed env vars
   */
  getManagedEnvVars(): Record<string, string> {
    return { ...this.managedEnv };
  }

  /**
   * Reset environment to defaults
   */
  resetEnvironment(): void {
    this.config.environmentConfig = createDefaultEnvironmentConfig();
    this.managedEnv = {};
    this.rebuildEnvironment();
    this.emit('envReset');
  }
}

// ============================================================
// Factory Function
// ============================================================

export function createShell(options?: NativeShellConfig): NativeShell {
  return new NativeShell(options);
}
