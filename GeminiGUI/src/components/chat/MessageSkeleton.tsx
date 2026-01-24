/**
 * GeminiGUI - Message Skeleton Component
 * @module components/chat/MessageSkeleton
 *
 * Skeleton loading state for chat messages with animated placeholders.
 * Supports alternating left/right alignment for user/assistant messages.
 */

import { memo } from 'react';
import { SkeletonMessage } from '../ui';

// ============================================================================
// TYPES
// ============================================================================

export interface MessageSkeletonProps {
  /** Whether this skeleton is for a user message (right-aligned) */
  isUser?: boolean;
  /** Number of message skeletons to render */
  count?: number;
  /** Animation variant: 'pulse' or 'shimmer' */
  variant?: 'pulse' | 'shimmer';
}

// ============================================================================
// MESSAGE SKELETON
// ============================================================================

export const MessageSkeleton = memo<MessageSkeletonProps>(
  ({ isUser = false, count = 1, variant = 'pulse' }) => {
    // Generate random widths for natural variation
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
  }
);

MessageSkeleton.displayName = 'MessageSkeleton';

// ============================================================================
// LOADING MESSAGE STREAM
// ============================================================================

/**
 * Renders alternating user and assistant message skeletons
 * useful for showing a loading conversation thread.
 */
export const MessageStreamSkeleton = memo<
  Omit<MessageSkeletonProps, 'count' | 'isUser'>
>(({ variant = 'pulse' }) => {
  return (
    <>
      {/* User message skeleton */}
      <MessageSkeleton isUser={true} count={1} variant={variant} />

      {/* Assistant message skeletons (2-3 messages) */}
      <MessageSkeleton
        isUser={false}
        count={Math.floor(Math.random() * 2) + 2}
        variant={variant}
      />

      {/* Another user message */}
      <MessageSkeleton isUser={true} count={1} variant={variant} />

      {/* Assistant response skeleton */}
      <MessageSkeleton isUser={false} count={1} variant={variant} />
    </>
  );
});

MessageStreamSkeleton.displayName = 'MessageStreamSkeleton';

export default MessageSkeleton;
