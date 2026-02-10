/**
 * Chat Functionality E2E Tests
 *
 * Tests for the main chat interface including sending messages,
 * receiving responses, and message display.
 */

import { TEST_MESSAGES, TIMEOUTS } from '../fixtures/test-data';
import { expect, test } from '../fixtures/test-setup';

test.describe('Chat Functionality', () => {
  test('should display empty state when no messages', async ({ chat }) => {
    // Verify empty state is shown
    const isEmptyVisible = await chat.isEmptyStateVisible();
    expect(isEmptyVisible).toBe(true);

    // Verify no messages
    const messageCount = await chat.getMessageCount();
    expect(messageCount).toBe(0);
  });

  test('should send message and display in chat', async ({ page, chat }) => {
    const testMessage = TEST_MESSAGES.simple;

    // Send message
    await chat.sendMessage(testMessage);

    // User message should appear
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: TIMEOUTS.medium });

    // Empty state should be hidden
    const isEmptyVisible = await chat.isEmptyStateVisible();
    expect(isEmptyVisible).toBe(false);
  });

  test('should receive streaming response', async ({ page, chat }) => {
    await chat.sendMessage('Test prompt');

    // Simulate streaming response
    await chat.stream.emitChunk('This is ', false);
    await page.waitForTimeout(50);
    await chat.stream.emitChunk('a streaming ', false);
    await page.waitForTimeout(50);
    await chat.stream.emitChunk('response.', false);
    await chat.stream.emitChunk('', true);

    // Full response should appear
    await expect(page.getByText('This is a streaming response.')).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // Streaming indicator should be hidden after completion
    await chat.waitForStreamingComplete();
  });

  test('should handle Enter to send and Shift+Enter for newline', async ({ page, chat }) => {
    // Type first line
    await chat.chatInput.fill('Line 1');

    // Press Shift+Enter for newline
    await page.keyboard.press('Shift+Enter');

    // Type second line
    await chat.chatInput.pressSequentially('Line 2');

    // Verify input has newline
    const inputValue = await chat.getInputValue();
    expect(inputValue).toContain('Line 1');
    expect(inputValue).toContain('Line 2');
    expect(inputValue).toContain('\n');

    // Send with Enter
    await page.keyboard.press('Enter');

    // Message should be sent (both lines visible)
    await expect(page.getByText('Line 1')).toBeVisible();
  });

  test('should display character counter', async ({ chat }) => {
    // Type some text
    await chat.chatInput.fill('Test');

    // Get character count
    const count = await chat.getCharacterCount();

    // Should show 4 characters
    expect(count.current).toBe(4);
    expect(count.max).toBeGreaterThan(0);
  });

  test('should disable send when over character limit', async ({ chat }) => {
    const longText = TEST_MESSAGES.tooLong; // 4001 characters

    // Fill with long text
    await chat.chatInput.fill(longText);

    // Send button should be disabled
    const isEnabled = await chat.isSendEnabled();
    expect(isEnabled).toBe(false);

    // Character counter should show over limit
    const count = await chat.getCharacterCount();
    expect(count.current).toBeGreaterThan(count.max);
  });

  test('should copy message to clipboard', async ({ page, chat }) => {
    // Send a message
    await chat.sendMessage('Copy this message');

    // Simulate response
    await chat.simulateResponse('Response to copy');

    // Wait for message to appear
    await expect(page.getByText('Response to copy')).toBeVisible();

    // Copy the message
    await chat.copyLastMessage();

    // Check if copy success indicator appears
    await expect(page.locator('[data-lucide="check"]').last()).toBeVisible({
      timeout: TIMEOUTS.short,
    });
  });

  test('should render markdown in messages', async ({ page, chat }) => {
    await chat.sendMessage('Show markdown');

    // Simulate markdown response
    await chat.simulateResponse('# Heading\n\n**Bold** and *italic* text');

    // Check markdown elements are rendered
    await expect(page.locator('h1:has-text("Heading")')).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(page.locator('strong:has-text("Bold")')).toBeVisible();
    await expect(page.locator('em:has-text("italic")')).toBeVisible();
  });
});
