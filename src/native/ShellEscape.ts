/**
 * ShellEscape - Shell argument and command escaping utilities
 *
 * Provides cross-platform shell escaping for:
 * - Windows CMD
 * - Windows PowerShell
 * - Unix bash/sh/zsh
 *
 * Features:
 * - Escape single arguments (escapeShellArg)
 * - Escape full commands (escapeShellCommand)
 * - Smart quoting (quoteArg)
 * - Platform-specific escaping (escapeForCmd, escapeForPowerShell)
 * - Command parsing (parseCommand)
 * - Command building (buildCommand)
 * - Glob pattern escaping (escapeGlobPattern)
 * - Command sanitization (sanitizeCommand)
 */

import os from 'os';

// ============================================================
// Types
// ============================================================

export type ShellPlatform = 'windows' | 'unix';
export type WindowsShellType = 'cmd' | 'powershell';

// ============================================================
// Platform Detection
// ============================================================

/**
 * Detect current platform
 */
export function isWindowsPlatform(): boolean {
  return os.platform() === 'win32';
}

/**
 * Get current platform type
 */
export function getCurrentPlatform(): ShellPlatform {
  return isWindowsPlatform() ? 'windows' : 'unix';
}

// ============================================================
// Argument Escaping
// ============================================================

/**
 * Escape a single shell argument for safe use in shell commands.
 * Handles spaces, quotes, backslashes, and special characters.
 *
 * Special characters handled:
 * - Spaces (require quoting)
 * - Quotes (single and double)
 * - Backslash
 * - Shell special: $, `, !, &, |, ;, (, ), <, >, *, ?, [, ], {, }, ~
 * - Whitespace: newline, tab, carriage return
 *
 * @param arg - The argument to escape
 * @param platform - Optional platform override ('windows' | 'unix')
 * @returns Escaped argument string
 *
 * @example
 * // Unix
 * escapeShellArg('hello world', 'unix')  // Returns: 'hello world'
 * escapeShellArg("it's fine", 'unix')    // Returns: 'it'\''s fine'
 *
 * // Windows
 * escapeShellArg('hello world', 'windows')  // Returns: "hello world"
 * escapeShellArg('path\\file', 'windows')   // Returns: "path\\file"
 */
export function escapeShellArg(arg: string, platform?: ShellPlatform): string {
  const isWindows = platform === 'windows' || (platform === undefined && isWindowsPlatform());

  if (isWindows) {
    return escapeShellArgWindows(arg);
  } else {
    return escapeShellArgUnix(arg);
  }
}

/**
 * Escape argument for Windows CMD/PowerShell
 *
 * Windows escaping is complex due to multiple layers:
 * - CMD uses ^ for escaping special chars
 * - PowerShell uses ` (backtick) for escaping
 * - Double quotes have their own escaping rules
 */
export function escapeShellArgWindows(arg: string): string {
  // Empty string needs to be quoted
  if (arg === '') {
    return '""';
  }

  // Check if the string needs escaping
  // Special chars: spaces, quotes, backtick, dollar, ampersand, pipe, semicolon,
  // parens, angle brackets, asterisk, question, brackets, braces, tilde, caret, percent, exclamation
  const needsEscaping = /[\s"'`$&|;()<>*?[\]{}~^%!]|[\r\n\t]/.test(arg);

  if (!needsEscaping && !arg.includes('\\')) {
    return arg;
  }

  // For PowerShell/CMD, we use double quotes and escape internal characters
  let escaped = arg;

  // Escape backslashes followed by quotes or at end of string
  // In Windows, backslashes before quotes need doubling
  escaped = escaped.replace(/(\\*)"/g, (_match, slashes: string) => {
    return slashes + slashes + '\\"';
  });

  // Escape trailing backslashes (they would escape the closing quote)
  escaped = escaped.replace(/(\\+)$/, (_match, slashes: string) => {
    return slashes + slashes;
  });

  // Escape special CMD characters: ^, &, |, <, >, %
  // These need caret escaping in CMD
  escaped = escaped.replace(/([&|<>^%])/g, '^$1');

  // Escape exclamation mark (delayed expansion in CMD)
  escaped = escaped.replace(/!/g, '^^!');

  // Handle newlines and tabs - these need special treatment
  escaped = escaped.replace(/\r\n/g, '`r`n');
  escaped = escaped.replace(/\n/g, '`n');
  escaped = escaped.replace(/\r/g, '`r');
  escaped = escaped.replace(/\t/g, '`t');

  return `"${escaped}"`;
}

/**
 * Escape argument for Unix bash/sh
 *
 * Unix escaping strategies:
 * - Single quotes: Preserve everything literally except single quotes
 * - Double quotes: Allow variable expansion, need to escape $, `, \, ", !
 * - Backslash: Escape individual characters
 */
export function escapeShellArgUnix(arg: string): string {
  // Empty string needs to be quoted
  if (arg === '') {
    return "''";
  }

  // Check if string needs escaping
  const needsEscaping = /[\s"'`$&|;()<>*?[\]{}~!\\]|[\r\n\t]/.test(arg);

  if (!needsEscaping) {
    return arg;
  }

  // For Unix, single quotes are safest - they preserve everything literally
  // except single quotes themselves, which need special handling
  if (!arg.includes("'")) {
    return `'${arg}'`;
  }

  // If string contains single quotes, we need to break out and escape them
  // 'foo'\''bar' -> foo'bar (end quote, escaped quote, start quote)
  const escaped = arg.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

// ============================================================
// Command Escaping
// ============================================================

/**
 * Escape a full shell command string.
 * Useful when you need to pass a command string to another shell.
 *
 * @param cmd - The command string to escape
 * @param platform - Optional platform override ('windows' | 'unix')
 * @returns Escaped command string
 *
 * @example
 * // For bash -c
 * escapeShellCommand('echo "hello"', 'unix')
 * // Returns: 'echo "hello"'
 *
 * // For PowerShell -Command
 * escapeShellCommand('echo "hello"', 'windows')
 * // Returns: "echo \"hello\""
 */
export function escapeShellCommand(cmd: string, platform?: ShellPlatform): string {
  const isWindows = platform === 'windows' || (platform === undefined && isWindowsPlatform());

  if (isWindows) {
    return escapeShellCommandWindows(cmd);
  } else {
    return escapeShellCommandUnix(cmd);
  }
}

/**
 * Escape full command for Windows (for passing to PowerShell -Command or cmd /c)
 */
export function escapeShellCommandWindows(cmd: string): string {
  let escaped = cmd;

  // Escape double quotes
  escaped = escaped.replace(/"/g, '\\"');

  // Escape dollar signs (PowerShell variable expansion)
  escaped = escaped.replace(/\$/g, '`$');

  // Escape backticks (PowerShell escape character)
  escaped = escaped.replace(/`/g, '``');

  return `"${escaped}"`;
}

/**
 * Escape full command for Unix (for passing to bash -c)
 */
export function escapeShellCommandUnix(cmd: string): string {
  // For passing to bash -c, wrap in single quotes
  // Escape single quotes using the '\'' technique
  const escaped = cmd.replace(/'/g, "'\\''");
  return `'${escaped}'`;
}

// ============================================================
// Smart Quoting
// ============================================================

/**
 * Smart quote an argument, choosing the best quoting style.
 * Prefers no quotes if possible, then single quotes (Unix) or double quotes (Windows).
 *
 * @param arg - The argument to quote
 * @param platform - Optional platform override ('windows' | 'unix')
 * @returns Quoted argument string
 *
 * @example
 * quoteArg('simple', 'unix')       // Returns: simple (no quotes needed)
 * quoteArg('has space', 'unix')    // Returns: 'has space'
 * quoteArg("it's", 'unix')         // Returns: "it's" or 'it'\''s'
 */
export function quoteArg(arg: string, platform?: ShellPlatform): string {
  const isWindows = platform === 'windows' || (platform === undefined && isWindowsPlatform());

  if (isWindows) {
    return quoteArgWindows(arg);
  } else {
    return quoteArgUnix(arg);
  }
}

/**
 * Smart quote for Windows
 */
export function quoteArgWindows(arg: string): string {
  // Empty string
  if (arg === '') {
    return '""';
  }

  // No special characters - no quotes needed
  // Safe characters: alphanumeric, dot, underscore, hyphen, plus, equals, colon, slash, at, backslash
  if (/^[a-zA-Z0-9._\-+=/:@\\]+$/.test(arg)) {
    return arg;
  }

  // Has special characters - use double quotes with escaping
  return escapeShellArgWindows(arg);
}

/**
 * Smart quote for Unix
 */
export function quoteArgUnix(arg: string): string {
  // Empty string
  if (arg === '') {
    return "''";
  }

  // No special characters - no quotes needed
  if (/^[a-zA-Z0-9._\-+=/:@]+$/.test(arg)) {
    return arg;
  }

  // No single quotes - use single quotes (simplest, most secure)
  if (!arg.includes("'")) {
    return `'${arg}'`;
  }

  // No double quotes and no special chars that need escaping in double quotes
  // Special chars in double quotes: $, `, \, ", !
  if (!arg.includes('"') && !/[$`\\!]/.test(arg)) {
    return `"${arg}"`;
  }

  // Fall back to escaped single quotes
  return escapeShellArgUnix(arg);
}

// ============================================================
// Shell-Specific Escaping
// ============================================================

/**
 * Escape for PowerShell specifically (handles backtick escaping)
 *
 * @param arg - The argument to escape
 * @returns PowerShell-safe escaped string
 *
 * @example
 * escapeForPowerShell('$var')     // Returns: `$var
 * escapeForPowerShell('hello`n')  // Returns: hello``n
 */
export function escapeForPowerShell(arg: string): string {
  if (arg === '') {
    return '""';
  }

  // PowerShell uses backtick as escape character
  let escaped = arg;

  // Escape backticks first (before adding new ones)
  escaped = escaped.replace(/`/g, '``');

  // Escape dollar signs (variable expansion)
  escaped = escaped.replace(/\$/g, '`$');

  // Escape double quotes
  escaped = escaped.replace(/"/g, '`"');

  // Escape special characters that have meaning in PowerShell
  // ( ) { } [ ] are used for grouping/arrays
  escaped = escaped.replace(/([(){}[\]])/g, '`$1');

  // Check if quoting is needed
  if (/[\s'"]/.test(escaped) || /[\s'"]/.test(arg)) {
    return `"${escaped}"`;
  }

  return escaped;
}

/**
 * Escape for CMD.exe specifically (handles caret escaping)
 *
 * @param arg - The argument to escape
 * @returns CMD-safe escaped string
 *
 * @example
 * escapeForCmd('a&b')    // Returns: a^&b
 * escapeForCmd('100%')   // Returns: 100%%
 */
export function escapeForCmd(arg: string): string {
  if (arg === '') {
    return '""';
  }

  let escaped = arg;

  // CMD uses caret (^) as escape character for special chars
  // Special characters: & | < > ^
  escaped = escaped.replace(/([&|<>^])/g, '^$1');

  // Percent signs need doubling in CMD
  escaped = escaped.replace(/%/g, '%%');

  // Exclamation marks (delayed expansion) - escape with caret
  escaped = escaped.replace(/!/g, '^!');

  // Handle quotes - escape with backslash inside quoted strings
  if (/[\s"]/.test(escaped) || /[\s"]/.test(arg)) {
    escaped = escaped.replace(/"/g, '\\"');
    return `"${escaped}"`;
  }

  return escaped;
}

// ============================================================
// Command Building and Parsing
// ============================================================

/**
 * Build a command string from command and arguments with proper escaping.
 *
 * @param cmd - The command to run
 * @param args - Array of arguments
 * @param platform - Optional platform override ('windows' | 'unix')
 * @returns Full command string with escaped arguments
 *
 * @example
 * buildCommand('echo', ['hello', 'world with space'], 'unix')
 * // Returns: echo hello 'world with space'
 */
export function buildCommand(cmd: string, args: string[], platform?: ShellPlatform): string {
  const escapedArgs = args.map(arg => quoteArg(arg, platform));
  return [cmd, ...escapedArgs].join(' ');
}

/**
 * Parse a command string into command and arguments.
 * Handles quoted arguments correctly.
 *
 * @param cmdString - The command string to parse
 * @returns Object with command and args array
 *
 * @example
 * parseCommand('echo "hello world" test')
 * // Returns: { command: 'echo', args: ['hello world', 'test'] }
 */
export function parseCommand(cmdString: string): { command: string; args: string[] } {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escapeNext = false;

  for (let i = 0; i < cmdString.length; i++) {
    const char = cmdString[i];

    if (escapeNext) {
      current += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      escapeNext = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return {
    command: tokens[0] || '',
    args: tokens.slice(1)
  };
}

// ============================================================
// Pattern and Sanitization
// ============================================================

/**
 * Escape special glob/regex characters in a string for use in shell patterns.
 *
 * @param str - The string to escape
 * @returns Escaped string safe for use in patterns
 *
 * @example
 * escapeGlobPattern('file*.txt')  // Returns: file\*.txt
 * escapeGlobPattern('[test]')     // Returns: \[test\]
 */
export function escapeGlobPattern(str: string): string {
  // Escape glob special characters: * ? [ ] { } ~
  return str.replace(/[*?[\]{}~]/g, '\\$&');
}

/**
 * Escape regex special characters in a string.
 *
 * @param str - The string to escape
 * @returns Escaped string safe for use in regex
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate and sanitize a command to prevent injection.
 * Returns null if the command looks suspicious.
 *
 * @param cmd - The command to validate
 * @returns Sanitized command or null if suspicious
 *
 * @example
 * sanitizeCommand('ls -la')              // Returns: 'ls -la'
 * sanitizeCommand('ls; rm -rf /')        // Returns: null (suspicious)
 * sanitizeCommand('echo `whoami`')       // Returns: null (command substitution)
 */
export function sanitizeCommand(cmd: string): string | null {
  // Check for common injection patterns
  const suspiciousPatterns = [
    /;\s*rm\s/i,           // rm after semicolon
    /\|\s*rm\s/i,          // rm after pipe
    /\|\|\s*rm\s/i,        // rm after || (OR operator - Bash/PowerShell)
    /&&\s*rm\s/i,          // rm after && (AND operator - Bash/PowerShell)
    /\|\|.*\b(rm|del|Remove-Item|Clear-Content)\b/i,  // Dangerous commands after ||
    /&&.*\b(rm|del|Remove-Item|Clear-Content)\b/i,    // Dangerous commands after &&
    /`[^`]*`/,             // Command substitution with backticks
    /\$\([^)]*\)/,         // Command substitution with $()
    />\s*\/dev\/sd/,       // Writing to block devices
    />\s*\/etc\//,         // Writing to /etc
    /rm\s+-rf?\s+\//,      // rm -rf /
    /:\(\)\s*{\s*:\s*\|\s*:\s*&\s*}\s*;\s*:/,  // Fork bomb (with flexible whitespace)
    /mkfs\./,              // Filesystem formatting
    /dd\s+if=/,            // Direct disk access
    />\s*\/dev\/null.*2>&1.*&/,  // Background with redirect (potential hiding)
    /base64\s+-d/,         // Base64 decode (potential obfuscation)
    /eval\s+/,             // Eval command (dangerous)
    /curl.*\|\s*(ba)?sh/i, // Curl pipe to shell
    /wget.*\|\s*(ba)?sh/i, // Wget pipe to shell
    /\|\|\s*(powershell|cmd|sh|bash)\b/i,  // || followed by shell execution
    /&&\s*(powershell|cmd|sh|bash)\b/i,    // && followed by shell execution
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(cmd)) {
      return null;
    }
  }

  return cmd;
}

/**
 * Check if a command is safe to execute (no suspicious patterns)
 *
 * @param cmd - The command to check
 * @returns true if safe, false if suspicious
 */
export function isCommandSafe(cmd: string): boolean {
  return sanitizeCommand(cmd) !== null;
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Join path segments with proper escaping for shell use
 *
 * @param segments - Path segments to join
 * @param platform - Optional platform override
 * @returns Escaped path string
 */
export function escapePathForShell(pathStr: string, platform?: ShellPlatform): string {
  return quoteArg(pathStr, platform);
}

/**
 * Create a shell-safe environment variable assignment
 *
 * @param name - Variable name
 * @param value - Variable value
 * @param platform - Optional platform override
 * @returns Shell command for setting the variable
 */
export function createEnvAssignment(name: string, value: string, platform?: ShellPlatform): string {
  const isWindows = platform === 'windows' || (platform === undefined && isWindowsPlatform());

  if (isWindows) {
    // PowerShell: $env:NAME = "value"
    return `$env:${name} = ${escapeShellArgWindows(value)}`;
  } else {
    // Unix: export NAME='value'
    return `export ${name}=${escapeShellArgUnix(value)}`;
  }
}

// ============================================================
// Default Export (for convenience)
// ============================================================

export default {
  // Core escaping
  escapeShellArg,
  escapeShellArgWindows,
  escapeShellArgUnix,
  escapeShellCommand,
  escapeShellCommandWindows,
  escapeShellCommandUnix,

  // Quoting
  quoteArg,
  quoteArgWindows,
  quoteArgUnix,

  // Shell-specific
  escapeForPowerShell,
  escapeForCmd,

  // Building and parsing
  buildCommand,
  parseCommand,

  // Patterns and sanitization
  escapeGlobPattern,
  escapeRegex,
  sanitizeCommand,
  isCommandSafe,

  // Utilities
  escapePathForShell,
  createEnvAssignment,

  // Platform detection
  isWindowsPlatform,
  getCurrentPlatform,
};
