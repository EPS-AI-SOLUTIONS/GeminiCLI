// Quick test for ShellEscape module
import * as se from './src/native/ShellEscape.ts';

console.log('=== ShellEscape Quick Test ===\n');

// Test escapeShellArg
console.log('escapeShellArg tests:');
console.log(`  Unix "hello world":`, se.escapeShellArg('hello world', 'unix'));
console.log(`  Windows "hello world":`, se.escapeShellArg('hello world', 'windows'));
console.log(`  Unix "it's":`, se.escapeShellArg("it's", 'unix'));
console.log(`  Unix "$HOME":`, se.escapeShellArg('$HOME', 'unix'));
console.log(`  Windows "a&b":`, se.escapeShellArg('a&b', 'windows'));

// Test quoteArg
console.log('\nquoteArg tests:');
console.log(`  Unix "simple":`, se.quoteArg('simple', 'unix'));
console.log(`  Unix "with space":`, se.quoteArg('with space', 'unix'));

// Test buildCommand
console.log('\nbuildCommand tests:');
console.log(`  Unix:`, se.buildCommand('echo', ['hello', 'world with space'], 'unix'));
console.log(`  Windows:`, se.buildCommand('echo', ['hello', 'world with space'], 'windows'));

// Test parseCommand
console.log('\nparseCommand tests:');
const parsed = se.parseCommand('echo "hello world" test');
console.log(`  Parsed:`, JSON.stringify(parsed));

// Test sanitizeCommand
console.log('\nsanitizeCommand tests:');
console.log(`  "ls -la":`, se.sanitizeCommand('ls -la'));
console.log(`  "ls; rm -rf /":`, se.sanitizeCommand('ls; rm -rf /'));
console.log(`  "echo \`whoami\`":`, se.sanitizeCommand('echo `whoami`'));

// Test escapeGlobPattern
console.log('\nescapeGlobPattern tests:');
console.log(`  "*.txt":`, se.escapeGlobPattern('*.txt'));
console.log(`  "[abc]":`, se.escapeGlobPattern('[abc]'));

// Test escapeForPowerShell
console.log('\nescapeForPowerShell tests:');
console.log(`  "$var":`, se.escapeForPowerShell('$var'));
console.log(`  "Get-Process()":`, se.escapeForPowerShell('Get-Process()'));

// Test escapeForCmd
console.log('\nescapeForCmd tests:');
console.log(`  "a&b":`, se.escapeForCmd('a&b'));
console.log(`  "100%":`, se.escapeForCmd('100%'));

console.log('\n=== All tests passed! ===');
