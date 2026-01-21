/**
 * @fileoverview Ollama Learning Wrapper
 * Wraps Ollama client with automatic learning capabilities
 *
 * @description
 * Drop-in replacement for ollama-client that automatically:
 * - Injects RAG context into prompts
 * - Collects interactions for training
 * - Uses dynamic system prompts
 *
 * @module learning/ollama-learning-wrapper
 */

import ollamaClient from '../hydra/providers/ollama-client.js';
import learning from './index.js';

/** @type {boolean} */
let initialized = false;

/** @type {boolean} */
let learningEnabled = true;

/**
 * Ensures learning system is initialized
 */
async function ensureInitialized() {
  if (!initialized) {
    await learning.initialize({
      enableRAG: true,
      collectTraining: true,
      autoSaveRAG: true
    });
    initialized = true;
  }
}

/**
 * Generates completion with automatic learning
 *
 * @param {string} prompt - User prompt
 * @param {Object} [options={}] - Generation options
 * @returns {Promise<{
 *   content: string,
 *   model: string,
 *   duration_ms: number,
 *   tokens: number,
 *   learning: { ragSources: number, trainingCollected: boolean }
 * }>}
 *
 * @example
 * const result = await generate('Write a React hook');
 * console.log(result.content);
 * console.log('RAG sources used:', result.learning.ragSources);
 */
export async function generate(prompt, options = {}) {
  await ensureInitialized();

  const {
    model = 'llama3.2:3b',
    task = 'general',
    useRAG = learningEnabled,
    collectTraining = learningEnabled,
    ...ollamaOptions
  } = options;

  let systemPrompt = '';
  let contextSources = [];

  // Generate context-aware system prompt
  if (useRAG) {
    try {
      const promptResult = await learning.generatePrompt(prompt, { task });
      systemPrompt = promptResult.systemPrompt;
      contextSources = promptResult.contextSources;
    } catch {
      // Fall back to quick prompt
      systemPrompt = await learning.quickPrompt(task);
    }
  }

  // Build full prompt with system context
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n### User Request:\n${prompt}`
    : prompt;

  // Generate with Ollama
  const result = await ollamaClient.generate(fullPrompt, {
    model,
    ...ollamaOptions
  });

  // Collect interaction for training
  let trainingCollected = false;
  if (collectTraining) {
    try {
      const learnResult = await learning.processInteraction(prompt, result.content, {
        model,
        task,
        duration_ms: result.duration_ms
      });
      trainingCollected = learnResult.trainingCollected;
    } catch {
      // Learning failed, continue
    }
  }

  return {
    ...result,
    learning: {
      ragSources: contextSources.length,
      trainingCollected,
      systemPromptTokens: Math.ceil(systemPrompt.length / 4)
    }
  };
}

/**
 * Streams completion with automatic learning
 *
 * @param {string} prompt - User prompt
 * @param {Object} [options={}] - Generation options
 * @yields {string} Content chunks
 *
 * @example
 * for await (const chunk of streamGenerate('Tell me about React')) {
 *   process.stdout.write(chunk);
 * }
 */
export async function* streamGenerate(prompt, options = {}) {
  await ensureInitialized();

  const {
    model = 'llama3.2:3b',
    task = 'general',
    useRAG = learningEnabled,
    collectTraining = learningEnabled,
    ...ollamaOptions
  } = options;

  let systemPrompt = '';

  // Generate context-aware system prompt
  if (useRAG) {
    try {
      const promptResult = await learning.generatePrompt(prompt, { task });
      systemPrompt = promptResult.systemPrompt;
    } catch {
      systemPrompt = await learning.quickPrompt(task);
    }
  }

  // Build full prompt
  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n### User Request:\n${prompt}`
    : prompt;

  // Collect response chunks for training
  let fullResponse = '';

  // Stream from Ollama
  for await (const chunk of ollamaClient.streamGenerate(fullPrompt, {
    model,
    ...ollamaOptions
  })) {
    fullResponse += chunk;
    yield chunk;
  }

  // Collect completed interaction
  if (collectTraining && fullResponse.length > 50) {
    try {
      await learning.processInteraction(prompt, fullResponse, {
        model,
        task,
        streamed: true
      });
    } catch {
      // Learning failed, continue
    }
  }
}

/**
 * Chat completion with conversation history
 *
 * @param {Array<{role: string, content: string}>} messages - Conversation messages
 * @param {Object} [options={}] - Generation options
 * @returns {Promise<{content: string, model: string}>}
 */
export async function chat(messages, options = {}) {
  await ensureInitialized();

  const {
    model = 'llama3.2:3b',
    task = 'general',
    useRAG = learningEnabled,
    ...ollamaOptions
  } = options;

  // Get last user message for RAG
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

  let systemPrompt = '';
  if (useRAG && lastUserMessage) {
    try {
      const promptResult = await learning.generatePrompt(lastUserMessage.content, { task });
      systemPrompt = promptResult.systemPrompt;
    } catch {
      systemPrompt = await learning.quickPrompt(task);
    }
  }

  // Build conversation prompt
  const conversationParts = messages.map(m =>
    `${m.role.toUpperCase()}: ${m.content}`
  );

  const fullPrompt = systemPrompt
    ? `${systemPrompt}\n\n### Conversation:\n${conversationParts.join('\n\n')}\n\nASSISTANT:`
    : `${conversationParts.join('\n\n')}\n\nASSISTANT:`;

  const result = await ollamaClient.generate(fullPrompt, {
    model,
    ...ollamaOptions
  });

  // Collect conversation for training
  if (learningEnabled && lastUserMessage) {
    try {
      await learning.trainingCollector.collectConversation({
        messages: [...messages, { role: 'assistant', content: result.content }]
      });
    } catch {
      // Continue
    }
  }

  return result;
}

/**
 * Health check including learning system status
 *
 * @returns {Promise<{
 *   ollama: { available: boolean, models: string[] },
 *   learning: Object
 * }>}
 */
export async function healthCheck() {
  const ollamaHealth = await ollamaClient.healthCheck();

  let learningStatus = null;
  try {
    await ensureInitialized();
    learningStatus = await learning.getStatus();
  } catch {
    learningStatus = { error: 'Failed to initialize' };
  }

  return {
    ollama: ollamaHealth,
    learning: learningStatus
  };
}

/**
 * Enables or disables learning features
 *
 * @param {boolean} enabled - Enable learning
 */
export function setLearningEnabled(enabled) {
  learningEnabled = enabled;
}

/**
 * Gets learning enabled status
 *
 * @returns {boolean}
 */
export function isLearningEnabled() {
  return learningEnabled;
}

/**
 * Manually saves learning state
 *
 * @returns {Promise<{saved: boolean}>}
 */
export async function saveLearning() {
  await ensureInitialized();
  return learning.save();
}

/**
 * Prepares fine-tuning export
 *
 * @param {Object} [options={}] - Export options
 * @returns {Promise<Object>}
 */
export async function prepareFineTuning(options = {}) {
  await ensureInitialized();
  return learning.prepareFineTuning(options);
}

// Re-export original client functions for compatibility
export const { selectModel, getModelRole, getModelRoles, getBaseUrl } = ollamaClient;

export default {
  generate,
  streamGenerate,
  chat,
  healthCheck,
  setLearningEnabled,
  isLearningEnabled,
  saveLearning,
  prepareFineTuning,
  // Original exports
  selectModel: ollamaClient.selectModel,
  getModelRole: ollamaClient.getModelRole,
  getModelRoles: ollamaClient.getModelRoles,
  getBaseUrl: ollamaClient.getBaseUrl
};
