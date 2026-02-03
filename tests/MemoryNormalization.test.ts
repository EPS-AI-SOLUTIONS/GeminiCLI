/**
 * Tests for Memory Parameter Normalization
 *
 * These tests verify the fixes for:
 * - [bug] entities array format with dictionaries
 * - [bug] memory/add_observations with string arguments
 * - [bug] memory/create_entities with string arguments
 */

import { describe, test, expect, beforeEach } from 'vitest';

// Simulated normalizeMemoryParams function (extracted from MCPManager)
// This allows testing the normalization logic in isolation
function normalizeMemoryParams(toolName: string, params: Record<string, any>): Record<string, any> {
  const memoryTools = ['create_entities', 'add_observations', 'create_relations', 'delete_entities', 'delete_relations', 'delete_observations'];
  const baseTool = toolName.split('__').pop() || toolName;

  if (!memoryTools.includes(baseTool)) return params;

  const normalized = { ...params };

  // Convert entities string → array
  if (typeof normalized.entities === 'string') {
    normalized.entities = [{
      name: normalized.entities,
      entityType: 'concept',
      observations: []
    }];
  }

  // Convert observations string → array
  if (typeof normalized.observations === 'string') {
    normalized.observations = [normalized.observations];
  }

  // Convert entityName for add_observations if missing
  if (baseTool === 'add_observations' && !normalized.entityName && normalized.name) {
    normalized.entityName = normalized.name;
    delete normalized.name;
  }

  // Convert relations string → array (parse "A -> B" format)
  if (typeof normalized.relations === 'string') {
    const match = normalized.relations.match(/(.+?)\s*(?:->|relates?\s*to)\s*(.+)/i);
    if (match) {
      normalized.relations = [{
        from: match[1].trim(),
        to: match[2].trim(),
        relationType: 'relates_to'
      }];
    }
  }

  return normalized;
}

describe('Memory Parameter Normalization', () => {
  describe('create_entities', () => {
    test('should convert string entities to array format', () => {
      const result = normalizeMemoryParams('memory__create_entities', {
        entities: 'TestEntity'
      });

      expect(result.entities).toEqual([{
        name: 'TestEntity',
        entityType: 'concept',
        observations: []
      }]);
    });

    test('should preserve array entities format', () => {
      const originalEntities = [{
        name: 'Entity1',
        entityType: 'project',
        observations: ['obs1']
      }];

      const result = normalizeMemoryParams('create_entities', {
        entities: originalEntities
      });

      expect(result.entities).toEqual(originalEntities);
    });

    test('should handle MCP-prefixed tool names', () => {
      const result = normalizeMemoryParams('mcp__memory__create_entities', {
        entities: 'PrefixedEntity'
      });

      expect(result.entities).toBeInstanceOf(Array);
      expect(result.entities[0].name).toBe('PrefixedEntity');
    });
  });

  describe('add_observations', () => {
    test('should convert string observations to array', () => {
      const result = normalizeMemoryParams('add_observations', {
        entityName: 'TestEntity',
        observations: 'This is a single observation'
      });

      expect(result.observations).toEqual(['This is a single observation']);
    });

    test('should preserve array observations', () => {
      const result = normalizeMemoryParams('add_observations', {
        entityName: 'TestEntity',
        observations: ['obs1', 'obs2', 'obs3']
      });

      expect(result.observations).toEqual(['obs1', 'obs2', 'obs3']);
    });

    test('should convert name to entityName if entityName is missing', () => {
      const result = normalizeMemoryParams('memory__add_observations', {
        name: 'MyEntity',
        observations: 'test observation'
      });

      expect(result.entityName).toBe('MyEntity');
      expect(result.name).toBeUndefined();
    });

    test('should not overwrite existing entityName', () => {
      const result = normalizeMemoryParams('add_observations', {
        entityName: 'CorrectName',
        name: 'WrongName',
        observations: 'test'
      });

      expect(result.entityName).toBe('CorrectName');
    });
  });

  describe('create_relations', () => {
    test('should parse "A -> B" format', () => {
      const result = normalizeMemoryParams('create_relations', {
        relations: 'EntityA -> EntityB'
      });

      expect(result.relations).toEqual([{
        from: 'EntityA',
        to: 'EntityB',
        relationType: 'relates_to'
      }]);
    });

    test('should parse "A relates to B" format', () => {
      const result = normalizeMemoryParams('create_relations', {
        relations: 'Project relates to Technology'
      });

      expect(result.relations).toEqual([{
        from: 'Project',
        to: 'Technology',
        relationType: 'relates_to'
      }]);
    });

    test('should preserve array relations', () => {
      const originalRelations = [{
        from: 'A',
        to: 'B',
        relationType: 'depends_on'
      }];

      const result = normalizeMemoryParams('create_relations', {
        relations: originalRelations
      });

      expect(result.relations).toEqual(originalRelations);
    });

    test('should handle entities with spaces in "A -> B" format', () => {
      const result = normalizeMemoryParams('create_relations', {
        relations: 'User Profile -> Database Schema'
      });

      expect(result.relations[0].from).toBe('User Profile');
      expect(result.relations[0].to).toBe('Database Schema');
    });
  });

  describe('non-memory tools', () => {
    test('should not modify params for non-memory tools', () => {
      const originalParams = {
        entities: 'should stay string',
        observations: 'also string'
      };

      const result = normalizeMemoryParams('filesystem__read_file', originalParams);

      expect(result).toEqual(originalParams);
    });

    test('should not modify params for unknown tools', () => {
      const originalParams = {
        entities: 'test',
        somethingElse: 123
      };

      const result = normalizeMemoryParams('custom_tool', originalParams);

      expect(result).toEqual(originalParams);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string entities', () => {
      const result = normalizeMemoryParams('create_entities', {
        entities: ''
      });

      expect(result.entities).toEqual([{
        name: '',
        entityType: 'concept',
        observations: []
      }]);
    });

    test('should handle empty string observations', () => {
      const result = normalizeMemoryParams('add_observations', {
        entityName: 'Test',
        observations: ''
      });

      expect(result.observations).toEqual(['']);
    });

    test('should handle undefined params gracefully', () => {
      const result = normalizeMemoryParams('create_entities', {});

      expect(result.entities).toBeUndefined();
    });

    test('should handle null values', () => {
      const result = normalizeMemoryParams('create_entities', {
        entities: null
      });

      // null is not a string, so it should stay null
      expect(result.entities).toBeNull();
    });
  });
});
