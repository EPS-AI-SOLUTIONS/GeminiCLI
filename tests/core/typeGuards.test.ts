/**
 * Tests for type guards and safe resolvers (#31-32)
 * Covers: isValidAgentRole, resolveAgentRoleSafe, isTaskComplexity, getErrorMessage
 */

import { describe, expect, it } from 'vitest';
import { resolveAgentRole } from '../../src/config/agents.config.js';
import { getErrorMessage } from '../../src/core/errors.js';
import { isValidAgentRole, resolveAgentRoleSafe } from '../../src/types/swarm.js';

describe('isValidAgentRole', () => {
  it('should return true for all valid agent roles', () => {
    const validRoles = [
      'dijkstra',
      'geralt',
      'yennefer',
      'triss',
      'vesemir',
      'jaskier',
      'ciri',
      'eskel',
      'lambert',
      'zoltan',
      'regis',
      'philippa',
      'serena',
    ];

    for (const role of validRoles) {
      expect(isValidAgentRole(role), `Expected "${role}" to be valid`).toBe(true);
    }
  });

  it('should return false for invalid agent roles', () => {
    expect(isValidAgentRole('')).toBe(false);
    expect(isValidAgentRole('unknown')).toBe(false);
    expect(isValidAgentRole('GERALT')).toBe(false); // case-sensitive
    expect(isValidAgentRole('agent')).toBe(false);
    expect(isValidAgentRole('gemini')).toBe(false);
  });
});

describe('resolveAgentRoleSafe', () => {
  it('should return the role when valid', () => {
    expect(resolveAgentRoleSafe('geralt')).toBe('geralt');
    expect(resolveAgentRoleSafe('dijkstra')).toBe('dijkstra');
    expect(resolveAgentRoleSafe('serena')).toBe('serena');
  });

  it('should return fallback for invalid roles', () => {
    expect(resolveAgentRoleSafe('unknown')).toBe('geralt');
    expect(resolveAgentRoleSafe('')).toBe('geralt');
    expect(resolveAgentRoleSafe('INVALID')).toBe('geralt');
  });

  it('should return custom fallback when specified', () => {
    expect(resolveAgentRoleSafe('unknown', 'ciri')).toBe('ciri');
    expect(resolveAgentRoleSafe('invalid', 'dijkstra')).toBe('dijkstra');
  });

  it('should handle undefined input', () => {
    expect(resolveAgentRoleSafe(undefined)).toBe('geralt');
    expect(resolveAgentRoleSafe(undefined, 'triss')).toBe('triss');
  });
});

describe('resolveAgentRole (config)', () => {
  it('should normalize to lowercase and resolve', () => {
    expect(resolveAgentRole('GERALT')).toBe('geralt');
    expect(resolveAgentRole('Dijkstra')).toBe('dijkstra');
    expect(resolveAgentRole('Serena')).toBe('serena');
  });

  it('should fallback to geralt for unknown', () => {
    expect(resolveAgentRole('unknown')).toBe('geralt');
    expect(resolveAgentRole('')).toBe('geralt');
  });
});

describe('getErrorMessage', () => {
  it('should extract message from Error objects', () => {
    expect(getErrorMessage(new Error('test error'))).toBe('test error');
    expect(getErrorMessage(new TypeError('type error'))).toBe('type error');
  });

  it('should convert string to message', () => {
    expect(getErrorMessage('string error')).toBe('string error');
  });

  it('should handle null and undefined', () => {
    // getErrorMessage uses String() fallback, not a custom "Unknown error" message
    expect(getErrorMessage(null)).toBe('null');
    expect(getErrorMessage(undefined)).toBe('undefined');
  });

  it('should handle objects with message property', () => {
    expect(getErrorMessage({ message: 'object error' })).toBe('object error');
  });

  it('should handle numbers and other types', () => {
    expect(getErrorMessage(42)).toBe('42');
    expect(getErrorMessage(true)).toBe('true');
  });

  it('should handle nested errors', () => {
    const inner = new Error('inner');
    const outer = new Error('outer');
    outer.cause = inner;
    expect(getErrorMessage(outer)).toBe('outer');
  });
});
