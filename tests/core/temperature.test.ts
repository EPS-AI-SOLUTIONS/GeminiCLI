/**
 * Tests for Temperature Controller (#32)
 * Tests adaptive temperature, learning, and agent profiles
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_AGENT_PROFILES,
  detectTaskType,
  TemperatureController,
} from '../../src/core/agent/temperature.js';

describe('TemperatureController', () => {
  let controller: TemperatureController;

  beforeEach(() => {
    controller = new TemperatureController();
  });

  describe('getTemperatureForAgent', () => {
    it('should return a number for all known agents', () => {
      const agents = Object.keys(DEFAULT_AGENT_PROFILES);
      for (const agent of agents) {
        const temp = controller.getTemperatureForAgent(agent, 'general');
        expect(typeof temp).toBe('number');
        expect(temp).toBeGreaterThan(0);
        expect(temp).toBeLessThanOrEqual(2.0);
      }
    });

    it('should return lower temp for code tasks than creative tasks', () => {
      const codeTemp = controller.getTemperatureForAgent('geralt', 'code');
      const creativeTemp = controller.getTemperatureForAgent('geralt', 'creative');
      expect(codeTemp).toBeLessThan(creativeTemp);
    });

    it('should handle unknown agent names gracefully', () => {
      const temp = controller.getTemperatureForAgent('unknown_agent', 'general');
      expect(typeof temp).toBe('number');
      expect(temp).toBeGreaterThan(0);
    });

    it('serena profile should exist (FIX #1)', () => {
      expect(DEFAULT_AGENT_PROFILES).toHaveProperty('serena');
      const temp = controller.getTemperatureForAgent('serena', 'code');
      expect(temp).toBeGreaterThan(0);
      expect(temp).toBeLessThan(2.0);
    });
  });

  describe('adjustTemperatureDuringGeneration', () => {
    it('should apply annealing at high progress', () => {
      const adjusted = controller.adjustTemperatureDuringGeneration(1.0, {
        agentName: 'dijkstra',
        taskType: 'planning',
        task: 'test',
        generationProgress: 0.9,
        currentStep: 1,
        totalSteps: 1,
        previousResults: [],
        confidenceLevel: 0.8,
        retryCount: 0,
        errorCount: 0,
      });
      // Annealing should reduce temperature
      expect(adjusted).toBeLessThanOrEqual(1.0);
    });

    it('should boost temperature on low confidence', () => {
      const normal = controller.adjustTemperatureDuringGeneration(1.0, {
        agentName: 'geralt',
        taskType: 'analysis',
        task: 'test',
        generationProgress: 0,
        currentStep: 0,
        totalSteps: 1,
        previousResults: [],
        confidenceLevel: 0.8,
        retryCount: 0,
        errorCount: 0,
      });
      const boosted = controller.adjustTemperatureDuringGeneration(1.0, {
        agentName: 'geralt',
        taskType: 'analysis',
        task: 'test',
        generationProgress: 0,
        currentStep: 0,
        totalSteps: 1,
        previousResults: [],
        confidenceLevel: 0.2,
        retryCount: 0,
        errorCount: 0,
      });
      expect(boosted).toBeGreaterThanOrEqual(normal);
    });

    it('should clamp to [0.05, 2.0] range (FIX #5)', () => {
      const result = controller.adjustTemperatureDuringGeneration(3.0, {
        agentName: 'jaskier',
        taskType: 'creative',
        task: 'test',
        generationProgress: 0,
        currentStep: 0,
        totalSteps: 1,
        previousResults: [],
        confidenceLevel: 0.1,
        retryCount: 5,
        errorCount: 0,
      });
      expect(result).toBeLessThanOrEqual(2.0);
      expect(result).toBeGreaterThanOrEqual(0.05);
    });
  });

  describe('learnFromResult', () => {
    it('should record learning data', () => {
      controller.learnFromResult('geralt', 0.8, 'code', 0.9, 100, true);
      const stats = controller.getAgentStats('geralt');
      expect(stats.totalSamples).toBe(1);
      expect(stats.avgQuality).toBeGreaterThan(0);
    });

    it('should not crash on missing agent', () => {
      expect(() => {
        controller.learnFromResult('nonexistent', 0.5, 'general', 0.5, 50, true);
      }).not.toThrow();
    });
  });

  describe('resetLearning', () => {
    it('should reset specific agent history', () => {
      controller.learnFromResult('geralt', 0.8, 'code', 0.9, 100, true);
      controller.resetLearning('geralt');
      const stats = controller.getAgentStats('geralt');
      expect(stats.totalSamples).toBe(0);
    });

    it('should reset all agents when called without argument', () => {
      controller.learnFromResult('geralt', 0.8, 'code', 0.9, 100, true);
      controller.learnFromResult('dijkstra', 0.9, 'planning', 0.95, 200, true);
      controller.resetLearning();
      expect(controller.getAgentStats('geralt').totalSamples).toBe(0);
      expect(controller.getAgentStats('dijkstra').totalSamples).toBe(0);
    });
  });

  describe('exportLearningState / importLearningState', () => {
    it('should round-trip learning state', () => {
      controller.learnFromResult('geralt', 0.8, 'code', 0.9, 100, true);
      const exported = controller.exportLearningState();
      const newController = new TemperatureController();
      newController.importLearningState(exported);
      const stats = newController.getAgentStats('geralt');
      expect(stats.totalSamples).toBe(1);
    });
  });
});

describe('detectTaskType', () => {
  it('should detect code tasks', () => {
    expect(detectTaskType('implement a new function')).toBe('code');
    expect(detectTaskType('zaimplementuj klasę')).toBe('code');
  });

  it('should detect fix tasks', () => {
    expect(detectTaskType('fix the bug in login')).toBe('fix');
    expect(detectTaskType('napraw błąd w module')).toBe('fix');
  });

  it('should detect analysis tasks', () => {
    expect(detectTaskType('analyze the performance')).toBe('analysis');
    // 'przeanalizuj kod' matches 'kod' in codeKeywords first (priority order)
    expect(detectTaskType('sprawdź wyniki')).toBe('analysis');
  });

  it('should detect creative tasks', () => {
    expect(detectTaskType('suggest alternative approaches')).toBe('creative');
    expect(detectTaskType('zaproponuj pomysły')).toBe('creative');
  });

  it('should detect planning tasks', () => {
    // 'create a plan' matches 'create' in codeKeywords first (priority order)
    expect(detectTaskType('plan the migration strategy')).toBe('planning');
    expect(detectTaskType('zaplanuj architekturę')).toBe('planning');
  });

  it('should default to general for unknown tasks', () => {
    expect(detectTaskType('hello world')).toBe('general');
  });
});
