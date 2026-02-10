/**
 * GeminiGUI - Skeleton Loading Components
 * @module components/ui/Skeleton
 *
 * Loading placeholder components with Matrix-themed animations.
 * Features pulse and shimmer effects with CSS animations.
 */

import { type CSSProperties, forwardRef, type HTMLAttributes } from 'react';

// ============================================================================
// SKELETON STYLES & ANIMATIONS
// ============================================================================

const skeletonStyles = `
  @keyframes skeletonPulse {
    0%, 100% {
      background-color: rgba(0, 255, 65, 0.05);
      box-shadow: inset 0 0 20px rgba(0, 255, 65, 0.03);
    }
    50% {
      background-color: rgba(0, 255, 65, 0.12);
      box-shadow: inset 0 0 20px rgba(0, 255, 65, 0.08);
    }
  }

  @keyframes skeletonShimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }

  .skeleton-pulse {
    animation: skeletonPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    background-color: rgba(0, 255, 65, 0.05);
    border: 1px solid rgba(0, 255, 65, 0.1);
  }

  .skeleton-shimmer {
    animation: skeletonShimmer 2.5s infinite;
    background: linear-gradient(
      90deg,
      rgba(0, 255, 65, 0.05) 0%,
      rgba(0, 255, 65, 0.15) 50%,
      rgba(0, 255, 65, 0.05) 100%
    );
    background-size: 1000px 100%;
    border: 1px solid rgba(0, 255, 65, 0.1);
  }

  [data-theme='light'] .skeleton-pulse {
    background-color: rgba(5, 150, 105, 0.08);
    border-color: rgba(5, 150, 105, 0.15);
    animation: skeletonPulse-light 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes skeletonPulse-light {
    0%, 100% {
      background-color: rgba(5, 150, 105, 0.08);
      box-shadow: inset 0 0 20px rgba(5, 150, 105, 0.03);
    }
    50% {
      background-color: rgba(5, 150, 105, 0.15);
      box-shadow: inset 0 0 20px rgba(5, 150, 105, 0.08);
    }
  }

  [data-theme='light'] .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      rgba(5, 150, 105, 0.08) 0%,
      rgba(5, 150, 105, 0.18) 50%,
      rgba(5, 150, 105, 0.08) 100%
    );
    border-color: rgba(5, 150, 105, 0.15);
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-pulse,
    .skeleton-shimmer,
    [data-theme='light'] .skeleton-pulse,
    [data-theme='light'] .skeleton-shimmer {
      animation: none;
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('skeleton-styles')) {
  const styleEl = document.createElement('style');
  styleEl.id = 'skeleton-styles';
  styleEl.textContent = skeletonStyles;
  document.head.appendChild(styleEl);
}

// ============================================================================
// TYPES
// ============================================================================

export interface SkeletonBaseProps extends HTMLAttributes<HTMLDivElement> {
  /** Width of the skeleton (CSS value) */
  width?: string | number;
  /** Height of the skeleton (CSS value) */
  height?: string | number;
  /** Animation type: 'pulse' or 'shimmer' */
  variant?: 'pulse' | 'shimmer';
  /** Additional class names */
  className?: string;
}

export interface SkeletonTextProps extends SkeletonBaseProps {
  /** Number of lines to show */
  lines?: number;
  /** Gap between lines */
  gap?: string | number;
}

export interface SkeletonAvatarProps extends SkeletonBaseProps {
  /** Size in pixels */
  size?: number;
}

export interface SkeletonCardProps extends SkeletonBaseProps {
  /** Number of lines in the card */
  lines?: number;
}

export interface SkeletonMessageProps extends SkeletonBaseProps {
  /** Whether this is a user message (right-aligned) */
  isUser?: boolean;
}

// ============================================================================
// SKELETON TEXT
// ============================================================================

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      width = '100%',
      height = '1em',
      lines = 1,
      gap = '0.5rem',
      variant = 'pulse',
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    const lineHeights = Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className={`skeleton-${variant} rounded`}
        style={{
          width: i === lines - 1 ? '80%' : '100%',
          height,
        }}
      />
    ));

    return (
      <div
        ref={ref}
        className={`space-y flex flex-col ${className}`}
        style={
          {
            gap,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {lineHeights}
      </div>
    );
  },
);

SkeletonText.displayName = 'SkeletonText';

// ============================================================================
// SKELETON AVATAR
// ============================================================================

export const SkeletonAvatar = forwardRef<HTMLDivElement, SkeletonAvatarProps>(
  (
    { size = 40, width = size, height = size, variant = 'pulse', className = '', style, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`skeleton-${variant} rounded-full flex-shrink-0 ${className}`}
        style={
          {
            width,
            height,
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    );
  },
);

SkeletonAvatar.displayName = 'SkeletonAvatar';

// ============================================================================
// SKELETON CARD
// ============================================================================

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      width = '100%',
      height = '200px',
      lines = 3,
      variant = 'pulse',
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`skeleton-${variant} rounded-lg p-4 ${className}`}
        style={
          {
            width,
            minHeight: height,
            ...style,
          } as CSSProperties
        }
        {...props}
      >
        {/* Header skeleton */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`skeleton-${variant} rounded-full flex-shrink-0`}
            style={{
              width: '40px',
              height: '40px',
            }}
          />
          <div className="flex-1 space-y-2">
            <div className={`skeleton-${variant} rounded h-4 w-3/4`} />
            <div className={`skeleton-${variant} rounded h-3 w-1/2`} />
          </div>
        </div>

        {/* Content skeleton */}
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div
              key={i}
              className={`skeleton-${variant} rounded h-3 ${i === lines - 1 ? 'w-4/5' : 'w-full'}`}
            />
          ))}
        </div>
      </div>
    );
  },
);

SkeletonCard.displayName = 'SkeletonCard';

// ============================================================================
// SKELETON MESSAGE
// ============================================================================

export const SkeletonMessage = forwardRef<HTMLDivElement, SkeletonMessageProps>(
  (
    {
      width = '60%',
      height = '80px',
      isUser = false,
      variant = 'pulse',
      className = '',
      style,
      ...props
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} py-2 px-4`}
        {...props}
      >
        <div
          className={`skeleton-${variant} rounded-lg ${className}`}
          style={
            {
              width,
              minHeight: height,
              ...style,
            } as CSSProperties
          }
        />
      </div>
    );
  },
);

SkeletonMessage.displayName = 'SkeletonMessage';

// ============================================================================
// SKELETON (Generic / Flexible)
// ============================================================================

export const Skeleton = forwardRef<HTMLDivElement, SkeletonBaseProps>(
  (
    { width = '100%', height = '1rem', variant = 'pulse', className = '', style, ...props },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={`skeleton-${variant} ${className}`}
        style={
          {
            width,
            height,
            ...style,
          } as CSSProperties
        }
        {...props}
      />
    );
  },
);

Skeleton.displayName = 'Skeleton';

export default Skeleton;
