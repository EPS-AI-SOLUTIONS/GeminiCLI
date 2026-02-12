/**
 * ClaudeHydra - HTTP API Service Layer
 * @module services/api.service
 *
 * HTTP API service - all calls use fetch() to Next.js Route Handlers.
 * SSE streaming uses manual fetch + ReadableStream pattern.
 */

import { API_BASE_URL } from '../constants';
import type {
  AgentMemory,
  BridgeState,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface EnvVars {
  GEMINI_API_KEY?: string;
  GOOGLE_API_KEY?: string;
  [key: string]: string | undefined;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  system?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GGUFModelInfo {
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

export interface DownloadProgress {
  filename: string;
  downloaded: number;
  total: number;
  percentage: number;
  complete: boolean;
  error?: string;
}

export interface SystemStats {
  cpu_usage: number;
  memory_used_gb: number;
  memory_total_gb: number;
  memory_usage_percent: number;
}

// Re-export types from centralized types for convenience
export type { AgentMemory, KnowledgeEdge, KnowledgeGraph, KnowledgeNode } from '../types';

// ============================================================================
// HTTP HELPERS
// ============================================================================

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Connect to an SSE endpoint and call onChunk for each data event.
 * Returns an AbortController to cancel the stream.
 * Uses manual fetch + ReadableStream (NOT EventSource).
 */
function connectSSE(
  path: string,
  body: unknown,
  callbacks: {
    onChunk?: (data: string) => void;
    onResult?: (data: string) => void;
    onError?: (error: string) => void;
    onDone?: () => void;
  },
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.text();
        callbacks.onError?.(`HTTP ${res.status}: ${err}`);
        callbacks.onDone?.();
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr || jsonStr === '[DONE]') continue;

          try {
            const evt = JSON.parse(jsonStr) as {
              type?: string;
              content?: string;
              result?: string;
              error?: string;
            };

            if (evt.type === 'chunk' && evt.content) {
              callbacks.onChunk?.(evt.content);
            } else if (evt.type === 'result') {
              callbacks.onResult?.(evt.result || '');
            } else if (evt.type === 'error') {
              callbacks.onError?.(evt.error || 'Unknown error');
            }
          } catch {
            // Non-JSON SSE line, treat as raw chunk
            callbacks.onChunk?.(jsonStr);
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError?.((err as Error).message || 'Stream error');
      }
    } finally {
      callbacks.onDone?.();
    }
  })();

  return controller;
}

// ============================================================================
// BRIDGE SERVICE
// ============================================================================

export const BridgeService = {
  async getState(): Promise<BridgeState> {
    return apiGet<BridgeState>('/bridge');
  },

  async setAutoApprove(enabled: boolean): Promise<void> {
    await apiPatch('/bridge/auto-approve', { enabled });
  },

  async approveRequest(requestId: string): Promise<void> {
    await apiPost(`/bridge/approve/${requestId}`);
  },

  async rejectRequest(requestId: string): Promise<void> {
    await apiPost(`/bridge/reject/${requestId}`);
  },
};

// ============================================================================
// LLAMA SERVICE (llama.cpp via node-llama-cpp backend)
// ============================================================================

export const LlamaService = {
  async initialize(): Promise<string> {
    const res = await apiPost<{ message: string }>('/llama/initialize');
    return res.message;
  },

  async loadModel(modelPath: string, gpuLayers = 99): Promise<string> {
    const res = await apiPost<{ message: string }>('/llama/model/load', {
      modelPath,
      gpuLayers,
    });
    return res.message;
  },

  async unloadModel(): Promise<string> {
    const res = await apiPost<{ message: string }>('/llama/model/unload');
    return res.message;
  },

  async isModelLoaded(): Promise<boolean> {
    const res = await apiGet<{ loaded: boolean }>('/llama/model/status');
    return res.loaded;
  },

  async getCurrentModel(): Promise<string | null> {
    const res = await apiGet<{ currentModel: string | null }>('/llama/model/status');
    return res.currentModel;
  },

  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const res = await apiPost<{ output: string }>('/llama/generate', {
      prompt,
      system: options?.system,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
    return res.output;
  },

  generateStream(
    prompt: string,
    options?: GenerateOptions,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onDone?: () => void;
      onError?: (error: string) => void;
    },
  ): AbortController {
    return connectSSE(
      '/llama/generate/stream',
      {
        prompt,
        system: options?.system,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      },
      {
        onChunk: callbacks?.onChunk,
        onResult: () => callbacks?.onDone?.(),
        onError: callbacks?.onError,
        onDone: callbacks?.onDone,
      },
    );
  },

  async chat(messages: ChatMessage[], options?: Omit<GenerateOptions, 'system'>): Promise<string> {
    const res = await apiPost<{ output: string }>('/llama/chat', {
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
    return res.output;
  },

  chatStream(
    messages: ChatMessage[],
    options?: Omit<GenerateOptions, 'system'>,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onDone?: () => void;
      onError?: (error: string) => void;
    },
  ): AbortController {
    return connectSSE(
      '/llama/chat/stream',
      {
        messages,
        temperature: options?.temperature,
        maxTokens: options?.maxTokens,
      },
      {
        onChunk: callbacks?.onChunk,
        onResult: () => callbacks?.onDone?.(),
        onError: callbacks?.onError,
        onDone: callbacks?.onDone,
      },
    );
  },

  async getEmbeddings(text: string): Promise<number[]> {
    const res = await apiPost<{ embeddings: number[] }>('/llama/embeddings', { text });
    return res.embeddings;
  },

  async listModels(): Promise<GGUFModelInfo[]> {
    const res = await apiGet<{ models: GGUFModelInfo[] }>('/llama/models');
    return res.models;
  },

  async deleteModel(modelName: string): Promise<void> {
    await apiDelete(`/llama/models/${encodeURIComponent(modelName)}`);
  },

  async getRecommendedModels(): Promise<RecommendedModel[]> {
    const res = await apiGet<{ models: RecommendedModel[] }>('/llama/models/recommended');
    return res.models;
  },

  downloadModel(
    repoId: string,
    filename: string,
    callbacks?: {
      onProgress?: (progress: DownloadProgress) => void;
      onDone?: (path: string) => void;
      onError?: (error: string) => void;
    },
  ): AbortController {
    return connectSSE(
      '/llama/models/download',
      { repoId, filename },
      {
        onChunk: (data) => {
          try {
            const progress = JSON.parse(data) as DownloadProgress;
            callbacks?.onProgress?.(progress);
          } catch {
            // ignore
          }
        },
        onResult: (path) => callbacks?.onDone?.(path),
        onError: callbacks?.onError,
      },
    );
  },

  cancelDownload(): void {
    // Cancel is handled by aborting the SSE controller
    // The caller should keep and abort the controller returned by downloadModel()
  },
};

// ============================================================================
// GEMINI SERVICE
// ============================================================================

export const GeminiService = {
  async getModels(apiKey: string): Promise<string[]> {
    const res = await apiGet<{ models: string[] }>(
      `/gemini/models?apiKey=${encodeURIComponent(apiKey)}`,
    );
    return res.models;
  },

  promptStream(
    model: string,
    messages: ChatMessage[],
    apiKey: string,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxOutputTokens?: number;
    },
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onDone?: () => void;
      onError?: (error: string) => void;
    },
  ): AbortController {
    return connectSSE(
      '/gemini/stream',
      {
        model,
        messages,
        apiKey,
        systemPrompt: options?.systemPrompt,
        temperature: options?.temperature,
        maxOutputTokens: options?.maxOutputTokens,
      },
      {
        onChunk: callbacks?.onChunk,
        onResult: () => callbacks?.onDone?.(),
        onError: callbacks?.onError,
        onDone: callbacks?.onDone,
      },
    );
  },
};

// ============================================================================
// SYSTEM SERVICE
// ============================================================================

export const SystemService = {
  async getSystemStats(): Promise<SystemStats> {
    return apiGet<SystemStats>('/system/stats');
  },

  async runCommand(command: string): Promise<string> {
    const res = await apiPost<{ output?: string; error?: string }>('/system/exec', { command });
    if (res.error) throw new Error(res.error);
    return res.output || '';
  },

  spawnSwarmAgent(
    objective: string,
    callbacks?: {
      onChunk?: (chunk: string) => void;
      onDone?: () => void;
      onError?: (error: string) => void;
    },
  ): AbortController {
    return connectSSE(
      '/swarm/spawn',
      { objective },
      {
        onChunk: callbacks?.onChunk,
        onResult: () => callbacks?.onDone?.(),
        onError: callbacks?.onError,
        onDone: callbacks?.onDone,
      },
    );
  },

  async saveFileContent(filePath: string, content: string): Promise<void> {
    await apiPost('/system/files', { path: filePath, content });
  },

  async getEnvVars(): Promise<EnvVars> {
    return apiGet<EnvVars>('/env');
  },
};

// ============================================================================
// MEMORY SERVICE
// ============================================================================

export const MemoryService = {
  async getAgentMemories(agentName: string, topK = 10): Promise<AgentMemory[]> {
    const res = await apiGet<{ memories: AgentMemory[] }>(
      `/memory/memories?agent=${encodeURIComponent(agentName)}&topK=${topK}`,
    );
    return res.memories;
  },

  async addAgentMemory(agent: string, content: string, importance = 0.5): Promise<void> {
    await apiPost('/memory/memories', { agent, content, importance });
  },

  async clearAgentMemories(agentName: string): Promise<void> {
    await apiDelete(`/memory/memories?agent=${encodeURIComponent(agentName)}`);
  },

  async getKnowledgeGraph(): Promise<KnowledgeGraph> {
    return apiGet<KnowledgeGraph>('/memory/graph');
  },

  async addKnowledgeNode(node: KnowledgeNode): Promise<void> {
    await apiPost('/memory/graph/nodes', node);
  },

  async addKnowledgeEdge(edge: KnowledgeEdge): Promise<void> {
    await apiPost('/memory/graph/edges', edge);
  },
};

// ============================================================================
// UNIFIED API SERVICE
// ============================================================================

export const ApiService = {
  bridge: BridgeService,
  llama: LlamaService,
  gemini: GeminiService,
  system: SystemService,
  memory: MemoryService,
};

export default ApiService;
