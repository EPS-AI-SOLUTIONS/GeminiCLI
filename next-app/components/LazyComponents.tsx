'use client';

/**
 * ClaudeHydra - Lazy-loaded components for code splitting
 * Uses next/dynamic for proper Next.js integration with SSR control.
 *
 * Benefits:
 * - Reduces initial bundle size
 * - Code splitting at component level
 * - Better performance for users with slower connections
 * - Components only loaded when needed
 * - SSR disabled for client-only components
 */

import dynamic from 'next/dynamic';

/** Lazy-loaded SettingsModal - heavy due to form fields and model fetching */
const SettingsModalLazy = dynamic(
  () => import('./SettingsModal').then((m) => ({ default: m.SettingsModal })),
  { ssr: false },
);

/** Lazy-loaded MemoryPanel - heavy due to knowledge graph visualization */
const MemoryPanelLazy = dynamic(
  () => import('./MemoryPanel').then((m) => ({ default: m.MemoryPanel })),
  { ssr: false },
);

/** Lazy-loaded ShortcutsModal - keyboard shortcuts reference */
const ShortcutsModalLazy = dynamic(
  () => import('./ShortcutsModal').then((m) => ({ default: m.ShortcutsModal })),
  { ssr: false },
);

/** Lazy-loaded WitcherRunes - heavy due to continuous canvas animation */
const WitcherRunesLazy = dynamic(
  () => import('./effects/WitcherRunes').then((m) => ({ default: m.WitcherRunes })),
  { ssr: false },
);

/** Lazy-loaded SystemContextMenu - custom context menu with DOM event listeners */
const SystemContextMenuLazy = dynamic(
  () => import('./SystemContextMenu').then((m) => ({ default: m.SystemContextMenu })),
  { ssr: false },
);

export {
  SettingsModalLazy,
  MemoryPanelLazy,
  ShortcutsModalLazy,
  WitcherRunesLazy,
  SystemContextMenuLazy,
};
