/**
 * GeminiHydra - AI Models Configuration
 * Configuration for Gemini and llama.cpp models
 */

// ============================================================================
// GEMINI MODELS
// ============================================================================

export const GEMINI_MODELS = {
  /** Gemini 3 Pro Preview - High quality, slower */
  PRO: 'gemini-3-pro-preview',
  /** Gemini 3 Flash Preview - Fast, good quality */
  FLASH: 'gemini-3-flash-preview',
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

// ============================================================================
// LLAMA MODELS (Local - GGUF format for llama.cpp)
// ============================================================================

export const LLAMA_MODELS = {
  /** Llama 3.2 3B - Good balance of speed and quality */
  LLAMA_3B: 'Llama-3.2-3B-Instruct-Q4_K_M.gguf',
  /** Qwen 2.5 Coder 1.5B - Fast coding model */
  QWEN_CODER: 'qwen2.5-coder-1.5b-instruct-q4_k_m.gguf',
  /** Qwen 2.5 Coder 7B - Better quality coding */
  QWEN_CODER_7B: 'qwen2.5-coder-7b-instruct-q4_k_m.gguf',
  /** DeepSeek Coder V2 Lite - Lightweight coding */
  DEEPSEEK_LITE: 'deepseek-coder-v2-lite-q4_k_m.gguf',
  /** Phi-3 Mini - Small but capable */
  PHI3_MINI: 'Phi-3-mini-4k-instruct-q4.gguf',
} as const;

export type LlamaModel = (typeof LLAMA_MODELS)[keyof typeof LLAMA_MODELS];

// Backwards compatibility aliases (Ollama -> Llama)
export const OLLAMA_MODELS = LLAMA_MODELS;
export type OllamaModel = LlamaModel;

// HuggingFace repo mappings for downloading
export const LLAMA_REPOS: Record<string, string> = {
  [LLAMA_MODELS.LLAMA_3B]: 'bartowski/Llama-3.2-3B-Instruct-GGUF',
  [LLAMA_MODELS.QWEN_CODER]: 'Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF',
  [LLAMA_MODELS.QWEN_CODER_7B]: 'Qwen/Qwen2.5-Coder-7B-Instruct-GGUF',
  [LLAMA_MODELS.DEEPSEEK_LITE]: 'TheBloke/deepseek-coder-6.7B-instruct-GGUF',
  [LLAMA_MODELS.PHI3_MINI]: 'microsoft/Phi-3-mini-4k-instruct-gguf',
};

// ============================================================================
// MODEL SELECTION
// ============================================================================

/** Default model for general tasks */
export const DEFAULT_MODEL = GEMINI_MODELS.FLASH;

/** Fast model for quick operations (cost-effective) */
export const FAST_MODEL = GEMINI_MODELS.FLASH;

/** Quality model for complex reasoning */
export const QUALITY_MODEL = GEMINI_MODELS.PRO;

/** Local model for offline/free operations */
export const LOCAL_MODEL = LLAMA_MODELS.LLAMA_3B;

/** Coding-focused local model */
export const CODING_MODEL = LLAMA_MODELS.QWEN_CODER;

// ============================================================================
// MODEL PRICING (per 1M tokens, USD)
// ============================================================================

export interface ModelPricing {
  input: number;
  output: number;
  cachedInput?: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Gemini 3 Preview models
  [GEMINI_MODELS.PRO]: {
    input: 1.25,
    output: 5.0,
    cachedInput: 0.3125,
  },
  [GEMINI_MODELS.FLASH]: {
    input: 0.075,
    output: 0.30,
    cachedInput: 0.01875,
  },
  // Llama.cpp models (free, local)
  [LLAMA_MODELS.LLAMA_3B]: {
    input: 0,
    output: 0,
  },
  [LLAMA_MODELS.QWEN_CODER]: {
    input: 0,
    output: 0,
  },
  [LLAMA_MODELS.QWEN_CODER_7B]: {
    input: 0,
    output: 0,
  },
  [LLAMA_MODELS.DEEPSEEK_LITE]: {
    input: 0,
    output: 0,
  },
  [LLAMA_MODELS.PHI3_MINI]: {
    input: 0,
    output: 0,
  },
};

// ============================================================================
// MODEL CAPABILITIES
// ============================================================================

export interface ModelCapabilities {
  maxTokens: number;
  contextWindow: number;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  quantization?: string;
  gpuLayers?: number;
}

export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  [GEMINI_MODELS.PRO]: {
    maxTokens: 8192,
    contextWindow: 1000000,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
  },
  [GEMINI_MODELS.FLASH]: {
    maxTokens: 8192,
    contextWindow: 1000000,
    supportsVision: true,
    supportsTools: true,
    supportsStreaming: true,
  },
  [LLAMA_MODELS.LLAMA_3B]: {
    maxTokens: 4096,
    contextWindow: 128000,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: true,
    quantization: 'Q4_K_M',
    gpuLayers: 99,
  },
  [LLAMA_MODELS.QWEN_CODER]: {
    maxTokens: 4096,
    contextWindow: 32768,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: true,
    quantization: 'Q4_K_M',
    gpuLayers: 99,
  },
  [LLAMA_MODELS.QWEN_CODER_7B]: {
    maxTokens: 4096,
    contextWindow: 32768,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: true,
    quantization: 'Q4_K_M',
    gpuLayers: 35, // Reduced for 8GB VRAM
  },
  [LLAMA_MODELS.DEEPSEEK_LITE]: {
    maxTokens: 4096,
    contextWindow: 16384,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: true,
    quantization: 'Q4_K_M',
    gpuLayers: 99,
  },
  [LLAMA_MODELS.PHI3_MINI]: {
    maxTokens: 4096,
    contextWindow: 4096,
    supportsVision: false,
    supportsTools: false,
    supportsStreaming: true,
    quantization: 'Q4_0',
    gpuLayers: 99,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate cost for a given number of tokens
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  cachedInputTokens: number = 0
): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;

  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  const cachedCost = pricing.cachedInput
    ? (cachedInputTokens / 1_000_000) * pricing.cachedInput
    : 0;

  return inputCost + outputCost + cachedCost;
}

/**
 * Get model capabilities
 */
export function getModelCapabilities(model: string): ModelCapabilities | null {
  return MODEL_CAPABILITIES[model] || null;
}

/**
 * Check if model is a local llama.cpp model
 */
export function isLocalModel(model: string): boolean {
  return Object.values(LLAMA_MODELS).includes(model as LlamaModel);
}

/**
 * Check if model is a llama.cpp model
 */
export function isLlamaModel(model: string): boolean {
  return Object.values(LLAMA_MODELS).includes(model as LlamaModel);
}

/**
 * Check if model is a Gemini model
 */
export function isGeminiModel(model: string): boolean {
  return Object.values(GEMINI_MODELS).includes(model as GeminiModel);
}

/**
 * Get HuggingFace repo for a llama model
 */
export function getLlamaRepo(model: string): string | null {
  return LLAMA_REPOS[model] || null;
}
