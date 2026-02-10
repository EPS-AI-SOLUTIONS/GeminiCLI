/**
 * GeminiGUI - Skeleton Components Tests
 * @module components/ui/Skeleton.test
 *
 * Unit tests for skeleton loading components.
 */

import { render } from '@testing-library/react';
import React from 'react';
import { Skeleton, SkeletonAvatar, SkeletonCard, SkeletonMessage, SkeletonText } from './Skeleton';

describe('Skeleton Components', () => {
  // ========================================
  // Generic Skeleton Tests
  // ========================================

  describe('Skeleton', () => {
    it('should render with default props', () => {
      const { container } = render(<Skeleton />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element).toBeInTheDocument();
      expect(element).toHaveStyle({
        width: '100%',
        height: '1rem',
      });
    });

    it('should render with custom width and height', () => {
      const { container } = render(<Skeleton width="200px" height="100px" />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element).toHaveStyle({
        width: '200px',
        height: '100px',
      });
    });

    it('should apply shimmer variant', () => {
      const { container } = render(<Skeleton variant="shimmer" />);
      const element = container.querySelector('.skeleton-shimmer');
      expect(element).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(<Skeleton className="rounded-lg" />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element).toHaveClass('rounded-lg');
    });
  });

  // ========================================
  // SkeletonText Tests
  // ========================================

  describe('SkeletonText', () => {
    it('should render single line by default', () => {
      const { container } = render(<SkeletonText />);
      const lines = container.querySelectorAll('.skeleton-pulse');
      expect(lines).toHaveLength(1);
    });

    it('should render multiple lines', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const lines = container.querySelectorAll('.skeleton-pulse');
      expect(lines).toHaveLength(3);
    });

    it('should set correct gap between lines', () => {
      const { container } = render(<SkeletonText lines={2} gap="1rem" />);
      const wrapper = container.querySelector('[class*="space-y"]');
      expect(wrapper).toHaveStyle({ gap: '1rem' });
    });

    it('should make last line shorter', () => {
      const { container } = render(<SkeletonText lines={3} />);
      const lines = container.querySelectorAll('.skeleton-pulse');
      const lastLine = lines[lines.length - 1] as HTMLElement;
      expect(lastLine).toHaveStyle({ width: '80%' });
    });

    it('should apply shimmer variant to all lines', () => {
      const { container } = render(<SkeletonText lines={3} variant="shimmer" />);
      const lines = container.querySelectorAll('.skeleton-shimmer');
      expect(lines).toHaveLength(3);
    });
  });

  // ========================================
  // SkeletonAvatar Tests
  // ========================================

  describe('SkeletonAvatar', () => {
    it('should render with default size', () => {
      const { container } = render(<SkeletonAvatar />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element).toHaveClass('rounded-full');
      expect(element).toHaveStyle({
        width: '40px',
        height: '40px',
      });
    });

    it('should render with custom size', () => {
      const { container } = render(<SkeletonAvatar size={64} />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element).toHaveStyle({
        width: '64px',
        height: '64px',
      });
    });

    it('should be circular', () => {
      const { container } = render(<SkeletonAvatar />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element).toHaveClass('rounded-full');
    });

    it('should apply shimmer variant', () => {
      const { container } = render(<SkeletonAvatar variant="shimmer" />);
      const element = container.querySelector('.skeleton-shimmer');
      expect(element).toBeInTheDocument();
      expect(element).toHaveClass('rounded-full');
    });
  });

  // ========================================
  // SkeletonCard Tests
  // ========================================

  describe('SkeletonCard', () => {
    it('should render card with header and content', () => {
      const { container } = render(<SkeletonCard />);
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      // 1 avatar + 2 header lines + 3 content lines = 6 total
      expect(skeletons.length).toBeGreaterThan(1);
    });

    it('should render correct number of content lines', () => {
      const { container } = render(<SkeletonCard lines={4} />);
      const skeletons = container.querySelectorAll('[class*="skeleton"]');
      // 1 avatar + 2 header lines + 4 content lines = 7 total
      expect(skeletons.length).toBeGreaterThanOrEqual(7);
    });

    it('should apply correct height', () => {
      const { container } = render(<SkeletonCard height="300px" />);
      const card = container.querySelector('.skeleton-pulse');
      expect(card).toHaveStyle({ minHeight: '300px' });
    });

    it('should be rounded', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.querySelector('.skeleton-pulse');
      expect(card).toHaveClass('rounded-lg');
    });

    it('should have padding', () => {
      const { container } = render(<SkeletonCard />);
      const card = container.querySelector('.skeleton-pulse');
      expect(card).toHaveClass('p-4');
    });

    it('should apply shimmer variant', () => {
      const { container } = render(<SkeletonCard variant="shimmer" />);
      const card = container.querySelector('.skeleton-shimmer');
      expect(card).toBeInTheDocument();
    });
  });

  // ========================================
  // SkeletonMessage Tests
  // ========================================

  describe('SkeletonMessage', () => {
    it('should render assistant message (left-aligned by default)', () => {
      const { container } = render(<SkeletonMessage />);
      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('justify-start');
    });

    it('should render user message (right-aligned)', () => {
      const { container } = render(<SkeletonMessage isUser={true} />);
      const wrapper = container.querySelector('.flex');
      expect(wrapper).toHaveClass('justify-end');
    });

    it('should apply custom width', () => {
      const { container } = render(<SkeletonMessage width="70%" />);
      const message = container.querySelector('[class*="skeleton"]');
      expect(message).toHaveStyle({ width: '70%' });
    });

    it('should apply custom height', () => {
      const { container } = render(<SkeletonMessage height="120px" />);
      const message = container.querySelector('[class*="skeleton"]');
      expect(message).toHaveStyle({ minHeight: '120px' });
    });

    it('should be rounded', () => {
      const { container } = render(<SkeletonMessage />);
      const message = container.querySelector('[class*="skeleton"]');
      expect(message).toHaveClass('rounded-lg');
    });

    it('should apply shimmer variant', () => {
      const { container } = render(<SkeletonMessage variant="shimmer" />);
      const message = container.querySelector('.skeleton-shimmer');
      expect(message).toBeInTheDocument();
    });
  });

  // ========================================
  // Animation Tests
  // ========================================

  describe('Animations', () => {
    it('should inject skeleton styles into DOM', () => {
      render(<Skeleton />);
      const styleEl = document.getElementById('skeleton-styles');
      expect(styleEl).toBeInTheDocument();
      expect(styleEl?.textContent).toContain('skeletonPulse');
      expect(styleEl?.textContent).toContain('skeletonShimmer');
    });

    it('should support reduced motion preference', () => {
      const styleEl = document.getElementById('skeleton-styles');
      expect(styleEl?.textContent).toContain('prefers-reduced-motion');
    });
  });

  // ========================================
  // Ref Tests
  // ========================================

  describe('Refs', () => {
    it('should forward ref for Skeleton', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<Skeleton ref={ref} />);
      expect(ref.current).toBeInTheDocument();
      expect(ref.current?.className).toContain('skeleton-pulse');
    });

    it('should forward ref for SkeletonText', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonText ref={ref} />);
      expect(ref.current).toBeInTheDocument();
    });

    it('should forward ref for SkeletonAvatar', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonAvatar ref={ref} />);
      expect(ref.current).toBeInTheDocument();
      expect(ref.current?.className).toContain('rounded-full');
    });

    it('should forward ref for SkeletonCard', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonCard ref={ref} />);
      expect(ref.current).toBeInTheDocument();
      expect(ref.current?.className).toContain('rounded-lg');
    });

    it('should forward ref for SkeletonMessage', () => {
      const ref = React.createRef<HTMLDivElement>();
      render(<SkeletonMessage ref={ref} />);
      expect(ref.current).toBeInTheDocument();
    });
  });

  // ========================================
  // Accessibility Tests
  // ========================================

  describe('Accessibility', () => {
    it('should not interfere with keyboard navigation', () => {
      const { container } = render(<Skeleton />);
      const element = container.querySelector('.skeleton-pulse');
      expect(element?.getAttribute('role')).not.toBe('button');
    });

    it('should have appropriate data attributes', () => {
      const { container } = render(<Skeleton data-testid="skeleton-loader" />);
      const element = container.querySelector('[data-testid="skeleton-loader"]');
      expect(element).toBeInTheDocument();
    });
  });

  // ========================================
  // Display Name Tests
  // ========================================

  describe('Display Names', () => {
    it('should have correct display names for debugging', () => {
      expect(Skeleton.displayName).toBe('Skeleton');
      expect(SkeletonText.displayName).toBe('SkeletonText');
      expect(SkeletonAvatar.displayName).toBe('SkeletonAvatar');
      expect(SkeletonCard.displayName).toBe('SkeletonCard');
      expect(SkeletonMessage.displayName).toBe('SkeletonMessage');
    });
  });
});
