/**
 * Session Sidebar Page Object for Playwright E2E Tests
 *
 * Handles session management interactions.
 */

import type { Locator, Page } from '@playwright/test';
import { SELECTORS } from '../fixtures/test-data';
import { BasePage } from './BasePage';

export class SessionSidebar extends BasePage {
  // Locators
  readonly container: Locator;
  readonly createButton: Locator;
  readonly searchInput: Locator;
  readonly sessionItems: Locator;

  constructor(page: Page) {
    super(page);
    this.container = page.locator(SELECTORS.sessionSidebar);
    this.createButton = page.locator(SELECTORS.createSessionButton);
    this.searchInput = this.container.locator('input[placeholder*="Szukaj"]');
    this.sessionItems = this.container.locator(SELECTORS.sessionItem);
  }

  /**
   * Create a new session
   */
  async createSession(): Promise<void> {
    await this.createButton.first().click();
    await this.page.waitForTimeout(100); // Allow state update
  }

  /**
   * Get the number of sessions
   */
  async getSessionCount(): Promise<number> {
    return this.sessionItems.count();
  }

  /**
   * Get all session titles
   */
  async getAllSessionTitles(): Promise<string[]> {
    const titles: string[] = [];
    const count = await this.sessionItems.count();

    for (let i = 0; i < count; i++) {
      const title = await this.sessionItems.nth(i).locator('span.truncate').textContent();
      if (title) titles.push(title.trim());
    }

    return titles;
  }

  /**
   * Select a session by title
   */
  async selectSession(title: string): Promise<void> {
    const session = this.sessionItems.filter({ hasText: title });
    await session.click();
    await this.page.waitForTimeout(100); // Allow state update
  }

  /**
   * Select a session by index (0-based)
   */
  async selectSessionByIndex(index: number): Promise<void> {
    await this.sessionItems.nth(index).click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Get the currently selected session title
   */
  async getCurrentSessionTitle(): Promise<string | null> {
    // Active session has different background color
    const activeSession = this.sessionItems.filter({
      has: this.page.locator('[class*="bg-"]'),
    });

    if ((await activeSession.count()) === 0) return null;

    const title = await activeSession.first().locator('span.truncate').textContent();
    return title?.trim() || null;
  }

  /**
   * Delete a session by title
   */
  async deleteSession(title: string): Promise<void> {
    const session = this.sessionItems.filter({ hasText: title });
    await session.hover();

    const deleteButton = session.locator('button').filter({
      has: this.page.locator(SELECTORS.trashIcon),
    });

    await deleteButton.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Delete session by index
   */
  async deleteSessionByIndex(index: number): Promise<void> {
    const session = this.sessionItems.nth(index);
    await session.hover();

    const deleteButton = session.locator('button').filter({
      has: this.page.locator(SELECTORS.trashIcon),
    });

    await deleteButton.click();
    await this.page.waitForTimeout(100);
  }

  /**
   * Rename a session by double-clicking
   */
  async renameSession(oldTitle: string, newTitle: string): Promise<void> {
    const session = this.sessionItems.filter({ hasText: oldTitle });
    await session.dblclick();

    // Wait for input to appear
    const input = session.locator('input');
    await input.waitFor({ state: 'visible' });

    await input.clear();
    await input.fill(newTitle);
    await this.page.keyboard.press('Enter');

    await this.page.waitForTimeout(100);
  }

  /**
   * Search/filter sessions
   */
  async searchSessions(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(200); // Allow filter to apply
  }

  /**
   * Clear search filter
   */
  async clearSearch(): Promise<void> {
    await this.searchInput.clear();
    await this.page.waitForTimeout(200);
  }

  /**
   * Check if sidebar is visible
   */
  async isVisible(): Promise<boolean> {
    return this.container.isVisible();
  }
}
