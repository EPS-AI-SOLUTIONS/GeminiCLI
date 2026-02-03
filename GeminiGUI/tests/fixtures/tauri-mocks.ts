/**
 * Tauri API Mocks for Playwright E2E Tests
 *
 * These mocks simulate Tauri's invoke and event systems
 * to allow testing the React frontend without the Rust backend.
 */

import type { Page } from '@playwright/test';

// Types for mock system
interface MockInvokeHandlers {
  [command: string]: (args?: Record<string, unknown>) => unknown;
}

interface StreamPayload {
  chunk: string;
  done: boolean;
  error?: string;
}

interface MemoryEntry {
  id: string;
  agent: string;
  content: string;
  timestamp: number;
  importance: number;
}

interface KnowledgeGraph {
  nodes: Array<{ id: string; type: string; label: string }>;
  edges: Array<{ source: string; target: string; label: string }>;
}

// Default mock responses
export const DEFAULT_MOCK_RESPONSES = {
  greet: 'Test Mode Active - GeminiGUI',
  run_system_command: (args?: Record<string, unknown>) =>
    `Mock output for: ${args?.command || 'unknown'}`,
  spawn_swarm_agent_v2: null,
  get_ollama_models: ['llama3.2:3b', 'qwen2.5-coder:1.5b', 'phi3:mini'],
  get_gemini_models: ['gemini-3-flash-preview', 'gemini-3-pro-preview'],
  get_gemini_models_sorted: ['gemini-3-flash-preview', 'gemini-3-pro-preview'],
  get_bridge_state: { requests: [], auto_approve: false },
  set_auto_approve: true,
  approve_request: true,
  reject_request: true,
  get_agent_memories: [] as MemoryEntry[],
  add_agent_memory: true,
  clear_agent_memories: true,
  get_knowledge_graph: { nodes: [], edges: [] } as KnowledgeGraph,
  add_knowledge_node: true,
  add_knowledge_edge: true,
  save_file_content: true,
  get_env_vars: {},
  start_ollama_server: true,
  prompt_ollama: 'Mock Ollama response',
  prompt_ollama_stream: null, // Handled via events
  prompt_gemini_stream: null, // Handled via events
};

/**
 * Creates the Tauri mock injection script for page.addInitScript()
 */
export function createTauriMockScript(customHandlers: Partial<MockInvokeHandlers> = {}): string {
  const handlersJson = JSON.stringify({
    ...DEFAULT_MOCK_RESPONSES,
    ...customHandlers,
  });

  return `
    (function() {
      // Create mock store accessible from tests
      window.__TAURI_MOCK__ = {
        eventListeners: new Map(),
        invokeResults: ${handlersJson},
        invokeHistory: [],
      };

      // Mock @tauri-apps/api/core invoke
      window.__TAURI_INTERNALS__ = {
        invoke: async function(cmd, args) {
          // Record invocation for debugging
          window.__TAURI_MOCK__.invokeHistory.push({ cmd, args, timestamp: Date.now() });

          const mock = window.__TAURI_MOCK__;
          const handler = mock.invokeResults[cmd];

          if (handler !== undefined) {
            if (typeof handler === 'function') {
              return handler(args);
            }
            return handler;
          }

          console.warn('[Tauri Mock] Unmocked command:', cmd, args);
          return null;
        }
      };

      // Mock window.__TAURI__ for event system
      window.__TAURI__ = {
        event: {
          listen: function(eventName, handler) {
            const mock = window.__TAURI_MOCK__;
            if (!mock.eventListeners.has(eventName)) {
              mock.eventListeners.set(eventName, new Set());
            }
            mock.eventListeners.get(eventName).add(handler);

            // Return unlisten function
            return Promise.resolve(function() {
              mock.eventListeners.get(eventName)?.delete(handler);
            });
          },
          emit: function(eventName, payload) {
            const mock = window.__TAURI_MOCK__;
            const listeners = mock.eventListeners.get(eventName);
            if (listeners) {
              listeners.forEach(function(handler) {
                handler({ payload: payload });
              });
            }
            return Promise.resolve();
          }
        },
        core: {
          invoke: window.__TAURI_INTERNALS__.invoke
        }
      };

      // Helper for tests to emit events
      window.__emitTauriEvent = function(eventName, payload) {
        const mock = window.__TAURI_MOCK__;
        const listeners = mock.eventListeners.get(eventName);
        if (listeners) {
          listeners.forEach(function(handler) {
            handler({ payload: payload });
          });
        }
      };

      // Helper to set mock invoke result
      window.__setMockInvokeResult = function(cmd, result) {
        window.__TAURI_MOCK__.invokeResults[cmd] = result;
      };

      // Helper to get invoke history
      window.__getInvokeHistory = function() {
        return window.__TAURI_MOCK__.invokeHistory;
      };

      // Helper to clear invoke history
      window.__clearInvokeHistory = function() {
        window.__TAURI_MOCK__.invokeHistory = [];
      };

      console.log('[Tauri Mock] Initialized successfully');
    })();
  `;
}

/**
 * Inject Tauri mocks into a Playwright page
 */
export async function injectTauriMocks(
  page: Page,
  customHandlers: Partial<MockInvokeHandlers> = {}
): Promise<void> {
  await page.addInitScript(createTauriMockScript(customHandlers));
}

/**
 * Emit a Tauri event from test code
 */
export async function emitTauriEvent(
  page: Page,
  eventName: string,
  payload: unknown
): Promise<void> {
  await page.evaluate(
    ([name, data]) => {
      (window as any).__emitTauriEvent(name, data);
    },
    [eventName, payload]
  );
}

/**
 * Set a mock invoke result from test code
 */
export async function setMockInvokeResult(
  page: Page,
  command: string,
  result: unknown
): Promise<void> {
  await page.evaluate(
    ([cmd, res]) => {
      (window as any).__setMockInvokeResult(cmd, res);
    },
    [command, result]
  );
}

/**
 * Get invoke history for assertions
 */
export async function getInvokeHistory(
  page: Page
): Promise<Array<{ cmd: string; args: unknown; timestamp: number }>> {
  return page.evaluate(() => (window as any).__getInvokeHistory());
}

/**
 * Clear invoke history
 */
export async function clearInvokeHistory(page: Page): Promise<void> {
  await page.evaluate(() => (window as any).__clearInvokeHistory());
}

/**
 * Emit a stream chunk event (for streaming responses)
 */
export async function emitStreamChunk(
  page: Page,
  chunk: string,
  done: boolean = false,
  eventType: 'ollama-event' | 'swarm-data' | 'gemini-stream' = 'swarm-data'
): Promise<void> {
  const payload: StreamPayload = { chunk, done };
  await emitTauriEvent(page, eventType, payload);
}

/**
 * Emit a stream error event
 */
export async function emitStreamError(
  page: Page,
  error: string,
  eventType: 'ollama-event' | 'swarm-data' | 'gemini-stream' = 'swarm-data'
): Promise<void> {
  const payload: StreamPayload = { chunk: '', done: true, error };
  await emitTauriEvent(page, eventType, payload);
}

/**
 * Mock memories for the memory panel
 */
export function createMockMemories(count: number = 5): MemoryEntry[] {
  const agents = ['Dijkstra', 'Geralt', 'Yennefer', 'Triss', 'Jaskier'];
  return Array.from({ length: count }, (_, i) => ({
    id: `memory-${i}`,
    agent: agents[i % agents.length],
    content: `Test memory content #${i + 1}`,
    timestamp: Date.now() / 1000 - i * 3600,
    importance: Math.random(),
  }));
}

/**
 * Mock knowledge graph
 */
export function createMockKnowledgeGraph(): KnowledgeGraph {
  return {
    nodes: [
      { id: 'node-1', type: 'concept', label: 'Test Concept' },
      { id: 'node-2', type: 'entity', label: 'Test Entity' },
      { id: 'node-3', type: 'action', label: 'Test Action' },
    ],
    edges: [
      { source: 'node-1', target: 'node-2', label: 'relates_to' },
      { source: 'node-2', target: 'node-3', label: 'triggers' },
    ],
  };
}
