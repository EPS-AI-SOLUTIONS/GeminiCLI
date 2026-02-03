/**
 * Test Knowledge System - Bank wiedzy i KnowledgeAgent
 */

import { knowledgeBank } from './dist/src/knowledge/KnowledgeBank.js';
import { knowledgeAgent } from './dist/src/knowledge/KnowledgeAgent.js';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           KNOWLEDGE SYSTEM TEST                               ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

async function runTests() {
  // ============================================================
  // TEST 1: Initialize Knowledge Bank
  // ============================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Initialize Knowledge Bank');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await knowledgeBank.init();
  console.log('✓ KnowledgeBank initialized\n');

  // ============================================================
  // TEST 2: Add Knowledge Entries
  // ============================================================
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Add Knowledge Entries');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const entries = [
    {
      type: 'code_pattern',
      title: 'Circuit Breaker Pattern',
      content: `Circuit Breaker chroni przed kaskadowymi awariami.
Stany: CLOSED (normalna praca), OPEN (blokuje wywołania), HALF_OPEN (testuje).
Po przekroczeniu progu błędów przechodzi do OPEN na określony czas.
Użycie: const breaker = new CircuitBreaker({ failureThreshold: 5, resetTimeout: 30000 });`,
      tags: ['pattern', 'resilience', 'circuit-breaker']
    },
    {
      type: 'architecture',
      title: 'GeminiHydra Agent Architecture',
      content: `System multi-agentowy oparty na specjalizacji:
- Dijkstra: Strategist, planowanie (tylko Gemini)
- Geralt: Security, veto unsafe changes
- Yennefer: Architect, design patterns
- Triss: QA, testing
- Ciri: Scout, szybkie zadania
Agenci używają fallback chains dla niezawodności.`,
      tags: ['architecture', 'agents', 'gemini']
    },
    {
      type: 'bug_fix',
      title: 'Fix: TaskPriority dependencies undefined',
      content: `Problem: Cannot read properties of undefined (reading 'length')
Rozwiązanie: Zmiana a.dependencies.length na (a.dependencies || []).length
Plik: src/core/TaskPriority.ts linia 109
Lekcja: Zawsze sprawdzaj opcjonalne pola przed dostępem.`,
      tags: ['bug', 'typescript', 'fix', 'taskpriority']
    },
    {
      type: 'lesson_learned',
      title: 'SQLite vs JSON storage',
      content: `SQLite (better-sqlite3) wymaga native bindings i kompilacji.
JSON file storage jest prostsze i portable.
Dla małych/średnich danych JSON jest wystarczający.
Używaj debounced saves dla performance.`,
      tags: ['storage', 'sqlite', 'json', 'persistence']
    },
    {
      type: 'workflow',
      title: 'Git commit workflow',
      content: `1. git status - sprawdź zmiany
2. git diff - przejrzyj różnice
3. git add <specific files> - unikaj git add -A
4. git commit -m "$(cat <<'EOF' ... )" - użyj HEREDOC dla formatowania
5. Zawsze dodaj Co-Authored-By dla AI asystentów`,
      tags: ['git', 'workflow', 'commit']
    }
  ];

  for (const entry of entries) {
    await knowledgeBank.add(entry.type, entry.title, entry.content, {
      source: 'user',
      tags: entry.tags,
      importance: 0.7,
      generateEmbedding: false // Skip embeddings for test speed
    });
    console.log(`  ✓ Added: ${entry.title}`);
  }

  console.log(`\n✓ Added ${entries.length} knowledge entries`);

  // ============================================================
  // TEST 3: Search Knowledge (Keyword)
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Search Knowledge (Keyword)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const searchQueries = [
    'circuit breaker pattern',
    'git commit',
    'agent architecture',
    'typescript bug fix'
  ];

  for (const query of searchQueries) {
    const results = await knowledgeBank.search(query, {
      limit: 3,
      useSemanticSearch: false // Keyword only for test
    });

    console.log(`\n🔍 "${query}" → ${results.length} result(s)`);
    for (const r of results) {
      console.log(`   • ${r.entry.title} (score: ${r.score.toFixed(2)}, ${r.matchType})`);
    }
  }

  // ============================================================
  // TEST 4: RAG Context Building
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: RAG Context Building');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const ragContext = await knowledgeBank.getRAGContext('Jak działa circuit breaker?', {
    maxEntries: 3,
    maxTokens: 2000
  });

  console.log(`RAG Context generated:`);
  console.log(`  Relevant entries: ${ragContext.relevantKnowledge.length}`);
  console.log(`  Token estimate: ~${ragContext.tokenEstimate}`);
  console.log(`\n  Context preview (first 500 chars):`);
  console.log('  ' + '─'.repeat(50));
  console.log('  ' + ragContext.contextText.slice(0, 500).replace(/\n/g, '\n  '));
  console.log('  ' + '─'.repeat(50));

  // ============================================================
  // TEST 5: Knowledge Agent - Build Context for Agent
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Knowledge Agent - Build Context for Agent');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await knowledgeAgent.init();

  const agentContext = await knowledgeAgent.buildContextForAgent({
    query: 'Jakie wzorce projektowe są używane w tym projekcie?',
    agentName: 'Yennefer',
    conversationHistory: [
      { role: 'user', content: 'Analizuj architekturę projektu' },
      { role: 'assistant', content: 'Zaczynam analizę architektury GeminiHydra...' }
    ]
  });

  console.log('Context built for Yennefer agent:');
  console.log('─'.repeat(50));
  console.log(agentContext.slice(0, 800));
  if (agentContext.length > 800) console.log('...[truncated]');
  console.log('─'.repeat(50));

  // ============================================================
  // TEST 6: Statistics
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: Statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats = knowledgeBank.getStats();

  console.log('Knowledge Bank Stats:');
  console.log(`  Total entries: ${stats.totalEntries}`);
  console.log(`  With embeddings: ${stats.embeddingsCount}`);
  console.log('\n  By Type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`    ${type}: ${count}`);
  }
  console.log('\n  By Source:');
  for (const [source, count] of Object.entries(stats.bySource)) {
    console.log(`    ${source}: ${count}`);
  }
  console.log('\n  Top Tags:');
  console.log(`    ${stats.topTags.map(t => `${t.tag}(${t.count})`).join(', ')}`);

  // ============================================================
  // TEST 7: Export for Training
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Export for Training');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const trainingPath = await knowledgeBank.exportForTraining();
  console.log(`✓ Training data exported to: ${trainingPath}`);

  // ============================================================
  // TEST 8: Persistence Check
  // ============================================================
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Persistence Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await knowledgeBank.close();
  console.log('✓ Knowledge bank saved and closed');

  // Re-init to verify persistence
  const { KnowledgeBank: KBClass } = await import('./dist/src/knowledge/KnowledgeBank.js');
  const newKB = new KBClass();
  await newKB.init();

  const reloadedStats = newKB.getStats();
  console.log(`✓ Reloaded: ${reloadedStats.totalEntries} entries`);

  if (reloadedStats.totalEntries >= entries.length) {
    console.log('✓ Persistence verified!');
  }

  await newKB.close();

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  ALL TESTS COMPLETED                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  console.log('Knowledge system files stored in: ~/.geminihydra/knowledge/');
  console.log('Available CLI commands:');
  console.log('  /knowledge status      - Show stats');
  console.log('  /knowledge add         - Add knowledge');
  console.log('  /knowledge search      - Search knowledge');
  console.log('  /knowledge ask         - Ask with RAG');
  console.log('  /knowledge learn       - Learn from codebase/sessions');
  console.log('  /knowledge train       - Create custom model');
}

runTests().catch(console.error);
