/**
 * MockService - Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MockService } from './mock.service';

describe('MockService', () => {
  beforeEach(() => {
    // Reset any mocked window state
    vi.restoreAllMocks();
  });

  describe('isWebMode', () => {
    it('should return true when __TAURI__ is not defined', () => {
      // Default state - no TAURI
      expect(MockService.isWebMode()).toBe(true);
    });

    it('should return false when __TAURI__ is defined', () => {
      // Mock TAURI environment
      (window as any).__TAURI__ = {};
      expect(MockService.isWebMode()).toBe(false);
      delete (window as any).__TAURI__;
    });
  });

  describe('getAgentMemories', () => {
    it('should return an array of memories', async () => {
      const memories = await MockService.getAgentMemories();
      expect(Array.isArray(memories)).toBe(true);
      expect(memories.length).toBeGreaterThan(0);
    });

    it('should filter memories by agent name', async () => {
      const memories = await MockService.getAgentMemories('Geralt');
      expect(memories.every((m) => m.agent === 'Geralt')).toBe(true);
    });

    it('should return all memories when no agent specified', async () => {
      const allMemories = await MockService.getAgentMemories();
      const geraltMemories = await MockService.getAgentMemories('Geralt');
      expect(allMemories.length).toBeGreaterThanOrEqual(geraltMemories.length);
    });

    it('should return empty array for unknown agent', async () => {
      const memories = await MockService.getAgentMemories('NonExistentAgent');
      expect(memories).toEqual([]);
    });
  });

  describe('getKnowledgeGraph', () => {
    it('should return a knowledge graph with nodes and edges', async () => {
      const graph = await MockService.getKnowledgeGraph();
      expect(graph).toHaveProperty('nodes');
      expect(graph).toHaveProperty('edges');
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
    });

    it('should return nodes with required properties', async () => {
      const graph = await MockService.getKnowledgeGraph();
      if (graph.nodes.length > 0) {
        const node = graph.nodes[0];
        expect(node).toHaveProperty('id');
        expect(node).toHaveProperty('label');
        expect(node).toHaveProperty('type');
      }
    });

    it('should return edges with required properties', async () => {
      const graph = await MockService.getKnowledgeGraph();
      if (graph.edges.length > 0) {
        const edge = graph.edges[0];
        expect(edge).toHaveProperty('source');
        expect(edge).toHaveProperty('target');
        expect(edge).toHaveProperty('label');
      }
    });
  });

  describe('addAgentMemory', () => {
    it('should add a new memory and return it with an id', async () => {
      const newMemory = {
        agent: 'TestAgent',
        content: 'Test memory content',
        timestamp: Date.now() / 1000,
        importance: 0.7,
      };

      const result = await MockService.addAgentMemory(newMemory);
      expect(result).toHaveProperty('id');
      expect(result.agent).toBe(newMemory.agent);
      expect(result.content).toBe(newMemory.content);
    });

    it('should generate a unique id for each memory', async () => {
      const memory1 = await MockService.addAgentMemory({
        agent: 'Agent1',
        content: 'Memory 1',
        timestamp: Date.now() / 1000,
      });

      const memory2 = await MockService.addAgentMemory({
        agent: 'Agent2',
        content: 'Memory 2',
        timestamp: Date.now() / 1000,
      });

      expect(memory1.id).not.toBe(memory2.id);
    });
  });

  describe('clearAgentMemories', () => {
    it('should resolve without error', async () => {
      await expect(MockService.clearAgentMemories()).resolves.not.toThrow();
    });

    it('should accept agent name parameter', async () => {
      await expect(MockService.clearAgentMemories('Geralt')).resolves.not.toThrow();
    });
  });
});
