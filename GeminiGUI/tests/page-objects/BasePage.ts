/**
 * Base Page Object for Playwright E2E Tests
 *
 * Provides common utilities and helpers for all page objects.
 */

import { expect, type Page } from '@playwright/test';
import { emitTauriEvent, injectTauriMocks, setMockInvokeResult } from '../fixtures/tauri-mocks';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-data';

export class BasePage {
  constructor(protected page: Page) {}

  /**
   * Initialize the page with Tauri mocks
   */
  async init(customMocks: Record<string, unknown> = {}): Promise<void> {
    await injectTauriMocks(this.page, customMocks);
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Wait for the app to be fully loaded and ready
   */
  async waitForAppReady(timeout: number = TIMEOUTS.long): Promise<void> {
    // Wait for header with logo
    await expect(this.page.locator(SELECTORS.logo)).toContainText('Gemini', { timeout });
    // Wait for chat input to be visible
    await expect(this.page.locator(SELECTORS.chatInput)).toBeVisible({ timeout });
  }

  /**
   * Emit a Tauri event from test
   */
  async emitEvent(eventName: string, payload: unknown): Promise<void> {
    await emitTauriEvent(this.page, eventName, payload);
  }

  /**
   * Set mock result for a Tauri invoke command
   */
  async setMockResult(command: string, result: unknown): Promise<void> {
    await setMockInvokeResult(this.page, command, result);
  }

  /**
   * Take a screenshot with automatic naming
   */
  async screenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `./test-results/screenshots/${name}.png` });
  }

  /**
   * Wait for a specific duration
   */
  async wait(ms: number): Promise<void> {
    await this.page.waitForTimeout(ms);
  }

  /**
   * Get current URL
   */
  async getUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Check if element exists on page
   */
  async elementExists(selector: string): Promise<boolean> {
    const count = await this.page.locator(selector).count();
    return count > 0;
  }

  /**
   * Get element text content
   */
  async getText(selector: string): Promise<string | null> {
    const element = this.page.locator(selector).first();
    return element.textContent();
  }

  /**
   * Fill input and optionally submit
   */
  async fillInput(selector: string, value: string, submit: boolean = false): Promise<void> {
    const input = this.page.locator(selector);
    await input.fill(value);
    if (submit) {
      await input.press('Enter');
    }
  }

  /**
   * Get all text contents from multiple elements
   */
  async getAllTexts(selector: string): Promise<string[]> {
    const elements = this.page.locator(selector);
    return elements.allTextContents();
  }

  /**
   * Wait for text to appear anywhere on page
   */
  async waitForText(text: string, timeout: number = TIMEOUTS.medium): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout });
  }

  /**
   * Wait for text to disappear from page
   */
  async waitForTextToDisappear(text: string, timeout: number = TIMEOUTS.medium): Promise<void> {
    await expect(this.page.getByText(text)).toBeHidden({ timeout });
  }

  /**
   * Press keyboard shortcut
   */
  async pressShortcut(shortcut: string): Promise<void> {
    await this.page.keyboard.press(shortcut);
  }

  /**
   * Handle browser dialog (alert, confirm, prompt)
   */
  async handleDialog(accept: boolean = true, promptText?: string): Promise<void> {
    this.page.once('dialog', async (dialog) => {
      if (promptText && dialog.type() === 'prompt') {
        await dialog.accept(promptText);
      } else if (accept) {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });
  }

  /**
   * Get localStorage value
   */
  async getLocalStorage(key: string): Promise<string | null> {
    return this.page.evaluate((k) => localStorage.getItem(k), key);
  }

  /**
   * Set localStorage value
   */
  async setLocalStorage(key: string, value: string): Promise<void> {
    await this.page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, value]);
  }

  /**
   * Clear localStorage
   */
  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }
}
