/**
 * GeminiGUI - UI Components Barrel Export
 * @module components/ui
 *
 * Atomic UI components for the application.
 * All UI components are centrally exported from this file.
 *
 * Usage:
 *   import { Button, Skeleton, Toast } from '@/components/ui';
 *   import type { ButtonProps, ToastProps } from '@/components/ui';
 */

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

export type { ButtonProps } from './Button';
export { Button, default as ButtonDefault } from './Button';

// ============================================================================
// SKELETON COMPONENTS (Loading States)
// ============================================================================

export type {
  SkeletonAvatarProps,
  SkeletonBaseProps,
  SkeletonCardProps,
  SkeletonMessageProps,
  SkeletonTextProps,
} from './Skeleton';
export {
  Skeleton,
  SkeletonAvatar,
  SkeletonCard,
  SkeletonMessage,
  SkeletonText,
} from './Skeleton';

// ============================================================================
// PANEL HEADER COMPONENT
// ============================================================================

export { PanelHeader } from './PanelHeader';
