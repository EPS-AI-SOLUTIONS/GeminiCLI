#!/usr/bin/env npx tsx
/**
 * Integration Test for GeminiHydra Path Validation Fixes
 *
 * Tests:
 * 1. Path validation in GraphProcessor
 * 2. Error detection in MCP responses
 * 3. Root directory enforcement
 */

import { GraphProcessor } from './src/core/GraphProcessor.js';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname);

console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════'));
console.log(chalk.cyan('     GEMINIHYDRA INTEGRATION TEST - Path Validation'));
console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));

const gp = new GraphProcessor({
  rootDir: ROOT_DIR,
  yolo: true
});

// Type assertion for private method access
const gpAny = gp as any;

console.log(chalk.yellow('Root Directory:'), ROOT_DIR);
console.log(chalk.yellow('GraphProcessor rootDir:'), gpAny.rootDir);
console.log('');

// Test Suite
let passed = 0;
let failed = 0;

function test(name: string, condition: boolean, details?: string) {
  if (condition) {
    console.log(chalk.green(`✓ PASS: ${name}`));
    if (details) console.log(chalk.gray(`    ${details}`));
    passed++;
  } else {
    console.log(chalk.red(`✗ FAIL: ${name}`));
    if (details) console.log(chalk.red(`    ${details}`));
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST GROUP 1: Path Validation
// ═══════════════════════════════════════════════════════════════
console.log(chalk.magenta('\n── Test Group 1: Path Validation ──\n'));

// Test 1.1: Relative path within project
const relPath = gpAny.validateAndNormalizePath('src/core/Agent.ts');
test(
  'Relative path should resolve to absolute within project',
  relPath !== null && relPath.includes(ROOT_DIR),
  relPath || 'null'
);

// Test 1.2: Absolute path within project
const absPath = gpAny.validateAndNormalizePath(path.join(ROOT_DIR, 'src/index.ts'));
test(
  'Absolute path within project should be allowed',
  absPath !== null,
  absPath || 'null'
);

// Test 1.3: Path outside project (different user)
const outsidePath = gpAny.validateAndNormalizePath('C:\\Users\\Eskelem\\Projects\\test.txt');
test(
  'Path outside project (different user) should be BLOCKED',
  outsidePath === null,
  outsidePath ? `ERROR: Got ${outsidePath}` : 'Correctly blocked'
);

// Test 1.4: Path traversal attempt
const traversalPath = gpAny.validateAndNormalizePath('..\\..\\..\\Windows\\System32\\config');
test(
  'Path traversal attempt should be BLOCKED',
  traversalPath === null,
  traversalPath ? `ERROR: Got ${traversalPath}` : 'Correctly blocked'
);

// Test 1.5: Empty path
const emptyPath = gpAny.validateAndNormalizePath('');
test(
  'Empty path should be BLOCKED',
  emptyPath === null,
  emptyPath ? `ERROR: Got ${emptyPath}` : 'Correctly blocked'
);

// Test 1.6: Null/undefined path
const nullPath = gpAny.validateAndNormalizePath(null);
test(
  'Null path should be BLOCKED',
  nullPath === null,
  nullPath ? `ERROR: Got ${nullPath}` : 'Correctly blocked'
);

// Test 1.7: Single word (invalid path from bad parsing)
const singleWord = gpAny.validateAndNormalizePath('while');
// This should resolve to ROOT_DIR/while which is within project, but may not exist
// The path validation only checks if within project, not if file exists
test(
  'Single word resolves within project (may not exist but is valid location)',
  singleWord !== null && singleWord.includes(ROOT_DIR),
  singleWord || 'null'
);

// Test 1.8: Path with different drive
const differentDrive = gpAny.validateAndNormalizePath('D:\\SomeOtherDrive\\file.txt');
test(
  'Path on different drive should be BLOCKED',
  differentDrive === null,
  differentDrive ? `ERROR: Got ${differentDrive}` : 'Correctly blocked'
);

// ═══════════════════════════════════════════════════════════════
// TEST GROUP 2: MCP Error Detection
// ═══════════════════════════════════════════════════════════════
console.log(chalk.magenta('\n── Test Group 2: MCP Error Detection ──\n'));

// Test 2.1: Normal content (not an error)
const normalContent = 'File successfully written to disk';
test(
  'Normal success message should NOT be detected as error',
  !gpAny.isMcpError(normalContent),
  normalContent
);

// Test 2.2: Error in response
const errorContent = 'Error: ENOENT: no such file or directory';
test(
  'ENOENT error should be detected',
  gpAny.isMcpError(errorContent),
  errorContent
);

// Test 2.3: Permission denied
const permissionDenied = 'Access denied: EACCES permission denied';
test(
  'EACCES error should be detected',
  gpAny.isMcpError(permissionDenied),
  permissionDenied
);

// Test 2.4: Outside allowed directories
const outsideAllowed = 'Path outside allowed directories';
test(
  '"Outside allowed" error should be detected',
  gpAny.isMcpError(outsideAllowed),
  outsideAllowed
);

// Test 2.5: MCP error prefix
const mcpError = 'MCP error: Tool execution failed';
test(
  'MCP error prefix should be detected',
  gpAny.isMcpError(mcpError),
  mcpError
);

// Test 2.6: Invalid path
const invalidPath = 'Invalid path provided';
test(
  'Invalid path error should be detected',
  gpAny.isMcpError(invalidPath),
  invalidPath
);

// Test 2.7: Failed operation
const failedOp = 'Operation failed: unable to complete';
test(
  'Failed operation should be detected',
  gpAny.isMcpError(failedOp),
  failedOp
);

// Test 2.8: Mixed case error
const mixedCase = 'DENIED: Access not permitted';
test(
  'Mixed case "denied" should be detected',
  gpAny.isMcpError(mixedCase),
  mixedCase
);

// ═══════════════════════════════════════════════════════════════
// TEST GROUP 3: Edge Cases
// ═══════════════════════════════════════════════════════════════
console.log(chalk.magenta('\n── Test Group 3: Edge Cases ──\n'));

// Test 3.1: Path with spaces
const spacePath = gpAny.validateAndNormalizePath('src/my folder/file.ts');
test(
  'Path with spaces should resolve within project',
  spacePath !== null && spacePath.includes(ROOT_DIR),
  spacePath || 'null'
);

// Test 3.2: Path with dots (valid)
const dotPath = gpAny.validateAndNormalizePath('./src/index.ts');
test(
  'Dot-relative path should resolve within project',
  dotPath !== null && dotPath.includes(ROOT_DIR),
  dotPath || 'null'
);

// Test 3.3: Path with forward slashes (Unix style)
const unixPath = gpAny.validateAndNormalizePath('src/core/Agent.ts');
test(
  'Unix-style path should resolve within project',
  unixPath !== null && unixPath.includes(ROOT_DIR),
  unixPath || 'null'
);

// Test 3.4: Path with backslashes (Windows style)
const winPath = gpAny.validateAndNormalizePath('src\\core\\Agent.ts');
test(
  'Windows-style path should resolve within project',
  winPath !== null && winPath.includes(ROOT_DIR),
  winPath || 'null'
);

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log(chalk.cyan('\n═══════════════════════════════════════════════════════════'));
console.log(chalk.cyan('                        SUMMARY'));
console.log(chalk.cyan('═══════════════════════════════════════════════════════════\n'));

console.log(chalk.green(`Passed: ${passed}`));
console.log(chalk.red(`Failed: ${failed}`));
console.log(chalk.yellow(`Total:  ${passed + failed}`));

if (failed === 0) {
  console.log(chalk.green.bold('\n✓ ALL TESTS PASSED!\n'));
  console.log(chalk.gray('Path validation is working correctly.'));
  console.log(chalk.gray('The following protections are in place:'));
  console.log(chalk.gray('  - Paths outside project directory are blocked'));
  console.log(chalk.gray('  - Path traversal attempts are blocked'));
  console.log(chalk.gray('  - MCP errors are properly detected'));
  console.log(chalk.gray('  - Tasks with errors will be marked as failed'));
} else {
  console.log(chalk.red.bold(`\n✗ ${failed} TEST(S) FAILED!\n`));
  process.exit(1);
}

console.log('');
