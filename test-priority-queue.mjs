/**
 * Comprehensive Task Priority Queue Tests
 */

import { TaskPriorityQueue, detectPriority, prioritizeTasks, taskQueue } from './dist/src/core/TaskPriority.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║         COMPREHENSIVE TASK PRIORITY QUEUE TESTS               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log('  ✓ ' + testName);
    passed++;
  } else {
    console.log('  ✗ ' + testName);
    failed++;
  }
}

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 1: detectPriority()
// ═══════════════════════════════════════════════════════════════
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 1: detectPriority() - Keyword Detection');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Critical keywords
assert(detectPriority('critical bug fix') === 'critical', 'Detects "critical"');
assert(detectPriority('URGENT: server down') === 'critical', 'Detects "URGENT" (uppercase)');
assert(detectPriority('fix this ASAP') === 'critical', 'Detects "ASAP"');
assert(detectPriority('emergency deployment needed') === 'critical', 'Detects "emergency"');
assert(detectPriority('do this immediately') === 'critical', 'Detects "immediately"');
assert(detectPriority('pilne zadanie') === 'critical', 'Detects Polish "pilne"');
assert(detectPriority('krytyczny błąd') === 'critical', 'Detects Polish "krytyczny"');

// High priority keywords
assert(detectPriority('important feature request') === 'high', 'Detects "important"');
assert(detectPriority('high priority task') === 'high', 'Detects "high priority"');
assert(detectPriority('wysoki priorytet') === 'high', 'Detects Polish "wysoki priorytet"');
assert(detectPriority('to jest ważne') === 'high', 'Detects Polish "ważne"');

// Low priority keywords
assert(detectPriority('low priority cleanup') === 'low', 'Detects "low priority"');
assert(detectPriority('nice to have feature') === 'low', 'Detects "nice to have"');
assert(detectPriority('niski priorytet') === 'low', 'Detects Polish "niski priorytet"');
assert(detectPriority('opcjonalnie dodaj') === 'low', 'Detects Polish "opcjonalnie"');

// Medium (default)
assert(detectPriority('refactor the code') === 'medium', 'Default is "medium"');
assert(detectPriority('add new feature') === 'medium', 'Normal task is "medium"');
assert(detectPriority('update dependencies') === 'medium', 'Update task is "medium"');

// Edge cases
assert(detectPriority('') === 'medium', 'Empty string returns "medium"');
assert(detectPriority('   ') === 'medium', 'Whitespace returns "medium"');

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 2: Basic Queue Operations
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 2: Basic Queue Operations');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q1 = new TaskPriorityQueue();

assert(q1.isEmpty(), 'New queue is empty');
assert(q1.size() === 0, 'New queue size is 0');
assert(q1.next() === undefined, 'next() on empty queue returns undefined');
assert(q1.peek() === undefined, 'peek() on empty queue returns undefined');

q1.add({ id: 1, content: 'Task 1', priority: 'medium' });
assert(!q1.isEmpty(), 'Queue not empty after add');
assert(q1.size() === 1, 'Size is 1 after adding one task');

const peeked = q1.peek();
assert(peeked && peeked.id === 1, 'peek() returns correct task');
assert(q1.size() === 1, 'peek() does not remove task');

const next = q1.next();
assert(next && next.id === 1, 'next() returns correct task');
assert(q1.isEmpty(), 'Queue empty after next()');

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 3: Priority Ordering
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 3: Priority Ordering');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q2 = new TaskPriorityQueue();

// Add in random order
q2.add({ id: 'low1', content: 'Low task', priority: 'low' });
q2.add({ id: 'crit1', content: 'Critical task', priority: 'critical' });
q2.add({ id: 'med1', content: 'Medium task', priority: 'medium' });
q2.add({ id: 'high1', content: 'High task', priority: 'high' });
q2.add({ id: 'crit2', content: 'Another critical', priority: 'critical' });

const order = [];
while (!q2.isEmpty()) {
  const t = q2.next();
  if (t) order.push(t.priority);
}

assert(order[0] === 'critical', 'First task is critical');
assert(order[1] === 'critical', 'Second task is critical');
assert(order[2] === 'high', 'Third task is high');
assert(order[3] === 'medium', 'Fourth task is medium');
assert(order[4] === 'low', 'Fifth task is low');

console.log('  Order: ' + order.join(' -> '));

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 4: Dependency Resolution
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 4: Dependency Resolution');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q3 = new TaskPriorityQueue();

// Create dependency chain: A -> B -> C
q3.add({ id: 'C', content: 'Task C', priority: 'critical', dependencies: ['B'] });
q3.add({ id: 'A', content: 'Task A', priority: 'low' });
q3.add({ id: 'B', content: 'Task B', priority: 'high', dependencies: ['A'] });

// Without completing dependencies
const first = q3.next();
assert(first && first.id === 'A', 'Returns A first (no deps, despite low priority)');

// B and C are blocked
const blocked = q3.next();
assert(blocked === undefined, 'B is blocked (A not completed)');

// Complete A
q3.complete('A');
const second = q3.next();
assert(second && second.id === 'B', 'Returns B after A completed');

// Complete B
q3.complete('B');
const third = q3.next();
assert(third && third.id === 'C', 'Returns C after B completed');

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 5: Complex Dependency Graph (Diamond Pattern)
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 5: Complex Dependency Graph (Diamond Pattern)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

//     A
//    / \
//   B   C
//    \ /
//     D

const q4 = new TaskPriorityQueue();
q4.add({ id: 'D', content: 'Deploy', priority: 'critical', dependencies: ['B', 'C'] });
q4.add({ id: 'B', content: 'Build Backend', priority: 'high', dependencies: ['A'] });
q4.add({ id: 'C', content: 'Build Frontend', priority: 'high', dependencies: ['A'] });
q4.add({ id: 'A', content: 'Setup', priority: 'medium' });

console.log('  Diamond pattern:    A');
console.log('                     / \\');
console.log('                    B   C');
console.log('                     \\ /');
console.log('                      D');

const completed = new Set();
const execOrder = [];

while (!q4.isEmpty()) {
  const task = q4.next(completed);
  if (task) {
    execOrder.push(task.id);
    completed.add(task.id);
  } else {
    break;
  }
}

console.log('  Execution order: ' + execOrder.join(' -> '));

assert(execOrder[0] === 'A', 'A executes first');
assert(execOrder.indexOf('B') < execOrder.indexOf('D'), 'B before D');
assert(execOrder.indexOf('C') < execOrder.indexOf('D'), 'C before D');
assert(execOrder[3] === 'D', 'D executes last');

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 6: Parallel Execution (getAllExecutable)
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 6: Parallel Execution (getAllExecutable)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q5 = new TaskPriorityQueue();

// Independent tasks (no deps)
q5.add({ id: 1, content: 'Independent 1', priority: 'high' });
q5.add({ id: 2, content: 'Independent 2', priority: 'critical' });
q5.add({ id: 3, content: 'Independent 3', priority: 'medium' });
q5.add({ id: 4, content: 'Independent 4', priority: 'low' });
// Dependent task
q5.add({ id: 5, content: 'Depends on 1 and 2', priority: 'critical', dependencies: [1, 2] });

const batch1 = q5.getAllExecutable(3);
assert(batch1.length === 3, 'Gets max 3 executable tasks');
assert(batch1[0].id === 2, 'First in batch is critical (id 2)');
assert(!batch1.some(t => t.id === 5), 'Dependent task not in first batch');

console.log('  Batch 1: ' + batch1.map(t => t.id + '(' + t.priority + ')').join(', '));

// Mark batch 1 as complete
batch1.forEach(t => q5.complete(t.id));

const batch2 = q5.getAllExecutable(3);
console.log('  Batch 2: ' + batch2.map(t => t.id + '(' + t.priority + ')').join(', '));

assert(batch2.some(t => t.id === 5), 'Task 5 now available after deps completed');

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 7: Failure Handling and Retry
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 7: Failure Handling and Retry');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q6 = new TaskPriorityQueue();
q6.add({ id: 1, content: 'Failing task', priority: 'high' });

let task = q6.next();
assert(task && (task.retryCount === 0 || task.retryCount === undefined), 'Initial retry count is 0');

// Simulate failure and requeue
q6.fail(task, true);
assert(q6.size() === 1, 'Task requeued after failure');

task = q6.next();
assert(task && task.retryCount === 1, 'Retry count incremented to 1');

// Fail again
q6.fail(task, true);
task = q6.next();
assert(task && task.retryCount === 2, 'Retry count incremented to 2');
assert(task.priority === 'medium', 'Priority demoted after 2 failures');

// Fail third time
q6.fail(task, true);
task = q6.next();
assert(task && task.retryCount === 3, 'Retry count incremented to 3');
assert(task.priority === 'low', 'Priority demoted to low after 3 failures');

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 8: prioritizeTasks() Function
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 8: prioritizeTasks() Function');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const tasks = [
  { id: 1, objective: 'Update readme' },
  { id: 2, task: 'Fix critical bug' },
  { id: 3, content: 'URGENT: Production down' },
  { id: 4, objective: 'Low priority cleanup' },
  { id: 5, task: 'High priority feature' }
];

const sorted = prioritizeTasks(tasks);

// Both id:2 (critical bug) and id:3 (URGENT) have 'critical' priority
// Their relative order is implementation-dependent, so check both are in top 2
const topTwoIds = [sorted[0].id, sorted[1].id];
assert(topTwoIds.includes(2) && topTwoIds.includes(3), 'Both critical tasks in top 2 positions');
assert(sorted[0].priority === 'critical', 'First task has critical priority');
assert(sorted[1].priority === 'critical', 'Second task has critical priority');
assert(sorted[sorted.length - 1].id === 4, 'Low priority last');

console.log('  Sorted order:');
sorted.forEach((t, i) => {
  const text = t.objective || t.task || t.content;
  console.log('    ' + (i+1) + '. [' + t.priority.padEnd(8) + '] ' + text);
});

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 9: Queue Statistics
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 9: Queue Statistics');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q7 = new TaskPriorityQueue();
q7.add({ id: 1, content: 'Task', priority: 'critical' });
q7.add({ id: 2, content: 'Task', priority: 'critical' });
q7.add({ id: 3, content: 'Task', priority: 'high' });
q7.add({ id: 4, content: 'Task', priority: 'medium' });
q7.add({ id: 5, content: 'Task', priority: 'medium' });
q7.add({ id: 6, content: 'Task', priority: 'medium' });
q7.add({ id: 7, content: 'Task', priority: 'low' });

q7.complete(1);
q7.complete(2);

const stats = q7.getStats();

assert(stats.total === 7, 'Total count is 7');
assert(stats.completed === 2, 'Completed count is 2');
assert(stats.byPriority.critical === 2, 'Critical count is 2');
assert(stats.byPriority.high === 1, 'High count is 1');
assert(stats.byPriority.medium === 3, 'Medium count is 3');
assert(stats.byPriority.low === 1, 'Low count is 1');

console.log('  Stats: ' + JSON.stringify(stats));

// ═══════════════════════════════════════════════════════════════
// TEST SUITE 10: Clear and Reset
// ═══════════════════════════════════════════════════════════════
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('TEST SUITE 10: Clear and Reset');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

const q8 = new TaskPriorityQueue();
q8.add({ id: 1, content: 'Task', priority: 'high' });
q8.add({ id: 2, content: 'Task', priority: 'low' });
q8.complete(1);

assert(q8.size() === 2, 'Queue has 2 tasks');

q8.clear();

assert(q8.isEmpty(), 'Queue is empty after clear');
assert(q8.size() === 0, 'Size is 0 after clear');

const statsAfterClear = q8.getStats();
assert(statsAfterClear.completed === 0, 'Completed count reset after clear');

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════
console.log('\n╔═══════════════════════════════════════════════════════════════╗');
console.log('║                        TEST SUMMARY                           ║');
console.log('╠═══════════════════════════════════════════════════════════════╣');
console.log('║  Passed: ' + String(passed).padStart(3) + '                                                 ║');
console.log('║  Failed: ' + String(failed).padStart(3) + '                                                 ║');
console.log('║  Total:  ' + String(passed + failed).padStart(3) + '                                                 ║');
console.log('╚═══════════════════════════════════════════════════════════════╝');

if (failed > 0) {
  process.exit(1);
}
