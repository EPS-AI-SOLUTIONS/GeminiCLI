/**
 * MetaPrompting - Advanced prompt optimization and generation system
 *
 * This file re-exports from the modular metaprompting/ subdirectory.
 * The implementation has been split into:
 * - metaprompting/types.ts       - All interfaces, types, and default configs
 * - metaprompting/templates.ts   - PromptTemplateLibrary with built-in templates
 * - metaprompting/MetaPrompter.ts - Base MetaPrompter class
 * - metaprompting/AdvancedMetaPrompter.ts - Advanced features (genetic algo, A/B, compression, domain, few-shot)
 * - metaprompting/legacy.ts      - Legacy API (classifyTaskType, generateMetaPrompt, etc.)
 * - metaprompting/index.ts       - Re-exports, singletons, and quick functions
 *
 * Import from here or from './metaprompting/index.js' directly.
 */

// Default export
export {
  type ABTestResult,
  AdvancedMetaPrompter,
  advancedMetaPrompter,
  type CompressionResult,
  classifyTaskType,
  // Default configs
  DEFAULT_CONFIG,
  DEFAULT_EVOLUTION_CONFIG,
  type DomainOptimizationResult,
  // Types - Domain
  type DomainType,
  default,
  type EvolutionConfig,
  executeWithMetaPrompt,
  // Legacy API functions
  generateMetaPrompt,
  getPromptTemplate,
  // Classes
  MetaPrompter,
  type MetaPromptingConfig,
  // Types - Legacy API
  type MetaPromptResult,
  // Singleton instances
  metaPrompter,
  // Types - Internal (exported for advanced usage)
  type PromptIndividual,
  // Types - Optimization
  type PromptOptimization,
  // Types - Templates
  type PromptTemplate,
  PromptTemplateLibrary,
  promptTemplateLibrary,
  quickABTest,
  quickCompress,
  quickEvolve,
  // Quick functions
  quickOptimize,
  type RecursiveOptimizationResult,
  type TaskType,
  type TemplateCategory,
} from './metaprompting/index.js';
