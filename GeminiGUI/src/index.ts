/**
 * GeminiGUI - Main Barrel Export
 * @module index
 *
 * Centralized entry point for all GeminiGUI exports.
 * This allows consumers to import from '@/index' or the package root.
 *
 * Usage:
 *   import { ChatContainer, useAppStore, LIMITS } from '@/index';
 *   import type { Message, Session, Settings } from '@/index';
 */

// ============================================================================
// COMPONENTS
// ============================================================================

// Main Components
export {
  Button,
  ChatContainer,
  ChatInput,
  CodeBlock,
  DragDropZone,
  ErrorBoundary,
  MemoryPanel,
  MessageList,
  ModelSelector,
  SessionSidebar,
  SettingsModal,
  StatusFooter,
} from './components';
export type {
  ChatInputProps,
  DragDropZoneProps,
  MessageListProps,
  MessageSkeletonProps,
  ModelSelectorProps,
} from './components/chat';
// Chat Components (with defaults)
export {
  ChatInputDefault,
  DragDropZoneDefault,
  MessageListDefault,
  MessageSkeleton,
  MessageSkeletonDefault,
  MessageStreamSkeleton,
  ModelSelectorDefault,
} from './components/chat';
export type {
  ButtonProps,
  SkeletonAvatarProps,
  SkeletonBaseProps,
  SkeletonCardProps,
  SkeletonMessageProps,
  SkeletonTextProps,
} from './components/ui';
// UI Components
export {
  ButtonDefault,
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonMessage,
  SkeletonText,
} from './components/ui';

// ============================================================================
// HOOKS
// ============================================================================

export {
  isHotkeyPressed,
  useAppKeyboardShortcuts,
  useAppTheme,
  useEnvLoader,
  useGeminiModels,
  useStreamListeners,
} from './hooks';

// ============================================================================
// SERVICES
// ============================================================================

export type {
  AgentMemory,
  EnvVars,
  KnowledgeEdge,
  KnowledgeGraph,
  KnowledgeNode,
} from './services';
export {
  BridgeService,
  MemoryService,
  SystemService,
  TauriService,
  TauriServiceDefault,
} from './services';

// ============================================================================
// STORE (Zustand State Management)
// ============================================================================

export {
  selectCount,
  selectCurrentMessages,
  selectCurrentSession,
  selectCurrentSessionId,
  selectDefaultProvider,
  selectGeminiApiKey,
  selectHasMessages,
  selectIsApiKeySet,
  selectIsAppReady,
  selectOllamaEndpoint,
  selectProvider,
  selectSessionById,
  selectSessionCount,
  selectSessions,
  selectSettings,
  selectSystemPrompt,
  selectTheme,
  selectUseSwarm,
  useAppStore,
} from './store';

// ============================================================================
// TYPES
// ============================================================================

export type {
  AgentMemory as AgentMemoryType,
  AppState,
  BridgeRequest,
  BridgeState,
  KnowledgeEdge as KnowledgeEdgeType,
  KnowledgeGraph as KnowledgeGraphType,
  KnowledgeNode as KnowledgeNodeType,
  Message,
  MessageRole,
  Provider,
  Session,
  Settings,
  StreamPayload,
  Theme,
} from './types';

// ============================================================================
// CONSTANTS
// ============================================================================

export {
  AGENTS,
  COMMAND_PATTERNS,
  DEFAULT_SETTINGS,
  DEFAULT_SYSTEM_PROMPT,
  FALLBACK_MODELS,
  KEYBOARD_SHORTCUTS,
  KEYBOARD_SHORTCUTS_LABELS,
  LIMITS,
  QUERY_KEYS,
  STATUS,
  STORAGE_KEYS,
  TAURI_COMMANDS,
  TAURI_EVENTS,
  UI,
} from './constants';

// ============================================================================
// UTILITIES
// ============================================================================

export {
  isValidApiKey,
  isValidUrl,
  sanitizeContent,
  sanitizeTitle,
} from './utils/validators';
