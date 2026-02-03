import { GraphProcessor } from './src/core/GraphProcessor.js';

console.log('Testing GraphProcessor with rootDir...');

const gp = new GraphProcessor({
  rootDir: 'C:\\Users\\BIURODOM\\Desktop\\GeminiHydra',
  yolo: true
});

console.log('GraphProcessor created successfully!');
console.log('Testing path validation...');

// Test 1: Valid path within project
const valid1 = (gp as any).validateAndNormalizePath('src/core/Agent.ts');
console.log('Test 1 (relative path):', valid1 ? 'PASS - ' + valid1 : 'FAIL');

// Test 2: Valid absolute path within project
const valid2 = (gp as any).validateAndNormalizePath('C:\\Users\\BIURODOM\\Desktop\\GeminiHydra\\src\\index.ts');
console.log('Test 2 (absolute path):', valid2 ? 'PASS - ' + valid2 : 'FAIL');

// Test 3: Invalid path outside project (should be blocked)
const invalid1 = (gp as any).validateAndNormalizePath('C:\\Users\\Eskelem\\Projects\\test.txt');
console.log('Test 3 (outside project):', invalid1 === null ? 'PASS - blocked as expected' : 'FAIL - should be null');

// Test 4: Path traversal attempt
const invalid2 = (gp as any).validateAndNormalizePath('..\\..\\..\\Windows\\System32\\test.txt');
console.log('Test 4 (path traversal):', invalid2 === null ? 'PASS - blocked as expected' : 'FAIL - should be null');

console.log('\nAll tests completed!');
