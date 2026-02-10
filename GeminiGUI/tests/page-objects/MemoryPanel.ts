/**
 * Memory Panel Page Object for Playwright E2E Tests
 *
 * Handles memory panel interactions.
 */

import type { Locator, Page } from '@playwright/test';
import { SELECTORS, UI_TEXTS } from '../fixtures/test-data';
import { BasePage } from './BasePage';

interface MemoryEntry {
  agent: string;
  content: string;
  importance: number;
}

export class MemoryPanel extends BasePage {
  // Locators
  readonly container: Locator;
  readonly knowledgeGraphSection: Locator;
  readonly agentMemorySection: Locator;
  readonly agentSelect: Locator;
  readonly memoryList: Locator;
  readonly refreshButton: Locator;
  readonly addTestMemoryButton: Locator;
  readonly clearMemoriesButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.container = page.locator(SELECTORS.memoryPanel);
    this.knowledgeGraphSection = page.getByText(UI_TEXTS.memory.knowledgeGraph);
    this.agentMemorySection = page.getByText(UI_TEXTS.memory.agentMemory);
    this.agentSelect = page.locator(SELECTORS.agentSelect);
    this.memoryList = this.container.locator('[class*="space-y"]');
    this.refreshButton = page.locator('button[title*="Odswiez"]');
    this.addTestMemoryButton = page.locator('button[title*="testowe"]');
    this.clearMemoriesButton = page.locator('button[title*="Wyczysc pamiec"]');
    this.emptyState = page.getByText(UI_TEXTS.memory.noMemories);
  }

  /**
   * Check if memory panel is visible
   */
  async isVisible(): Promise<boolean> {
    return this.container.isVisible();
  }

  /**
   * Check if knowledge graph section is visible
   */
  async isKnowledgeGraphVisible(): Promise<boolean> {
    return this.knowledgeGraphSection.isVisible();
  }

  /**
   * Check if agent memory section is visible
   */
  async isAgentMemoryVisible(): Promise<boolean> {
    return this.agentMemorySection.isVisible();
  }

  /**
   * Get available agents from select dropdown
   */
  async getAvailableAgents(): Promise<string[]> {
    const options = await this.agentSelect.locator('option').allTextContents();
    return options;
  }

  /**
   * Select an agent from dropdown
   */
  async selectAgent(agentName: string): Promise<void> {
    await this.agentSelect.selectOption(agentName);
    await this.page.waitForTimeout(100); // Allow state update
  }

  /**
   * Get currently selected agent
   */
  async getSelectedAgent(): Promise<string> {
    return this.agentSelect.inputValue();
  }

  /**
   * Refresh memories
   */
  async refreshMemories(): Promise<void> {
    await this.refreshButton.click();
    await this.page.waitForTimeout(200); // Allow refresh
  }

  /**
   * Clear all memories for current agent
   */
  async clearMemories(): Promise<void> {
    // Set up dialog handler to confirm
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.clearMemoriesButton.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Get memory count
   */
  async getMemoryCount(): Promise<number> {
    // Each memory entry is a div with specific structure
    const memoryItems = this.container.locator('[class*="bg-"][class*="rounded"]');
    return memoryItems.count();
  }

  /**
   * Get all displayed memories
   */
  async getAllMemories(): Promise<MemoryEntry[]> {
    const memories: MemoryEntry[] = [];
    const memoryItems = this.container.locator('[class*="bg-"][class*="rounded"]');
    const count = await memoryItems.count();

    for (let i = 0; i < count; i++) {
      const item = memoryItems.nth(i);
      const content = (await item.locator('p').textContent()) || '';
      const importanceText = await item.locator('[class*="text-xs"]').textContent();
      const importance = importanceText ? parseInt(importanceText.replace('%', ''), 10) / 100 : 0;

      memories.push({
        agent: await this.getSelectedAgent(),
        content: content.trim(),
        importance,
      });
    }

    return memories;
  }

  /**
   * Check if specific memory content exists
   */
  async hasMemoryContent(content: string): Promise<boolean> {
    const memoryWithContent = this.container.locator(`p:has-text("${content}")`);
    return (await memoryWithContent.count()) > 0;
  }

  /**
   * Check if refresh button is enabled
   */
  async isRefreshEnabled(): Promise<boolean> {
    return this.refreshButton.isEnabled();
  }

  /**
   * Check if clear button is enabled
   */
  async isClearEnabled(): Promise<boolean> {
    return this.clearMemoriesButton.isEnabled();
  }
}
