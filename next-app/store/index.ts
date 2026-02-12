/**
 * ClaudeHydra - Store Barrel Export
 * @module store
 *
 * Centralized Zustand state management with SSR hydration guard.
 *
 * Usage:
 *   import { useAppStore, selectTheme, useIsHydrated } from '@/store';
 *   const theme = useAppStore(selectTheme);
 *   const isHydrated = useIsHydrated();
 */

// ============================================================================
// MAIN STORE
// ============================================================================

export { useAppStore } from './useAppStore';
export type { AppStateWithPagination } from './useAppStore';

// ============================================================================
// SSR HYDRATION GUARD
// ============================================================================

export { useHydrated, useIsHydrated } from './useHydrated';

// ============================================================================
// BASIC STATE SELECTORS (Primitive Values)
// ============================================================================

export {
  selectCount,
  selectCurrentSessionId,
  selectCurrentView,
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
