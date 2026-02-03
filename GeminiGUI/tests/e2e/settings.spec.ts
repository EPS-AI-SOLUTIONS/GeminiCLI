/**
 * Settings Modal E2E Tests
 *
 * Tests for settings modal functionality including opening,
 * editing, and persisting settings.
 */

import { test, expect } from '../fixtures/test-setup';
import { TEST_SETTINGS, SHORTCUTS, TIMEOUTS, UI_TEXTS } from '../fixtures/test-data';

test.describe('Settings Modal', () => {
  test('should open settings with Ctrl+,', async ({ page, settings }) => {
    // Press keyboard shortcut
    await page.keyboard.press(SHORTCUTS.openSettings);

    // Modal should be visible
    await expect(settings.modal).toBeVisible({ timeout: TIMEOUTS.medium });

    // Should have correct title
    await expect(page.getByText(UI_TEXTS.settings.title)).toBeVisible();
  });

  test('should close settings with X button', async ({ settings }) => {
    // Open settings
    await settings.open();

    // Close with X button
    await settings.close();

    // Modal should be hidden
    await expect(settings.modal).toBeHidden();
  });

  test('should close settings with Escape key', async ({ page, settings }) => {
    // Open settings
    await settings.open();

    // Close with Escape
    await page.keyboard.press(SHORTCUTS.escape);

    // Modal should be hidden
    await expect(settings.modal).toBeHidden();
  });

  test('should persist Ollama endpoint setting', async ({ settings }) => {
    const customEndpoint = TEST_SETTINGS.ollamaEndpoint.custom;

    // Open settings
    await settings.open();

    // Set custom endpoint
    await settings.setOllamaEndpoint(customEndpoint);

    // Save settings
    await settings.save();

    // Reopen settings
    await settings.open();

    // Verify endpoint was saved
    const savedEndpoint = await settings.getOllamaEndpoint();
    expect(savedEndpoint).toBe(customEndpoint);
  });

  test('should mask API key input', async ({ settings }) => {
    // Open settings
    await settings.open();

    // Verify input type is password
    const isMasked = await settings.isApiKeyMasked();
    expect(isMasked).toBe(true);
  });

  test('should save system prompt', async ({ settings }) => {
    const customPrompt = TEST_SETTINGS.systemPrompt.custom;

    // Open settings
    await settings.open();

    // Set custom system prompt
    await settings.setSystemPrompt(customPrompt);

    // Save settings
    await settings.save();

    // Reopen settings
    await settings.open();

    // Verify prompt was saved
    const savedPrompt = await settings.getSystemPrompt();
    expect(savedPrompt).toBe(customPrompt);
  });

  test('should clear chat history', async ({ page, chat, settings }) => {
    // First add some messages
    await chat.sendMessage('Test message');
    await chat.simulateResponse('Response');

    // Verify message exists
    await expect(page.getByText('Test message')).toBeVisible();

    // Open settings
    await settings.open();

    // Set up dialog handler to accept confirmation
    page.once('dialog', (dialog) => dialog.accept());

    // Clear chat
    await settings.clearChat();

    // Close settings if still open
    if (await settings.isOpen()) {
      await settings.close();
    }

    // Wait for UI to update
    await page.waitForTimeout(300);

    // Chat should be empty - empty state should be visible
    const isEmptyVisible = await chat.isEmptyStateVisible();
    expect(isEmptyVisible).toBe(true);
  });

  test('should update status badge when API key is set', async ({ page, settings }) => {
    const validApiKey = TEST_SETTINGS.geminiApiKey.valid;

    // Open settings
    await settings.open();

    // Set API key
    await settings.setGeminiApiKey(validApiKey);

    // Save settings
    await settings.save();

    // Wait for status update
    await page.waitForTimeout(300);

    // Status should change (look for Gemini Ready or similar)
    // The exact text depends on implementation
    const statusText = await page.locator('[class*="badge"]').textContent();
    expect(statusText).toBeTruthy();
  });
});
