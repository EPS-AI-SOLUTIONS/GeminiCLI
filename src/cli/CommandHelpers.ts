/**
 * CommandHelpers - Shared utility functions for CLI commands
 *
 * Common helpers for argument parsing, formatting, and user interaction.
 */

import readline from 'node:readline';
import chalk from 'chalk';
import { escapeRegex } from '../utils/regex.js';

/**
 * Parsed arguments result
 */
export interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | boolean>;
}

/**
 * Parse a string of arguments into positional args and flags
 *
 * Supports:
 *   --flag value    (long flag with value)
 *   --flag          (boolean long flag)
 *   -f              (boolean short flag)
 *   -f value        (short flag with value, only if next arg doesn't start with -)
 *   positional args
 */
export function parseArgs(argsInput: string | string[]): ParsedArgs {
  const args = typeof argsInput === 'string' ? argsInput.split(/\s+/).filter(Boolean) : argsInput;

  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--')) {
      // Long flag
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        // --flag=value format
        const key = arg.slice(2, eqIndex);
        flags[key] = arg.slice(eqIndex + 1);
      } else {
        const key = arg.slice(2);
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags[key] = nextArg;
          i++;
        } else {
          flags[key] = true;
        }
      }
    } else if (arg.startsWith('-') && arg.length > 1) {
      // Short flag(s)
      const chars = arg.slice(1);
      if (chars.length === 1) {
        // Single short flag, might have value
        const nextArg = args[i + 1];
        if (nextArg && !nextArg.startsWith('-')) {
          flags[chars] = nextArg;
          i++;
        } else {
          flags[chars] = true;
        }
      } else {
        // Multiple short flags combined (-abc = -a -b -c)
        for (const char of chars) {
          flags[char] = true;
        }
      }
    } else {
      positional.push(arg);
    }
  }

  return { positional: positional, flags };
}

/**
 * Get flag value as string
 */
export function getStringFlag(
  flags: Record<string, string | boolean>,
  ...names: string[]
): string | undefined {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === 'string') return value;
    if (value === true) return '';
  }
  return undefined;
}

/**
 * Get flag value as boolean
 */
export function getBooleanFlag(
  flags: Record<string, string | boolean>,
  ...names: string[]
): boolean {
  for (const name of names) {
    if (flags[name]) return true;
  }
  return false;
}

/**
 * Get flag value as number
 */
export function getNumberFlag(
  flags: Record<string, string | boolean>,
  defaultValue: number,
  ...names: string[]
): number {
  for (const name of names) {
    const value = flags[name];
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return defaultValue;
}

/**
 * Table column definition
 */
export interface TableColumn {
  header: string;
  key: string;
  width?: number;
  align?: 'left' | 'right' | 'center';
  color?: (value: string) => string;
}

/**
 * Format data as a table
 */
export function formatTable(columns: TableColumn[], rows: Record<string, unknown>[]): string {
  if (rows.length === 0) {
    return chalk.gray('(no data)');
  }

  // Calculate column widths
  const widths = columns.map((col) => {
    if (col.width) return col.width;

    const headerLen = col.header.length;
    const maxDataLen = rows.reduce((max, row) => {
      const val = String(row[col.key] ?? '');
      return Math.max(max, val.length);
    }, 0);

    return Math.max(headerLen, maxDataLen);
  });

  // Build header
  const headerRow = columns
    .map((col, i) => padString(col.header, widths[i], col.align || 'left'))
    .join('  ');

  const separator = widths.map((w) => '-'.repeat(w)).join('  ');

  // Build data rows
  const dataRows = rows.map((row) => {
    return columns
      .map((col, i) => {
        const val = String(row[col.key] ?? '');
        const padded = padString(val, widths[i], col.align || 'left');
        return col.color ? col.color(padded) : padded;
      })
      .join('  ');
  });

  return [chalk.bold(headerRow), chalk.gray(separator), ...dataRows].join('\n');
}

/**
 * Simple table with headers and string rows
 */
export function formatSimpleTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return chalk.gray('(no data)');
  }

  // Calculate widths
  const widths = headers.map((header, colIndex) => {
    const maxDataLen = rows.reduce((max, row) => {
      const val = row[colIndex] || '';
      return Math.max(max, val.length);
    }, 0);
    return Math.max(header.length, maxDataLen);
  });

  // Build output
  const headerRow = headers.map((h, i) => h.padEnd(widths[i])).join('  ');

  const separator = widths.map((w) => '-'.repeat(w)).join('  ');

  const dataRows = rows.map((row) =>
    row.map((cell, i) => (cell || '').padEnd(widths[i])).join('  '),
  );

  return [chalk.bold(headerRow), chalk.gray(separator), ...dataRows].join('\n');
}

/**
 * Pad string to width with alignment
 */
function padString(str: string, width: number, align: 'left' | 'right' | 'center'): string {
  if (str.length >= width) return str;

  const diff = width - str.length;

  switch (align) {
    case 'right':
      return ' '.repeat(diff) + str;
    case 'center': {
      const left = Math.floor(diff / 2);
      const right = diff - left;
      return ' '.repeat(left) + str + ' '.repeat(right);
    }
    default:
      return str + ' '.repeat(diff);
  }
}

/**
 * Format duration from milliseconds
 */
export function formatDuration(ms: number): string {
  if (ms < 0) return '-';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const h = hours % 24;
    return `${days}d ${h}h`;
  }
  if (hours > 0) {
    const m = minutes % 60;
    return `${hours}h ${m}m`;
  }
  if (minutes > 0) {
    const s = seconds % 60;
    return `${minutes}m ${s}s`;
  }
  if (seconds > 0) {
    return `${seconds}s`;
  }

  return `${ms}ms`;
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | number): string {
  const d = new Date(date);
  const now = Date.now();
  const diff = now - d.getTime();

  if (diff < 0) return 'in the future';

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return d.toLocaleDateString();
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  if (seconds > 10) return `${seconds} seconds ago`;

  return 'just now';
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exp = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / 1024 ** exp;

  return `${value.toFixed(exp > 0 ? 1 : 0)} ${units[exp]}`;
}

/**
 * Format number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Prompt for user confirmation
 */
export async function confirmAction(
  message: string,
  defaultValue: boolean = false,
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? '[Y/n]' : '[y/N]';

  return new Promise((resolve) => {
    rl.question(`${chalk.yellow('?')} ${message} ${chalk.gray(hint)} `, (answer) => {
      rl.close();

      const trimmed = answer.trim().toLowerCase();
      if (trimmed === '') {
        resolve(defaultValue);
      } else {
        resolve(trimmed === 'y' || trimmed === 'yes');
      }
    });
  });
}

/**
 * Prompt for user input
 */
export async function promptInput(message: string, defaultValue?: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const hint = defaultValue ? chalk.gray(` (${defaultValue})`) : '';

  return new Promise((resolve) => {
    rl.question(`${chalk.cyan('?')} ${message}${hint}: `, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue || '');
    });
  });
}

/**
 * Prompt for selection from options
 */
export async function promptSelect<T extends string>(
  message: string,
  options: { value: T; label: string }[],
): Promise<T | null> {
  console.log(`\n${chalk.cyan('?')} ${message}\n`);

  options.forEach((opt, i) => {
    console.log(`  ${chalk.cyan((i + 1).toString())}. ${opt.label}`);
  });
  console.log(`  ${chalk.gray('0')}. Cancel\n`);

  const answer = await promptInput('Enter number');
  const index = parseInt(answer, 10);

  if (index === 0 || Number.isNaN(index) || index > options.length) {
    return null;
  }

  return options[index - 1].value;
}

/**
 * Truncate string with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Indent text
 */
export function indent(text: string, spaces: number = 2): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map((line) => pad + line)
    .join('\n');
}

/**
 * Create a horizontal line
 */
export function horizontalLine(length: number = 50, char: string = '-'): string {
  return chalk.gray(char.repeat(length));
}

/**
 * Create a box around text
 */
export function box(content: string, title?: string): string {
  const lines = content.split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length), title?.length || 0);
  const width = maxLen + 2;

  const top = title
    ? `+-[ ${chalk.bold(title)} ]${'-'.repeat(Math.max(0, width - title.length - 6))}+`
    : `+${'-'.repeat(width)}+`;

  const bottom = `+${'-'.repeat(width)}+`;

  const boxedLines = lines.map((l) => `| ${l.padEnd(maxLen)} |`);

  return [top, ...boxedLines, bottom].join('\n');
}

/**
 * Spinner for async operations
 */
export class Spinner {
  private frames = ['|', '/', '-', '\\'];
  private frameIndex = 0;
  private interval?: NodeJS.Timeout;
  private message: string;

  constructor(message: string = 'Loading') {
    this.message = message;
  }

  start(): void {
    process.stdout.write('\x1B[?25l'); // Hide cursor
    this.interval = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      process.stdout.write(`\r${chalk.cyan(frame)} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 100);
  }

  stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    process.stdout.write('\x1B[?25h'); // Show cursor
    process.stdout.write(`\r${' '.repeat(this.message.length + 5)}\r`);
    if (finalMessage) {
      console.log(finalMessage);
    }
  }

  update(message: string): void {
    this.message = message;
  }
}

/**
 * Progress indicator for operations
 */
export function showProgress(current: number, total: number, label?: string): string {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;
  const barWidth = 20;
  const filled = Math.round((percent / 100) * barWidth);
  const bar = chalk.green('='.repeat(filled)) + chalk.gray('-'.repeat(barWidth - filled));

  const labelText = label ? ` ${label}` : '';
  return `[${bar}] ${percent}%${labelText}`;
}

/**
 * Create a colored status indicator
 */
export function statusIndicator(
  status: 'success' | 'error' | 'warning' | 'info' | 'pending',
): string {
  switch (status) {
    case 'success':
      return chalk.green('[OK]');
    case 'error':
      return chalk.red('[ERROR]');
    case 'warning':
      return chalk.yellow('[WARN]');
    case 'info':
      return chalk.blue('[INFO]');
    case 'pending':
      return chalk.gray('[...]');
  }
}

/**
 * Highlight matched text in a string
 */
export function highlightMatch(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, chalk.yellow.bold('$1'));
}

// escapeRegex is re-exported from utils/regex.ts
export { escapeRegex } from '../utils/regex.js';

export default {
  parseArgs,
  getStringFlag,
  getBooleanFlag,
  getNumberFlag,
  formatTable,
  formatSimpleTable,
  formatDuration,
  formatRelativeTime,
  formatBytes,
  formatNumber,
  formatPercent,
  confirmAction,
  promptInput,
  promptSelect,
  truncate,
  indent,
  horizontalLine,
  box,
  Spinner,
  showProgress,
  statusIndicator,
  highlightMatch,
  escapeRegex,
};
