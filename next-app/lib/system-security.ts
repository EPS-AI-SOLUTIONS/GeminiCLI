/**
 * System Security Module
 * Replicates security.rs validation for command execution and file operations
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// Allowed Commands Whitelist
// ═══════════════════════════════════════════════════════════════════════════

const ALLOWED_COMMANDS = [
  'dir',
  'ls',
  'pwd',
  'cd',
  'echo',
  'type',
  'cat',
  'head',
  'tail',
  'tree',
  'find',
  'where',
  'ver',
  'uname',
  'Get-Date',
  'Get-Location',
  'Get-ChildItem',
  'Get-Content',
  'Test-Path',
  'Resolve-Path',
  'Select-String',
  'Measure-Object',
  'whoami',
  'hostname',
  'systeminfo',
  'ipconfig',
  'netstat',
  'tasklist',
  'git status',
  'git log',
  'git branch',
  'git diff',
  'git remote -v',
  'git show',
  'node --version',
  'npm --version',
  'npm list',
  'npm run build',
  'npx tsc',
  'python --version',
  'pip list',
];

const DANGEROUS_SEQUENCES = ['&&', '||', ';', '|', '`', '$(', '${', '\n', '\r', '\0', '>', '<'];

const DANGEROUS_PATTERNS = [
  'rm ',
  'del ',
  'rmdir',
  'format',
  'mkfs',
  '>',
  '>>',
  'Remove-Item',
  'Clear-Content',
  'Set-Content',
  'Invoke-Expression',
  'iex',
  'Start-Process',
  'curl',
  'wget',
  'Invoke-WebRequest',
];

export const DANGEROUS_EXTENSIONS = ['.exe', '.dll', '.bat', '.cmd', '.ps1', '.sh', '.msi'];

// ═══════════════════════════════════════════════════════════════════════════
// Validation Functions
// ═══════════════════════════════════════════════════════════════════════════

export function containsShellMetacharacters(cmd: string): boolean {
  return DANGEROUS_SEQUENCES.some((seq) => cmd.includes(seq));
}

export function isCommandAllowed(cmd: string): boolean {
  const cmdLower = cmd.toLowerCase().trim();
  return ALLOWED_COMMANDS.some((allowed) => cmdLower.startsWith(allowed.toLowerCase()));
}

export function containsDangerousPatterns(cmd: string): boolean {
  const cmdLower = cmd.toLowerCase();
  return DANGEROUS_PATTERNS.some((pattern) => cmdLower.includes(pattern.toLowerCase()));
}

export function isDangerousExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return DANGEROUS_EXTENSIONS.includes(ext);
}

/**
 * Validate a command against all security checks.
 * Returns null if valid, or an error message string if blocked.
 */
export function validateCommand(command: string): string | null {
  if (!command || typeof command !== 'string') {
    return 'Command is required';
  }

  if (containsShellMetacharacters(command)) {
    return `SECURITY: Command contains shell metacharacters (chaining/injection blocked): '${command.slice(0, 50)}'`;
  }

  if (!isCommandAllowed(command)) {
    return `SECURITY: Command '${command.slice(0, 50)}' is not in the allowlist`;
  }

  if (containsDangerousPatterns(command)) {
    return 'SECURITY: Command contains dangerous patterns';
  }

  return null;
}

/**
 * Validate objective string for swarm spawning
 * Returns null if valid, or an error message string if blocked.
 */
export function validateObjective(objective: string): string | null {
  if (!objective || typeof objective !== 'string') {
    return 'Objective is required';
  }

  const dangerousChars = ['`', '$', '|', '&', ';', '>', '<', '\n', '\r'];
  for (const c of dangerousChars) {
    if (objective.includes(c)) {
      return `SECURITY: Objective contains dangerous character '${c}'`;
    }
  }

  if (objective.length > 1000) {
    return 'SECURITY: Objective too long (max 1000 characters)';
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Project Root Discovery
// ═══════════════════════════════════════════════════════════════════════════

export function getProjectRoot(): string {
  let current = process.cwd();
  for (let i = 0; i < 10; i++) {
    const pkgPath = path.join(current, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const content = fs.readFileSync(pkgPath, 'utf-8');
        if (content.includes('gemini-hydra-core')) return current;
      } catch {
        // ignore
      }
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return process.cwd();
}
