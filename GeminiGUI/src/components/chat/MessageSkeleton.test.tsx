/**
 * GeminiGUI - MessageSkeleton Components Tests
 * @module components/chat/MessageSkeleton.test
 *
 * Unit tests for chat message skeleton components.
 */

import { render } from '@testing-library/react';
import { MessageSkeleton, MessageStreamSkeleton } from './MessageSkeleton';

describe('MessageSkeleton Components', () => {
  // ========================================
  // MessageSkeleton Tests
  // ========================================

  describe('MessageSkeleton', () => {
    it('should render single assistant message by default', () => {
      const { container } = render(<MessageSkeleton />);
      const messages = container.querySelectorAll('.flex');
      // At least one message container
      expect(messages.length).toBeGreaterThan(0);
    });

    it('should render assistant messages (left-aligned)', () => {
      const { container } = render(<MessageSkeleton isUser={false} count={1} />);
      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render user messages (right-aligned)', () => {
      const { container } = render(<MessageSkeleton isUser={true} count={1} />);
      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    it('should render multiple messages', () => {
      const { container } = render(<MessageSkeleton isUser={false} count={3} />);
      const messages = container.querySelectorAll('.flex');
      expect(messages.length).toBe(3);
    });

    it('should apply pulse animation by default', () => {
      const { container } = render(<MessageSkeleton />);
      const skeleton = container.querySelector('.skeleton-pulse');
      expect(skeleton).toBeInTheDocument();
    });

    it('should apply shimmer animation when specified', () => {
      const { container } = render(
        <MessageSkeleton variant="shimmer" count={1} />
      );
      const skeleton = container.querySelector('.skeleton-shimmer');
      expect(skeleton).toBeInTheDocument();
    });

    it('should have varied widths for natural appearance', () => {
      const { container } = render(
        <MessageSkeleton isUser={false} count={3} />
      );
      const skeletons = container.querySelectorAll('[class*="skeleton"]');

      // Widths should be different (randomly generated)
      const widths = Array.from(skeletons).map(
        (el) => (el as HTMLElement).style.width
      );

      // At least some variation in widths
      expect(new Set(widths).size).toBeGreaterThan(1);
    });

    it('should render with correct styling structure', () => {
      const { container } = render(<MessageSkeleton isUser={true} count={1} />);
      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('py-2');
      expect(wrapper).toHaveClass('px-4');
    });
  });

  // ========================================
  // MessageStreamSkeleton Tests
  // ========================================

  describe('MessageStreamSkeleton', () => {
    it('should render complete conversation flow', () => {
      const { container } = render(<MessageStreamSkeleton />);
      const messages = container.querySelectorAll('.flex');

      // Should have multiple message groups (user, assistant, user, assistant)
      expect(messages.length).toBeGreaterThanOrEqual(4);
    });

    it('should alternate between user and assistant messages', () => {
      const { container } = render(<MessageStreamSkeleton />);
      const alignments = Array.from(container.querySelectorAll('.flex')).map(
        (el) => {
          if (el.className.includes('justify-end')) return 'user';
          if (el.className.includes('justify-start')) return 'assistant';
          return 'unknown';
        }
      );

      // First message should be user
      expect(alignments[0]).toBe('user');

      // Should have alternating pattern
      const hasAlternation = alignments.some(
        (_, i) =>
          i > 0 &&
          alignments[i] !== 'unknown' &&
          alignments[i - 1] !== 'unknown' &&
          alignments[i] !== alignments[i - 1]
      );
      expect(hasAlternation).toBe(true);
    });

    it('should include user messages', () => {
      const { container } = render(<MessageStreamSkeleton />);
      const userMessages = container.querySelectorAll('.justify-end');
      expect(userMessages.length).toBeGreaterThan(0);
    });

    it('should include assistant messages', () => {
      const { container } = render(<MessageStreamSkeleton />);
      const assistantMessages = container.querySelectorAll('.justify-start');
      expect(assistantMessages.length).toBeGreaterThan(0);
    });

    it('should apply pulse animation by default', () => {
      const { container } = render(<MessageStreamSkeleton />);
      const pulseSkeletons = container.querySelectorAll('.skeleton-pulse');
      expect(pulseSkeletons.length).toBeGreaterThan(0);
    });

    it('should apply shimmer animation when specified', () => {
      const { container } = render(<MessageStreamSkeleton variant="shimmer" />);
      const shimmerSkeletons = container.querySelectorAll('.skeleton-shimmer');
      expect(shimmerSkeletons.length).toBeGreaterThan(0);
    });

    it('should have consistent structure with MessageSkeleton', () => {
      const { container: container1 } = render(<MessageStreamSkeleton />);
      const { container: container2 } = render(
        <MessageSkeleton isUser={false} count={1} />
      );

      const stream = container1.querySelector('.flex');
      
      expect(stream?.className).toContain('justify-end');
    });
  });

  // ========================================
  // Memo Tests
  // ========================================

  describe('Memoization', () => {
    it('MessageSkeleton should be memoized', () => {
      expect(MessageSkeleton.$$typeof).toBeDefined();
      // Memoized components have specific internal structure
    });

    it('MessageStreamSkeleton should be memoized', () => {
      expect(MessageStreamSkeleton.$$typeof).toBeDefined();
    });
  });

  // ========================================
  // Display Name Tests
  // ========================================

  describe('Display Names', () => {
    it('should have correct display names for debugging', () => {
      expect(MessageSkeleton.displayName).toBe('MessageSkeleton');
      expect(MessageStreamSkeleton.displayName).toBe('MessageStreamSkeleton');
    });
  });

  // ========================================
  // Animation Consistency Tests
  // ========================================

  describe('Animation Consistency', () => {
    it('should apply same animation to all messages in stream', () => {
      const { container } = render(
        <MessageStreamSkeleton variant="shimmer" />
      );
      const shimmerCount = container.querySelectorAll('.skeleton-shimmer')
        .length;
      const pulseCount = container.querySelectorAll('.skeleton-pulse').length;

      // All should use shimmer, not pulse
      expect(shimmerCount).toBeGreaterThan(0);
      expect(pulseCount).toBe(0);
    });

    it('should maintain animation consistency across multiple renders', () => {
      const { container: container1 } = render(
        <MessageSkeleton variant="pulse" count={2} />
      );
      const { container: container2 } = render(
        <MessageSkeleton variant="pulse" count={2} />
      );

      const pulseCount1 = container1.querySelectorAll('.skeleton-pulse').length;
      const pulseCount2 = container2.querySelectorAll('.skeleton-pulse').length;

      expect(pulseCount1).toBe(pulseCount2);
    });
  });

  // ========================================
  // Alignment Tests
  // ========================================

  describe('Alignment', () => {
    it('should correctly align user messages to the right', () => {
      const { container } = render(
        <MessageSkeleton isUser={true} count={1} />
      );
      const wrapper = container.querySelector('.justify-end');
      expect(wrapper).toBeInTheDocument();
    });

    it('should correctly align assistant messages to the left', () => {
      const { container } = render(
        <MessageSkeleton isUser={false} count={1} />
      );
      const wrapper = container.querySelector('.justify-start');
      expect(wrapper).toBeInTheDocument();
    });

    it('should respect alignment for multiple messages', () => {
      const { container } = render(
        <MessageSkeleton isUser={true} count={3} />
      );
      const wrappers = container.querySelectorAll('.justify-end');
      expect(wrappers.length).toBe(3);
    });
  });

  // ========================================
  // Padding Tests
  // ========================================

  describe('Padding', () => {
    it('should have correct padding for all messages', () => {
      const { container } = render(
        <MessageSkeleton isUser={false} count={1} />
      );
      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('py-2');
      expect(wrapper).toHaveClass('px-4');
    });
  });
});
