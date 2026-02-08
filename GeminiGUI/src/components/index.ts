/**
 * GeminiGUI - Components Barrel Export
 * @module components
 *
 * Main component exports for the application.
 */

// Main Layout Components
export { ChatContainer } from './ChatContainer';
export { SessionSidebar } from './SessionSidebar';
export { SettingsModal } from './SettingsModal';
export { StatusFooter } from './StatusFooter';

// Feature Components
export { MemoryPanel } from './MemoryPanel';

// Utility Components
export { CodeBlock } from './CodeBlock';
export { ErrorBoundary } from './ErrorBoundary';
export { SuspenseFallback } from './SuspenseFallback';

// Lazy Components (Code Splitting)
export {
  SettingsModalLazy,
  MemoryPanelLazy,
  ShortcutsModalLazy,
  WitcherRunesLazy,
  SystemContextMenuLazy,
} from './LazyComponents';

// UI Components
export { Button } from './ui';

// Chat Components
export { MessageList, ChatInput, ModelSelector, DragDropZone } from './chat';
