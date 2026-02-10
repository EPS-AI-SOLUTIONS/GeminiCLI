/**
 * GeminiHydra - ApiKeyRotator Unit Tests
 * Feature #47: Multi-key rotation, health tracking, selection strategies
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { ApiKeyRotator } from '../../src/core/SecuritySystem.js';

describe('ApiKeyRotator', () => {
  let rotator: ApiKeyRotator;

  beforeEach(() => {
    rotator = new ApiKeyRotator('round-robin', 3);
  });

  describe('addKey / getKey basics', () => {
    it('should return undefined for unknown provider', () => {
      expect(rotator.getKey('gemini')).toBeUndefined();
    });

    it('should add and return a key', () => {
      rotator.addKey('gemini', 'key-a', 'primary');
      expect(rotator.getKey('gemini')).toBe('key-a');
    });

    it('should not add duplicate keys', () => {
      rotator.addKey('gemini', 'key-a', 'primary');
      rotator.addKey('gemini', 'key-a', 'duplicate');
      const status = rotator.getStatus('gemini');
      expect(status).toHaveLength(1);
    });

    it('should assign default label when none provided', () => {
      rotator.addKey('gemini', 'key-a');
      const status = rotator.getStatus('gemini');
      expect(status[0].label).toBe('key-1');
    });
  });

  describe('round-robin strategy', () => {
    it('should cycle through keys in order', () => {
      rotator.addKey('gemini', 'key-a', 'a');
      rotator.addKey('gemini', 'key-b', 'b');
      rotator.addKey('gemini', 'key-c', 'c');

      expect(rotator.getKey('gemini')).toBe('key-a');
      expect(rotator.getKey('gemini')).toBe('key-b');
      expect(rotator.getKey('gemini')).toBe('key-c');
      // Wraps around
      expect(rotator.getKey('gemini')).toBe('key-a');
    });
  });

  describe('least-used strategy', () => {
    it('should prefer least-used key', () => {
      const leastUsed = new ApiKeyRotator('least-used', 3);
      leastUsed.addKey('gemini', 'key-a', 'a');
      leastUsed.addKey('gemini', 'key-b', 'b');

      // First call: both at 0, picks first
      const first = leastUsed.getKey('gemini');
      expect(first).toBe('key-a');

      // Second call: key-a has 1, key-b has 0 -> picks key-b
      expect(leastUsed.getKey('gemini')).toBe('key-b');

      // Third call: both at 1 -> picks first again
      expect(leastUsed.getKey('gemini')).toBe('key-a');
    });
  });

  describe('random strategy', () => {
    it('should return a valid key', () => {
      const random = new ApiKeyRotator('random', 3);
      random.addKey('gemini', 'key-a', 'a');
      random.addKey('gemini', 'key-b', 'b');

      const key = random.getKey('gemini');
      expect(['key-a', 'key-b']).toContain(key);
    });
  });

  describe('failure tracking', () => {
    it('should skip keys that exceed failure threshold', () => {
      rotator.addKey('gemini', 'key-bad', 'bad');
      rotator.addKey('gemini', 'key-good', 'good');

      // Fail key-bad 3 times (threshold)
      rotator.reportFailure('gemini', 'key-bad');
      rotator.reportFailure('gemini', 'key-bad');
      rotator.reportFailure('gemini', 'key-bad');

      // Should always get key-good since key-bad is unhealthy
      expect(rotator.getKey('gemini')).toBe('key-good');
      expect(rotator.getKey('gemini')).toBe('key-good');
    });

    it('should reset failure count on success', () => {
      rotator.addKey('gemini', 'key-a', 'a');
      rotator.reportFailure('gemini', 'key-a');
      rotator.reportFailure('gemini', 'key-a');
      expect(rotator.getStatus('gemini')[0].failureCount).toBe(2);

      rotator.reportSuccess('gemini', 'key-a');
      expect(rotator.getStatus('gemini')[0].failureCount).toBe(0);
    });

    it('should auto-reset failures when all keys exhausted', () => {
      rotator.addKey('gemini', 'key-a', 'a');

      // Exhaust the key
      for (let i = 0; i < 3; i++) rotator.reportFailure('gemini', 'key-a');

      // getKey should reset and return it (circuit-breaker-style recovery)
      const key = rotator.getKey('gemini');
      expect(key).toBe('key-a');
    });
  });

  describe('disableKey', () => {
    it('should permanently disable a key', () => {
      rotator.addKey('gemini', 'key-a', 'a');
      rotator.addKey('gemini', 'key-b', 'b');

      rotator.disableKey('gemini', 'a');

      // Should only return key-b
      expect(rotator.getKey('gemini')).toBe('key-b');
      expect(rotator.getKey('gemini')).toBe('key-b');
    });

    it('should return undefined when all keys disabled', () => {
      rotator.addKey('gemini', 'key-a', 'a');
      rotator.disableKey('gemini', 'a');

      expect(rotator.getKey('gemini')).toBeUndefined();
    });

    it('should return false for non-existent label', () => {
      expect(rotator.disableKey('gemini', 'nope')).toBe(false);
    });
  });

  describe('removeKey', () => {
    it('should remove a key by label', () => {
      rotator.addKey('gemini', 'key-a', 'a');
      rotator.addKey('gemini', 'key-b', 'b');

      expect(rotator.removeKey('gemini', 'a')).toBe(true);
      expect(rotator.getStatus('gemini')).toHaveLength(1);
    });

    it('should return false for non-existent key', () => {
      expect(rotator.removeKey('gemini', 'nope')).toBe(false);
    });

    it('should return false for non-existent provider', () => {
      expect(rotator.removeKey('unknown', 'x')).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return empty array for unknown provider', () => {
      expect(rotator.getStatus('unknown')).toEqual([]);
    });

    it('should report healthy status correctly', () => {
      rotator.addKey('gemini', 'key-a', 'a');
      rotator.getKey('gemini'); // use it once

      const status = rotator.getStatus('gemini');
      expect(status).toHaveLength(1);
      expect(status[0].label).toBe('a');
      expect(status[0].usageCount).toBe(1);
      expect(status[0].healthy).toBe(true);
      expect(status[0].lastUsedAt).toBeDefined();
    });
  });

  describe('getProviders', () => {
    it('should list all providers', () => {
      rotator.addKey('gemini', 'key-a');
      rotator.addKey('gemini', 'key-b');
      rotator.addKey('ollama', 'key-c');

      const providers = rotator.getProviders();
      expect(providers).toHaveLength(2);

      const gemini = providers.find((p) => p.provider === 'gemini');
      expect(gemini?.totalKeys).toBe(2);
      expect(gemini?.healthyKeys).toBe(2);
    });
  });

  describe('exportState / importState', () => {
    it('should round-trip state correctly', () => {
      rotator.addKey('gemini', 'key-a', 'primary');
      rotator.addKey('gemini', 'key-b', 'secondary');
      rotator.getKey('gemini'); // use key-a
      rotator.reportFailure('gemini', 'key-b');

      const exported = rotator.exportState();

      // Import into fresh rotator
      const newRotator = new ApiKeyRotator('round-robin', 3);
      newRotator.importState(exported);

      const status = newRotator.getStatus('gemini');
      expect(status).toHaveLength(2);
      expect(status[0].label).toBe('primary');
      expect(status[0].usageCount).toBe(1);
      expect(status[1].label).toBe('secondary');
      expect(status[1].failureCount).toBe(1);
    });

    it('should clear previous state on import', () => {
      rotator.addKey('old-provider', 'old-key');
      rotator.importState({
        newProvider: [
          {
            key: 'new-key',
            label: 'new',
            addedAt: Date.now(),
            usageCount: 0,
            failureCount: 0,
            disabled: false,
          },
        ],
      });

      expect(rotator.getProviders()).toHaveLength(1);
      expect(rotator.getProviders()[0].provider).toBe('newProvider');
    });
  });

  describe('multi-provider isolation', () => {
    it('should track keys independently per provider', () => {
      rotator.addKey('gemini', 'gem-key', 'g1');
      rotator.addKey('ollama', 'oll-key', 'o1');

      rotator.reportFailure('gemini', 'gem-key');

      const geminiStatus = rotator.getStatus('gemini');
      const ollamaStatus = rotator.getStatus('ollama');

      expect(geminiStatus[0].failureCount).toBe(1);
      expect(ollamaStatus[0].failureCount).toBe(0);
    });
  });
});
