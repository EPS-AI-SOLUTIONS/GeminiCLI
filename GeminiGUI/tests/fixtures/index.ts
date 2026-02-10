/**
 * Fixtures Index
 *
 * Re-exports all test fixtures for easy importing.
 */

// Stream simulator
export {
  createStreamSimulator,
  createSwarmAgentMessages,
  StreamSimulator,
} from './stream-simulator';
// Tauri mocks
export {
  clearInvokeHistory,
  createMockKnowledgeGraph,
  createMockMemories,
  createTauriMockScript,
  DEFAULT_MOCK_RESPONSES,
  emitStreamChunk,
  emitStreamError,
  emitTauriEvent,
  getInvokeHistory,
  injectTauriMocks,
  setMockInvokeResult,
} from './tauri-mocks';
// Test data
export {
  AGENTS,
  createTestMessage,
  generateTestId,
  generateText,
  LIMITS,
  SELECTORS,
  SHORTCUTS,
  TEST_MESSAGES,
  TEST_PROMPTS,
  TEST_SESSION_TITLES,
  TEST_SETTINGS,
  TIMEOUTS,
  UI_TEXTS,
} from './test-data';
export type { SetupOptions, TestContext, TestFixtures } from './test-setup';
// Test setup with Playwright fixtures pattern
export { expect, setupTest, setupThemeTest, test } from './test-setup';
