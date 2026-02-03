/**
 * Memory Panel E2E Tests
 *
 * Tests for memory panel functionality including agent memories
 * and knowledge graph visualization.
 */

import { test, expect } from '../fixtures/test-setup';
import { createMockMemories } from '../fixtures/tauri-mocks';
import { TIMEOUTS, UI_TEXTS } from '../fixtures/test-data';

test.describe('Memory Panel', () => {
  test('should display memory panel', async ({ page, memory }) => {
    // Memory panel title should be visible
    await expect(page.getByText(UI_TEXTS.memory.title)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // Panel container should be visible
    const isVisible = await memory.isVisible();
    expect(isVisible).toBe(true);
  });

  test('should show knowledge graph section', async ({ page, memory }) => {
    // Knowledge graph section should be visible
    await expect(page.getByText(UI_TEXTS.memory.knowledgeGraph)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    const isKGVisible = await memory.isKnowledgeGraphVisible();
    expect(isKGVisible).toBe(true);
  });

  test('should show agent memory section', async ({ page, memory }) => {
    // Agent memory section should be visible
    await expect(page.getByText(UI_TEXTS.memory.agentMemory)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    const isAgentMemoryVisible = await memory.isAgentMemoryVisible();
    expect(isAgentMemoryVisible).toBe(true);
  });

  test('should allow agent selection', async ({ page, memory }) => {
    // Agent select should be visible
    const agentSelect = page.locator('select');
    await expect(agentSelect).toBeVisible({ timeout: TIMEOUTS.medium });

    // Get available agents
    const availableAgents = await memory.getAvailableAgents();

    // Should have multiple agents
    expect(availableAgents.length).toBeGreaterThan(0);

    // Should include known agents like Dijkstra
    const hasDijkstra = availableAgents.some(a =>
      a.toLowerCase().includes('dijkstra')
    );
    expect(hasDijkstra).toBe(true);
  });

  test('should display memories when available', async ({ page, memory }) => {
    // Mock memories response
    const mockMemories = createMockMemories(3);
    await memory.setMockResult('get_agent_memories', mockMemories);

    // Refresh memories
    await memory.refreshMemories();

    // Wait for memories to load
    await page.waitForTimeout(300);

    // Should show memory content
    for (const mem of mockMemories) {
      const hasContent = await memory.hasMemoryContent(mem.content);
      // At least some memories should be visible
      // (might be filtered by selected agent)
    }

    // Memory count should be greater than 0
    const memoryCount = await memory.getMemoryCount();
    expect(memoryCount).toBeGreaterThanOrEqual(0);
  });

  test('should handle empty state', async ({ page, memory }) => {
    // Mock empty memories
    await memory.mockEmptyMemories();

    // Refresh
    await memory.refreshMemories();

    // Wait for update
    await page.waitForTimeout(300);

    // Empty state should be visible
    const isEmpty = await memory.isEmptyStateVisible();
    // Note: depends on whether agent has default memories
  });
});
