#!/usr/bin/env node
/**
 * Test full generation with learning wrapper
 */

import ollamaLearning from './ollama-learning-wrapper.js';

async function test() {
  console.log('\n=== Testing Ollama with Learning System ===\n');

  // Check health
  console.log('Checking system health...');
  const health = await ollamaLearning.healthCheck();
  console.log(`Ollama: ${health.ollama.available ? 'OK' : 'OFFLINE'}`);
  console.log(`Models: ${health.ollama.models?.join(', ') || 'none'}`);
  console.log(`RAG documents: ${health.learning?.rag?.documents || 0}`);
  console.log();

  if (!health.ollama.available) {
    console.log('Ollama is offline. Start it with: ollama serve');
    process.exit(1);
  }

  // Generate with RAG context
  console.log('Generating response with RAG context...\n');
  console.log('Query: "Write a simple React hook for theme toggle"');
  console.log('-'.repeat(50));

  const result = await ollamaLearning.generate(
    'Write a simple React hook for theme toggle',
    {
      model: 'qwen2.5-coder:1.5b',
      task: 'code',
      maxTokens: 500,
      temperature: 0.7
    }
  );

  console.log('\nResponse:');
  console.log(result.content);
  console.log('-'.repeat(50));
  console.log(`\nStats:`);
  console.log(`  Model: ${result.model}`);
  console.log(`  Duration: ${result.duration_ms}ms`);
  console.log(`  Tokens: ${result.tokens}`);
  console.log(`  RAG sources used: ${result.learning.ragSources}`);
  console.log(`  Training collected: ${result.learning.trainingCollected}`);

  // Save learning state
  await ollamaLearning.saveLearning();
  console.log('\nLearning state saved!');
}

test().catch(console.error);
