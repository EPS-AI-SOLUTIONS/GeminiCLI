/**
 * Streaming Response E2E Tests
 *
 * Tests for real-time streaming response handling.
 */

import { test, expect } from '../fixtures/test-setup';
import { TIMEOUTS } from '../fixtures/test-data';

test.describe('Streaming Responses', () => {
  test('should show streaming cursor during response', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Test streaming');

    // Start streaming
    await chat.stream.emitChunk('Partial...', false);

    // Streaming cursor should be visible (pulsing element)
    await expect(page.locator('.animate-pulse')).toBeVisible({ timeout: TIMEOUTS.short });

    // Complete stream
    await chat.stream.emitChunk('', true);

    // Cursor should hide after completion
    await expect(page.locator('.animate-pulse')).toBeHidden({ timeout: TIMEOUTS.medium });
  });

  test('should accumulate streaming chunks correctly', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Stream test');

    // Send chunks
    const chunks = ['Hello ', 'world, ', 'this is ', 'a test!'];
    for (const chunk of chunks) {
      await chat.stream.emitChunk(chunk, false);
      await page.waitForTimeout(50);
    }

    // Complete stream
    await chat.stream.emitChunk('', true);

    // Full accumulated text should be visible
    await expect(page.getByText('Hello world, this is a test!')).toBeVisible({
      timeout: TIMEOUTS.medium,
    });
  });

  test('should handle stream errors gracefully', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Error test');

    // Start streaming
    await chat.stream.emitChunk('Partial response...', false);
    await page.waitForTimeout(100);

    // Emit error
    await chat.stream.emitError('Connection lost');

    // Streaming should stop
    await expect(page.locator('.animate-pulse')).toBeHidden({ timeout: TIMEOUTS.medium });

    // Error message or toast should appear
    // The exact behavior depends on implementation
    // At minimum, the UI should not be stuck
  });

  test('should handle multiple event types', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Multi-event test');

    // Emit via different event types
    await chat.stream.emitChunk('From Ollama ', false, 'ollama-event');
    await page.waitForTimeout(50);

    await chat.stream.emitChunk('and Swarm.', false, 'swarm-data');
    await chat.stream.emitChunk('', true, 'swarm-data');

    // Both chunks should be combined in the response
    await expect(page.getByText(/From Ollama.*and Swarm/)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });
  });

  test('should render markdown in streamed content', async ({ page, chat }) => {
    // Send message
    await chat.sendMessage('Markdown test');

    // Simulate markdown response
    await chat.simulateMarkdownResponse();

    // Wait for response to complete
    await chat.waitForStreamingComplete();

    // Check for rendered markdown elements
    await expect(page.locator('h1')).toBeVisible({ timeout: TIMEOUTS.medium });
    await expect(page.locator('strong')).toBeVisible();
    await expect(page.locator('em')).toBeVisible();
    await expect(page.locator('pre code')).toBeVisible();
  });
});
