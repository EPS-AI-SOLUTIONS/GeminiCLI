/**
 * Keyboard Shortcuts E2E Tests
 *
 * Tests for keyboard shortcuts functionality.
 */

import { test, expect } from '../fixtures/test-setup';
import { SHORTCUTS, TIMEOUTS, UI_TEXTS } from '../fixtures/test-data';

test.describe('Keyboard Shortcuts', () => {
  test('Ctrl+, should open settings', async ({ page }) => {
    // Press shortcut
    await page.keyboard.press(SHORTCUTS.openSettings);

    // Settings modal should open
    await expect(page.getByText(UI_TEXTS.settings.title)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });
  });

  test('Ctrl+/ should open shortcuts modal', async ({ page }) => {
    // Press shortcut
    await page.keyboard.press(SHORTCUTS.openShortcuts);

    // Shortcuts modal should open
    await expect(page.getByText(UI_TEXTS.shortcuts.title)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });
  });

  test('Ctrl+L should clear chat (with confirmation)', async ({ page, chat }) => {
    // Add a message first
    await chat.sendMessage('Test message');
    await chat.simulateResponse('Response');

    // Verify message exists
    await expect(page.getByText('Test message')).toBeVisible();

    // Set up dialog handler
    page.once('dialog', (dialog) => dialog.accept());

    // Press clear shortcut
    await page.keyboard.press(SHORTCUTS.clearChat);

    // Wait for clear to process
    await page.waitForTimeout(300);

    // Chat should be empty
    const isEmptyVisible = await chat.isEmptyStateVisible();
    expect(isEmptyVisible).toBe(true);
  });

  test('Escape should close modals', async ({ page }) => {
    // Open settings
    await page.keyboard.press(SHORTCUTS.openSettings);

    // Verify it's open
    await expect(page.getByText(UI_TEXTS.settings.title)).toBeVisible();

    // Press Escape
    await page.keyboard.press(SHORTCUTS.escape);

    // Modal should be closed
    await expect(page.getByText(UI_TEXTS.settings.title)).toBeHidden({
      timeout: TIMEOUTS.short,
    });
  });

  test('Enter sends message (without Shift)', async ({ page, chat }) => {
    const testMessage = 'Test message with Enter';

    // Type message
    await chat.chatInput.fill(testMessage);

    // Press Enter
    await page.keyboard.press(SHORTCUTS.enter);

    // Message should be sent and appear in chat
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: TIMEOUTS.medium });

    // Input should be cleared
    const inputValue = await chat.getInputValue();
    expect(inputValue).toBe('');
  });

  test('Shift+Enter adds newline', async ({ page, chat }) => {
    // Focus input
    await chat.chatInput.focus();

    // Type first line
    await chat.chatInput.fill('Line 1');

    // Press Shift+Enter
    await page.keyboard.press(SHORTCUTS.shiftEnter);

    // Type second line
    await chat.chatInput.pressSequentially('Line 2');

    // Verify input has newline
    const inputValue = await chat.getInputValue();
    expect(inputValue).toContain('\n');
    expect(inputValue).toContain('Line 1');
    expect(inputValue).toContain('Line 2');

    // Message should NOT be sent yet
    const messageCount = await chat.getMessageCount();
    expect(messageCount).toBe(0);
  });
});
