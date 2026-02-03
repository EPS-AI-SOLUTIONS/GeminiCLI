/**
 * IntelligenceLayer - Advanced AI reasoning capabilities for GeminiHydra
 *
 * Implements:
 * 1. Chain-of-Thought reasoning
 * 2. Self-Reflection Loop (with Gemini Flash)
 * 3. Confidence Scoring
 * 4. Multi-Perspective Analysis
 * 5. Tree-of-Thoughts exploration
 * 6. Context Window Management
 * 7. Semantic Caching
 * 8. Query Decomposition
 * 9. Knowledge Graphs
 * 10. Analogical Reasoning
 * 11. Meta-Prompting
 * 12. Semantic Chunking
 */

import chalk from 'chalk';

// Re-export all modules
export { SemanticCache, semanticCache, type CacheEntry } from './SemanticCache.js';
export { KnowledgeGraph, knowledgeGraph, type KnowledgeNode, type KnowledgeEdge } from './KnowledgeGraph.js';
export { chainOfThought, type ChainOfThoughtResult } from './ChainOfThought.js';
export {
  selfReflect,
  reflexionLoop,
  getReflexionStats,
  clearReflexionMemory,
  reflexionMemory,
  type ReflectionResult,
  type ReflexionResult,
  type ReflexionLesson,
  type ReflexionMemory,
  type EvaluationResult,
  type TrajectoryCheckpoint
} from './SelfReflection.js';
export { scoreConfidence, type ConfidenceScore } from './ConfidenceScoring.js';
export { multiPerspectiveAnalysis, type Perspective, type MultiPerspectiveResult } from './MultiPerspective.js';
export { ContextWindowManager, contextManager, type ContextChunk } from './ContextManager.js';
export {
  decomposeQuery,
  detectQueryType,
  hierarchicalDecompose,
  mergeRelatedQueries,
  buildHierarchyTree,
  visualizeDependencyGraph,
  shouldDecompose,
  robustJsonParse,
  decompositionCache,
  getDecompositionCacheStats,
  clearDecompositionCache,
  type DecomposedQuery,
  type SubQuery,
  type QueryType,
  type QueryTypeInfo,
  type HierarchyNode,
  type MergedGroup
} from './QueryDecomposition.js';
export { findAnalogies, type Analogy } from './AnalogicalReasoning.js';
export {
  treeOfThoughts,
  quickTreeOfThoughts,
  mctsTreeOfThoughts,
  bfsTreeOfThoughts,
  parallelTreeOfThoughts,
  type ThoughtNode,
  type TreeOfThoughtsResult,
  type ToTOptions,
  type SearchStrategy
} from './TreeOfThoughts.js';
// MetaPrompting - Full implementation in intelligence/MetaPrompting.ts
export {
  // Classes
  MetaPrompter,
  AdvancedMetaPrompter,
  PromptTemplateLibrary,

  // Singleton instances
  metaPrompter,
  advancedMetaPrompter,
  promptTemplateLibrary,

  // Quick functions
  quickOptimize,
  quickEvolve,
  quickCompress,
  quickABTest,

  // Legacy API functions
  generateMetaPrompt,
  executeWithMetaPrompt,
  classifyTaskType,
  getPromptTemplate,

  // Types - Main
  type PromptOptimization,
  type MetaPromptingConfig,
  type EvolutionConfig,
  type ABTestResult,
  type CompressionResult,
  type DomainOptimizationResult,
  type RecursiveOptimizationResult,
  type PromptTemplate,
  type TemplateCategory,
  type DomainType,

  // Types - Legacy
  type MetaPromptResult,
  type TaskType
} from './MetaPrompting.js';
export {
  semanticChunk,
  createSemanticChunks,
  createCodeAwareChunks,
  createHierarchicalChunks,
  detectSemanticBoundaries,
  detectLanguage,
  mergeChunksWithOverlap,
  prioritizeChunks,
  findRelevantChunks,
  summarizeChunks,
  reconstructText,
  addToContextWithChunking,
  getSemanticContext,
  type SemanticChunk,
  type ChunkType,
  type ChunkingResult,
  type ChunkBoundary,
  type BoundaryType,
  type HierarchyLevel,
  type ChunkHierarchy,
  type ChunkingOptions,
  type ProgrammingLanguage
} from './SemanticChunking.js';

// Import for internal use
import { semanticCache } from './SemanticCache.js';
import { knowledgeGraph } from './KnowledgeGraph.js';
import { contextManager } from './ContextManager.js';
import { selfReflect, reflexionLoop } from './SelfReflection.js';
import { scoreConfidence } from './ConfidenceScoring.js';
import { multiPerspectiveAnalysis } from './MultiPerspective.js';
import { findAnalogies } from './AnalogicalReasoning.js';
import { treeOfThoughts, mctsTreeOfThoughts, bfsTreeOfThoughts, parallelTreeOfThoughts } from './TreeOfThoughts.js';
import { generateMetaPrompt, classifyTaskType, metaPrompter, advancedMetaPrompter } from './MetaPrompting.js';
import {
  semanticChunk,
  createSemanticChunks,
  createCodeAwareChunks,
  findRelevantChunks,
  prioritizeChunks,
  addToContextWithChunking,
  getSemanticContext
} from './SemanticChunking.js';

// =============================================================================
// UNIFIED INTELLIGENCE PIPELINE
// =============================================================================

export interface IntelligenceConfig {
  useChainOfThought?: boolean;
  useSelfReflection?: boolean;
  useConfidenceScoring?: boolean;
  useMultiPerspective?: boolean;
  useSemanticCache?: boolean;
  useKnowledgeGraph?: boolean;
  useQueryDecomposition?: boolean;
  useAnalogicalReasoning?: boolean;
  useTreeOfThoughts?: boolean;      // NEW: Tree-of-Thoughts exploration
  useMetaPrompting?: boolean;       // NEW: Dynamic prompt optimization
  useSemanticChunking?: boolean;    // NEW: Intelligent text segmentation
  confidenceThreshold?: number;
}

const DEFAULT_INTELLIGENCE_CONFIG: IntelligenceConfig = {
  useChainOfThought: true,
  useSelfReflection: true,
  useConfidenceScoring: true,
  useMultiPerspective: false,    // Expensive, use for critical tasks
  useSemanticCache: true,
  useKnowledgeGraph: true,
  useQueryDecomposition: true,
  useAnalogicalReasoning: true,
  useTreeOfThoughts: false,      // Expensive, use for exploration problems
  useMetaPrompting: true,        // Enabled by default for prompt optimization
  useSemanticChunking: true,     // Enabled for long context handling
  confidenceThreshold: 70
};

/**
 * Main intelligence pipeline - enhances any task with advanced reasoning
 */
export async function enhanceWithIntelligence(
  task: string,
  baseResponse: string,
  config: IntelligenceConfig = {}
): Promise<string> {
  const cfg = { ...DEFAULT_INTELLIGENCE_CONFIG, ...config };

  console.log(chalk.cyan('\n[INTELLIGENCE LAYER] ACTIVATED'));

  let enhancedResponse = baseResponse;

  // 1. Check semantic cache first
  if (cfg.useSemanticCache) {
    const cached = await semanticCache.get(task);
    if (cached) {
      return cached;
    }
  }

  // 2. Add knowledge graph context
  if (cfg.useKnowledgeGraph) {
    const knowledgeContext = knowledgeGraph.buildContext(task);
    if (knowledgeContext) {
      contextManager.add(knowledgeContext, 'system', 0.7);
    }
  }

  // 3. Find analogies
  if (cfg.useAnalogicalReasoning) {
    const analogies = await findAnalogies(task);
    if (analogies.length > 0) {
      const analogyContext = analogies
        .map(a => `[Analogy] ${a.sourcePattern} -> ${a.suggestedApproach}`)
        .join('\n');
      contextManager.add(analogyContext, 'system', 0.6);
    }
  }

  // 4. Self-reflection loop
  if (cfg.useSelfReflection) {
    const reflection = await selfReflect(task, enhancedResponse);
    if (reflection.confidenceImprovement > 10) {
      enhancedResponse = reflection.improvedResponse;
    }
  }

  // 5. Confidence scoring
  if (cfg.useConfidenceScoring) {
    const confidence = await scoreConfidence(task, enhancedResponse);

    if (confidence.overall < cfg.confidenceThreshold! && confidence.needsClarification) {
      // Add clarification note
      enhancedResponse += `\n\n[CONFIDENCE] ${confidence.overall}%\n`;
      enhancedResponse += `Pytania do wyjasnienia:\n`;
      enhancedResponse += confidence.clarificationQuestions.map(q => `* ${q}`).join('\n');
    }
  }

  // 6. Multi-perspective (only for critical tasks)
  if (cfg.useMultiPerspective) {
    const perspectives = await multiPerspectiveAnalysis(task);
    if (perspectives.disagreements.length > 0) {
      enhancedResponse += `\n\n[PERSPECTIVES]\n`;
      enhancedResponse += perspectives.perspectives
        .map(p => `* ${p.viewpoint}: ${p.recommendation}`)
        .join('\n');
    }
  }

  // Store in cache and knowledge graph
  if (cfg.useSemanticCache) {
    await semanticCache.set(task, enhancedResponse);
  }

  if (cfg.useKnowledgeGraph) {
    knowledgeGraph.recordExecution(task, enhancedResponse, true);
  }

  console.log(chalk.cyan('[INTELLIGENCE LAYER] COMPLETE\n'));

  return enhancedResponse;
}

// Export default object with all functions and managers
export default {
  // Core functions
  enhanceWithIntelligence,

  // Managers (singleton instances)
  semanticCache,
  knowledgeGraph,
  contextManager,

  // Tree-of-Thoughts (all strategies)
  treeOfThoughts,
  mctsTreeOfThoughts,
  bfsTreeOfThoughts,
  parallelTreeOfThoughts,

  // MetaPrompting
  metaPrompter,
  advancedMetaPrompter,
  generateMetaPrompt,
  classifyTaskType,

  // Semantic Chunking (all functions)
  semanticChunk,
  createSemanticChunks,
  createCodeAwareChunks,
  findRelevantChunks,
  prioritizeChunks,
  addToContextWithChunking,
  getSemanticContext
};
