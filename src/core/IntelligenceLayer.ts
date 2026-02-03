/**
 * @deprecated This file has been removed and consolidated into src/core/intelligence/
 *
 * All functionality is now available from:
 * - src/core/intelligence/index.ts (main export point)
 * - src/core/intelligence/SemanticCache.ts
 * - src/core/intelligence/KnowledgeGraph.ts
 * - src/core/intelligence/ChainOfThought.ts
 * - src/core/intelligence/SelfReflection.ts
 * - src/core/intelligence/ConfidenceScoring.ts
 * - src/core/intelligence/MultiPerspective.ts
 * - src/core/intelligence/ContextManager.ts
 * - src/core/intelligence/QueryDecomposition.ts
 * - src/core/intelligence/AnalogicalReasoning.ts
 *
 * Import from intelligence/ instead:
 * import { chainOfThought, selfReflect, semanticCache } from './intelligence/index.js';
 *
 * This stub file exists only for backward compatibility and will be removed in future versions.
 */

// Re-export everything from the intelligence module for backward compatibility
export * from './intelligence/index.js';
