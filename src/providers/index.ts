/**
 * GeminiHydra - Provider Module Exports
 */

// Base provider
export * from './base-provider.js';
// Simple providers (LLMProvider interface) - for core/Agent.ts and RefinementService
export {
  createGeminiProviders,
  GEMINI_MODELS,
  type GeminiModelAlias,
  GeminiProvider,
} from './GeminiProvider.js';
// Enhanced providers (EnhancedProvider base) - for SwarmOrchestrator
export {
  createEnhancedGeminiProvider,
  EnhancedGeminiProvider,
  type GeminiConfig,
  type GeminiTier,
} from './gemini-provider.js';
export {
  createLlamaCppProvider,
  LLAMA_CPP_MODELS,
  type LlamaCppConfig,
  LlamaCppProvider,
  type LlamaCppServerInfo,
} from './LlamaCppProvider.js';
export {
  createEnhancedLlamaCppProvider,
  EnhancedLlamaCppProvider,
} from './llamacpp-provider.js';
// MCP Llama provider (primary)
export * from './McpLlamaProvider.js';
// Registry
export * from './registry.js';

// Serena provider
export {
  createSerenaProvider,
  SerenaProvider,
  type SerenaProviderConfig,
} from './SerenaProvider.js';
