/**
 * NativeCommands - CLI commands for native GeminiHydra tools
 * Provides direct access to native implementations without MCP overhead
 *
 * Enhanced with:
 * - File diagnostics (/fs diagnose)
 * - Dynamic path management (/fs unblock, /fs allow)
 * - File attributes (/fs attrs)
 * - Encoding detection (/fs encoding)
 * - --force flag for readonly files
 * - --encoding flag for read/write operations
 */

import chalk from 'chalk';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { commandRegistry, success, error, CommandResult } from './CommandRegistry.js';
import {
  getProjectTools,
  initProjectTools,
  NativeTools,
  ShellManager,
  ShellConfigProfile,
  SHELL_PROFILES
} from '../native/index.js';
import {
  formatBytes,
  formatDuration,
  truncate,
  box,
  Spinner,
  highlightMatch
} from './CommandHelpers.js';
import { createFailedMessage, formatError } from '../utils/errorHandling.js';
import type { FileAttributes } from '../native/types.js';
import { createDiagnostics, FileSystemDiagnostics, type DiagnosticResult } from '../native/FileSystemDiagnostics.js';
import { createShellDiagnostics, ShellDiagnostics } from '../native/ShellDiagnostics.js';

// Singleton for shell diagnostics
let shellDiagnostics: ShellDiagnostics | null = null;

function getShellDiagnostics(): ShellDiagnostics {
  if (!shellDiagnostics) {
    const tools = getProjectTools();
    shellDiagnostics = createShellDiagnostics({
      shell: tools?.shell,
      maxHistorySize: 1000
    });
  }
  return shellDiagnostics;
}

const execAsync = promisify(exec);

// ============================================================
// Helper Functions
// ============================================================

function getTools(): NativeTools {
  const tools = getProjectTools();
  if (!tools) {
    throw new Error('Native tools not initialized. Run /native init first.');
  }
  return tools;
}

/**
 * Parse command arguments for flags
 */
function parseFlags(args: string[]): {
  flags: Record<string, string | boolean>;
  positional: string[];
} {
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      // Check if next arg is a value (doesn't start with --)
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[i + 1];
        i++;
      } else {
        flags[key] = true;
      }
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  return { flags, positional };
}

// ============================================================
// File Diagnostics and Utilities
// ============================================================

/**
 * Detect file encoding by analyzing byte patterns
 */
async function detectFileEncoding(filePath: string): Promise<{
  encoding: string;
  confidence: number;
  bom: string | null;
  details: string;
}> {
  const buffer = await fs.readFile(filePath);
  const bytes = new Uint8Array(buffer);

  // Check for BOM (Byte Order Mark)
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { encoding: 'utf-8', confidence: 100, bom: 'UTF-8 BOM', details: 'UTF-8 with BOM detected' };
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { encoding: 'utf-16be', confidence: 100, bom: 'UTF-16 BE BOM', details: 'UTF-16 Big Endian with BOM' };
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    if (bytes[2] === 0x00 && bytes[3] === 0x00) {
      return { encoding: 'utf-32le', confidence: 100, bom: 'UTF-32 LE BOM', details: 'UTF-32 Little Endian with BOM' };
    }
    return { encoding: 'utf-16le', confidence: 100, bom: 'UTF-16 LE BOM', details: 'UTF-16 Little Endian with BOM' };
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0xFE && bytes[3] === 0xFF) {
    return { encoding: 'utf-32be', confidence: 100, bom: 'UTF-32 BE BOM', details: 'UTF-32 Big Endian with BOM' };
  }

  // Analyze content for encoding hints
  let nullBytes = 0;
  let highBytes = 0;
  let utf8Sequences = 0;
  let invalidUtf8 = 0;

  for (let i = 0; i < Math.min(bytes.length, 8192); i++) {
    const byte = bytes[i];

    if (byte === 0x00) nullBytes++;
    if (byte > 0x7F) highBytes++;

    // Check for valid UTF-8 multi-byte sequences
    if (byte >= 0xC0 && byte <= 0xDF && i + 1 < bytes.length) {
      if ((bytes[i + 1] & 0xC0) === 0x80) {
        utf8Sequences++;
        i++;
      } else {
        invalidUtf8++;
      }
    } else if (byte >= 0xE0 && byte <= 0xEF && i + 2 < bytes.length) {
      if ((bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80) {
        utf8Sequences++;
        i += 2;
      } else {
        invalidUtf8++;
      }
    } else if (byte >= 0xF0 && byte <= 0xF7 && i + 3 < bytes.length) {
      if ((bytes[i + 1] & 0xC0) === 0x80 && (bytes[i + 2] & 0xC0) === 0x80 && (bytes[i + 3] & 0xC0) === 0x80) {
        utf8Sequences++;
        i += 3;
      } else {
        invalidUtf8++;
      }
    }
  }

  // Determine encoding based on analysis
  if (nullBytes > bytes.length * 0.1) {
    return { encoding: 'binary', confidence: 90, bom: null, details: 'Binary file (many null bytes)' };
  }

  if (highBytes === 0) {
    return { encoding: 'ascii', confidence: 95, bom: null, details: 'Pure ASCII (7-bit clean)' };
  }

  if (utf8Sequences > 0 && invalidUtf8 === 0) {
    const confidence = Math.min(95, 70 + utf8Sequences * 2);
    return { encoding: 'utf-8', confidence, bom: null, details: `UTF-8 (${utf8Sequences} multi-byte sequences)` };
  }

  if (invalidUtf8 > 0) {
    return { encoding: 'iso-8859-1', confidence: 60, bom: null, details: 'Likely ISO-8859-1 or Windows-1252' };
  }

  return { encoding: 'utf-8', confidence: 70, bom: null, details: 'Assumed UTF-8 (no BOM, mostly ASCII)' };
}

/**
 * Get file attributes (Windows-specific with Unix fallback)
 */
async function getFileAttributes(filePath: string): Promise<FileAttributes> {
  const stats = await fs.stat(filePath);

  // Base attributes from stats
  const attrs: FileAttributes = {
    readonly: (stats.mode & 0o200) === 0, // No write permission
    hidden: path.basename(filePath).startsWith('.'),
    system: false,
    archive: false
  };

  // On Windows, try to get actual attributes
  if (process.platform === 'win32') {
    try {
      const { stdout } = await execAsync(`attrib "${filePath}"`, { encoding: 'utf-8' });
      const attribLine = stdout.trim();

      attrs.readonly = attribLine.includes('R');
      attrs.hidden = attribLine.includes('H');
      attrs.system = attribLine.includes('S');
      attrs.archive = attribLine.includes('A');
      attrs.raw = attribLine;
    } catch {
      // Fall back to stats-based detection
    }
  }

  return attrs;
}

/**
 * Set file attributes (primarily for removing readonly)
 */
async function setFileAttributes(filePath: string, options: {
  readonly?: boolean;
  hidden?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (process.platform === 'win32') {
      const flags: string[] = [];
      if (options.readonly === false) flags.push('-R');
      if (options.readonly === true) flags.push('+R');
      if (options.hidden === false) flags.push('-H');
      if (options.hidden === true) flags.push('+H');

      if (flags.length > 0) {
        await execAsync(`attrib ${flags.join(' ')} "${filePath}"`);
      }
    } else {
      // Unix: modify permissions
      const stats = await fs.stat(filePath);
      let newMode = stats.mode;

      if (options.readonly === false) {
        newMode |= 0o200; // Add write permission for owner
      } else if (options.readonly === true) {
        newMode &= ~0o200; // Remove write permission for owner
      }

      await fs.chmod(filePath, newMode);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Dynamic path management storage (in-memory for session)
const dynamicAllowedPaths: Set<string> = new Set();
const dynamicBlockedPaths: Set<string> = new Set();

// ============================================================
// Native Tools Command Group
// ============================================================

export const nativeCommands = {
  /**
   * Initialize native tools
   */
  async init(args: string[]): Promise<CommandResult> {
    const rootDir = args[0] || process.cwd();
    const spinner = new Spinner('Initializing native tools...');

    try {
      spinner.start();
      await initProjectTools(rootDir);
      spinner.stop();

      return success({
        components: ['FileSystem', 'Memory', 'Shell', 'Search'],
        rootDir
      }, `Native tools initialized for: ${rootDir}`);
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('initialize', err));
    }
  },

  /**
   * Show native tools status
   */
  async status(): Promise<CommandResult> {
    try {
      const tools = getTools();
      tools.printStatus();
      return success(null, 'Status displayed above');
    } catch (err) {
      return error(formatError(err));
    }
  },

  /**
   * Shutdown native tools
   */
  async shutdown(): Promise<CommandResult> {
    try {
      const tools = getTools();
      await tools.shutdown();
      return success(null, 'Native tools shutdown complete');
    } catch (err) {
      return error(formatError(err));
    }
  }
};

// ============================================================
// File System Commands
// ============================================================

export const fsCommands = {
  /**
   * Read file contents
   * Supports: --encoding <enc> to specify encoding (utf-8, ascii, latin1, etc.)
   */
  async read(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);
    const filePath = positional[0];

    if (!filePath) {
      return error('Usage: /fs read <path> [--encoding utf-8|ascii|latin1|utf16le]\n\nRead file contents with optional encoding');
    }

    try {
      const tools = getTools();
      const encoding = (flags.encoding as BufferEncoding) || 'utf-8';
      const content = await tools.fs.readFile(filePath, { encoding });

      return success({
        content: truncate(content, 5000),
        size: formatBytes(content.length),
        encoding
      }, `File: ${filePath}`);
    } catch (err: any) {
      // Provide more helpful error messages
      if (err.code === 'ENOENT') {
        return error(`File not found: ${filePath}\n${chalk.gray('Use /fs diagnose to check path issues')}`);
      }
      if (err.code === 'EACCES') {
        return error(`Permission denied: ${filePath}\n${chalk.gray('Use /fs perms to check permissions')}`);
      }
      if (err.message?.includes('blocked')) {
        return error(`Path is blocked: ${filePath}\n${chalk.gray('Use /fs unblock to temporarily allow access')}`);
      }
      return error(createFailedMessage('read file', err));
    }
  },

  /**
   * List directory
   */
  async ls(args: string[]): Promise<CommandResult> {
    const dirPath = args[0] || '.';
    const recursive = args.includes('-r') || args.includes('--recursive');

    try {
      const tools = getTools();
      const fileInfos = await tools.fs.listDirectory(dirPath, { recursive });
      const files = fileInfos.map(f => f.path);

      return success({
        files: files.slice(0, 100),
        total: files.length,
        showing: Math.min(100, files.length)
      }, `Directory: ${dirPath}`);
    } catch (err) {
      return error(createFailedMessage('list directory', err));
    }
  },

  /**
   * Write file
   * Supports:
   *   --encoding <enc> to specify encoding (utf-8, ascii, latin1, etc.)
   *   --force to remove readonly attribute before writing
   */
  async write(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);
    const filePath = positional[0];
    const content = positional.slice(1).join(' ');

    if (!filePath || !content) {
      return error('Usage: /fs write <path> <content> [--encoding utf-8] [--force]\n\n--force: Remove readonly attribute before writing\n--encoding: Specify file encoding');
    }

    try {
      const tools = getTools();
      const encoding = (flags.encoding as BufferEncoding) || 'utf-8';

      // Handle --force flag to remove readonly attribute
      if (flags.force) {
        try {
          const attrs = await getFileAttributes(filePath);
          if (attrs.readonly) {
            const result = await setFileAttributes(filePath, { readonly: false });
            if (!result.success) {
              return error(`Cannot remove readonly attribute: ${result.error}`);
            }
          }
        } catch {
          // File might not exist yet, which is fine
        }
      }

      await tools.fs.writeFile(filePath, content, { encoding });

      return success({
        bytes: content.length,
        encoding,
        forced: !!flags.force
      }, `Written to: ${filePath}`);
    } catch (err: any) {
      // Provide more helpful error messages
      if (err.code === 'EACCES' || err.code === 'EPERM') {
        return error(`Permission denied: ${filePath}\n${chalk.gray('Try using --force to remove readonly attribute')}`);
      }
      if (err.code === 'ENOENT') {
        return error(`Directory not found for: ${filePath}\n${chalk.gray('Parent directory must exist')}`);
      }
      if (err.message?.includes('blocked')) {
        return error(`Path is blocked: ${filePath}\n${chalk.gray('Use /fs unblock to temporarily allow access')}`);
      }
      return error(createFailedMessage('write file', err));
    }
  },

  /**
   * Get file info
   */
  async info(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs info <path>');
    }

    try {
      const tools = getTools();
      const info = await tools.fs.getFileInfo(args[0]);

      return success({
        size: formatBytes(info.size ?? 0),
        modified: info.modified?.toISOString() ?? 'unknown',
        created: info.created?.toISOString(),
        isDirectory: info.isDirectory,
        isFile: info.isFile
      }, `File Info: ${args[0]}`);
    } catch (err) {
      return error(createFailedMessage('get info', err));
    }
  },

  /**
   * Search in file contents (simple grep-like text search)
   * NOTE: For LSP-powered semantic search, use /serena search instead
   */
  async search(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs search <pattern> [glob]');
    }

    const [pattern, glob] = args;

    try {
      const tools = getTools();
      const matches = await tools.fs.searchContent(pattern, { glob });

      const results = matches.slice(0, 20).map(m => ({
        file: m.file,
        line: m.line,
        match: highlightMatch(truncate(m.content, 80), pattern)
      }));

      return success({
        results,
        showing: Math.min(20, matches.length)
      }, `Found ${matches.length} matches for "${pattern}"`);
    } catch (err) {
      return error(createFailedMessage('search', err));
    }
  },

  /**
   * Comprehensive filesystem diagnostics using FileSystemDiagnostics module
   * Provides detailed information about path validity, permissions, attributes, etc.
   */
  async diagnose(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs diagnose <path>');
    }

    const targetPath = args[0];
    const showSystemInfo = args.includes('--system') || args.includes('-s');

    try {
      const diagnostics = createDiagnostics({
        rootDir: process.cwd()
      });

      const result = await diagnostics.diagnose(targetPath);

      // Print formatted output
      diagnostics.printDiagnostic(result);

      // Optionally show system info
      if (showSystemInfo) {
        const sysInfo = diagnostics.getSystemInfo();
        diagnostics.printSystemInfo(sysInfo);
      }

      // Return structured data
      return success({
        path: result.path,
        exists: result.exists,
        readable: result.readable,
        writable: result.writable,
        isDirectory: result.isDirectory,
        isFile: result.isFile,
        isSymlink: result.isSymlink,
        isBlocked: result.isBlocked,
        size: result.size,
        encoding: result.encoding,
        blockedReason: result.blockedReason,
        permissions: {
          mode: result.permissions.modeString,
          readable: result.permissions.readable,
          writable: result.permissions.writable,
          executable: result.permissions.executable
        },
        pathValidation: {
          valid: result.pathValidation.valid,
          issues: result.pathValidation.issues
        },
        errors: result.errors,
        warnings: result.warnings
      }, `Diagnostics for: ${targetPath}`);
    } catch (err) {
      return error(createFailedMessage('diagnose path', err));
    }
  },

  /**
   * Get system filesystem information
   */
  async sysinfo(): Promise<CommandResult> {
    try {
      const diagnostics = createDiagnostics();
      const info = diagnostics.getSystemInfo();

      diagnostics.printSystemInfo(info);

      return success({
        platform: info.platform,
        release: info.release,
        arch: info.arch,
        user: info.user.username,
        homeDir: info.user.homeDir,
        cwd: info.user.cwd,
        limits: info.limits,
        tempDir: info.env.tempDir
      }, 'System Filesystem Info');
    } catch (err) {
      return error(createFailedMessage('get system info', err));
    }
  },

  /**
   * Validate a path without checking existence
   */
  async validate(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs validate <path>');
    }

    try {
      const diagnostics = createDiagnostics();
      const result = diagnostics.checkPath(args[0]);

      const statusIcon = result.valid ? chalk.green('[VALID]') : chalk.red('[INVALID]');

      console.log(`\n${statusIcon} Path: ${result.originalPath}`);
      console.log(`  Resolved: ${result.resolvedPath}`);
      console.log(`  Is Absolute: ${result.isAbsolute}`);
      console.log(`  Has Traversal: ${result.hasTraversal}`);
      console.log(`  Path Too Long: ${result.pathTooLong}`);

      if (result.issues.length > 0) {
        console.log(chalk.yellow('\n  Issues:'));
        for (const issue of result.issues) {
          console.log(chalk.red(`    - ${issue}`));
        }
      }

      return success(result, result.valid ? 'Path is valid' : 'Path has issues');
    } catch (err) {
      return error(createFailedMessage('validate path', err));
    }
  },

  /**
   * Check permissions on a path
   */
  async perms(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs perms <path>');
    }

    try {
      const diagnostics = createDiagnostics();
      const result = await diagnostics.checkPermissions(args[0]);

      const readable = result.readable ? chalk.green('YES') : chalk.red('NO');
      const writable = result.writable ? chalk.green('YES') : chalk.red('NO');
      const executable = result.executable ? chalk.green('YES') : chalk.red('NO');

      console.log(`\nPermissions for: ${result.path}`);
      console.log(`  Mode: ${result.modeString || 'N/A'}`);
      console.log(`  Readable: ${readable}`);
      console.log(`  Writable: ${writable}`);
      console.log(`  Executable: ${executable}`);

      if (result.owner) {
        console.log(`  Owner: uid=${result.owner}, gid=${result.group}`);
      }

      if (result.error) {
        console.log(chalk.red(`  Error: ${result.error}`));
      }

      return success(result, 'Permission check complete');
    } catch (err) {
      return error(createFailedMessage('check permissions', err));
    }
  },

  /**
   * Unblock a path - remove from blocked paths list (session-only)
   */
  async unblock(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs unblock <path>\n\nRemoves path from blocked list for this session');
    }

    const targetPath = args[0];

    try {
      // Remove from dynamic blocked paths
      dynamicBlockedPaths.delete(targetPath);

      // Add to dynamic allowed paths (overrides blocked)
      dynamicAllowedPaths.add(targetPath);

      return success({
        path: targetPath,
        action: 'unblocked',
        allowedPaths: Array.from(dynamicAllowedPaths)
      }, `Path unblocked: ${targetPath}\n${chalk.gray('Note: This is a session-only change.')}`);
    } catch (err) {
      return error(createFailedMessage('unblock path', err));
    }
  },

  /**
   * Allow a path - add to allowed paths list (session-only)
   */
  async allow(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs allow <path>\n\nAdds path to allowed list for this session');
    }

    const targetPath = args[0];

    try {
      dynamicAllowedPaths.add(targetPath);

      return success({
        path: targetPath,
        action: 'allowed',
        allowedPaths: Array.from(dynamicAllowedPaths)
      }, `Path allowed: ${targetPath}\n${chalk.gray('Note: This is a session-only change.')}`);
    } catch (err) {
      return error(createFailedMessage('allow path', err));
    }
  },

  /**
   * Show file attributes (Windows: R,H,S,A / Unix: permissions)
   */
  async attrs(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs attrs <path> [--set readonly|hidden] [--unset readonly|hidden]\n\nShow or modify file attributes');
    }

    const { flags, positional } = parseFlags(args);
    const filePath = positional[0];

    if (!filePath) {
      return error('Path is required');
    }

    try {
      // Check if setting attributes
      if (flags.set || flags.unset) {
        const setOptions: { readonly?: boolean; hidden?: boolean } = {};

        if (flags.set === 'readonly') setOptions.readonly = true;
        if (flags.set === 'hidden') setOptions.hidden = true;
        if (flags.unset === 'readonly') setOptions.readonly = false;
        if (flags.unset === 'hidden') setOptions.hidden = false;

        const result = await setFileAttributes(filePath, setOptions);

        if (!result.success) {
          return error(`Failed to set attributes: ${result.error}`);
        }

        const newAttrs = await getFileAttributes(filePath);
        return success({
          path: filePath,
          action: 'modified',
          attributes: newAttrs
        }, `Attributes updated for: ${filePath}`);
      }

      // Just show attributes
      const attrs = await getFileAttributes(filePath);

      const output = [
        chalk.cyan('\n=== File Attributes ===\n'),
        chalk.white(`Path: ${filePath}`),
        '',
        `  Readonly: ${attrs.readonly ? chalk.yellow('Yes') : 'No'}`,
        `  Hidden: ${attrs.hidden ? chalk.yellow('Yes') : 'No'}`,
        `  System: ${attrs.system ? chalk.yellow('Yes') : 'No'}`,
        `  Archive: ${attrs.archive ? 'Yes' : 'No'}`
      ];

      if (attrs.raw) {
        output.push(`  Raw: ${attrs.raw}`);
      }

      return success(attrs, output.join('\n'));
    } catch (err) {
      return error(createFailedMessage('get attributes', err));
    }
  },

  /**
   * Detect file encoding (UTF-8, ASCII, UTF-16, binary, etc.)
   */
  async encoding(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /fs encoding <path>\n\nDetects file encoding (UTF-8, ASCII, UTF-16, binary, etc.)');
    }

    try {
      const enc = await detectFileEncoding(args[0]);

      const confidenceColor = enc.confidence >= 90 ? chalk.green :
        enc.confidence >= 70 ? chalk.yellow : chalk.red;

      const output = [
        chalk.cyan('\n=== File Encoding ===\n'),
        chalk.white(`Path: ${args[0]}`),
        '',
        `  Encoding: ${chalk.bold(enc.encoding)}`,
        `  Confidence: ${confidenceColor(enc.confidence + '%')}`,
        `  BOM: ${enc.bom || 'None'}`,
        `  Details: ${enc.details}`
      ];

      return success(enc, output.join('\n'));
    } catch (err) {
      return error(createFailedMessage('detect encoding', err));
    }
  }
};

// ============================================================
// Shell Commands (Using ShellManager)
// ============================================================

export const shellCommands = {
  /**
   * Run shell command (uses ShellManager for enhanced features)
   */
  async run(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);

    if (!positional.length) {
      return error('Usage: /shell run <command> [--timeout <ms>] [--shell cmd|powershell|bash]');
    }

    const command = positional.join(' ');
    const spinner = new Spinner(`Running: ${truncate(command, 40)}`);

    try {
      const tools = getTools();
      spinner.start();

      // Use ShellManager for enhanced execution
      const result = await tools.shellManager.exec(command, {
        timeout: flags.timeout ? parseInt(flags.timeout as string) : undefined,
        shell: flags.shell as any
      });

      spinner.stop();

      return success({
        command,
        output: truncate(result.stdout, 5000),
        exitCode: result.exitCode,
        duration: `${result.duration}ms`
      }, 'Command completed');
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('run command', err));
    }
  },

  /**
   * Run command in background
   */
  async bg(args: string[]): Promise<CommandResult> {
    if (!args.length) {
      return error('Usage: /shell bg <command>');
    }

    const command = args.join(' ');

    try {
      const tools = getTools();
      const pid = await tools.shellManager.background(command);
      return success({ pid, command }, 'Background process started');
    } catch (err) {
      return error(createFailedMessage('start background process', err));
    }
  },

  /**
   * List processes
   */
  async ps(args: string[]): Promise<CommandResult> {
    const status = args[0] as any;

    try {
      const tools = getTools();
      const processes = tools.shellManager.listProcesses(status ? { status } : undefined);

      const rows = processes.map(p => ({
        pid: p.pid,
        command: truncate(p.command, 30),
        status: p.status,
        duration: p.endTime
          ? formatDuration(p.endTime.getTime() - p.startTime.getTime())
          : 'running'
      }));

      return success({ processes: rows }, `Processes: ${processes.length}`);
    } catch (err) {
      return error(createFailedMessage('list processes', err));
    }
  },

  /**
   * Kill process
   */
  async kill(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /shell kill <pid>');
    }

    const pid = parseInt(args[0]);

    try {
      const tools = getTools();
      const killed = tools.shellManager.kill(pid);

      if (killed) {
        return success(null, `Process ${pid} killed`);
      } else {
        return error(`Could not kill process ${pid}`);
      }
    } catch (err) {
      return error(createFailedMessage('kill process', err));
    }
  },

  /**
   * Get process output
   */
  async output(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /shell output <pid>');
    }

    const pid = parseInt(args[0]);

    try {
      const tools = getTools();
      const output = tools.shellManager.getOutput(pid);
      const errors = tools.shellManager.getErrors(pid);

      return success({
        stdout: truncate(output, 3000),
        stderr: truncate(errors, 1000)
      }, `Process ${pid} output`);
    } catch (err) {
      return error(createFailedMessage('get output', err));
    }
  },

  /**
   * System info (enhanced with ShellManager metrics)
   */
  async sysinfo(): Promise<CommandResult> {
    try {
      const tools = getTools();
      const info = tools.shellManager.getSystemInfo();

      return success({
        platform: info.platform,
        arch: info.arch,
        hostname: info.hostname,
        cpus: info.cpus,
        memory: {
          total: formatBytes(info.memory.total),
          free: formatBytes(info.memory.free)
        },
        uptime: formatDuration(info.uptime * 1000),
        shell: info.shell,
        shellManager: info.shellManager
      }, 'System Information');
    } catch (err) {
      return error(createFailedMessage('get system info', err));
    }
  },

  /**
   * Show ShellManager configuration and status
   */
  async config(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);

    try {
      const tools = getTools();
      const manager = tools.shellManager;

      // Set profile if specified
      if (positional[0] && ['default', 'secure', 'performance', 'debug'].includes(positional[0])) {
        const profile = positional[0] as ShellConfigProfile;
        const profileConfig = SHELL_PROFILES[profile];
        manager.updateConfig({ ...profileConfig, profile });
        return success({ profile, config: profileConfig }, `Profile set to: ${profile}`);
      }

      // Show current config
      const config = manager.getConfig();
      const metrics = manager.getMetrics();

      console.log(chalk.cyan('\n=== ShellManager Configuration ===\n'));
      console.log(chalk.gray(`  Profile: ${config.profile}`));
      console.log(chalk.gray(`  Preferred Shell: ${config.preferredShell}`));
      console.log(chalk.gray(`  Default Timeout: ${config.defaultTimeout}ms`));
      console.log(chalk.gray(`  Sandbox Mode: ${config.sandbox ? chalk.yellow('ENABLED') : 'disabled'}`));
      console.log(chalk.gray(`  Verbose: ${config.verbose}`));
      console.log(chalk.gray(`  Max Concurrent: ${config.maxConcurrentProcesses}`));
      console.log(chalk.gray(`  Track History: ${config.trackHistory}`));
      console.log(chalk.cyan('\n=== Metrics ===\n'));
      console.log(chalk.gray(`  Running: ${metrics.running}`));
      console.log(chalk.gray(`  Tracked: ${metrics.tracked}`));
      console.log(chalk.gray(`  History: ${metrics.historySize}`));
      console.log(chalk.gray(`  Sessions: ${metrics.sessionsActive}`));

      return success({ config, metrics }, 'ShellManager configuration');
    } catch (err) {
      return error(createFailedMessage('get config', err));
    }
  },

  /**
   * Show command history
   */
  async history(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);

    try {
      const tools = getTools();
      const manager = tools.shellManager;

      // Clear history if requested
      if (flags.clear) {
        manager.clearHistory();
        return success(null, 'History cleared');
      }

      // Search history
      if (positional[0]) {
        const results = manager.searchHistory(positional[0]);
        return success({
          query: positional[0],
          matches: results.map(e => ({
            command: truncate(e.command, 60),
            timestamp: e.timestamp.toISOString(),
            exitCode: e.exitCode,
            duration: e.duration ? `${e.duration}ms` : undefined
          }))
        }, `Found ${results.length} matching commands`);
      }

      // Show recent history
      const limit = flags.limit ? parseInt(flags.limit as string) : 20;
      const history = manager.getHistory(limit);

      const entries = history.map(e => ({
        command: truncate(e.command, 50),
        time: e.timestamp.toLocaleTimeString(),
        exit: e.exitCode ?? '?',
        shell: e.shell
      }));

      return success({ entries, total: history.length }, 'Command History');
    } catch (err) {
      return error(createFailedMessage('get history', err));
    }
  },

  /**
   * List available shells
   */
  async shells(): Promise<CommandResult> {
    try {
      const tools = getTools();
      const availability = await tools.shellManager.getAvailableShells();

      console.log(chalk.cyan('\n=== Available Shells ===\n'));

      const printShell = (info: any) => {
        const status = info.available ? chalk.green('[OK]') : chalk.red('[NOT FOUND]');
        const version = info.version ? chalk.gray(` - ${info.version}`) : '';
        console.log(`  ${status} ${info.type}: ${info.path || 'N/A'}${version}`);
      };

      printShell(availability.cmd);
      printShell(availability.powershell);
      printShell(availability.pwsh);
      printShell(availability.bash);
      printShell(availability.sh);
      printShell(availability.zsh);

      console.log(chalk.gray(`\n  Default: ${availability.default}`));

      return success(availability, 'Available shells');
    } catch (err) {
      return error(createFailedMessage('list shells', err));
    }
  },

  /**
   * Escape/quote string for shell
   */
  async escape(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);

    if (!positional.length) {
      return error('Usage: /shell escape <string> [--shell cmd|powershell|bash] [--quote]');
    }

    try {
      const tools = getTools();
      const str = positional.join(' ');
      const shell = flags.shell as any;

      const escaped = tools.shellManager.escape(str, { shell });
      const quoted = tools.shellManager.quote(str, { shell });

      return success({
        original: str,
        escaped,
        quoted,
        shell: shell || tools.shellManager.getConfig().preferredShell
      }, 'Escaped string');
    } catch (err) {
      return error(createFailedMessage('escape string', err));
    }
  },

  /**
   * Shell diagnostics - comprehensive shell and system analysis
   */
  async diagnostics(args: string[]): Promise<CommandResult> {
    const { flags } = parseFlags(args);
    const spinner = new Spinner('Running shell diagnostics...');

    try {
      const diag = getShellDiagnostics();
      spinner.start();

      // Get all diagnostic information
      const systemInfo = await diag.getSystemInfo();
      const healthCheck = await diag.checkShellHealth();
      const processStats = diag.getProcessStats();

      spinner.stop();

      // Print formatted output
      if (flags.system || flags.s) {
        diag.printSystemInfo(systemInfo);
      }

      if (flags.health || flags.h || (!flags.system && !flags.stats)) {
        diag.printHealthCheck(healthCheck);
      }

      if (flags.stats || flags.t) {
        diag.printProcessStats(processStats);
      }

      return success({
        healthy: healthCheck.healthy,
        availableShells: systemInfo.shells.filter(s => s.available).length,
        runningProcesses: processStats.byStatus.running,
        issues: healthCheck.issues,
        recommendations: healthCheck.recommendations
      }, 'Shell diagnostics complete');
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('run diagnostics', err));
    }
  },

  /**
   * List active processes with detailed information
   */
  async processes(args: string[]): Promise<CommandResult> {
    const { flags } = parseFlags(args);

    try {
      const tools = getTools();
      const diag = getShellDiagnostics();
      const processes = tools.shell.listProcesses();

      // Apply filter if provided
      let filtered = processes;
      if (flags.running || flags.r) {
        filtered = processes.filter(p => p.status === 'running');
      } else if (flags.completed || flags.c) {
        filtered = processes.filter(p => p.status === 'completed');
      } else if (flags.error || flags.e) {
        filtered = processes.filter(p => p.status === 'error');
      }

      // Format output
      console.log(chalk.cyan('\n========================================'));
      console.log(chalk.cyan('  ACTIVE PROCESSES'));
      console.log(chalk.cyan(`  (${filtered.length} of ${processes.length})`));
      console.log(chalk.cyan('========================================\n'));

      for (const proc of filtered) {
        const statusColors: Record<string, typeof chalk.green> = {
          running: chalk.green,
          completed: chalk.blue,
          error: chalk.red,
          killed: chalk.yellow,
          zombie: chalk.magenta
        };
        const statusColor = statusColors[proc.status] || chalk.gray;

        const duration = proc.endTime
          ? formatDuration(proc.endTime.getTime() - proc.startTime.getTime())
          : formatDuration(Date.now() - proc.startTime.getTime()) + ' (running)';

        console.log(`${statusColor(`[${proc.status.toUpperCase()}]`)} PID: ${chalk.yellow(proc.pid.toString())}`);
        console.log(chalk.white(`  Command: ${truncate(proc.command, 60)}`));
        console.log(chalk.gray(`  Duration: ${duration}`));
        console.log(chalk.gray(`  Started: ${proc.startTime.toISOString()}`));

        if (proc.exitCode !== undefined) {
          console.log(chalk.gray(`  Exit Code: ${proc.exitCode}`));
        }

        if (proc.output.length > 0 && flags.output) {
          console.log(chalk.gray(`  Output: ${truncate(proc.output.join(''), 100)}`));
        }

        console.log('');
      }

      // Print stats
      const stats = diag.getProcessStats();
      console.log(chalk.cyan('--- Summary ---'));
      console.log(chalk.gray(`Running: ${stats.byStatus.running} | Completed: ${stats.byStatus.completed} | Error: ${stats.byStatus.error} | Killed: ${stats.byStatus.killed}`));

      console.log(chalk.cyan('\n========================================\n'));

      return success({
        total: processes.length,
        filtered: filtered.length,
        byStatus: stats.byStatus
      }, `Showing ${filtered.length} processes`);
    } catch (err) {
      return error(createFailedMessage('list processes', err));
    }
  },

  /**
   * Show execution history with diagnostics
   */
  async execHistory(args: string[]): Promise<CommandResult> {
    const { flags, positional } = parseFlags(args);
    const limit = flags.limit ? parseInt(flags.limit as string) : 20;
    const command = positional[0];

    try {
      const diag = getShellDiagnostics();

      const history = diag.getExecutionHistory({
        limit,
        filter: command ? { command } : undefined
      });

      diag.printExecutionHistory(history, { limit });

      // If --analyze flag is provided, show performance analysis
      if (flags.analyze || flags.a) {
        const report = diag.analyzePerformance({ topN: 5 });
        diag.printPerformanceReport(report);
      }

      return success({
        total: history.length,
        showing: Math.min(limit, history.length)
      }, `Execution history (${history.length} records)`);
    } catch (err) {
      return error(createFailedMessage('get history', err));
    }
  },

  /**
   * Analyze performance over time
   */
  async performance(args: string[]): Promise<CommandResult> {
    const { flags } = parseFlags(args);
    const spinner = new Spinner('Analyzing performance...');

    try {
      const diag = getShellDiagnostics();
      spinner.start();

      // Parse time range
      let startTime: Date | undefined;
      let endTime: Date | undefined;

      if (flags.hours) {
        const hours = parseInt(flags.hours as string);
        startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      } else if (flags.days) {
        const days = parseInt(flags.days as string);
        startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      }

      const report = diag.analyzePerformance({
        startTime,
        endTime,
        topN: flags.top ? parseInt(flags.top as string) : 10
      });

      spinner.stop();
      diag.printPerformanceReport(report);

      return success({
        totalExecutions: report.totalExecutions,
        successRate: report.successRate.toFixed(1) + '%',
        timeoutRate: report.timeoutRate.toFixed(1) + '%',
        avgExecutionTime: (report.executionTime.average / 1000).toFixed(2) + 's',
        recommendations: report.recommendations
      }, 'Performance analysis complete');
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('analyze performance', err));
    }
  },

  /**
   * Clear execution history
   */
  async clearHistory(): Promise<CommandResult> {
    try {
      const diag = getShellDiagnostics();
      const count = diag.clearHistory();
      return success({ cleared: count }, `Cleared ${count} execution records`);
    } catch (err) {
      return error(createFailedMessage('clear history', err));
    }
  }
};

// ============================================================
// Search Commands
// ============================================================
//
// IMPORTANT - Search command distinction:
// - /search grep = Simple grep-like text search (plain text pattern matching)
// - /fs search = Same as /search grep (simple text search)
// - /grep = Alias for /search grep
// - /serena search = LSP-powered semantic code search (in SerenaCommands.ts)
//
// ============================================================

export const searchCommands = {
  /**
   * Grep-like search (simple text pattern matching)
   * NOTE: For LSP-powered semantic search, use /serena search instead
   */
  async grep(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /search grep <pattern> [glob]');
    }

    const [pattern, glob] = args;
    const spinner = new Spinner(`Searching for "${pattern}"...`);

    try {
      const tools = getTools();
      spinner.start();
      const matches = await tools.search.grep(pattern, glob);
      spinner.stop();

      const results = matches.slice(0, 30).map(m => ({
        file: m.file,
        line: m.line,
        content: highlightMatch(truncate(m.content, 60), pattern)
      }));

      return success({
        results,
        showing: Math.min(30, matches.length)
      }, `Found ${matches.length} matches`);
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('search', err));
    }
  },

  /**
   * Find symbol definitions
   */
  async symbol(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /search symbol <name> [type]');
    }

    const [pattern, type] = args;
    const spinner = new Spinner(`Finding symbols matching "${pattern}"...`);

    try {
      const tools = getTools();
      spinner.start();
      const symbols = await tools.search.searchSymbols({
        pattern,
        types: type ? [type as any] : undefined,
        maxResults: 20
      });
      spinner.stop();

      const results = symbols.map(s => ({
        name: s.name,
        type: s.type,
        file: s.file,
        line: s.line,
        signature: truncate(s.signature || '', 50)
      }));

      return success({ results }, `Found ${symbols.length} symbols`);
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('search symbols', err));
    }
  },

  /**
   * Find file by fuzzy matching
   */
  async file(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /search file <query>');
    }

    const query = args.join(' ');

    try {
      const tools = getTools();
      const matches = await tools.search.fuzzyFindFile(query, 15);

      const results = matches.map(m => ({
        file: m.item,
        score: m.score.toFixed(1)
      }));

      return success({ results }, `Files matching "${query}"`);
    } catch (err) {
      return error(createFailedMessage('search files', err));
    }
  },

  /**
   * Find references to a symbol
   */
  async refs(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /search refs <name> [glob]');
    }

    const [name, glob] = args;
    const spinner = new Spinner(`Finding references to "${name}"...`);

    try {
      const tools = getTools();
      spinner.start();
      const refs = await tools.search.findReferences(name, glob);
      spinner.stop();

      const results = refs.slice(0, 30).map(r => ({
        file: r.file,
        line: r.line,
        content: highlightMatch(truncate(r.content, 60), name)
      }));

      return success({
        results,
        showing: Math.min(30, refs.length)
      }, `Found ${refs.length} references to "${name}"`);
    } catch (err) {
      spinner.stop();
      return error(createFailedMessage('find references', err));
    }
  }
};

// ============================================================
// Memory Commands
// ============================================================

export const memoryCommands = {
  /**
   * Set value in memory
   */
  async set(args: string[]): Promise<CommandResult> {
    if (args.length < 2) {
      return error('Usage: /mem set <key> <value>');
    }

    const [key, ...valueParts] = args;
    let value: any = valueParts.join(' ');

    // Try to parse as JSON
    try {
      value = JSON.parse(value);
    } catch {
      // Keep as string
    }

    try {
      const tools = getTools();
      tools.memory.set(key, value);
      return success({ value }, `Set "${key}"`);
    } catch (err) {
      return error(createFailedMessage('set value', err));
    }
  },

  /**
   * Get value from memory
   */
  async get(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /mem get <key>');
    }

    try {
      const tools = getTools();
      const value = tools.memory.get(args[0]);

      if (value === undefined) {
        return error(`Key not found: ${args[0]}`);
      }

      return success({ value }, `Value of "${args[0]}"`);
    } catch (err) {
      return error(createFailedMessage('get value', err));
    }
  },

  /**
   * Search memory
   */
  async find(args: string[]): Promise<CommandResult> {
    if (!args[0]) {
      return error('Usage: /mem find <query>');
    }

    const query = args.join(' ');

    try {
      const tools = getTools();
      const results = tools.memory.searchEntities(query);

      return success({
        entities: results.slice(0, 20)
      }, `Found ${results.length} entities matching "${query}"`);
    } catch (err) {
      return error(createFailedMessage('find entities', err));
    }
  },

  /**
   * Create entity
   */
  async entity(args: string[]): Promise<CommandResult> {
    if (args.length < 2) {
      return error('Usage: /mem entity <name> <type> [observations...]');
    }

    const [name, type, ...observations] = args;

    try {
      const tools = getTools();
      const entity = tools.memory.createEntity(name, type);

      // Add observations if provided
      for (const obs of observations) {
        tools.memory.addObservation(entity.id, obs);
      }

      return success({ type, observations }, `Created entity "${name}"`);
    } catch (err) {
      return error(createFailedMessage('create entity', err));
    }
  },

  /**
   * Add observation to entity
   */
  async observe(args: string[]): Promise<CommandResult> {
    if (args.length < 2) {
      return error('Usage: /mem observe <entity> <observation>');
    }

    const [entityName, ...observationParts] = args;
    const observation = observationParts.join(' ');

    try {
      const tools = getTools();
      // Use observe() method which handles entity lookup/creation
      tools.memory.observe(entityName, observation);
      return success({ observation }, `Added observation to "${entityName}"`);
    } catch (err) {
      return error(createFailedMessage('add observation', err));
    }
  },

  /**
   * Create relation between entities
   */
  async relate(args: string[]): Promise<CommandResult> {
    if (args.length < 3) {
      return error('Usage: /mem relate <from> <relation> <to>');
    }

    const [from, relationType, to] = args;

    try {
      const tools = getTools();
      // Use relate() method which handles entity lookup by name
      const relation = tools.memory.relate(from, to, relationType, true);
      if (!relation) {
        return error('Could not create relation');
      }
      return success(null, `Created relation: ${from} --[${relationType}]--> ${to}`);
    } catch (err) {
      return error(createFailedMessage('create relation', err));
    }
  },

  /**
   * Show graph
   */
  async graph(): Promise<CommandResult> {
    try {
      const tools = getTools();
      const entities = tools.memory.getAllEntities();
      const relations = tools.memory.getAllRelations();

      return success({
        entities: entities.length,
        relations: relations.length,
        types: [...new Set(entities.map(e => e.type))]
      }, 'Knowledge Graph');
    } catch (err) {
      return error(createFailedMessage('get graph', err));
    }
  },

  /**
   * Save memory to disk
   */
  async save(): Promise<CommandResult> {
    try {
      const tools = getTools();
      await tools.memory.save();
      return success(null, 'Memory saved to disk');
    } catch (err) {
      return error(createFailedMessage('save memory', err));
    }
  },

  /**
   * Load memory from disk
   */
  async load(): Promise<CommandResult> {
    try {
      const tools = getTools();
      await tools.memory.load();
      return success(null, 'Memory loaded from disk');
    } catch (err) {
      return error(createFailedMessage('load memory', err));
    }
  }
};

// ============================================================
// Command Registration
// ============================================================

export function registerNativeCommands(): void {
  // Main native tools commands
  commandRegistry.register({
    name: 'native',
    aliases: [],
    description: 'Native tools management',
    usage: '/native <init|status|shutdown> [args]',
    handler: async (ctx) => {
      const [subcommand, ...args] = ctx.args;

      switch (subcommand) {
        case 'init':
          return nativeCommands.init(args);
        case 'status':
          return nativeCommands.status();
        case 'shutdown':
          return nativeCommands.shutdown();
        default:
          return success(
            box(
              `${chalk.cyan('Native Tools Commands')}\n\n` +
              `/native init [dir]  - Initialize native tools\n` +
              `/native status      - Show status\n` +
              `/native shutdown    - Shutdown tools\n\n` +
              `${chalk.cyan('Subcommand Groups')}\n\n` +
              `/fs    - File system operations\n` +
              `/shell - Shell/process operations\n` +
              `/search - Search operations\n` +
              `/mem   - Memory/knowledge graph`,
              'Native Tools'
            )
          );
      }
    }
  });

  // File system commands
  commandRegistry.register({
    name: 'fs',
    aliases: ['file'],
    description: 'File system operations',
    usage: '/fs <read|ls|write|info|search> [args]',
    handler: async (ctx) => {
      const [subcommand, ...args] = ctx.args;

      switch (subcommand) {
        case 'read':
          return fsCommands.read(args);
        case 'ls':
          return fsCommands.ls(args);
        case 'write':
          return fsCommands.write(args);
        case 'info':
          return fsCommands.info(args);
        case 'search':
          return fsCommands.search(args);
        case 'diagnose':
          return fsCommands.diagnose(args);
        case 'sysinfo':
          return fsCommands.sysinfo();
        case 'validate':
          return fsCommands.validate(args);
        case 'perms':
          return fsCommands.perms(args);
        case 'unblock':
          return fsCommands.unblock(args);
        case 'allow':
          return fsCommands.allow(args);
        case 'attrs':
          return fsCommands.attrs(args);
        case 'encoding':
          return fsCommands.encoding(args);
        default:
          return success(
            box(
              `${chalk.cyan('Basic Operations')}\n` +
              `/fs read <path> [--encoding enc]     - Read file contents\n` +
              `/fs write <path> <text> [--force] [--encoding enc]\n` +
              `                                     - Write to file\n` +
              `/fs ls [path] [-r]                   - List directory\n` +
              `/fs info <path>                      - Get file info\n` +
              `/fs search <pattern>                 - Simple text search\n\n` +
              `${chalk.cyan('Diagnostics')}\n` +
              `/fs diagnose <path> [-s]             - Full path diagnostics\n` +
              `/fs validate <path>                  - Validate path syntax\n` +
              `/fs perms <path>                     - Check permissions\n` +
              `/fs sysinfo                          - System filesystem info\n` +
              `/fs attrs <path> [--set|--unset ...]  - Show/set attributes\n` +
              `/fs encoding <path>                  - Detect file encoding\n\n` +
              `${chalk.cyan('Path Management')}\n` +
              `/fs unblock <path>                   - Unblock path (session)\n` +
              `/fs allow <path>                     - Allow path (session)\n\n` +
              `${chalk.gray('Flags:')}\n` +
              `${chalk.gray('  --force     Remove readonly attribute before writing')}\n` +
              `${chalk.gray('  --encoding  Specify encoding (utf-8, ascii, latin1, utf16le)')}\n\n` +
              `${chalk.gray('TIP: For LSP semantic search, use /serena search')}`,
              'File System'
            )
          );
      }
    }
  });

  // Shell commands (using ShellManager)
  commandRegistry.register({
    name: 'shell',
    aliases: ['sh'],
    description: 'Shell and process operations (using ShellManager)',
    usage: '/shell <run|bg|ps|kill|output|sysinfo|config|history|shells|escape|diagnostics> [args]',
    handler: async (ctx) => {
      const [subcommand, ...args] = ctx.args;

      switch (subcommand) {
        // Basic commands (using ShellManager)
        case 'run':
          return shellCommands.run(args);
        case 'bg':
          return shellCommands.bg(args);
        case 'ps':
          return shellCommands.ps(args);
        case 'kill':
          return shellCommands.kill(args);
        case 'output':
          return shellCommands.output(args);
        case 'sysinfo':
          return shellCommands.sysinfo();

        // ShellManager-specific commands
        case 'config':
        case 'cfg':
          return shellCommands.config(args);
        case 'history':
        case 'hist':
          return shellCommands.history(args);
        case 'shells':
          return shellCommands.shells();
        case 'escape':
          return shellCommands.escape(args);

        // Diagnostic commands (from ShellDiagnostics)
        case 'diagnostics':
        case 'diag':
          return shellCommands.diagnostics(args);
        case 'processes':
        case 'proc':
          return shellCommands.processes(args);
        case 'performance':
        case 'perf':
          return shellCommands.performance(args);
        case 'clear-history':
          return shellCommands.clearHistory();
        default:
          return success(
            box(
              `${chalk.cyan('Basic Commands')}\n` +
              `/shell run <cmd> [--timeout ms] [--shell type]\n` +
              `                              - Run command and wait\n` +
              `/shell bg <cmd>               - Run in background\n` +
              `/shell ps [status]            - List processes\n` +
              `/shell kill <pid>             - Kill process\n` +
              `/shell output <pid>           - Get process output\n` +
              `/shell sysinfo                - System information\n\n` +
              `${chalk.cyan('ShellManager Commands')}\n` +
              `/shell config [profile]       - Show/set configuration\n` +
              `       Profiles: default, secure, performance, debug\n` +
              `/shell history [query] [--limit N] [--clear]\n` +
              `                              - Command history\n` +
              `/shell shells                 - List available shells\n` +
              `/shell escape <string> [--shell type] [--quote]\n` +
              `                              - Escape/quote for shell\n\n` +
              `${chalk.cyan('Diagnostics')}\n` +
              `/shell diagnostics [-s|-h|-t] - Full shell diagnostics\n` +
              `/shell processes [--running|--completed|--error]\n` +
              `                              - Detailed process list\n` +
              `/shell performance [--hours N|--days N]\n` +
              `                              - Performance report\n` +
              `/shell clear-history          - Clear execution history`,
              'Shell (via ShellManager)'
            )
          );
      }
    }
  });

  // Search commands (simple grep-like text search)
  // NOTE: For LSP-powered semantic search, use /serena search (in SerenaCommands.ts)
  commandRegistry.register({
    name: 'search',
    aliases: ['s'],
    description: 'Simple text search operations (grep-like)',
    usage: '/search <grep|symbol|file|refs> [args]',
    handler: async (ctx) => {
      const [subcommand, ...args] = ctx.args;

      switch (subcommand) {
        case 'grep':
          return searchCommands.grep(args);
        case 'symbol':
          return searchCommands.symbol(args);
        case 'file':
          return searchCommands.file(args);
        case 'refs':
          return searchCommands.refs(args);
        default:
          return success(
            box(
              `/search grep <pattern> [glob]  - Search file contents (text)\n` +
              `/search symbol <name> [type]   - Find symbols\n` +
              `/search file <query>           - Fuzzy file search\n` +
              `/search refs <name> [glob]     - Find references\n\n` +
              `${chalk.gray('TIP: For LSP semantic search, use /serena search')}`,
              'Search (grep-like)'
            )
          );
      }
    }
  });

  // /grep command - alias for /search grep (simple text search)
  // NOTE: This is NOT the same as /serena search (LSP-powered)
  commandRegistry.register({
    name: 'grep',
    aliases: ['rg'],
    description: 'Simple grep-like text search (alias for /search grep)',
    usage: '/grep <pattern> [glob]',
    handler: async (ctx) => searchCommands.grep(ctx.args)
  });

  // Memory commands
  commandRegistry.register({
    name: 'mem',
    aliases: ['memory'],
    description: 'Memory and knowledge graph operations',
    usage: '/mem <set|get|find|entity|observe|relate|graph|save|load> [args]',
    handler: async (ctx) => {
      const [subcommand, ...args] = ctx.args;

      switch (subcommand) {
        case 'set':
          return memoryCommands.set(args);
        case 'get':
          return memoryCommands.get(args);
        case 'find':
          return memoryCommands.find(args);
        case 'entity':
          return memoryCommands.entity(args);
        case 'observe':
          return memoryCommands.observe(args);
        case 'relate':
          return memoryCommands.relate(args);
        case 'graph':
          return memoryCommands.graph();
        case 'save':
          return memoryCommands.save();
        case 'load':
          return memoryCommands.load();
        default:
          return success(
            box(
              `/mem set <key> <value>          - Store key-value\n` +
              `/mem get <key>                  - Retrieve value\n` +
              `/mem find <query>               - Search entities\n` +
              `/mem entity <name> <type>       - Create entity\n` +
              `/mem observe <entity> <text>    - Add observation\n` +
              `/mem relate <from> <rel> <to>   - Create relation\n` +
              `/mem graph                      - Show graph stats\n` +
              `/mem save                       - Save to disk\n` +
              `/mem load                       - Load from disk`,
              'Memory'
            )
          );
      }
    }
  });

  console.log(chalk.gray('[CLI] Native commands registered'));
}
