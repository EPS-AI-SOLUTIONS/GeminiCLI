/**
 * Store Slices - Re-export all slice modules
 */

// Chat Slice
export {
  type ChatActions,
  type ChatSlice,
  type ChatState,
  createChatSlice,
  initialChatState,
  selectChatHistory,
  selectCurrentMessages,
  selectHasMessages,
  selectMessageCount,
} from './chatSlice';

// Session Slice
export {
  createSessionSlice,
  initialSessionState,
  type SessionActions,
  type SessionSlice,
  type SessionState,
  selectCurrentSessionId,
  selectSessionById,
  selectSessions,
} from './sessionSlice';
// Settings Slice
export {
  createSettingsSlice,
  initialSettingsState,
  type SettingsActions,
  type SettingsSlice,
  type SettingsState,
  selectIsApiKeySet,
  selectSettings,
  selectUseSwarm,
} from './settingsSlice';
// UI Slice
export {
  createUISlice,
  initialUIState,
  selectCount,
  selectProvider,
  selectTheme,
  type UIActions,
  type UISlice,
  type UIState,
} from './uiSlice';
