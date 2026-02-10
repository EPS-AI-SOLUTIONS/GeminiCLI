/**
 * GeminiGUI - Mock Service for Web Environment
 * Provides fallback data when Tauri backend is unavailable
 */

import type { AgentMemory, KnowledgeGraphData } from '../types';

/**
 * Mock agent memories for demonstration
 */
const MOCK_MEMORIES: AgentMemory[] = [
  {
    id: 'mem-1',
    agent: 'Geralt',
    content: 'Zweryfikowano bezpieczeństwo operacji - brak zagrożeń wykrytych.',
    timestamp: Date.now() - 3600000,
    tags: ['security', 'veto'],
    importance: 0.9,
  },
  {
    id: 'mem-2',
    agent: 'Dijkstra',
    content: 'Plan wykonania zatwierdzony. Strategia optymalna dla zadania.',
    timestamp: Date.now() - 7200000,
    tags: ['planning', 'strategy'],
    importance: 0.85,
  },
  {
    id: 'mem-3',
    agent: 'Yennefer',
    content: 'Architektura rozwiązania zoptymalizowana pod kątem wydajności.',
    timestamp: Date.now() - 10800000,
    tags: ['architecture', 'optimization'],
    importance: 0.8,
  },
  {
    id: 'mem-4',
    agent: 'Triss',
    content: 'Testy jednostkowe przeszły pomyślnie. Pokrycie: 87%.',
    timestamp: Date.now() - 14400000,
    tags: ['testing', 'qa'],
    importance: 0.75,
  },
  {
    id: 'mem-5',
    agent: 'Jaskier',
    content: 'Dokumentacja zaktualizowana. Oto opowieść o wielkim zwycięstwie!',
    timestamp: Date.now() - 18000000,
    tags: ['documentation', 'summary'],
    importance: 0.7,
  },
];

/**
 * Mock knowledge graph for demonstration
 */
const MOCK_KNOWLEDGE_GRAPH: KnowledgeGraphData = {
  nodes: [
    {
      id: 'n1',
      type: 'concept',
      label: 'Wolf Swarm',
      data: { description: 'System multi-agentowy' },
    },
    { id: 'n2', type: 'agent', label: 'Geralt', data: { role: 'Security/VETO' } },
    { id: 'n3', type: 'agent', label: 'Dijkstra', data: { role: 'Strategist' } },
    { id: 'n4', type: 'task', label: 'Ostatnie zadanie', data: { status: 'completed' } },
  ],
  edges: [
    { source: 'n1', target: 'n2', relation: 'contains' },
    { source: 'n1', target: 'n3', relation: 'contains' },
    { source: 'n3', target: 'n4', relation: 'planned' },
    { source: 'n2', target: 'n4', relation: 'verified' },
  ],
};

/**
 * Mock Service - provides fallback data for web environment
 */
export const MockService = {
  /**
   * Get mock agent memories
   */
  getAgentMemories: (agent?: string): Promise<AgentMemory[]> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (agent) {
          resolve(MOCK_MEMORIES.filter((m) => m.agent === agent));
        } else {
          resolve(MOCK_MEMORIES);
        }
      }, 300); // Simulate network delay
    });
  },

  /**
   * Get mock knowledge graph
   */
  getKnowledgeGraph: (): Promise<KnowledgeGraphData> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_KNOWLEDGE_GRAPH);
      }, 200);
    });
  },

  /**
   * Add mock memory (no-op in web mode, but returns success)
   */
  addAgentMemory: (memory: Omit<AgentMemory, 'id'>): Promise<AgentMemory> => {
    return new Promise((resolve) => {
      const newMemory: AgentMemory = {
        ...memory,
        id: `mem-${Date.now()}`,
      };
      MOCK_MEMORIES.unshift(newMemory);
      resolve(newMemory);
    });
  },

  /**
   * Clear agent memories (for specific agent or all)
   */
  clearAgentMemories: (agent?: string): Promise<void> => {
    return new Promise((resolve) => {
      if (agent) {
        const index = MOCK_MEMORIES.findIndex((m) => m.agent === agent);
        if (index > -1) MOCK_MEMORIES.splice(index, 1);
      }
      resolve();
    });
  },

  /**
   * Check if running in web (non-Tauri) mode
   */
  isWebMode: (): boolean => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return !(window as any).__TAURI__;
    } catch {
      return true;
    }
  },
};

export default MockService;
