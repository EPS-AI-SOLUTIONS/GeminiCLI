/**
 * Test CodebaseMemory - Codebase analysis and memory system
 */

import { codebaseMemory } from './dist/src/memory/CodebaseMemory.js';
import { autoEnrichPrompt, initCodebaseForCwd } from './dist/src/cli/CodebaseCommands.js';
import path from 'path';

console.log('╔═══════════════════════════════════════════════════════════════╗');
console.log('║           CODEBASE MEMORY TEST                                ║');
console.log('╚═══════════════════════════════════════════════════════════════╝\n');

const projectPath = process.cwd();

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 1: Initialize CodebaseMemory');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await codebaseMemory.init();
  console.log('✓ CodebaseMemory initialized\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 2: Analyze Current Project (GeminiHydra)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const startTime = Date.now();
  const analysis = await codebaseMemory.analyzeProject(projectPath, {
    maxFiles: 200,
    maxDepth: 5
  });
  const elapsed = Date.now() - startTime;

  console.log(`\n✓ Analysis completed in ${elapsed}ms`);
  console.log(`  Project: ${analysis.projectName}`);
  console.log(`  Type: ${analysis.structure.type} (${analysis.structure.framework || 'no framework'})`);
  console.log(`  Files: ${analysis.structure.totalFiles}`);
  console.log(`  Lines: ${analysis.structure.totalLines}`);
  console.log(`  Entry points: ${analysis.structure.entryPoints.join(', ')}`);

  console.log(`\n  Languages:`);
  const langs = Object.entries(analysis.structure.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  for (const [ext, count] of langs) {
    console.log(`    ${ext}: ${count} files`);
  }

  console.log(`\n  Key directories:`);
  for (const dir of analysis.structure.directories.slice(0, 8)) {
    console.log(`    📁 ${dir}`);
  }

  if (analysis.dependencies.length > 0) {
    console.log(`\n  Dependencies (${analysis.dependencies.length}):`);
    console.log(`    ${analysis.dependencies.slice(0, 10).join(', ')}...`);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 3: Set Current Project & Check Persistence');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const current = codebaseMemory.setCurrentProject(projectPath);
  console.log(`✓ Current project set: ${current?.projectName}`);

  const retrieved = codebaseMemory.getAnalysis(projectPath);
  console.log(`✓ Retrieved from memory: ${retrieved?.projectName}`);
  console.log(`  Access count: ${retrieved?.accessCount}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 4: Prompt Enrichment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const testPrompts = [
    'Jak działa circuit breaker w tym projekcie?',
    'Pokaż mi testy dla TaskPriority',
    'Gdzie są obsługiwane błędy API?',
    'Dodaj nową komendę CLI'
  ];

  for (const prompt of testPrompts) {
    console.log(`\n📝 Original: "${prompt}"`);

    const { enrichedPrompt, context } = codebaseMemory.enrichPrompt(prompt, {
      maxContextLength: 1500
    });

    console.log(`\n📎 Relevant files found: ${context.relevantFiles.length}`);
    for (const f of context.relevantFiles.slice(0, 3)) {
      console.log(`   → ${f.relativePath}`);
      if (f.exports?.length) {
        console.log(`     exports: ${f.exports.slice(0, 5).join(', ')}`);
      }
    }

    if (context.suggestedActions.length > 0) {
      console.log(`\n💡 Suggestions:`);
      for (const action of context.suggestedActions) {
        console.log(`   ! ${action}`);
      }
    }

    console.log('\n' + '─'.repeat(60));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 5: Memory Stats');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const stats = codebaseMemory.getStats();
  console.log(`Total projects: ${stats.totalProjects}`);
  console.log(`Total files indexed: ${stats.totalFiles}`);
  console.log(`Total lines: ${stats.totalLines}`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 6: List Projects');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const projects = codebaseMemory.listProjects();
  for (const p of projects) {
    console.log(`● ${p.name}`);
    console.log(`  Path: ${p.path}`);
    console.log(`  Type: ${p.type}${p.framework ? ` (${p.framework})` : ''}`);
    console.log(`  Analyzed: ${p.analyzedAt}`);
    console.log('');
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 7: Auto-enrich Function');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const originalPrompt = 'Napraw błąd w systemie logowania';
  const enriched = await autoEnrichPrompt(originalPrompt);

  console.log('Original prompt length:', originalPrompt.length);
  console.log('Enriched prompt length:', enriched.length);
  console.log('\nEnriched prompt preview (first 500 chars):');
  console.log('─'.repeat(50));
  console.log(enriched.slice(0, 500));
  if (enriched.length > 500) console.log('...[truncated]');
  console.log('─'.repeat(50));

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('TEST 8: Persistence Check');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  await codebaseMemory.close();
  console.log('✓ Memory saved and closed');

  // Re-init to verify persistence
  const freshMemory = await import('./dist/src/memory/CodebaseMemory.js');
  const newInstance = new freshMemory.CodebaseMemory();
  await newInstance.init();

  const reloaded = newInstance.getAnalysis(projectPath);
  if (reloaded) {
    console.log('✓ Analysis successfully reloaded from disk!');
    console.log(`  Project: ${reloaded.projectName}`);
    console.log(`  Files: ${reloaded.structure.totalFiles}`);
    console.log(`  Access count: ${reloaded.accessCount}`);
  } else {
    console.log('✗ Failed to reload analysis');
  }

  await newInstance.close();

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                  ALL TESTS COMPLETED                          ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');
}

runTests().catch(console.error);
