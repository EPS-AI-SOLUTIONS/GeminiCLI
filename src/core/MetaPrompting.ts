/**
 * @deprecated Import directly from './intelligence/MetaPrompting.js' instead.
 *
 * MetaPrompting - Re-export from consolidated intelligence module
 *
 * This file re-exports the consolidated MetaPrompting implementation
 * from src/core/intelligence/MetaPrompting.ts for backward compatibility.
 *
 * The main module provides:
 * - PromptTemplateLibrary with pre-built templates
 * - MetaPrompter for basic optimization
 * - AdvancedMetaPrompter for:
 *   - Recursive self-optimization
 *   - Genetic algorithm evolution
 *   - A/B testing
 *   - Prompt compression
 *   - Domain-specific optimization
 *   - Few-shot injection
 * - Legacy API (generateMetaPrompt, classifyTaskType, etc.)
 */

export {
  // Types - Optimization
  type PromptOptimization,
  type MetaPromptingConfig,
  type EvolutionConfig,
  type ABTestResult,
  type CompressionResult,
  type DomainOptimizationResult,
  type RecursiveOptimizationResult,

  // Types - Templates
  type PromptTemplate,
  type TemplateCategory,

  // Types - Domain
  type DomainType,

  // Types - Legacy API
  type MetaPromptResult,
  type TaskType,

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
  getPromptTemplate
} from './intelligence/MetaPrompting.js';

// Default export
export { default } from './intelligence/MetaPrompting.js';
