/**
 * Classification Service
 * Handles prompt classification and agent selection
 * Migrated from src/api/services/ClassificationService.ts
 *
 * NOTE: Imports from core module (../../index.js in original).
 * Path adjusted to reference the core module from the Next.js project root.
 * These dynamic imports will be resolved at runtime.
 */

import type { AgentSummary, ComplexityInfo, ExecutePlan } from '../api-types';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface Classification {
  agent: string;
  tier: string;
  model: string;
  confidence: number;
}

export interface FullClassification {
  classification: Classification;
  complexity: ComplexityInfo & {
    wordCount: number;
    hasCode: boolean;
    hasMultipleTasks: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Core Module Loader
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Lazily loads core functions from the main module.
 * Uses dynamic import to avoid issues with SSR and module resolution.
 */
async function loadCoreFunctions() {
  // Dynamic import of core module from parent directory (../src/index.ts)
  // webpackIgnore prevents Turbopack/Webpack from statically analyzing this import
  // @ts-expect-error - Runtime-only dynamic import from parent project, not resolvable by TS
  const core = await import(/* webpackIgnore: true */ '../../src/index.js');
  return {
    classifyPrompt: core.classifyPrompt as (prompt: string) => {
      agent: string;
      tier: string;
      model: string;
      confidence: number;
    },
    analyzeComplexity: core.analyzeComplexity as (prompt: string) => {
      level: string;
      score: number;
      wordCount: number;
      hasCode: boolean;
      hasMultipleTasks: boolean;
    },
    getAgentSummaries: core.getAgentSummaries as () => AgentSummary[],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Service Class
// ═══════════════════════════════════════════════════════════════════════════

export class ClassificationService {
  private coreFunctions: Awaited<ReturnType<typeof loadCoreFunctions>> | null = null;

  private async getCore() {
    if (!this.coreFunctions) {
      this.coreFunctions = await loadCoreFunctions();
    }
    return this.coreFunctions;
  }

  async getAgents(): Promise<AgentSummary[]> {
    const core = await this.getCore();
    return core.getAgentSummaries();
  }

  async classify(prompt: string): Promise<Classification> {
    const core = await this.getCore();
    const result = core.classifyPrompt(prompt);
    return {
      agent: result.agent,
      tier: result.tier,
      model: result.model,
      confidence: result.confidence,
    };
  }

  async analyzeComplexity(prompt: string): Promise<
    ComplexityInfo & {
      wordCount: number;
      hasCode: boolean;
      hasMultipleTasks: boolean;
    }
  > {
    const core = await this.getCore();
    const result = core.analyzeComplexity(prompt);
    return {
      level: result.level,
      score: result.score,
      wordCount: result.wordCount,
      hasCode: result.hasCode,
      hasMultipleTasks: result.hasMultipleTasks,
    };
  }

  async getFullClassification(prompt: string): Promise<FullClassification> {
    return {
      classification: await this.classify(prompt),
      complexity: await this.analyzeComplexity(prompt),
    };
  }

  async createPlan(prompt: string): Promise<ExecutePlan> {
    const core = await this.getCore();
    const classification = await this.classify(prompt);
    const complexity = core.analyzeComplexity(prompt);

    return {
      agent: classification.agent,
      tier: classification.tier,
      model: classification.model,
      confidence: classification.confidence,
      complexity: {
        level: complexity.level,
        score: complexity.score,
      },
    };
  }
}

// Singleton
export const classificationService = new ClassificationService();
