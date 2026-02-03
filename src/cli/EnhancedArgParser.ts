/**
 * EnhancedArgParser - Advanced argument parsing for CLI commands
 *
 * Supports:
 * - Short flags: -f, -v
 * - Combined short flags: -fv (same as -f -v)
 * - Long flags: --force, --verbose
 * - Flags with values: --output=file.txt, --output file.txt, -o file.txt
 * - Boolean negation: --no-color (sets color=false)
 * - Double dash (--): stops flag parsing, rest are positional
 * - Quoted values: --message "hello world"
 * - Escape sequences: --path C:\\Users\\name
 */

import chalk from 'chalk';

/**
 * Flag definition for commands
 */
export interface FlagDefinition {
  /** Short flag name without dash (e.g., 'f' for -f) */
  short?: string;
  /** Long flag name without dashes (e.g., 'force' for --force) */
  long: string;
  /** Description for help text */
  description: string;
  /** Whether flag accepts a value */
  type: 'boolean' | 'string' | 'number';
  /** Default value if not provided */
  default?: string | boolean | number;
  /** Whether this flag is required */
  required?: boolean;
  /** Aliases for the flag */
  aliases?: string[];
}

/**
 * Parsed arguments result
 */
export interface ParsedArgs {
  /** Positional arguments (non-flag arguments) */
  positional: string[];
  /** Parsed flags with their values */
  flags: Record<string, string | boolean | number>;
  /** Raw input string */
  raw: string;
  /** Unknown flags that were encountered */
  unknownFlags: string[];
  /** Validation errors */
  errors: string[];
  /** Index where -- was found (-1 if not present) */
  doubleDashIndex: number;
  /** Arguments after -- (passed through as-is) */
  passthrough: string[];
}

/**
 * Command definition (minimal interface for validation)
 */
export interface CommandWithFlags {
  name: string;
  flags?: FlagDefinition[];
}

/**
 * Tokenize input string handling quotes and escape sequences
 * @param input - Raw input string
 * @returns Array of tokens
 */
export function tokenizeInput(input: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let escaped = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (escaped) {
      // Handle escape sequences
      switch (char) {
        case 'n': current += '\n'; break;
        case 't': current += '\t'; break;
        case 'r': current += '\r'; break;
        case '\\': current += '\\'; break;
        case '"': current += '"'; break;
        case "'": current += "'"; break;
        case ' ': current += ' '; break;
        default: current += char; break;
      }
      escaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      escaped = true;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === ' ' && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Set a flag value with proper type conversion
 */
function setFlagValue(
  result: ParsedArgs,
  flagName: string,
  value: string | boolean,
  flagDefs: FlagDefinition[] | undefined,
  shortToLong: Map<string, string>,
  longFlags: Set<string>,
  flagTypes: Map<string, 'boolean' | 'string' | 'number'>
): void {
  const resolvedName = shortToLong.get(flagName) || flagName;
  const flagType = flagTypes.get(resolvedName) || (typeof value === 'boolean' ? 'boolean' : 'string');

  // Track unknown flags
  if (flagDefs && !longFlags.has(flagName) && !shortToLong.has(flagName)) {
    const prefix = flagName.length === 1 ? '-' : '--';
    result.unknownFlags.push(`${prefix}${flagName}`);
  }

  // Convert value to proper type
  let convertedValue: string | boolean | number = value;

  if (typeof value === 'string') {
    switch (flagType) {
      case 'boolean':
        convertedValue = value.toLowerCase() === 'true' || value === '1' || value === 'yes';
        break;
      case 'number':
        const num = parseFloat(value);
        if (isNaN(num)) {
          result.errors.push(`Flag --${resolvedName} expects a number, got "${value}"`);
          convertedValue = value;
        } else {
          convertedValue = num;
        }
        break;
      case 'string':
      default:
        convertedValue = value;
        break;
    }
  }

  result.flags[resolvedName] = convertedValue;
}

/**
 * Parse command arguments into positional args and flags
 *
 * @param input - Either string input or pre-tokenized array
 * @param flagDefs - Optional flag definitions for validation
 */
export function parseArgs(input: string | string[], flagDefs?: FlagDefinition[]): ParsedArgs {
  const tokens = typeof input === 'string' ? tokenizeInput(input) : input;
  const raw = typeof input === 'string' ? input : input.join(' ');

  const result: ParsedArgs = {
    positional: [],
    flags: {},
    raw,
    unknownFlags: [],
    errors: [],
    doubleDashIndex: -1,
    passthrough: []
  };

  // Build lookup maps from flag definitions
  const shortToLong = new Map<string, string>();
  const longFlags = new Set<string>();
  const flagTypes = new Map<string, 'boolean' | 'string' | 'number'>();
  const flagDefaults = new Map<string, string | boolean | number>();
  const requiredFlags = new Set<string>();

  if (flagDefs) {
    for (const def of flagDefs) {
      longFlags.add(def.long);
      flagTypes.set(def.long, def.type);
      if (def.short) {
        shortToLong.set(def.short, def.long);
      }
      if (def.aliases) {
        for (const alias of def.aliases) {
          longFlags.add(alias);
          shortToLong.set(alias, def.long);
        }
      }
      if (def.default !== undefined) {
        flagDefaults.set(def.long, def.default);
      }
      if (def.required) {
        requiredFlags.add(def.long);
      }
    }

    // Apply defaults
    for (const [name, value] of flagDefaults) {
      result.flags[name] = value;
    }
  }

  let i = 0;
  while (i < tokens.length) {
    const token = tokens[i];

    // Check for -- (end of flags)
    if (token === '--') {
      result.doubleDashIndex = i;
      result.passthrough = tokens.slice(i + 1);
      break;
    }

    // Long flag: --flag or --flag=value or --no-flag
    if (token.startsWith('--')) {
      const flagPart = token.slice(2);

      // Check for --flag=value syntax
      const equalsIndex = flagPart.indexOf('=');
      if (equalsIndex !== -1) {
        const flagName = flagPart.slice(0, equalsIndex);
        const flagValue = flagPart.slice(equalsIndex + 1);
        setFlagValue(result, flagName, flagValue, flagDefs, shortToLong, longFlags, flagTypes);
        i++;
        continue;
      }

      // Check for --no-flag (boolean negation)
      if (flagPart.startsWith('no-')) {
        const baseName = flagPart.slice(3);
        const resolvedName = shortToLong.get(baseName) || baseName;
        const flagType = flagTypes.get(resolvedName);

        if (!flagType || flagType === 'boolean') {
          result.flags[resolvedName] = false;
          if (flagDefs && !longFlags.has(baseName) && !longFlags.has(resolvedName)) {
            result.unknownFlags.push(`--no-${baseName}`);
          }
          i++;
          continue;
        }
      }

      // Regular long flag
      const resolvedName = shortToLong.get(flagPart) || flagPart;
      const flagType = flagTypes.get(resolvedName) || 'boolean';

      // Check if next token is a value (not starting with -)
      const nextToken = tokens[i + 1];
      if (flagType !== 'boolean' && nextToken && !nextToken.startsWith('-')) {
        setFlagValue(result, flagPart, nextToken, flagDefs, shortToLong, longFlags, flagTypes);
        i += 2;
      } else if (flagType === 'boolean' || !nextToken || nextToken.startsWith('-')) {
        // Boolean flag or no value provided
        setFlagValue(result, flagPart, true, flagDefs, shortToLong, longFlags, flagTypes);
        i++;
      } else {
        setFlagValue(result, flagPart, nextToken, flagDefs, shortToLong, longFlags, flagTypes);
        i += 2;
      }
      continue;
    }

    // Short flag: -f or -fv (combined) or -f value
    if (token.startsWith('-') && token.length > 1 && !token.startsWith('--')) {
      const flagChars = token.slice(1);

      // Check if it's -f=value syntax
      const equalsIndex = flagChars.indexOf('=');
      if (equalsIndex !== -1) {
        const flagName = flagChars.slice(0, equalsIndex);
        const flagValue = flagChars.slice(equalsIndex + 1);
        setFlagValue(result, flagName, flagValue, flagDefs, shortToLong, longFlags, flagTypes);
        i++;
        continue;
      }

      // Check if it's a single flag with a value (e.g., -o file.txt)
      if (flagChars.length === 1) {
        const resolvedName = shortToLong.get(flagChars) || flagChars;
        const flagType = flagTypes.get(resolvedName);
        const nextToken = tokens[i + 1];

        if (flagType && flagType !== 'boolean' && nextToken && !nextToken.startsWith('-')) {
          setFlagValue(result, flagChars, nextToken, flagDefs, shortToLong, longFlags, flagTypes);
          i += 2;
          continue;
        }
      }

      // Handle combined short flags (-fv) or single boolean flag
      for (let j = 0; j < flagChars.length; j++) {
        const char = flagChars[j];
        const resolvedName = shortToLong.get(char) || char;
        const flagType = flagTypes.get(resolvedName);

        // If this is the last char and it expects a value, check next token
        if (j === flagChars.length - 1 && flagType && flagType !== 'boolean') {
          const nextToken = tokens[i + 1];
          if (nextToken && !nextToken.startsWith('-')) {
            setFlagValue(result, char, nextToken, flagDefs, shortToLong, longFlags, flagTypes);
            i++;
            break;
          }
        }

        setFlagValue(result, char, true, flagDefs, shortToLong, longFlags, flagTypes);
      }
      i++;
      continue;
    }

    // Positional argument
    result.positional.push(token);
    i++;
  }

  // Validate required flags
  if (flagDefs) {
    for (const required of requiredFlags) {
      if (result.flags[required] === undefined) {
        result.errors.push(`Required flag --${required} is missing`);
      }
    }
  }

  return result;
}

/**
 * Validate flags against command definition and return warnings
 */
export function validateCommandFlags(
  parsedArgs: ParsedArgs,
  command: CommandWithFlags
): { valid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [...parsedArgs.errors];

  // Warn about unknown flags
  for (const unknownFlag of parsedArgs.unknownFlags) {
    warnings.push(`Unknown flag: ${unknownFlag}`);
  }

  // Validate against command flags
  if (command.flags) {
    const knownFlags = new Set<string>();
    for (const def of command.flags) {
      knownFlags.add(def.long);
      if (def.short) knownFlags.add(def.short);
      if (def.aliases) {
        for (const alias of def.aliases) {
          knownFlags.add(alias);
        }
      }
    }

    // Check for flags not in command definition
    for (const flagName of Object.keys(parsedArgs.flags)) {
      if (!knownFlags.has(flagName)) {
        const prefix = flagName.length === 1 ? '-' : '--';
        warnings.push(`Flag ${prefix}${flagName} is not recognized by /${command.name}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Generate help text for command flags
 */
export function generateFlagHelp(command: CommandWithFlags): string {
  if (!command.flags || command.flags.length === 0) {
    return '';
  }

  const lines: string[] = [];
  lines.push(chalk.bold('Flags:'));

  for (const flag of command.flags) {
    const shortPart = flag.short ? chalk.yellow(`-${flag.short}`) + ', ' : '    ';
    const longPart = chalk.yellow(`--${flag.long}`);
    const typePart = flag.type !== 'boolean' ? chalk.blue(` <${flag.type}>`) : '';
    const reqPart = flag.required ? chalk.red(' (required)') : '';
    const defPart = flag.default !== undefined ? chalk.gray(` (default: ${flag.default})`) : '';

    lines.push(`  ${shortPart}${longPart}${typePart}${reqPart}`);
    lines.push(`      ${flag.description}${defPart}`);

    if (flag.aliases && flag.aliases.length > 0) {
      lines.push(chalk.gray(`      Aliases: ${flag.aliases.join(', ')}`));
    }
  }

  // Add negation info
  const booleanFlags = command.flags.filter(f => f.type === 'boolean');
  if (booleanFlags.length > 0) {
    lines.push('');
    lines.push(chalk.gray('  Boolean flags can be negated with --no-<flag>'));
  }

  return lines.join('\n');
}

/**
 * Enhanced Argument Parser class for integration with CommandRegistry
 */
export class EnhancedArgParser {
  /**
   * Tokenize input string
   */
  tokenize(input: string): string[] {
    return tokenizeInput(input);
  }

  /**
   * Parse arguments
   */
  parse(input: string | string[], flagDefs?: FlagDefinition[]): ParsedArgs {
    return parseArgs(input, flagDefs);
  }

  /**
   * Validate flags against command
   */
  validate(parsedArgs: ParsedArgs, command: CommandWithFlags): { valid: boolean; warnings: string[]; errors: string[] } {
    return validateCommandFlags(parsedArgs, command);
  }

  /**
   * Generate flag help
   */
  generateHelp(command: CommandWithFlags): string {
    return generateFlagHelp(command);
  }
}

export default EnhancedArgParser;
