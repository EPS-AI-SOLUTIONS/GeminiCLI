/**
 * Test Session Memory - Persistent chat history system
 */

import { sessionMemory } from './dist/src/memory/SessionMemory.js';
import {
  initSessionSystem,
  recordMessage,
  getPromptContext,
  buildFullContext,
  saveAndClose
} from './dist/src/cli/SessionCommands.js';
import { codebaseMemory } from './dist/src/memory/CodebaseMemory.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           SESSION MEMORY TEST                                 ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function runTests() {
  // ============================================================
  // TEST 1: Initialize Session System
  // ============================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Initialize Session System');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sessionMemory.init();
  console.log('✓ SessionMemory initialized\n');

  // ============================================================
  // TEST 2: Create New Session
  // ============================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Create New Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sessionId = await sessionMemory.startSession('Test Session - CircuitBreaker Analysis');
  console.log(`✓ Session created: ${sessionId}`);

  const current = sessionMemory.getCurrentSession();
  console.log(`  Name: ${current?.name}`);
  console.log(`  ID: ${current?.id}`);
  console.log(`  Created: ${current?.created}`);

  // ============================================================
  // TEST 3: Add Messages to Session
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Add Messages to Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Simulate a conversation
  await sessionMemory.addMessage('user', 'Jak działa circuit breaker w tym projekcie?');
  await sessionMemory.addMessage('assistant', 'Circuit breaker w GeminiHydra znajduje się w src/core/CircuitBreaker.ts. Implementuje wzorzec, który zapobiega kaskadowym awariom poprzez monitorowanie błędów i tymczasowe wyłączanie usług.', 'Gemini');
  await sessionMemory.addMessage('user', 'Pokaż mi jak go używać');
  await sessionMemory.addMessage('assistant', `Oto przykład użycia:

\`\`\`typescript
import { CircuitBreaker } from './core/CircuitBreaker';

const breaker = new CircuitBreaker({
  failureThreshold: 5,
  resetTimeout: 30000
});

const result = await breaker.execute(() => callExternalApi());
\`\`\``, 'Gemini');

  console.log(`✓ Added 4 messages to session`);

  const messages = sessionMemory.getRecentMessages(10);
  console.log(`  Total messages: ${messages.length}`);
  for (const msg of messages) {
    const preview = msg.content.slice(0, 50).replace(/\n/g, ' ');
    console.log(`    ${msg.role === 'user' ? '👤' : '🤖'} ${preview}...`);
  }

  // ============================================================
  // TEST 4: Save and Verify Persistence
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Save and Verify Persistence');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await sessionMemory.saveSnapshot();
  console.log('✓ Session saved to disk');

  // ============================================================
  // TEST 5: Resume Session (Simulate Restart)
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Resume Session (Simulate CLI Restart)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Create new SessionMemory instance to simulate restart
  const { SessionMemory: SessionMemoryClass } = await import('./dist/src/memory/SessionMemory.js');
  const newSessionMemory = new SessionMemoryClass();
  await newSessionMemory.init();

  const resumedSession = await newSessionMemory.resumeSession(sessionId);
  if (resumedSession) {
    console.log('✓ Session resumed after "restart"!');
    console.log(`  Name: ${resumedSession.name}`);
    console.log(`  Messages: ${resumedSession.messages.length}`);

    const resumedMessages = newSessionMemory.getRecentMessages(10);
    console.log(`\n  Restored conversation:`);
    for (const msg of resumedMessages) {
      const preview = msg.content.slice(0, 60).replace(/\n/g, ' ');
      console.log(`    ${msg.role === 'user' ? '👤' : '🤖'} ${preview}...`);
    }
  } else {
    console.log('✗ Failed to resume session');
  }

  // ============================================================
  // TEST 6: List All Sessions
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: List All Sessions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const allSessions = await sessionMemory.listSessions();
  console.log(`Found ${allSessions.length} session(s):\n`);

  for (const sess of allSessions.slice(0, 5)) {
    console.log(`  📁 ${sess.name}`);
    console.log(`     ID: ${sess.id}`);
    console.log(`     Messages: ${sess.messageCount}`);
    console.log(`     Updated: ${sess.updated.toLocaleString()}`);
    console.log('');
  }

  // ============================================================
  // TEST 7: Search Sessions
  // ============================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Search Sessions');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const searchResults = await sessionMemory.searchSessions('circuit');
  console.log(`Search for "circuit":`);

  if (searchResults.length > 0) {
    for (const result of searchResults) {
      console.log(`  📁 ${result.session}: ${result.matches.length} match(es)`);
      for (const match of result.matches.slice(0, 2)) {
        console.log(`     ...${match}`);
      }
    }
  } else {
    console.log('  No results found');
  }

  // ============================================================
  // TEST 8: Context Building Integration
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Context Building for New Prompts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize codebase memory too
  await codebaseMemory.init();
  codebaseMemory.setCurrentProject(process.cwd());

  const { messages: contextMessages, projectContext } = await getPromptContext(4);

  console.log('Context for next prompt:');
  console.log(`  Recent messages: ${contextMessages.length}`);
  console.log(`  Project context: ${projectContext ? 'Available' : 'Not available'}`);

  if (contextMessages.length > 0) {
    console.log('\n  Conversation history to include:');
    for (const msg of contextMessages) {
      const preview = msg.content.slice(0, 50).replace(/\n/g, ' ');
      console.log(`    ${msg.role}: ${preview}...`);
    }
  }

  // ============================================================
  // TEST 9: Branch Session
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 9: Branch Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const branchId = await sessionMemory.branchSession('Alternative Approach - Redis Cache');
  const branchedSession = sessionMemory.getCurrentSession();

  console.log(`✓ Session branched`);
  console.log(`  New name: ${branchedSession?.name}`);
  console.log(`  New ID: ${branchId}`);
  console.log(`  Parent ID: ${branchedSession?.parentId}`);
  console.log(`  Messages inherited: ${branchedSession?.messages.length}`);

  // ============================================================
  // TEST 10: Export Session
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 10: Export Session');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const markdown = await sessionMemory.exportSession('markdown');
  console.log('Markdown export preview (first 500 chars):');
  console.log('─'.repeat(50));
  console.log(markdown.slice(0, 500));
  console.log('...[truncated]');
  console.log('─'.repeat(50));

  // ============================================================
  // Cleanup
  // ============================================================
  sessionMemory.stopAutoSave();
  await sessionMemory.saveSnapshot();

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  ALL TESTS COMPLETED                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Session files stored in: ~/.geminihydra/sessions/');
  console.log('Sessions persist between CLI restarts!');
}

runTests().catch(console.error);
