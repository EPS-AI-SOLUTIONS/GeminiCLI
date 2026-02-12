'use client';

/**
 * ClaudeHydra - Message Skeleton Component
 * @module components/chat/MessageSkeleton
 *
 * Skeleton loading state for chat messages with animated placeholders.
 */

import { memo } from 'react';
import { SkeletonMessage } from '../ui';

// ============================================================================
// TYPES
// ============================================================================

export interface MessageSkeletonProps {
  isUser?: boolean;
  count?: number;
  variant?: 'pulse' | 'shimmer';
}

// ============================================================================
// MESSAGE SKELETON
// ============================================================================

export const MessageSkeleton = memo<MessageSkeletonProps>(
  ({ isUser = false, count = 1, variant = 'pulse' }) => {
    const getRandomWidth = () => {
      const min = 45;
      const max = 85;
      return `${Math.floor(Math.random() * (max - min + 1) + min)}%`;
    };

    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonMessage
            key={index}
            isUser={isUser}
            width={getRandomWidth()}
            height={`${Math.random() > 0.5 ? 60 : 100}px`}
            variant={variant}
          />
        ))}
      </>
    );
  },
);

MessageSkeleton.displayName = 'MessageSkeleton';

// ============================================================================
// LOADING MESSAGE STREAM
// ============================================================================

export const MessageStreamSkeleton = memo<Omit<MessageSkeletonProps, 'count' | 'isUser'>>(
  ({ variant = 'pulse' }) => {
    return (
      <>
        <MessageSkeleton isUser={true} count={1} variant={variant} />
        <MessageSkeleton
          isUser={false}
          count={Math.floor(Math.random() * 2) + 2}
          variant={variant}
        />
        <MessageSkeleton isUser={true} count={1} variant={variant} />
        <MessageSkeleton isUser={false} count={1} variant={variant} />
      </>
    );
  },
);

MessageStreamSkeleton.displayName = 'MessageStreamSkeleton';

export default MessageSkeleton;
