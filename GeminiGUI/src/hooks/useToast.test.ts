/**
 * GeminiGUI - useToast Hook Tests
 * @module hooks/useToast.test
 *
 * Unit tests for the useToast hook.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToast } from './useToast';

describe('useToast Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('initializes with empty toast array', () => {
      const { result } = renderHook(() => useToast());

      expect(result.current.toasts).toEqual([]);
    });

    it('provides toast methods', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.toast.success).toBe('function');
      expect(typeof result.current.toast.error).toBe('function');
      expect(typeof result.current.toast.warning).toBe('function');
      expect(typeof result.current.toast.info).toBe('function');
      expect(typeof result.current.toast.custom).toBe('function');
    });

    it('provides dismissToast method', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.dismissToast).toBe('function');
    });

    it('provides clearAll method', () => {
      const { result } = renderHook(() => useToast());

      expect(typeof result.current.clearAll).toBe('function');
    });
  });

  describe('Adding Toasts', () => {
    it('adds success toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Success message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Success message',
        variant: 'success',
      });
    });

    it('adds error toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.error('Error message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Error message',
        variant: 'error',
      });
    });

    it('adds warning toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.warning('Warning message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Warning message',
        variant: 'warning',
      });
    });

    it('adds info toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.info('Info message');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Info message',
        variant: 'info',
      });
    });

    it('adds custom toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.custom('Custom message', 'warning');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0]).toMatchObject({
        message: 'Custom message',
        variant: 'warning',
      });
    });

    it('generates unique IDs for toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Toast 1');
        result.current.toast.error('Toast 2');
        result.current.toast.warning('Toast 3');
      });

      const ids = result.current.toasts.map((t) => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it('uses custom duration when provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Message', 5000);
      });

      expect(result.current.toasts[0].duration).toBe(5000);
    });

    it('uses default duration when not provided', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Message');
      });

      expect(result.current.toasts[0].duration).toBe(3000);
    });
  });

  describe('Queue Management', () => {
    it('enforces max 3 visible toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Toast 1');
        result.current.toast.success('Toast 2');
        result.current.toast.success('Toast 3');
        result.current.toast.success('Toast 4');
        result.current.toast.success('Toast 5');
      });

      expect(result.current.toasts).toHaveLength(3);
      expect(result.current.toasts[0].message).toBe('Toast 3');
      expect(result.current.toasts[1].message).toBe('Toast 4');
      expect(result.current.toasts[2].message).toBe('Toast 5');
    });

    it('keeps latest toasts when exceeding max', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('First');
        result.current.toast.success('Second');
        result.current.toast.success('Third');
        result.current.toast.success('Fourth');
      });

      const messages = result.current.toasts.map((t) => t.message);

      expect(messages).toEqual(['Second', 'Third', 'Fourth']);
    });
  });

  describe('Dismissing Toasts', () => {
    it('dismisses toast by ID', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Message 1');
        result.current.toast.success('Message 2');
      });

      const toastId = result.current.toasts[0].id;

      expect(result.current.toasts).toHaveLength(2);

      act(() => {
        result.current.dismissToast(toastId);
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('Message 2');
    });

    it('does nothing when dismissing non-existent toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Message');
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismissToast('non-existent-id');
      });

      expect(result.current.toasts).toHaveLength(1);
    });

    it('clears all toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Message 1');
        result.current.toast.success('Message 2');
        result.current.toast.success('Message 3');
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Toast Properties', () => {
    it('sets dismissible property to true by default', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Message');
      });

      expect(result.current.toasts[0].dismissible).toBe(true);
    });

    it('preserves toast variant', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Success');
        result.current.toast.error('Error');
        result.current.toast.warning('Warning');
      });

      expect(result.current.toasts[0].variant).toBe('success');
      expect(result.current.toasts[1].variant).toBe('error');
      expect(result.current.toasts[2].variant).toBe('warning');
    });

    it('all toasts have unique IDs', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toast.success(`Message ${i}`);
        }
      });

      const ids = result.current.toasts.map((t) => t.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(Math.min(10, 3)); // Max 3 visible
    });
  });

  describe('Multiple Instances', () => {
    it('maintains separate state for different hook instances', () => {
      const { result: result1 } = renderHook(() => useToast());
      const { result: result2 } = renderHook(() => useToast());

      act(() => {
        result1.current.toast.success('Hook 1 toast');
      });

      act(() => {
        result2.current.toast.error('Hook 2 toast');
      });

      expect(result1.current.toasts).toHaveLength(1);
      expect(result2.current.toasts).toHaveLength(1);
      expect(result1.current.toasts[0].message).toBe('Hook 1 toast');
      expect(result2.current.toasts[0].message).toBe('Hook 2 toast');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty message', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('');
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].message).toBe('');
    });

    it('handles very long message', () => {
      const { result } = renderHook(() => useToast());
      const longMessage = 'A'.repeat(1000);

      act(() => {
        result.current.toast.success(longMessage);
      });

      expect(result.current.toasts[0].message).toBe(longMessage);
    });

    it('handles rapid successive calls', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.toast.success(`Message ${i}`);
        }
      });

      expect(result.current.toasts.length).toBeLessThanOrEqual(3);
    });

    it('handles zero duration', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('No auto-dismiss', 0);
      });

      expect(result.current.toasts[0].duration).toBe(0);
    });

    it('handles negative duration gracefully', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        result.current.toast.success('Negative duration', -1000);
      });

      expect(result.current.toasts[0].duration).toBe(-1000);
    });
  });
});
