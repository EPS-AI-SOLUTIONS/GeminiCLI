/**
 * Command Execution E2E Tests
 *
 * Tests for [EXECUTE: "cmd"] pattern detection and code block execution.
 */

import { test, expect } from '../fixtures/test-setup';
import { TIMEOUTS, UI_TEXTS } from '../fixtures/test-data';

test.describe('Command Execution', () => {
  test('should detect [EXECUTE: "cmd"] pattern', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Run a command');

    // Simulate response with execute pattern
    await chat.simulateExecuteResponse('dir');

    // Wait for response
    await chat.waitForStreamingComplete();

    // Execute pattern should trigger system output
    // Look for the execute pattern or system output indicator
    const hasExecutePattern = await page.getByText(/\[EXECUTE:/).isVisible({ timeout: TIMEOUTS.medium }).catch(() => false);
    const hasSystemOutput = await page.getByText(UI_TEXTS.messages.systemOutput).isVisible({ timeout: 1000 }).catch(() => false);
    const hasExecuting = await page.getByText(UI_TEXTS.messages.executing).isVisible({ timeout: 1000 }).catch(() => false);

    // At least one indicator should be present
    expect(hasExecutePattern || hasSystemOutput || hasExecuting).toBe(true);
  });

  test('should show Run button for code blocks', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Show me python code');

    // Simulate code response
    await chat.simulateCodeResponse('python', 'print("hello")');

    // Wait for response
    await chat.waitForStreamingComplete();

    // Code block should be visible
    const hasCodeBlock = await chat.hasCodeBlock();
    expect(hasCodeBlock).toBe(true);

    // Run button should be visible
    await expect(page.locator('button[title*="Uruchom"]')).toBeVisible({ timeout: TIMEOUTS.medium });
  });

  test('should block dangerous commands in code execution', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Show me code');

    // Simulate dangerous code response
    await chat.simulateCodeResponse('bash', 'rm -rf /');

    // Wait for response
    await chat.waitForStreamingComplete();

    // Get the run button
    const runButton = page.locator('button[title*="Uruchom"]').first();

    // Set up dialog handler to catch security warning
    let dialogMessage = '';
    page.once('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.accept();
    });

    // Click run button
    await runButton.click();

    // Wait for potential dialog
    await page.waitForTimeout(500);

    // Should have shown security warning OR button should be disabled
    const buttonEnabled = await runButton.isEnabled();

    // Either dialog with security message appeared, or button was disabled
    expect(
      dialogMessage.includes(UI_TEXTS.security.dangerousCommand) ||
      dialogMessage.includes('BEZPIECZE') ||
      dialogMessage.includes('niebezpieczn') ||
      !buttonEnabled
    ).toBe(true);
  });

  test('should copy code to clipboard', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Code example');

    // Simulate code response
    await chat.simulateCodeResponse('javascript', 'const x = 1;');

    // Wait for response
    await chat.waitForStreamingComplete();

    // Click copy button on code block
    await chat.clickCopyCodeButton();

    // Check indicator shows copy success
    await expect(page.locator('[data-lucide="check"]').first()).toBeVisible({
      timeout: TIMEOUTS.short,
    });
  });
});
