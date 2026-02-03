/**
 * Settings Modal Page Object for Playwright E2E Tests
 *
 * Handles settings modal interactions.
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { SELECTORS, SHORTCUTS, TIMEOUTS, UI_TEXTS } from '../fixtures/test-data';

export class SettingsModal extends BasePage {
  // Locators
  readonly modal: Locator;
  readonly closeButton: Locator;
  readonly ollamaEndpointInput: Locator;
  readonly geminiApiKeyInput: Locator;
  readonly systemPromptTextarea: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly clearChatButton: Locator;
  readonly factoryResetButton: Locator;
  readonly providerSelect: Locator;
  readonly swarmToggle: Locator;

  constructor(page: Page) {
    super(page);
    this.modal = page.locator(SELECTORS.settingsModal);
    this.closeButton = this.modal.locator('button').filter({
      has: page.locator('[data-lucide="x"]'),
    });
    this.ollamaEndpointInput = this.modal.locator(SELECTORS.ollamaInput);
    this.geminiApiKeyInput = this.modal.locator(SELECTORS.apiKeyInput);
    this.systemPromptTextarea = this.modal.locator(SELECTORS.systemPromptTextarea);
    this.saveButton = this.modal.locator(SELECTORS.saveButton);
    this.cancelButton = this.modal.locator(SELECTORS.cancelButton);
    this.clearChatButton = this.modal.locator(SELECTORS.clearChatButton);
    this.factoryResetButton = this.modal.getByText(UI_TEXTS.settings.factoryReset);
    this.providerSelect = this.modal.locator('select').first();
    this.swarmToggle = this.modal.locator('input[type="checkbox"]').first();
  }

  /**
   * Open settings modal using keyboard shortcut
   */
  async open(): Promise<void> {
    await this.page.keyboard.press(SHORTCUTS.openSettings);
    await expect(this.modal).toBeVisible({ timeout: TIMEOUTS.medium });
  }

  /**
   * Close settings modal using X button
   */
  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.modal).toBeHidden({ timeout: TIMEOUTS.short });
  }

  /**
   * Close settings using Escape key
   */
  async closeWithEscape(): Promise<void> {
    await this.page.keyboard.press(SHORTCUTS.escape);
    await expect(this.modal).toBeHidden({ timeout: TIMEOUTS.short });
  }

  /**
   * Check if modal is open
   */
  async isOpen(): Promise<boolean> {
    return this.modal.isVisible();
  }

  /**
   * Set Ollama endpoint
   */
  async setOllamaEndpoint(url: string): Promise<void> {
    await this.ollamaEndpointInput.clear();
    await this.ollamaEndpointInput.fill(url);
  }

  /**
   * Get Ollama endpoint value
   */
  async getOllamaEndpoint(): Promise<string> {
    return this.ollamaEndpointInput.inputValue();
  }

  /**
   * Set Gemini API key
   */
  async setGeminiApiKey(key: string): Promise<void> {
    await this.geminiApiKeyInput.clear();
    await this.geminiApiKeyInput.fill(key);
  }

  /**
   * Get Gemini API key value
   */
  async getGeminiApiKey(): Promise<string> {
    return this.geminiApiKeyInput.inputValue();
  }

  /**
   * Check if API key input is masked (type="password")
   */
  async isApiKeyMasked(): Promise<boolean> {
    const type = await this.geminiApiKeyInput.getAttribute('type');
    return type === 'password';
  }

  /**
   * Set system prompt
   */
  async setSystemPrompt(prompt: string): Promise<void> {
    await this.systemPromptTextarea.clear();
    await this.systemPromptTextarea.fill(prompt);
  }

  /**
   * Get system prompt value
   */
  async getSystemPrompt(): Promise<string> {
    return this.systemPromptTextarea.inputValue();
  }

  /**
   * Save settings
   */
  async save(): Promise<void> {
    await this.saveButton.click();
    await expect(this.modal).toBeHidden({ timeout: TIMEOUTS.short });
  }

  /**
   * Cancel and close modal
   */
  async cancel(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.modal).toBeHidden({ timeout: TIMEOUTS.short });
  }

  /**
   * Clear chat history
   */
  async clearChat(): Promise<void> {
    // Set up dialog handler
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.clearChatButton.click();
  }

  /**
   * Perform factory reset
   */
  async factoryReset(): Promise<void> {
    // Set up dialog handler
    this.page.once('dialog', (dialog) => dialog.accept());
    await this.factoryResetButton.click();
  }

  /**
   * Select default provider
   */
  async selectProvider(provider: 'ollama' | 'gemini'): Promise<void> {
    await this.providerSelect.selectOption(provider);
  }

  /**
   * Get selected provider
   */
  async getSelectedProvider(): Promise<string> {
    return this.providerSelect.inputValue();
  }

  /**
   * Toggle Swarm mode
   */
  async toggleSwarm(): Promise<void> {
    await this.swarmToggle.click();
  }

  /**
   * Check if Swarm is enabled
   */
  async isSwarmEnabled(): Promise<boolean> {
    return this.swarmToggle.isChecked();
  }

  /**
   * Get all settings values
   */
  async getAllSettings(): Promise<{
    ollamaEndpoint: string;
    geminiApiKey: string;
    systemPrompt: string;
    provider: string;
    swarmEnabled: boolean;
  }> {
    return {
      ollamaEndpoint: await this.getOllamaEndpoint(),
      geminiApiKey: await this.getGeminiApiKey(),
      systemPrompt: await this.getSystemPrompt(),
      provider: await this.getSelectedProvider(),
      swarmEnabled: await this.isSwarmEnabled(),
    };
  }

  /**
   * Fill all settings at once
   */
  async fillSettings(settings: {
    ollamaEndpoint?: string;
    geminiApiKey?: string;
    systemPrompt?: string;
    provider?: 'ollama' | 'gemini';
  }): Promise<void> {
    if (settings.ollamaEndpoint) {
      await this.setOllamaEndpoint(settings.ollamaEndpoint);
    }
    if (settings.geminiApiKey) {
      await this.setGeminiApiKey(settings.geminiApiKey);
    }
    if (settings.systemPrompt) {
      await this.setSystemPrompt(settings.systemPrompt);
    }
    if (settings.provider) {
      await this.selectProvider(settings.provider);
    }
  }

  /**
   * Check if save button is enabled
   */
  async isSaveEnabled(): Promise<boolean> {
    return this.saveButton.isEnabled();
  }

  /**
   * Check if modal title is correct
   */
  async hasCorrectTitle(): Promise<boolean> {
    return this.modal.getByText(UI_TEXTS.settings.title).isVisible();
  }

  /**
   * Wait for modal to be visible
   */
  async waitForOpen(timeout: number = TIMEOUTS.medium): Promise<void> {
    await expect(this.modal).toBeVisible({ timeout });
  }

  /**
   * Wait for modal to be hidden
   */
  async waitForClose(timeout: number = TIMEOUTS.short): Promise<void> {
    await expect(this.modal).toBeHidden({ timeout });
  }
}
