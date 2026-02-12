/**
 * Components barrel export - ClaudeHydra
 * All component re-exports for clean imports
 */

// UI primitives
export { Button } from './ui/Button';
export { PanelHeader } from './ui/PanelHeader';
export { Skeleton } from './ui/Skeleton';

// Chat components
export {
  ChatInput,
  ChatMessageContextMenu,
  DragDropZone,
  MessageList,
  MessageSkeleton,
  ModelSelector,
  TabBar,
} from './chat';

// Layout
export { Header } from './layout/Header';

// Views
export { AgentsView } from './AgentsView';
export { default as ChatContainer } from './ChatContainer';
export { HistoryView } from './HistoryView';
export { MemoryPanel } from './MemoryPanel';
export { default as WelcomeScreen } from './WelcomeScreen';

// Modals
export { SettingsModal } from './SettingsModal';
export { ShortcutsModal } from './ShortcutsModal';

// Sidebar & Navigation
export { default as Sidebar } from './Sidebar';
export { SessionSidebar } from './SessionSidebar';

// System
export { SystemContextMenu } from './SystemContextMenu';
export { default as ErrorBoundary } from './ErrorBoundary';
export { default as SuspenseFallback } from './SuspenseFallback';
export { StatusFooter } from './StatusFooter';
export { CodeBlock } from './CodeBlock';

// Effects
export { WitcherRunes } from './effects/WitcherRunes';

// Lazy-loaded components
export {
  SettingsModalLazy,
  MemoryPanelLazy,
  ShortcutsModalLazy,
  WitcherRunesLazy,
  SystemContextMenuLazy,
} from './LazyComponents';
