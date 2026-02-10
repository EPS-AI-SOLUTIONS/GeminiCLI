/**
 * GeminiGUI - Store Barrel Export
 * @module store
 *
 * Centralized Zustand state management with memoized selectors.
 * Provides access to the global app store and optimized selectors
 * for performance-critical component subscriptions.
 *
 * Usage:
 *   import { useAppStore, selectTheme } from '@/store';
 *   const theme = useAppStore(selectTheme);
 *   const isApiKeySet = useAppStore(selectIsApiKeySet);
 */

// ============================================================================
// MAIN STORE
// ============================================================================

export { useAppStore } from './useAppStore';

// ============================================================================
// BASIC STATE SELECTORS (Primitive Values)
// ============================================================================

export {
  selectCount,
  selectCurrentSessionId,
  selectProvider,
  selectTheme,
} from './selectors';

// ============================================================================
// SETTINGS SELECTORS
// ============================================================================

export {
  selectDefaultProvider,
  selectGeminiApiKey,
  selectIsApiKeySet,
  selectOllamaEndpoint,
  selectSettings,
  selectSystemPrompt,
  selectUseSwarm,
} from './selectors';

// ============================================================================
// SESSION SELECTORS
// ============================================================================

export {
  selectCurrentSession,
  selectSessionById,
  selectSessionCount,
  selectSessionHasMessages,
  selectSessionMetadata,
  selectSessions,
} from './selectors';

// ============================================================================
// MESSAGE SELECTORS
// ============================================================================

export {
  selectChatHistory,
  selectCurrentMessages,
  selectHasMessages,
  selectLastMessage,
  selectLastMessageBySessionId,
  selectMessageCount,
  selectMessageCountBySessionId,
  selectMessagesBySessionId,
} from './selectors';

// ============================================================================
// COMPUTED STATE SELECTORS
// ============================================================================

export {
  selectApiConfigStatus,
  selectIsAppReady,
  selectRuntimeSettings,
} from './selectors';

// ============================================================================
// PAGINATION SELECTORS
// ============================================================================

export {
  selectPaginatedMessages,
  selectPaginationInfo,
  selectTotalPages,
} from './selectors';
