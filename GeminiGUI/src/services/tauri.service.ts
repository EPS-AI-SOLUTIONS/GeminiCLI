/**
 * GeminiGUI - Tauri Service Layer
 * @module services/tauri.service
 *
 * Centralized service for all Tauri invoke calls.
 * Provides type-safe wrappers with error handling.
 */

import { invoke } from '@tauri-apps/api/core';
import { TAURI_COMMANDS } from '../constants';
import type { BridgeState, AgentMemory, KnowledgeNode, KnowledgeEdge, KnowledgeGraph } from '../types';

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
  size_bytes: number;
  size_human: string;
  quantization: string;
  parameters: string;
  context_length: number;
  architecture: string;
  gguf_version: number;
  tensor_count: number;
  metadata_count: number;
}

export interface RecommendedModel {
  name: string;
  repo_id: string;
  filename: string;
  size_gb: number;
  description: string;
  min_vram_gb: number;
  category: string;
}

export interface DownloadProgress {
  filename: string;
  downloaded: number;
  total: number;
  speed_bps: number;
  percentage: number;
  complete: boolean;
  error?: string;
}

// Re-export types from centralized types for convenience
export type { AgentMemory, KnowledgeNode, KnowledgeEdge, KnowledgeGraph } from '../types';

// ============================================================================
// BRIDGE SERVICE
// ============================================================================

export const BridgeService = {
  async getState(): Promise<BridgeState> {
    return invoke<BridgeState>(TAURI_COMMANDS.GET_BRIDGE_STATE);
  },

  async setAutoApprove(enabled: boolean): Promise<void> {
    return invoke(TAURI_COMMANDS.SET_AUTO_APPROVE, { enabled });
  },

  async approveRequest(requestId: string): Promise<void> {
    return invoke(TAURI_COMMANDS.APPROVE_REQUEST, { requestId });
  },

  async rejectRequest(requestId: string): Promise<void> {
    return invoke(TAURI_COMMANDS.REJECT_REQUEST, { requestId });
  },
};

// ============================================================================
// LLAMA SERVICE (llama.cpp integration)
// ============================================================================

export const LlamaService = {
  /**
   * Initialize llama.cpp backend
   */
  async initialize(): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.LLAMA_INITIALIZE);
  },

  /**
   * Load a model into GPU memory
   */
  async loadModel(modelPath: string, gpuLayers: number = 99): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.LLAMA_LOAD_MODEL, {
      modelPath,
      gpuLayers,
    });
  },

  /**
   * Unload the current model from memory
   */
  async unloadModel(): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.LLAMA_UNLOAD_MODEL);
  },

  /**
   * Check if a model is currently loaded
   */
  async isModelLoaded(): Promise<boolean> {
    return invoke<boolean>(TAURI_COMMANDS.LLAMA_IS_MODEL_LOADED);
  },

  /**
   * Get the path of the currently loaded model
   */
  async getCurrentModel(): Promise<string | null> {
    return invoke<string | null>(TAURI_COMMANDS.LLAMA_GET_CURRENT_MODEL);
  },

  /**
   * Generate text from a prompt (non-streaming)
   */
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.LLAMA_GENERATE, {
      prompt,
      system: options?.system,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  },

  /**
   * Generate text with streaming
   */
  async generateStream(prompt: string, options?: GenerateOptions): Promise<void> {
    return invoke(TAURI_COMMANDS.LLAMA_GENERATE_STREAM, {
      prompt,
      system: options?.system,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  },

  /**
   * Chat with the model (non-streaming)
   */
  async chat(messages: ChatMessage[], options?: Omit<GenerateOptions, 'system'>): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.LLAMA_CHAT, {
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  },

  /**
   * Chat with streaming
   */
  async chatStream(messages: ChatMessage[], options?: Omit<GenerateOptions, 'system'>): Promise<void> {
    return invoke(TAURI_COMMANDS.LLAMA_CHAT_STREAM, {
      messages,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    });
  },

  /**
   * Get embeddings for text
   */
  async getEmbeddings(text: string): Promise<number[]> {
    return invoke<number[]>(TAURI_COMMANDS.LLAMA_GET_EMBEDDINGS, { text });
  },

  /**
   * List available GGUF models
   */
  async listModels(): Promise<GGUFModelInfo[]> {
    return invoke<GGUFModelInfo[]>(TAURI_COMMANDS.LLAMA_LIST_MODELS);
  },

  /**
   * Get information about a specific model
   */
  async getModelInfo(modelPath: string): Promise<GGUFModelInfo> {
    return invoke<GGUFModelInfo>(TAURI_COMMANDS.LLAMA_GET_MODEL_INFO, { modelPath });
  },

  /**
   * Delete a model file
   */
  async deleteModel(modelPath: string): Promise<void> {
    return invoke(TAURI_COMMANDS.LLAMA_DELETE_MODEL, { modelPath });
  },

  /**
   * Get recommended models for download
   */
  async getRecommendedModels(): Promise<RecommendedModel[]> {
    return invoke<RecommendedModel[]>(TAURI_COMMANDS.LLAMA_GET_RECOMMENDED_MODELS);
  },

  /**
   * Download a model from HuggingFace
   */
  async downloadModel(repoId: string, filename: string): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.LLAMA_DOWNLOAD_MODEL, {
      repoId,
      filename,
    });
  },

  /**
   * Cancel ongoing download
   */
  async cancelDownload(): Promise<void> {
    return invoke(TAURI_COMMANDS.LLAMA_CANCEL_DOWNLOAD);
  },
};

// ============================================================================
// GEMINI SERVICE
// ============================================================================

export const GeminiService = {
  /**
   * Get available Gemini models
   */
  async getModels(apiKey: string): Promise<string[]> {
    return invoke<string[]>(TAURI_COMMANDS.GET_GEMINI_MODELS, { apiKey });
  },

  /**
   * Start Gemini streaming prompt
   */
  async promptStream(
    model: string,
    messages: ChatMessage[],
    apiKey: string
  ): Promise<void> {
    return invoke(TAURI_COMMANDS.PROMPT_GEMINI_STREAM, {
      model,
      messages,
      apiKey,
    });
  },
};

// ============================================================================
// SYSTEM SERVICE
// ============================================================================

export const SystemService = {
  /**
   * Run a system command
   */
  async runCommand(command: string): Promise<string> {
    return invoke<string>(TAURI_COMMANDS.RUN_SYSTEM_COMMAND, { command });
  },

  /**
   * Spawn a swarm agent
   */
  async spawnSwarmAgent(objective: string): Promise<void> {
    return invoke(TAURI_COMMANDS.SPAWN_SWARM_AGENT, { objective });
  },

  /**
   * Save file content
   */
  async saveFileContent(path: string, content: string): Promise<void> {
    return invoke(TAURI_COMMANDS.SAVE_FILE_CONTENT, { path, content });
  },

  /**
   * Get environment variables
   */
  async getEnvVars(): Promise<EnvVars> {
    return invoke<EnvVars>(TAURI_COMMANDS.GET_ENV_VARS);
  },
};

// ============================================================================
// MEMORY SERVICE
// ============================================================================

export const MemoryService = {
  /**
   * Get agent memories
   */
  async getAgentMemories(agentName: string): Promise<AgentMemory[]> {
    return invoke<AgentMemory[]>(TAURI_COMMANDS.GET_AGENT_MEMORIES, {
      agentName,
    });
  },

  /**
   * Add agent memory
   */
  async addAgentMemory(
    agentName: string,
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    return invoke(TAURI_COMMANDS.ADD_AGENT_MEMORY, {
      agentName,
      content,
      metadata,
    });
  },

  /**
   * Clear agent memories
   */
  async clearAgentMemories(agentName: string): Promise<void> {
    return invoke(TAURI_COMMANDS.CLEAR_AGENT_MEMORIES, { agentName });
  },

  /**
   * Get knowledge graph
   */
  async getKnowledgeGraph(): Promise<KnowledgeGraph> {
    return invoke<KnowledgeGraph>(TAURI_COMMANDS.GET_KNOWLEDGE_GRAPH);
  },

  /**
   * Add knowledge node
   */
  async addKnowledgeNode(node: KnowledgeNode): Promise<void> {
    return invoke(TAURI_COMMANDS.ADD_KNOWLEDGE_NODE, { node });
  },

  /**
   * Add knowledge edge
   */
  async addKnowledgeEdge(edge: KnowledgeEdge): Promise<void> {
    return invoke(TAURI_COMMANDS.ADD_KNOWLEDGE_EDGE, { edge });
  },
};

// ============================================================================
// UNIFIED TAURI SERVICE
// ============================================================================

export const TauriService = {
  bridge: BridgeService,
  llama: LlamaService,
  gemini: GeminiService,
  system: SystemService,
  memory: MemoryService,
};

export default TauriService;
