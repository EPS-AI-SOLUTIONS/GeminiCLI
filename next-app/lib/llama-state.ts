/**
 * Llama State Module
 * Shared state for node-llama-cpp across all llama route handlers
 * Replaces module-level variables from src/api/routes/llama.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface ModelInfo {
  name: string;
  path: string;
  size_mb: number;
  modified: string;
}

export interface RecommendedModel {
  name: string;
  repo_id: string;
  filename: string;
  size_gb: number;
  description: string;
  quantization: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// Recommended models list
// ═══════════════════════════════════════════════════════════════════════════

export const RECOMMENDED_MODELS: RecommendedModel[] = [
  {
    name: 'Phi-3 Mini 4K (Q4_K_M)',
    repo_id: 'bartowski/Phi-3-mini-4k-instruct-GGUF',
    filename: 'Phi-3-mini-4k-instruct-Q4_K_M.gguf',
    size_gb: 2.2,
    description: 'Microsoft Phi-3 Mini - fast, good for general tasks',
    quantization: 'Q4_K_M',
  },
  {
    name: 'Llama 3.1 8B (Q4_K_M)',
    repo_id: 'bartowski/Meta-Llama-3.1-8B-Instruct-GGUF',
    filename: 'Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf',
    size_gb: 4.9,
    description: 'Meta Llama 3.1 8B - balanced performance and quality',
    quantization: 'Q4_K_M',
  },
  {
    name: 'Mistral 7B v0.3 (Q4_K_M)',
    repo_id: 'bartowski/Mistral-7B-Instruct-v0.3-GGUF',
    filename: 'Mistral-7B-Instruct-v0.3-Q4_K_M.gguf',
    size_gb: 4.4,
    description: 'Mistral 7B - excellent coding and reasoning',
    quantization: 'Q4_K_M',
  },
  {
    name: 'Gemma 2 2B (Q4_K_M)',
    repo_id: 'bartowski/gemma-2-2b-it-GGUF',
    filename: 'gemma-2-2b-it-Q4_K_M.gguf',
    size_gb: 1.5,
    description: 'Google Gemma 2 2B - ultra-lightweight, fastest',
    quantization: 'Q4_K_M',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Shared State (singleton)
// ═══════════════════════════════════════════════════════════════════════════

class LlamaState {
  private _module: typeof import('node-llama-cpp') | null = null;
  // biome-ignore lint/suspicious/noExplicitAny: node-llama-cpp Llama has private constructor
  instance: any = null;
  // biome-ignore lint/suspicious/noExplicitAny: node-llama-cpp model type varies
  model: any = null;
  // biome-ignore lint/suspicious/noExplicitAny: node-llama-cpp context type varies
  context: any = null;
  currentModelPath: string | null = null;

  async getModule() {
    if (!this._module) {
      this._module = await import('node-llama-cpp');
    }
    return this._module;
  }

  async ensureInstance() {
    if (!this.instance) {
      const mod = await this.getModule();
      this.instance = await mod.getLlama();
    }
    return this.instance;
  }

  async disposeContext() {
    if (this.context) {
      await this.context.dispose();
      this.context = null;
    }
  }

  async disposeModel() {
    await this.disposeContext();
    if (this.model) {
      await this.model.dispose();
      this.model = null;
    }
    this.currentModelPath = null;
  }

  get isModelLoaded(): boolean {
    return this.model !== null;
  }
}

export const llamaState = new LlamaState();

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

export function getModelsDir(): string {
  return path.join(process.cwd(), 'data', 'models');
}

export function ensureModelsDir(): void {
  const dir = getModelsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}
