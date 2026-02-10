/**
 * GeminiHydra - Provider Module Exports
 *
 * ARCHITECTURE FIX (#14): Provider naming conventions clarified.
 *
 * TWO-TIER PROVIDER PATTERN:
 * ┌─────────────────────────────────────────────────────────────┐
 * │ BASIC providers (PascalCase files):                         │
 * │   GeminiProvider.ts     - Simple LLMProvider for Agent.ts   │
 * │   LlamaCppProvider.ts   - Simple LLMProvider for local LLM  │
 * │   McpLlamaProvider.ts   - MCP-based llama integration       │
 * │   SerenaProvider.ts     - Serena code intel decorator       │
 * │                                                             │
 * │ ENHANCED providers (kebab-case files):                      │
 * │   gemini-provider.ts    - EnhancedGeminiProvider with       │
 * │                           pooling, circuit breaker, retry   │
 * │   llamacpp-provider.ts  - EnhancedLlamaCppProvider with     │
 * │                           pooling, circuit breaker          │
 * │                                                             │
 * │ BASE:                                                       │
 * │   base-provider.ts      - Abstract base classes             │
 * └─────────────────────────────────────────────────────────────┘
 *
 * USE GUIDE:
 * - For core Agent.ts and simple usage → Basic providers (GeminiProvider, etc.)
 * - For SwarmOrchestrator/production → Enhanced providers (EnhancedGeminiProvider, etc.)
 */

// Base provider abstract classes
export * from './base-provider.js';

// ── BASIC Providers (LLMProvider interface) ──
// Used by core/Agent.ts, RefinementService, and simple integrations

/** @see GeminiProvider - Basic Gemini provider implementing LLMProvider */
export {
  createGeminiProviders,
  GEMINI_MODELS,
  type GeminiModelAlias,
  GeminiProvider,
} from './GeminiProvider.js';

/** @see LlamaCppProvider - Basic LlamaCpp provider implementing LLMProvider */
export {
  createLlamaCppProvider,
  LLAMA_CPP_MODELS,
  type LlamaCppConfig,
  LlamaCppProvider,
  type LlamaCppServerInfo,
} from './LlamaCppProvider.js';

/** @see McpLlamaProvider - MCP-based Llama provider (primary for local AI) */
export * from './McpLlamaProvider.js';

/** @see SerenaProvider - Code intelligence decorator (wraps any LLMProvider) */
export {
  createSerenaProvider,
  SerenaProvider,
  type SerenaProviderConfig,
} from './SerenaProvider.js';

// ── ENHANCED Providers (EnhancedProvider base) ──
// Production-grade with connection pooling, circuit breaker, rate limiting
// Used by SwarmOrchestrator and production pipelines

/** @see EnhancedGeminiProvider - Production Gemini with pooling & circuit breaker */
export {
  createEnhancedGeminiProvider,
  EnhancedGeminiProvider,
  type GeminiConfig,
  type GeminiTier,
} from './gemini-provider.js';

/** @see EnhancedLlamaCppProvider - Production LlamaCpp with pooling & circuit breaker */
export {
  createEnhancedLlamaCppProvider,
  EnhancedLlamaCppProvider,
} from './llamacpp-provider.js';

// ── Registry ──
export * from './registry.js';
