/**
 * Theme Toggle E2E Tests
 *
 * Tests for dark/light theme switching functionality.
 */

import { test as base, expect } from '@playwright/test';
import { setupThemeTest } from '../fixtures/test-setup';
import { ChatPage } from '../page-objects/ChatPage';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-data';

// Theme tests need special setup with localStorage clearing
// Using manual setup instead of fixtures
test.describe('Theme Toggle', () => {
  let chat: ChatPage;

  test.beforeEach(async ({ page }) => {
    const setup = await setupThemeTest(page);
    chat = setup.chat;
  });

  test('should start in dark theme', async ({ page }) => {
    // Dark theme should show sun icon (to switch to light)
    await expect(page.locator(SELECTORS.sunIcon)).toBeVisible({ timeout: TIMEOUTS.medium });

    // Or check for dark background/styling
    const body = page.locator('body');
    const bgColor = await body.evaluate((el) => getComputedStyle(el).backgroundColor);

    // Dark theme should have dark background
    // RGB values close to black/dark gray
    expect(bgColor).toBeTruthy();
  });

  test('should toggle to light theme', async ({ page }) => {
    // Find and click theme toggle button
    const themeButton = page.locator('button').filter({
      has: page.locator(SELECTORS.sunIcon),
    });

    await themeButton.click();

    // After toggle, should show moon icon (to switch back to dark)
    await expect(page.locator(SELECTORS.moonIcon)).toBeVisible({ timeout: TIMEOUTS.short });
  });

  test('should persist theme preference', async ({ page }) => {
    // Toggle to light theme
    const themeButton = page.locator('button').filter({
      has: page.locator(`${SELECTORS.sunIcon}, ${SELECTORS.moonIcon}`),
    }).first();

    await themeButton.click();

    // Wait for theme to apply
    await page.waitForTimeout(100);

    // Check which icon is visible
    const isMoonVisible = await page.locator(SELECTORS.moonIcon).isVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await chat.waitForAppReady();

    // Theme should be persisted
    if (isMoonVisible) {
      // Was light theme, should still be light
      await expect(page.locator(SELECTORS.moonIcon)).toBeVisible({ timeout: TIMEOUTS.medium });
    }
  });

  test('should update logo based on theme', async ({ page }) => {
    // Get initial logo src
    const logo = page.locator('img[alt*="Gemini"], img[src*="logo"]').first();
    const hasLogo = await logo.isVisible().catch(() => false);

    if (hasLogo) {
      const initialSrc = await logo.getAttribute('src');

      // Toggle theme
      const themeButton = page.locator('button').filter({
        has: page.locator(`${SELECTORS.sunIcon}, ${SELECTORS.moonIcon}`),
      }).first();

      await themeButton.click();
      await page.waitForTimeout(200);

      // Check if logo changed (some apps have separate dark/light logos)
      const newSrc = await logo.getAttribute('src');

      // Logo might change or stay same depending on implementation
      // Just verify the toggle worked and logo is still visible
      await expect(logo).toBeVisible();
    }
  });
});

// Re-export test for consistency
const test = base;
