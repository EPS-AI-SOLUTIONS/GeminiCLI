/**
 * Store Slices - Re-export all slice modules
 */

// UI Slice
export {
  createUISlice,
  initialUIState,
  selectTheme,
  selectCount,
  selectProvider,
  type UIState,
  type UIActions,
  type UISlice,
} from './uiSlice';

// Session Slice
export {
  createSessionSlice,
  initialSessionState,
  selectSessions,
  selectCurrentSessionId,
  selectSessionById,
  type SessionState,
  type SessionActions,
  type SessionSlice,
} from './sessionSlice';

// Chat Slice
export {
  createChatSlice,
  initialChatState,
  selectChatHistory,
  selectCurrentMessages,
  selectMessageCount,
  selectHasMessages,
  type ChatState,
  type ChatActions,
  type ChatSlice,
} from './chatSlice';

// Settings Slice
export {
  createSettingsSlice,
  initialSettingsState,
  selectSettings,
  selectIsApiKeySet,
  selectUseSwarm,
  selectOllamaEndpoint,
  type SettingsState,
  type SettingsActions,
  type SettingsSlice,
} from './settingsSlice';
