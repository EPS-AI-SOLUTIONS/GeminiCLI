/**
 * GeminiGUI - Chat Components Barrel Export
 * @module components/chat
 *
 * Sub-components for the ChatContainer, organized by feature.
 * All chat-related components are centrally exported from this file.
 *
 * Usage:
 *   import { MessageList, ChatInput, ModelSelector } from '@/components/chat';
 *   import type { MessageListProps, ChatInputProps } from '@/components/chat';
 */

// ============================================================================
// MESSAGE DISPLAY COMPONENTS
// ============================================================================

export { ChatMessageContextMenu } from './ChatMessageContextMenu';
export type { MessageListProps } from './MessageList';
export { default as MessageListDefault, MessageList } from './MessageList';
export type { MessageSkeletonProps } from './MessageSkeleton';
export {
  default as MessageSkeletonDefault,
  MessageSkeleton,
  MessageStreamSkeleton,
} from './MessageSkeleton';

// ============================================================================
// INPUT & INTERACTION COMPONENTS
// ============================================================================

export type { ChatInputProps } from './ChatInput';
export { ChatInput, default as ChatInputDefault } from './ChatInput';
export type { DragDropZoneProps } from './DragDropZone';
export { DragDropZone, default as DragDropZoneDefault } from './DragDropZone';

// ============================================================================
// MODEL SELECTION COMPONENT
// ============================================================================

export type { ModelSelectorProps } from './ModelSelector';
export { default as ModelSelectorDefault, ModelSelector } from './ModelSelector';
