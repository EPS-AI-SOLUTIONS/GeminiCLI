/**
 * Unified Test Setup for Playwright E2E Tests
 *
 * Provides shared fixtures and setup functions to eliminate
 * duplicate beforeEach initialization across test files.
 */

import { test as base, expect, Page } from '@playwright/test';
import { injectTauriMocks } from './tauri-mocks';
import { ChatPage } from '../page-objects/ChatPage';
import { SettingsModal } from '../page-objects/SettingsModal';
import { SessionSidebar } from '../page-objects/SessionSidebar';
import { MemoryPanel } from '../page-objects/MemoryPanel';

/**
 * Custom fixture types for test context
 */
export interface TestFixtures {
  chat: ChatPage;
  settings: SettingsModal;
  sidebar: SessionSidebar;
  memory: MemoryPanel;
}

/**
 * Extended test with custom fixtures
 * Uses Playwright's fixture pattern for dependency injection
 */
export const test = base.extend<TestFixtures>({
  // ChatPage fixture - always available
  chat: async ({ page }, use) => {
    await injectTauriMocks(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const chat = new ChatPage(page);
    await chat.waitForAppReady();
    await use(chat);
  },

  // SettingsModal fixture - lazy created
  settings: async ({ page }, use) => {
    const settings = new SettingsModal(page);
    await use(settings);
  },

  // SessionSidebar fixture - lazy created
  sidebar: async ({ page }, use) => {
    const sidebar = new SessionSidebar(page);
    await use(sidebar);
  },

  // MemoryPanel fixture - lazy created
  memory: async ({ page }, use) => {
    const memory = new MemoryPanel(page);
    await use(memory);
  },
});

/**
 * Re-export expect for convenience
 */
export { expect };

/**
 * Setup options for manual setup function
 */
export interface SetupOptions {
  clearLocalStorage?: boolean;
  customMocks?: Record<string, unknown>;
}

/**
 * Manual setup function for tests that need more control
 * Use this when you need custom initialization logic
 *
 * @param page - Playwright page instance
 * @param options - Optional setup configuration
 * @returns Object containing initialized page objects
 */
export async function setupTest(
  page: Page,
  options: SetupOptions = {}
): Promise<{
  chat: ChatPage;
  settings: SettingsModal;
  sidebar: SessionSidebar;
  memory: MemoryPanel;
}> {
  const { clearLocalStorage = false, customMocks = {} } = options;

  // Clear localStorage if requested
  if (clearLocalStorage) {
    await page.addInitScript(() => {
      localStorage.clear();
    });
  }

  // Inject Tauri mocks with any custom handlers
  await injectTauriMocks(page, customMocks);

  // Navigate and wait for app to load
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Create page objects
  const chat = new ChatPage(page);
  const settings = new SettingsModal(page);
  const sidebar = new SessionSidebar(page);
  const memory = new MemoryPanel(page);

  // Wait for app to be ready
  await chat.waitForAppReady();

  return { chat, settings, sidebar, memory };
}

/**
 * Setup function specifically for theme tests that need localStorage cleared
 */
export async function setupThemeTest(page: Page): Promise<{
  chat: ChatPage;
}> {
  // Clear localStorage to reset theme
  await page.addInitScript(() => {
    localStorage.clear();
  });

  await injectTauriMocks(page);
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  const chat = new ChatPage(page);
  await chat.waitForAppReady();

  return { chat };
}

/**
 * Type helper for destructuring fixtures in tests
 */
export type TestContext = TestFixtures & { page: Page };
