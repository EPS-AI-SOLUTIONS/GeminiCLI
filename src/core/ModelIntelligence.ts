/**
 * ModelIntelligence - Advanced model selection and management
 * Features #11, #12, #14, #15, #16, #17, #18, #19, #20
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import crypto from 'crypto';
import 'dotenv/config';
import { GEMINI_MODELS } from '../config/models.config.js';

// Import canonical fallback chain from FallbackChains.ts
import { getFallbackChain, AGENT_FALLBACK_CHAINS, type FallbackChainEntry } from './models/FallbackChains.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// ============================================================
// Feature #11: Dynamic Model Selection
// ============================================================

export type TaskComplexity = 'trivial' | 'simple' | 'medium' | 'complex' | 'critical';

export interface ModelSelectionResult {
  model: string;
  complexity: TaskComplexity;
  reason: string;
}

/**
 * Classify task complexity using fast model
 */
export async function classifyComplexity(taskText: string): Promise<TaskComplexity> {
  try {
    const classifier = genAI.getGenerativeModel({
      model: GEMINI_MODELS.FLASH,
      generationConfig: { temperature: 0, maxOutputTokens: 20 }
    });

    const prompt = `Classify this task complexity. Reply with ONE word only: trivial, simple, medium, complex, or critical.
Task: ${taskText.substring(0, 300)}
Complexity:`;

    const result = await classifier.generateContent(prompt);
    const response = result.response.text().toLowerCase().trim();

    const validLevels: TaskComplexity[] = ['trivial', 'simple', 'medium', 'complex', 'critical'];
    return validLevels.find(level => response.includes(level)) || 'medium';
  } catch {
    return 'medium';
  }
}

/**
 * Select optimal model for task
 */
export function selectModelForTask(
  complexity: TaskComplexity,
  agentType: string = 'general'
): ModelSelectionResult {
  const modelMap: Record<TaskComplexity, { model: string; reason: string }> = {
    trivial: { model: GEMINI_MODELS.FLASH, reason: 'Fast model for trivial tasks' },
    simple: { model: GEMINI_MODELS.FLASH, reason: 'Flash model for simple tasks' },
    medium: { model: GEMINI_MODELS.FLASH, reason: 'Balanced model for medium tasks' },
    complex: { model: GEMINI_MODELS.PRO, reason: 'Pro model for complex tasks' },
    critical: { model: GEMINI_MODELS.PRO, reason: 'Best model for critical tasks' }
  };

  const selection = modelMap[complexity];
  return { ...selection, complexity };
}

// ============================================================
// Feature #12: Agent-Specific Fallback Chains
// Re-exported from ./models/FallbackChains.ts (canonical source)
// ============================================================

export { getFallbackChain, AGENT_FALLBACK_CHAINS, type FallbackChainEntry };

// ============================================================
// Feature #14: Model Performance Tracking
// ============================================================

export interface ModelMetrics {
  successCount: number;
  errorCount: number;
  totalLatency: number;
  avgLatency: number;
  lastUsed: Date;
  qualityScores: number[];
}

class ModelPerformanceTracker {
  private metrics: Map<string, ModelMetrics> = new Map();

  record(model: string, success: boolean, latency: number, qualityScore?: number): void {
    if (!this.metrics.has(model)) {
      this.metrics.set(model, {
        successCount: 0,
        errorCount: 0,
        totalLatency: 0,
        avgLatency: 0,
        lastUsed: new Date(),
        qualityScores: []
      });
    }

    const m = this.metrics.get(model)!;

    if (success) {
      m.successCount++;
    } else {
      m.errorCount++;
    }

    m.totalLatency += latency;
    m.avgLatency = m.totalLatency / (m.successCount + m.errorCount);
    m.lastUsed = new Date();

    if (qualityScore !== undefined) {
      m.qualityScores.push(qualityScore);
      // Keep only last 100 scores
      if (m.qualityScores.length > 100) {
        m.qualityScores.shift();
      }
    }
  }

  getMetrics(model: string): ModelMetrics | undefined {
    return this.metrics.get(model);
  }

  getAllMetrics(): Record<string, ModelMetrics> {
    const result: Record<string, ModelMetrics> = {};
    this.metrics.forEach((v, k) => result[k] = v);
    return result;
  }

  getSuccessRate(model: string): number {
    const m = this.metrics.get(model);
    if (!m) return 0;
    const total = m.successCount + m.errorCount;
    return total > 0 ? m.successCount / total : 0;
  }

  getAvgQuality(model: string): number {
    const m = this.metrics.get(model);
    if (!m || m.qualityScores.length === 0) return 0;
    return m.qualityScores.reduce((a, b) => a + b, 0) / m.qualityScores.length;
  }

  getBestModel(candidates: string[]): string {
    let best = candidates[0];
    let bestScore = -1;

    for (const model of candidates) {
      const successRate = this.getSuccessRate(model);
      const quality = this.getAvgQuality(model);
      const score = successRate * 0.6 + quality * 0.4;

      if (score > bestScore) {
        bestScore = score;
        best = model;
      }
    }

    return best;
  }
}

export const modelPerformance = new ModelPerformanceTracker();

// ============================================================
// Feature #15: Prompt Caching
// ============================================================

interface CachedPrompt {
  hash: string;
  compiled: string;
  timestamp: number;
  hits: number;
}

class PromptCache {
  private cache: Map<string, CachedPrompt> = new Map();
  private maxSize = 100;
  private ttl = 30 * 60 * 1000; // 30 minutes

  private hash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  get(template: string, variables: Record<string, any>): string | undefined {
    const key = this.hash(template + JSON.stringify(variables));
    const cached = this.cache.get(key);

    if (!cached) return undefined;

    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }

    cached.hits++;
    return cached.compiled;
  }

  set(template: string, variables: Record<string, any>, compiled: string): void {
    const key = this.hash(template + JSON.stringify(variables));

    if (this.cache.size >= this.maxSize) {
      // Remove oldest
      const oldest = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
      if (oldest) this.cache.delete(oldest[0]);
    }

    this.cache.set(key, {
      hash: key,
      compiled,
      timestamp: Date.now(),
      hits: 0
    });
  }

  compile(template: string, variables: Record<string, any>): string {
    const cached = this.get(template, variables);
    if (cached) return cached;

    let compiled = template;
    for (const [key, value] of Object.entries(variables)) {
      compiled = compiled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    }

    this.set(template, variables, compiled);
    return compiled;
  }

  getStats(): { size: number; totalHits: number } {
    let totalHits = 0;
    this.cache.forEach(c => totalHits += c.hits);
    return { size: this.cache.size, totalHits };
  }

  clear(): void {
    this.cache.clear();
  }
}

export const promptCache = new PromptCache();

// ============================================================
// Feature #16: Response Quality Scoring
// ============================================================

export interface QualityScore {
  overall: number;
  completeness: number;
  format: number;
  relevance: number;
}

export function scoreResponseQuality(
  response: string,
  expectedType: 'list' | 'code' | 'text' | 'json',
  expectedLength?: number
): QualityScore {
  let completeness = 0;
  let format = 0;
  let relevance = 1; // Default to high

  // Completeness based on length
  const length = response.length;
  if (expectedLength) {
    completeness = Math.min(1, length / expectedLength);
  } else {
    completeness = length > 100 ? 1 : length / 100;
  }

  // Format scoring
  switch (expectedType) {
    case 'list':
      const listItems = (response.match(/^\d+\./gm) || []).length;
      format = listItems > 0 ? Math.min(1, listItems / 10) : 0;
      break;

    case 'code':
      const hasCode = /```|function|class|const|let|var|def |import /i.test(response);
      format = hasCode ? 1 : 0.3;
      break;

    case 'json':
      try {
        JSON.parse(response.replace(/```json|```/g, '').trim());
        format = 1;
      } catch {
        format = 0;
      }
      break;

    case 'text':
      format = response.trim().length > 0 ? 1 : 0;
      break;
  }

  // Detect low-quality patterns
  if (/I cannot|I'm unable|I don't have|jako AI/i.test(response)) {
    relevance = 0.3;
  }

  const overall = completeness * 0.3 + format * 0.4 + relevance * 0.3;

  return { overall, completeness, format, relevance };
}

// ============================================================
// Feature #17: Multi-Model Consensus (for critical tasks)
// ============================================================

export interface ConsensusResult {
  selectedResponse: string;
  responses: Array<{ model: string; response: string; score: number }>;
  confidence: number;
}

export async function getConsensus(
  prompt: string,
  models: string[] = [GEMINI_MODELS.PRO, GEMINI_MODELS.FLASH],
  expectedType: 'list' | 'code' | 'text' | 'json' = 'text'
): Promise<ConsensusResult> {
  const responses: Array<{ model: string; response: string; score: number }> = [];

  // Query all models in parallel
  const promises = models.map(async modelName => {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      const quality = scoreResponseQuality(response, expectedType);

      return { model: modelName, response, score: quality.overall };
    } catch (error) {
      return { model: modelName, response: '', score: 0 };
    }
  });

  const results = await Promise.all(promises);
  responses.push(...results.filter(r => r.response.length > 0));

  // Select best response
  responses.sort((a, b) => b.score - a.score);
  const best = responses[0] || { model: '', response: '', score: 0 };

  // Calculate confidence (how much better is best vs average)
  const avgScore = responses.reduce((sum, r) => sum + r.score, 0) / responses.length;
  const confidence = avgScore > 0 ? best.score / avgScore : 0;

  return {
    selectedResponse: best.response,
    responses,
    confidence
  };
}

// ============================================================
// Feature #18: Context Window Management
// ============================================================

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  importance: number;
}

class ContextWindowManager {
  private maxTokens = 30000;
  private messages: ContextMessage[] = [];

  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  add(message: ContextMessage): void {
    this.messages.push(message);
    this.pruneIfNeeded();
  }

  private pruneIfNeeded(): void {
    const totalTokens = this.messages.reduce(
      (sum, m) => sum + this.estimateTokens(m.content),
      0
    );

    if (totalTokens <= this.maxTokens) return;

    // Sort by importance and recency
    const scored = this.messages.map((m, i) => ({
      message: m,
      index: i,
      score: m.importance * 0.6 + (i / this.messages.length) * 0.4
    }));

    scored.sort((a, b) => b.score - a.score);

    // Keep highest scored messages up to limit
    let kept: typeof scored = [];
    let tokens = 0;

    for (const item of scored) {
      const itemTokens = this.estimateTokens(item.message.content);
      if (tokens + itemTokens <= this.maxTokens) {
        kept.push(item);
        tokens += itemTokens;
      }
    }

    // Restore chronological order
    kept.sort((a, b) => a.index - b.index);
    this.messages = kept.map(k => k.message);
  }

  getContext(): string {
    return this.messages.map(m => `[${m.role}]: ${m.content}`).join('\n\n');
  }

  getMessages(): ContextMessage[] {
    return [...this.messages];
  }

  clear(): void {
    this.messages = [];
  }

  setMaxTokens(max: number): void {
    this.maxTokens = max;
  }
}

export const contextManager = new ContextWindowManager();

// ============================================================
// Feature #19: Model-Specific Prompt Optimization
// ============================================================

export interface ModelPromptConfig {
  systemPrefix: string;
  responseFormat: string;
  temperature: number;
  styleHints: string;
}

export const MODEL_PROMPT_CONFIGS: Record<string, ModelPromptConfig> = {
  [GEMINI_MODELS.PRO]: {
    systemPrefix: 'You are a highly capable AI assistant.',
    responseFormat: 'Provide detailed, well-structured responses.',
    temperature: 0.3,
    styleHints: 'Be thorough and analytical.'
  },
  [GEMINI_MODELS.FLASH]: {
    systemPrefix: 'You are a fast, efficient AI assistant.',
    responseFormat: 'Be concise and direct.',
    temperature: 0.4,
    styleHints: 'Prioritize speed and clarity.'
  },
  'llama3.2:3b': {
    systemPrefix: 'You are a helpful assistant.',
    responseFormat: 'Keep responses focused and practical.',
    temperature: 0.3,
    styleHints: 'Be straightforward.'
  },
  'qwen2.5-coder:1.5b': {
    systemPrefix: 'You are a coding assistant.',
    responseFormat: 'Focus on code and technical details.',
    temperature: 0.2,
    styleHints: 'Provide working code with minimal explanation.'
  }
};

export function optimizePromptForModel(prompt: string, model: string): string {
  const config = MODEL_PROMPT_CONFIGS[model] || MODEL_PROMPT_CONFIGS[GEMINI_MODELS.FLASH];

  return `${config.systemPrefix}

${config.styleHints}
${config.responseFormat}

${prompt}`;
}

// ============================================================
// Feature #20: Model Health Check
// ============================================================

export interface ModelHealth {
  model: string;
  available: boolean;
  latency: number;
  lastCheck: Date;
  error?: string;
}

class ModelHealthChecker {
  private health: Map<string, ModelHealth> = new Map();
  private checkInterval = 5 * 60 * 1000; // 5 minutes

  async checkModel(modelName: string): Promise<ModelHealth> {
    const startTime = Date.now();

    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      await model.generateContent('Hi');

      const health: ModelHealth = {
        model: modelName,
        available: true,
        latency: Date.now() - startTime,
        lastCheck: new Date()
      };

      this.health.set(modelName, health);
      return health;

    } catch (error: any) {
      const health: ModelHealth = {
        model: modelName,
        available: false,
        latency: -1,
        lastCheck: new Date(),
        error: error.message
      };

      this.health.set(modelName, health);
      return health;
    }
  }

  async checkAll(models: string[]): Promise<Map<string, ModelHealth>> {
    const promises = models.map(m => this.checkModel(m));
    await Promise.all(promises);
    return this.health;
  }

  getHealth(model: string): ModelHealth | undefined {
    return this.health.get(model);
  }

  isAvailable(model: string): boolean {
    const h = this.health.get(model);
    if (!h) return true; // Assume available if not checked

    // Re-check if old
    if (Date.now() - h.lastCheck.getTime() > this.checkInterval) {
      return true; // Allow retry
    }

    return h.available;
  }

  getAvailableModels(candidates: string[]): string[] {
    return candidates.filter(m => this.isAvailable(m));
  }

  printStatus(): void {
    console.log(chalk.cyan('\n═══ Model Health Status ═══\n'));

    for (const [model, health] of this.health) {
      const icon = health.available ? chalk.green('✓') : chalk.red('✗');
      const latency = health.latency > 0 ? `${health.latency}ms` : 'N/A';
      console.log(`${icon} ${model}: ${latency}`);
      if (health.error) {
        console.log(chalk.gray(`   Error: ${health.error}`));
      }
    }
  }
}

export const modelHealth = new ModelHealthChecker();

// ============================================================
// Export all
// ============================================================

export default {
  classifyComplexity,
  selectModelForTask,
  getFallbackChain,
  modelPerformance,
  promptCache,
  scoreResponseQuality,
  getConsensus,
  contextManager,
  optimizePromptForModel,
  modelHealth,
  AGENT_FALLBACK_CHAINS,
  MODEL_PROMPT_CONFIGS
};
