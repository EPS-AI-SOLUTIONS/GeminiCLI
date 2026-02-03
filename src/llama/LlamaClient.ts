/**
 * LlamaClient - TypeScript client for llama.cpp CLI operations
 * @module llama/LlamaClient
 *
 * This client provides llama.cpp integration for CLI mode.
 * It can either:
 * 1. Use HTTP to connect to a running llama-server
 * 2. Spawn llama-cli directly for one-shot operations
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface LlamaClientConfig {
  modelsDir: string;
  binDir: string;
  serverUrl?: string;
  gpuLayers?: number;
  contextSize?: number;
  threads?: number;
  flashAttention?: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  stopSequences?: string[];
}

export interface ModelInfo {
  name: string;
  path: string;
  sizeBytes: number;
  sizeHuman: string;
  quantization: string;
  parameters: string;
}

/**
 * LlamaClient provides llama.cpp integration for CLI operations
 */
export class LlamaClient extends EventEmitter {
  private config: LlamaClientConfig;
  private currentProcess: ChildProcess | null = null;
  private currentModelPath: string | null = null;

  constructor(config: Partial<LlamaClientConfig> = {}) {
    super();
    this.config = {
      modelsDir: config.modelsDir || './data/models',
      binDir: config.binDir || './bin',
      serverUrl: config.serverUrl || 'http://localhost:8080',
      gpuLayers: config.gpuLayers ?? 99,
      contextSize: config.contextSize ?? 8192,
      threads: config.threads ?? 8,
      flashAttention: config.flashAttention ?? true,
    };
  }

  /**
   * List available GGUF models in the models directory
   */
  async listModels(): Promise<ModelInfo[]> {
    const modelsDir = this.config.modelsDir;

    if (!fs.existsSync(modelsDir)) {
      fs.mkdirSync(modelsDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(modelsDir);
    const models: ModelInfo[] = [];

    for (const file of files) {
      if (file.toLowerCase().endsWith('.gguf')) {
        const filePath = path.join(modelsDir, file);
        const stats = fs.statSync(filePath);

        models.push({
          name: file,
          path: filePath,
          sizeBytes: stats.size,
          sizeHuman: this.formatBytes(stats.size),
          quantization: this.extractQuantization(file),
          parameters: this.extractParameters(file),
        });
      }
    }

    return models;
  }

  /**
   * Generate text using llama-server HTTP API
   */
  async generate(
    prompt: string,
    systemPrompt?: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    return this.chat(messages, options);
  }

  /**
   * Generate text with streaming using llama-server HTTP API
   */
  async *generateStream(
    prompt: string,
    systemPrompt?: string,
    options: GenerateOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const messages: ChatMessage[] = [];

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    yield* this.chatStream(messages, options);
  }

  /**
   * Chat using llama-server HTTP API (OpenAI-compatible)
   */
  async chat(
    messages: ChatMessage[],
    options: GenerateOptions = {}
  ): Promise<string> {
    const url = `${this.config.serverUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'loaded',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.9,
        stream: false,
        stop: options.stopSequences,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Chat with streaming using llama-server HTTP API
   */
  async *chatStream(
    messages: ChatMessage[],
    options: GenerateOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const url = `${this.config.serverUrl}/v1/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'loaded',
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        top_p: options.topP ?? 0.9,
        stream: true,
        stop: options.stopSequences,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const json = JSON.parse(data);
              const content = json.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Get embeddings using llama-server
   */
  async getEmbeddings(text: string): Promise<number[]> {
    const url = `${this.config.serverUrl}/embedding`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    return data.embedding || [];
  }

  /**
   * Check if llama-server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Start llama-server with the specified model
   */
  async startServer(modelPath: string): Promise<void> {
    if (this.currentProcess) {
      await this.stopServer();
    }

    const args = [
      '-m', modelPath,
      '--host', '127.0.0.1',
      '--port', '8080',
      '-ngl', String(this.config.gpuLayers),
      '-c', String(this.config.contextSize),
      '-t', String(this.config.threads),
      '-np', '4', // parallel slots
      ...(this.config.flashAttention ? ['-fa'] : []),
    ];

    return new Promise((resolve, reject) => {
      // Look for llama-server in bin directory first
      const binServerPath = path.join(this.config.binDir, process.platform === 'win32' ? 'llama-server.exe' : 'llama-server');
      const serverPath = fs.existsSync(binServerPath)
        ? binServerPath
        : (process.platform === 'win32' ? 'llama-server.exe' : 'llama-server');

      this.currentProcess = spawn(serverPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      this.currentModelPath = modelPath;

      let started = false;

      this.currentProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.emit('log', text);

        // Check for server ready message
        if (text.includes('listening') || text.includes('HTTP server')) {
          started = true;
          resolve();
        }
      });

      this.currentProcess.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        this.emit('error', text);
      });

      this.currentProcess.on('error', (error) => {
        this.emit('error', error.message);
        if (!started) {
          reject(error);
        }
      });

      this.currentProcess.on('exit', (code) => {
        this.currentProcess = null;
        this.currentModelPath = null;
        this.emit('exit', code);
        if (!started) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Timeout for server startup
      setTimeout(() => {
        if (!started) {
          reject(new Error('Server startup timeout'));
        }
      }, 60000);
    });
  }

  /**
   * Stop the running llama-server
   */
  async stopServer(): Promise<void> {
    if (this.currentProcess) {
      this.currentProcess.kill('SIGTERM');
      this.currentProcess = null;
      this.currentModelPath = null;
    }
  }

  /**
   * Get the currently loaded model path
   */
  getCurrentModel(): string | null {
    return this.currentModelPath;
  }

  // Helper methods

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  }

  private extractQuantization(filename: string): string {
    const lower = filename.toLowerCase();
    const patterns = ['q4_k_m', 'q4_k_s', 'q5_k_m', 'q5_k_s', 'q6_k', 'q8_0', 'q4_0', 'f16', 'f32'];
    for (const pattern of patterns) {
      if (lower.includes(pattern)) {
        return pattern.toUpperCase();
      }
    }
    return 'Unknown';
  }

  private extractParameters(filename: string): string {
    const lower = filename.toLowerCase();
    const patterns = [
      { pattern: '1.5b', label: '1.5B' },
      { pattern: '1b', label: '1B' },
      { pattern: '3b', label: '3B' },
      { pattern: '7b', label: '7B' },
      { pattern: '8b', label: '8B' },
      { pattern: '13b', label: '13B' },
      { pattern: '14b', label: '14B' },
      { pattern: '32b', label: '32B' },
      { pattern: '70b', label: '70B' },
    ];
    for (const { pattern, label } of patterns) {
      if (lower.includes(pattern)) {
        return label;
      }
    }
    return 'Unknown';
  }
}

export default LlamaClient;
