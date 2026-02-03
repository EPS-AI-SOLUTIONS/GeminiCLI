/**
 * Fixtures Index
 *
 * Re-exports all test fixtures for easy importing.
 */

// Test setup with Playwright fixtures pattern
export { test, expect, setupTest, setupThemeTest } from './test-setup';
export type { TestFixtures, SetupOptions, TestContext } from './test-setup';

// Tauri mocks
export {
  injectTauriMocks,
  emitTauriEvent,
  setMockInvokeResult,
  getInvokeHistory,
  clearInvokeHistory,
  emitStreamChunk,
  emitStreamError,
  createMockMemories,
  createMockKnowledgeGraph,
  createTauriMockScript,
  DEFAULT_MOCK_RESPONSES,
} from './tauri-mocks';

// Stream simulator
export {
  StreamSimulator,
  createStreamSimulator,
  createSwarmAgentMessages,
} from './stream-simulator';

// Test data
export {
  TEST_MESSAGES,
  TEST_PROMPTS,
  AGENTS,
  TEST_SESSION_TITLES,
  TEST_SETTINGS,
  SHORTCUTS,
  SELECTORS,
  UI_TEXTS,
  TIMEOUTS,
  LIMITS,
  generateTestId,
  generateText,
  createTestMessage,
} from './test-data';
