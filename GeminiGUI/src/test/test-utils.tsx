/**
 * GeminiGUI - Test Utilities
 * @module test/test-utils
 *
 * Reusable utilities and helpers for testing React components
 */

import { type RenderOptions, render } from '@testing-library/react';
import type React from 'react';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

/**
 * Custom render function that includes common providers
 * Can be extended to include Redux, Theme providers, etc.
 */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }

  return render(ui, { wrapper: Wrapper, ...options });
}

/**
 * Create mock click handler with additional info
 */
export function createMockClickHandler() {
  const onClick = vi.fn((e: React.MouseEvent<HTMLButtonElement>) => {
    return {
      called: true,
      timestamp: Date.now(),
      event: e,
    };
  });

  return {
    onClick,
    getCalls: () => onClick.mock.calls.length,
    getLastCall: () => onClick.mock.calls[onClick.mock.calls.length - 1],
    reset: () => onClick.mockClear(),
  };
}

/**
 * Common test data
 */
export const BUTTON_VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'icon'] as const;
export const BUTTON_SIZES = ['sm', 'md', 'lg', 'icon'] as const;

/**
 * Test ID generators
 */
export const testIds = {
  button: (name: string) => `button-${name}`,
  icon: (position: 'left' | 'right') => `icon-${position}`,
  spinner: () => `spinner`,
  leftIcon: () => `left-icon`,
  rightIcon: () => `right-icon`,
};

/**
 * Assertion helpers
 */
export const assertions = {
  /**
   * Assert button has variant classes
   */
  hasVariant: (button: HTMLElement, variant: string) => {
    expect(button.className).toContain(variant);
  },

  /**
   * Assert button has size classes
   */
  hasSize: (button: HTMLElement, size: string) => {
    const sizeMap: Record<string, string[]> = {
      sm: ['text-xs', 'px-2', 'py-1'],
      md: ['text-sm', 'px-4', 'py-2'],
      lg: ['text-base', 'px-6', 'py-3'],
      icon: ['p-2'],
    };

    const expectedClasses = sizeMap[size] || [];
    expectedClasses.forEach((className) => {
      expect(button.className).toContain(className);
    });
  },

  /**
   * Assert button is disabled
   */
  isDisabled: (button: HTMLButtonElement) => {
    expect(button.disabled).toBe(true);
    expect(button.className).toContain('disabled:opacity-50');
    expect(button.className).toContain('disabled:cursor-not-allowed');
  },

  /**
   * Assert button is enabled
   */
  isEnabled: (button: HTMLButtonElement) => {
    expect(button.disabled).toBe(false);
  },

  /**
   * Assert button is full width
   */
  isFullWidth: (button: HTMLElement) => {
    expect(button.className).toContain('w-full');
  },

  /**
   * Assert button has focus styles
   */
  hasFocusStyles: (button: HTMLElement) => {
    expect(button.className).toContain('focus:outline-none');
    expect(button.className).toContain('focus:ring-2');
    expect(button.className).toContain('focus:ring-offset-2');
  },

  /**
   * Assert button has gap between items
   */
  hasGapBetweenItems: (button: HTMLElement) => {
    expect(button.className).toContain('gap-2');
  },
};

/**
 * Component builders for common test scenarios
 */
export const builders = {
  /**
   * Build button with common props
   */
  button: (props: Record<string, any> = {}) => ({
    ...{
      children: 'Test Button',
    },
    ...props,
  }),

  /**
   * Build all variant combinations
   */
  allVariants: (baseProps = {}) =>
    BUTTON_VARIANTS.map((variant) => ({
      variant,
      ...baseProps,
    })),

  /**
   * Build all size combinations
   */
  allSizes: (baseProps = {}) =>
    BUTTON_SIZES.map((size) => ({
      size,
      ...baseProps,
    })),
};

// Export React Testing Library utilities for convenience
export { fireEvent, render, screen, waitFor } from '@testing-library/react';
export { vi } from 'vitest';
