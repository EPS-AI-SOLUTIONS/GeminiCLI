/**
 * Swarm Workflow Integration Tests
 *
 * Tests for full Swarm agent workflow including multiple agents
 * and complex interactions.
 */

import { expect, test } from '@playwright/test';
import { createSwarmAgentMessages } from '../fixtures/stream-simulator';
import { injectTauriMocks } from '../fixtures/tauri-mocks';
import { TEST_PROMPTS, TIMEOUTS, UI_TEXTS } from '../fixtures/test-data';
import { ChatPage } from '../page-objects/ChatPage';
import { MemoryPanel } from '../page-objects/MemoryPanel';
import { SessionSidebar } from '../page-objects/SessionSidebar';
import { SettingsModal } from '../page-objects/SettingsModal';

test.describe('Swarm Workflow Integration', () => {
  let chat: ChatPage;
  let sidebar: SessionSidebar;
  let settings: SettingsModal;
  let _memory: MemoryPanel;

  test.beforeEach(async ({ page }) => {
    await injectTauriMocks(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    chat = new ChatPage(page);
    sidebar = new SessionSidebar(page);
    settings = new SettingsModal(page);
    _memory = new MemoryPanel(page);
    await chat.waitForAppReady();
  });

  test('should complete full Swarm protocol with multiple agents', async ({ page }) => {
    // Send a complex prompt
    await chat.sendMessage(TEST_PROMPTS.systemStatus);

    // Simulate full Swarm protocol
    await chat.simulateSwarmProtocol();

    // Wait for completion
    await chat.waitForStreamingComplete(TIMEOUTS.streaming);

    // Should see agent names in response
    const agentMessages = createSwarmAgentMessages();
    for (const agent of agentMessages) {
      await expect(page.getByText(new RegExp(agent.name, 'i'))).toBeVisible({
        timeout: TIMEOUTS.medium,
      });
    }

    // Should see completion marker
    await expect(page.getByText(/SWARM COMPLETED/i)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });
  });

  test('should maintain chat history across sessions', async ({ page }) => {
    // Create session 1 with Swarm interaction
    await chat.sendMessage('Session 1: First prompt');
    await chat.simulateResponse('Session 1: Response');

    // Create new session
    await sidebar.createSession();

    // Add content to session 2
    await chat.sendMessage('Session 2: Second prompt');
    await chat.simulateResponse('Session 2: Response');

    // Switch back to session 1
    await sidebar.selectSessionByIndex(1);
    await page.waitForTimeout(200);

    // Session 1 content should be visible
    await expect(page.getByText('Session 1: Response')).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // Session 2 content should NOT be visible
    await expect(page.getByText('Session 2: Response')).toBeHidden();
  });

  test('should integrate settings with chat behavior', async ({ page }) => {
    // Configure custom system prompt
    await settings.open();
    await settings.setSystemPrompt('Test system prompt for integration');
    await settings.save();

    // Send message
    await chat.sendMessage('Test with custom prompt');

    // Simulate response
    await chat.simulateResponse('Response using custom prompt');

    // Verify response appears
    await expect(page.getByText('Response using custom prompt')).toBeVisible();

    // Settings should persist
    await settings.open();
    const savedPrompt = await settings.getSystemPrompt();
    expect(savedPrompt).toBe('Test system prompt for integration');
    await settings.close();
  });

  test('should handle multiple concurrent features', async ({ page }) => {
    // 1. Create a session with messages
    await chat.sendMessage('Feature test prompt');
    await chat.simulateResponse('Feature test response with [EXECUTE: "echo test"]');

    // 2. Verify execute pattern detected
    await expect(page.getByText(/EXECUTE/).or(page.getByText(/Wykonuję/))).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // 3. Open settings while chat has content
    await settings.open();
    expect(await settings.isOpen()).toBe(true);

    // 4. Close settings
    await settings.closeWithEscape();

    // 5. Chat should still be visible and functional
    await expect(page.getByText('Feature test response')).toBeVisible();

    // 6. Send another message
    await chat.sendMessage('Follow-up message');
    await chat.simulateResponse('Follow-up response');

    // 7. Both messages should be in chat
    const messageCount = await chat.getMessageCount();
    expect(messageCount).toBeGreaterThanOrEqual(4); // 2 user + 2 assistant
  });

  test('should handle code execution workflow', async ({ page }) => {
    // Send prompt asking for code
    await chat.sendMessage('Write Python code to print hello');

    // Simulate code response
    await chat.simulateCodeResponse('python', 'print("Hello, World!")');

    // Wait for response
    await chat.waitForStreamingComplete();

    // Code block should be visible
    await expect(page.locator('pre code')).toBeVisible({ timeout: TIMEOUTS.medium });

    // Run button should be available
    const runButton = page.locator('button[title*="Uruchom"]');
    await expect(runButton).toBeVisible();

    // Copy button should work
    await chat.clickCopyCodeButton();
    await expect(page.locator('[data-lucide="check"]').first()).toBeVisible({
      timeout: TIMEOUTS.short,
    });
  });

  test('should persist state after page reload', async ({ page }) => {
    // Create content
    await chat.sendMessage('Persistence test');
    await chat.simulateResponse('This should persist');

    // Get session count
    const sessionsBefore = await sidebar.getSessionCount();

    // Reload page
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Reinitialize page objects (they use the page instance)
    chat = new ChatPage(page);
    sidebar = new SessionSidebar(page);

    // Wait for app to be ready again
    await chat.waitForAppReady();

    // Session should still exist
    const sessionsAfter = await sidebar.getSessionCount();
    expect(sessionsAfter).toBe(sessionsBefore);

    // Content should be restored (depends on localStorage persistence)
    // This might need adjustment based on actual persistence implementation
  });

  test('should handle Swarm initialization message', async ({ page }) => {
    // Send prompt that triggers Swarm
    await chat.sendMessage(TEST_PROMPTS.projectAnalysis);

    // Emit Swarm initialization
    await chat.stream.emitChunk(UI_TEXTS.status.swarmInit, false);
    await page.waitForTimeout(100);

    // Should see initialization message
    await expect(page.getByText(/Wilczej Zamieci|Wolf Swarm/i)).toBeVisible({
      timeout: TIMEOUTS.medium,
    });

    // Complete the stream
    await chat.stream.emitChunk('\n\nAnalysis complete.', false);
    await chat.stream.emitChunk('', true);

    await chat.waitForStreamingComplete();
  });
});
