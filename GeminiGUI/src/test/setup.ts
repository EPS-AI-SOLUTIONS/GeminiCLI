/**
 * Vitest Setup File
 * @module test/setup
 *
 * Global setup configuration for Vitest:
 * - Cleanup after each test
 * - Mock browser APIs
 * - Setup testing library configuration
 * - Configure custom matchers
 */

import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, expect, vi } from 'vitest';
import '@testing-library/jest-dom';

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Run cleanup after each test to prevent test isolation issues
 */
afterEach(() => {
  cleanup();
});

// ============================================================================
// BROWSER API MOCKS
// ============================================================================

/**
 * Mock IntersectionObserver
 * Required for Virtuoso (virtual scrolling library)
 */
global.IntersectionObserver = class IntersectionObserver {
  disconnect() {}

  observe() {}

  takeRecords() {
    return [];
  }

  unobserve() {}
} as any;

/**
 * Mock window.scrollTo
 * Used by Virtuoso for scrolling behavior
 */
if (typeof window !== 'undefined') {
  Window.prototype.scrollTo = vi.fn() as any;
}

/**
 * Mock ResizeObserver
 * May be used by components for responsive behavior
 */
global.ResizeObserver = class ResizeObserver {
  disconnect() {}

  observe() {}

  unobserve() {}
} as any;

/**
 * Mock requestAnimationFrame for animations
 */
global.requestAnimationFrame = vi.fn((callback) => {
  return setTimeout(callback, 0);
}) as any;

/**
 * Mock cancelAnimationFrame
 */
global.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
}) as any;

// ============================================================================
// DOM API MOCKS
// ============================================================================

/**
 * Mock navigator.clipboard
 * Used by CodeBlock for copy-to-clipboard functionality
 */
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  },
});

/**
 * Mock window.matchMedia
 * Used for responsive design queries
 */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ============================================================================
// TAURI MOCKS (if needed)
// ============================================================================

/**
 * Mock Tauri invoke for system commands
 * Comment out if you want to mock Tauri calls
 */
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(() => Promise.resolve(null)),
  invoke_array: vi.fn(() => Promise.resolve([])),
}));

/**
 * Mock Tauri dialog
 */
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(() => Promise.resolve(null)),
  open: vi.fn(() => Promise.resolve(null)),
}));

/**
 * Mock Tauri file system
 */
vi.mock('@tauri-apps/plugin-fs', () => ({
  readFile: vi.fn(() => Promise.resolve(new Uint8Array())),
  writeFile: vi.fn(() => Promise.resolve()),
}));

/**
 * Mock Tauri opener
 */
vi.mock('@tauri-apps/plugin-opener', () => ({
  open: vi.fn(() => Promise.resolve()),
}));

// ============================================================================
// CUSTOM MATCHERS (if needed)
// ============================================================================

/**
 * Custom matcher to check if element has multiple classes
 * Usage: expect(element).toHaveClasses(['class1', 'class2'])
 */
expect.extend({
  toHaveClasses(received: Element, classes: string[]) {
    const classList = Array.from(received.classList);
    const passed = classes.every((cls) => classList.includes(cls));

    if (passed) {
      return {
        message: () => `expected element not to have classes ${classes.join(', ')}`,
        pass: true,
      };
    } else {
      const missing = classes.filter((cls) => !classList.includes(cls));
      return {
        message: () =>
          `expected element to have classes ${classes.join(', ')}, but missing: ${missing.join(', ')}`,
        pass: false,
      };
    }
  },
});

// ============================================================================
// CONSOLE MOCKS (suppress warnings in tests)
// ============================================================================

/**
 * Optional: Suppress console.warn and console.error in tests
 * Uncomment if needed to reduce noise, but be careful not to hide real issues
 */

const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Only suppress specific expected warnings
  console.warn = vi.fn((...args) => {
    const message = args[0]?.toString?.() || '';

    // Only suppress React warnings we expect
    if (message.includes('componentWillReceiveProps') || message.includes('findDOMNode')) {
      return;
    }

    originalWarn(...args);
  });

  // Keep errors visible for debugging
  console.error = vi.fn((...args) => {
    const message = args[0]?.toString?.() || '';

    // Only suppress specific expected errors
    if (message.includes('Not implemented: HTMLFormElement.prototype.submit')) {
      return;
    }

    originalError(...args);
  });
});

// ============================================================================
// TYPE AUGMENTATION
// ============================================================================

/**
 * Extend Vitest matchers with custom matchers
 */
declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveClasses(classes: string[]): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveClasses(classes: string[]): any;
  }
}

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

/**
 * Set test environment variables
 */
process.env.VITE_TEST = 'true';

/**
 * Mock CSS variables
 * Ensures Matrix-themed CSS variables are available in tests
 */
if (typeof document !== 'undefined') {
  const style = document.documentElement.style;
  style.setProperty('--matrix-accent', '#00ff00');
  style.setProperty('--matrix-text', '#00ff00');
  style.setProperty('--matrix-text-dim', '#00aa00');
  style.setProperty('--matrix-border', '#00ff0033');
  style.setProperty('--matrix-bg', '#0a0a0a');
}

// ============================================================================
// PERFORMANCE WARNINGS
// ============================================================================

/**
 * Warn if tests are running slow
 * Helps identify performance issues
 */
let testStartTime: number;

beforeEach(() => {
  testStartTime = performance.now();
});

afterEach(() => {
  const duration = performance.now() - testStartTime;
  if (duration > 1000) {
    console.warn(`Test took ${duration.toFixed(0)}ms to complete`);
  }
});
