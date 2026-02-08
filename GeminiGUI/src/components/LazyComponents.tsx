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
 *
 * Usage: Wrap in <Suspense fallback={...}> at the call site.
 */

import { lazy } from 'react';

/**
 * Lazy-loaded SettingsModal component
 * Heavy component due to extensive form fields and model fetching
 */
const SettingsModalLazy = lazy(() =>
  import('./SettingsModal').then((m) => ({
    default: m.SettingsModal,
  }))
);

/**
 * Lazy-loaded MemoryPanel component
 * Heavy due to knowledge graph visualization and agent memory data fetching
 */
const MemoryPanelLazy = lazy(() =>
  import('./MemoryPanel').then((m) => ({
    default: m.MemoryPanel,
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

/**
 * Lazy-loaded WitcherRunes component
 * Heavy due to continuous canvas animation (setInterval drawing loop)
 * Defers loading of the visual effect to prioritize critical UI
 */
const WitcherRunesLazy = lazy(() =>
  import('./effects/WitcherRunes').then((m) => ({
    default: m.WitcherRunes,
  }))
);

/**
 * Lazy-loaded SystemContextMenu component
 * Custom context menu with DOM event listeners
 * Not needed until user right-clicks, so defer loading
 */
const SystemContextMenuLazy = lazy(() =>
  import('./SystemContextMenu').then((m) => ({
    default: m.SystemContextMenu,
  }))
);

export {
  SettingsModalLazy,
  MemoryPanelLazy,
  ShortcutsModalLazy,
  WitcherRunesLazy,
  SystemContextMenuLazy,
};
