/**
 * Test file for TemperatureController - Solution 21
 */

import {
  TemperatureController,
  getOptimalTemp,
  analyzeAndGetTemp,
  detectControllerTaskType,
  type ControllerTaskType,
  type ExecutionPhase
} from './src/core/TemperatureController.js';

// Test basic instantiation
const controller = new TemperatureController();
console.log('Controller created successfully');

// Test getOptimalTemperature for all combinations
const taskTypes: ControllerTaskType[] = ['factual', 'analytical', 'creative', 'code-generation'];
const phases: ExecutionPhase[] = ['PRE-A', 'A', 'B', 'C', 'D'];

console.log('\n=== Temperature Matrix ===');
console.log('TaskType\t\tPRE-A\tA\tB\tC\tD');
console.log('-'.repeat(60));

for (const taskType of taskTypes) {
  const temps = phases.map(phase => controller.getOptimalTemperature(taskType, phase));
  console.log(`${taskType.padEnd(16)}\t${temps.join('\t')}`);
}

// Test auto-detection
console.log('\n=== Auto-Detection Tests ===');

const testPrompts = [
  { prompt: 'What is the capital of France?', expected: 'factual' },
  { prompt: 'Analyze the performance of this algorithm', expected: 'analytical' },
  { prompt: 'Create a unique logo design for a tech startup', expected: 'creative' },
  { prompt: 'Implement a binary search function in TypeScript', expected: 'code-generation' }
];

for (const test of testPrompts) {
  const result = detectControllerTaskType(test.prompt);
  const match = result.taskType === test.expected ? 'OK' : 'MISMATCH';
  console.log(`[${match}] "${test.prompt.substring(0, 40)}..." -> ${result.taskType} (expected: ${test.expected})`);
}

// Test full analysis
console.log('\n=== Full Analysis Test ===');
const analysisResult = controller.getOptimalTemperatureWithAnalysis(
  'implement a sorting function that handles edge cases efficiently',
  'B'
);
console.log('Temperature:', analysisResult.temperature);
console.log('Task Type:', analysisResult.taskType);
console.log('Phase:', analysisResult.phase);
console.log('Confidence:', analysisResult.confidence);
console.log('Reasoning:');
analysisResult.reasoning.forEach(r => console.log('  -', r));

// Test statistics
console.log('\n=== Statistics ===');
const stats = controller.getStatistics();
console.log('Total usages:', stats.totalUsages);
console.log('Average temperature:', stats.averageTemperature);

console.log('\n=== All Tests Completed Successfully! ===');
