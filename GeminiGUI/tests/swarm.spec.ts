import { expect, test } from '@playwright/test';

test.describe('GeminiHydra Wolf Swarm', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Critical: Wait for React to hydrate. 'networkidle' is too strict for polling apps.
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('header h1')).toContainText('Gemini', { timeout: 15000 });
  });

  test('FULL SWARM PROTOCOL: Execute 12 Agents', async ({ page }) => {
    // 1. Verify Swarm Badge
    await expect(page.getByText('Wolf Swarm Active')).toBeVisible();

    // 2. Input Mission
    const mission = 'Zbuduj nową fortecę w Kaer Morhen';
    const input = page.locator('input[placeholder*="Wpisz cel"]');
    await input.fill(mission);
    await page.keyboard.press('Enter');

    // 3. Watch the spectacle
    // We expect the chat to fill up with agent responses.
    // We wait for Jaskier (the last one) to confirm the sequence finished.

    const chatArea = page.locator('.message-bubble.assistant').last();

    // Check specific Agents
    await expect(chatArea).toContainText('Dijkstra', { timeout: 30000 }); // Strategist
    await expect(chatArea).toContainText('Geralt'); // Security
    await expect(chatArea).toContainText('Yennefer'); // Architect

    // Check completion
    await expect(chatArea).toContainText('Jaskier', { timeout: 30000 });
    await expect(chatArea).toContainText('[SWARM COMPLETED]');
  });

  test('Command Execution Loop', async ({ page }) => {
    // ...
    await page.getByTitle('Ustawienia').click();
    await expect(page.getByText('Ustawienia Aplikacji')).toBeVisible({ timeout: 10000 });
  });
});
