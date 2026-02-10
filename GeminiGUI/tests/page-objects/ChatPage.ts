/**
 * Chat Page Object for Playwright E2E Tests
 *
 * Handles interactions with the main chat interface.
 */

import { expect, type Locator, type Page } from '@playwright/test';
import { StreamSimulator } from '../fixtures/stream-simulator';
import { SELECTORS, TIMEOUTS } from '../fixtures/test-data';
import { BasePage } from './BasePage';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class ChatPage extends BasePage {
  // Locators
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly messageList: Locator;
  readonly streamingCursor: Locator;
  readonly emptyState: Locator;
  readonly characterCounter: Locator;

  // Stream simulator
  readonly stream: StreamSimulator;

  constructor(page: Page) {
    super(page);
    this.chatInput = page.locator(SELECTORS.chatInput);
    this.sendButton = page.locator(SELECTORS.sendButton);
    this.messageList = page.locator(SELECTORS.messageList);
    this.streamingCursor = page.locator(SELECTORS.streamingCursor);
    this.emptyState = page.getByText('Oczekiwanie na dane');
    this.characterCounter = page.locator('[class*="text-xs"]').filter({ hasText: /\d+\/\d+/ });
    this.stream = new StreamSimulator(page);
  }

  /**
   * Send a message via the chat input
   */
  async sendMessage(text: string): Promise<void> {
    await this.chatInput.fill(text);
    await this.sendButton.click();
  }

  /**
   * Send a message using Enter key
   */
  async sendMessageWithEnter(text: string): Promise<void> {
    await this.chatInput.fill(text);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Type text with Shift+Enter for newlines
   */
  async typeMultilineMessage(lines: string[]): Promise<void> {
    await this.chatInput.focus();
    for (let i = 0; i < lines.length; i++) {
      await this.chatInput.pressSequentially(lines[i]);
      if (i < lines.length - 1) {
        await this.page.keyboard.press('Shift+Enter');
      }
    }
  }

  /**
   * Get the current input value
   */
  async getInputValue(): Promise<string> {
    return this.chatInput.inputValue();
  }

  /**
   * Clear the chat input
   */
  async clearInput(): Promise<void> {
    await this.chatInput.clear();
  }

  /**
   * Check if send button is enabled
   */
  async isSendEnabled(): Promise<boolean> {
    return this.sendButton.isEnabled();
  }

  /**
   * Get all message contents
   */
  async getAllMessages(): Promise<Message[]> {
    const messages: Message[] = [];
    const markdownBodies = this.page.locator(SELECTORS.markdownBody);
    const count = await markdownBodies.count();

    for (let i = 0; i < count; i++) {
      const element = markdownBodies.nth(i);
      const content = (await element.textContent()) || '';

      // Determine role based on parent element styling
      const parent = element.locator('..');
      const isUser = await parent.evaluate((el) =>
        el.className.includes('bg-[var(--matrix-accent)]'),
      );
      const isSystem = await parent.evaluate((el) => el.className.includes('bg-blue-900'));

      let role: 'user' | 'assistant' | 'system' = 'assistant';
      if (isUser) role = 'user';
      if (isSystem) role = 'system';

      messages.push({ role, content: content.trim() });
    }

    return messages;
  }

  /**
   * Get the last message content
   */
  async getLastMessageContent(): Promise<string> {
    const markdownBodies = this.page.locator(SELECTORS.markdownBody);
    const count = await markdownBodies.count();
    if (count === 0) return '';
    return (await markdownBodies.nth(count - 1).textContent()) || '';
  }

  /**
   * Get message count
   */
  async getMessageCount(): Promise<number> {
    return this.page.locator(SELECTORS.markdownBody).count();
  }

  /**
   * Check if streaming is active
   */
  async isStreaming(): Promise<boolean> {
    return this.streamingCursor.isVisible();
  }

  /**
   * Wait for streaming to complete
   */
  async waitForStreamingComplete(timeout: number = TIMEOUTS.streaming): Promise<void> {
    await expect(this.streamingCursor).toBeHidden({ timeout });
  }

  /**
   * Wait for streaming to start
   */
  async waitForStreamingStart(timeout: number = TIMEOUTS.medium): Promise<void> {
    await expect(this.streamingCursor).toBeVisible({ timeout });
  }

  /**
   * Check if empty state is displayed
   */
  async isEmptyStateVisible(): Promise<boolean> {
    return this.emptyState.isVisible();
  }

  /**
   * Get character count from counter display
   */
  async getCharacterCount(): Promise<{ current: number; max: number }> {
    const text = await this.characterCounter.textContent();
    const match = text?.match(/(\d+)\/(\d+)/);
    if (match) {
      return {
        current: parseInt(match[1], 10),
        max: parseInt(match[2], 10),
      };
    }
    return { current: 0, max: 4000 };
  }

  /**
   * Copy last message to clipboard
   */
  async copyLastMessage(): Promise<void> {
    const lastMessage = this.page.locator(SELECTORS.markdownBody).last();
    await lastMessage.hover();
    const copyButton = this.page.locator(SELECTORS.copyButton).last();
    await copyButton.click();
  }

  /**
   * Check if copy success indicator is shown
   */
  async isCopySuccessShown(): Promise<boolean> {
    return this.page.locator(SELECTORS.checkIcon).last().isVisible();
  }

  /**
   * Scroll to bottom of message list
   */
  async scrollToBottom(): Promise<void> {
    await this.messageList.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /**
   * Scroll to top of message list
   */
  async scrollToTop(): Promise<void> {
    await this.messageList.evaluate((el) => {
      el.scrollTop = 0;
    });
  }

  /**
   * Wait for specific text to appear in messages
   */
  async waitForMessageText(text: string, timeout: number = TIMEOUTS.medium): Promise<void> {
    await expect(this.page.locator(SELECTORS.markdownBody).filter({ hasText: text })).toBeVisible({
      timeout,
    });
  }

  /**
   * Check if code block exists in messages
   */
  async hasCodeBlock(): Promise<boolean> {
    return this.page.locator(SELECTORS.codeBlock).isVisible();
  }

  /**
   * Get code block content
   */
  async getCodeBlockContent(): Promise<string> {
    return (await this.page.locator(SELECTORS.codeBlock).first().textContent()) || '';
  }

  /**
   * Click run button on code block
   */
  async clickRunButton(): Promise<void> {
    await this.page.locator(SELECTORS.runButton).first().click();
  }

  /**
   * Click copy button on code block
   */
  async clickCopyCodeButton(): Promise<void> {
    await this.page.locator(SELECTORS.copyButton).first().click();
  }

  /**
   * Click save to file button on code block
   */
  async clickSaveToFileButton(): Promise<void> {
    await this.page.locator(SELECTORS.saveToFileButton).first().click();
  }

  /**
   * Simulate a full streaming response
   */
  async simulateResponse(text: string): Promise<void> {
    await this.stream.simulateInstantResponse(text);
  }

  /**
   * Simulate a typing streaming response
   */
  async simulateTypingResponse(text: string, delayMs: number = 30): Promise<void> {
    await this.stream.simulateTypingResponse(text, { delayMs });
  }

  /**
   * Simulate a markdown response
   */
  async simulateMarkdownResponse(): Promise<void> {
    await this.stream.simulateMarkdownResponse();
  }

  /**
   * Simulate a code response
   */
  async simulateCodeResponse(language: string, code: string): Promise<void> {
    await this.stream.simulateCodeResponse(language, code);
  }

  /**
   * Simulate an execute command response
   */
  async simulateExecuteResponse(command: string): Promise<void> {
    await this.stream.simulateExecuteResponse(command);
  }

  /**
   * Simulate a stream error
   */
  async simulateStreamError(error: string): Promise<void> {
    await this.stream.emitError(error);
  }

  /**
   * Simulate Swarm protocol with multiple agents
   */
  async simulateSwarmProtocol(): Promise<void> {
    const { createSwarmAgentMessages } = await import('../fixtures/stream-simulator');
    await this.stream.simulateSwarmProtocol(createSwarmAgentMessages());
  }
}
