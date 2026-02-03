/**
 * Lazy-loaded components for code splitting and performance optimization
 * Uses React 19 patterns with proper Suspense integration
 * Ported from ClaudeHydra.
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Code splitting at component level
 * - Better performance for users with slower connections
 * - Components only loaded when needed
 */

import { lazy } from 'react';

/**
 * Lazy-loaded SettingsModal component
 * Heavy component due to extensive form fields
 */
const SettingsModalLazy = lazy(() =>
  import('./SettingsModal').then((m) => ({
    default: m.SettingsModal,
  }))
);

/**
 * Lazy-loaded MemoryPanel component
 * Heavy due to knowledge graph visualization
 */
const MemoryPanelLazy = lazy(() =>
  import('./MemoryPanel').then((m) => ({
    default: m.MemoryPanel,
  }))
);

/**
 * Lazy-loaded BridgePanel component
 * Contains command approval system
 */
const BridgePanelLazy = lazy(() =>
  import('./BridgePanel').then((m) => ({
    default: m.BridgePanel,
  }))
);

/**
 * Lazy-loaded ShortcutsModal component
 * Keyboard shortcuts reference
 */
const ShortcutsModalLazy = lazy(() =>
  import('./ShortcutsModal').then((m) => ({
    default: m.ShortcutsModal,
  }))
);

export {
  SettingsModalLazy,
  MemoryPanelLazy,
  BridgePanelLazy,
  ShortcutsModalLazy,
};
