/**
 * useKeyboardListener - Base Keyboard Event Hook
 * @module hooks/useKeyboardListener
 *
 * Provides common keyboard event handling logic used by useHotkey and useKeyboardShortcuts.
 */

import { useEffect } from 'react';

/**
 * Common options interface for keyboard event hooks
 */
export interface UseKeyboardOptions {
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  /** Stop event propagation (default: false) */
  stopPropagation?: boolean;
  /** Enable/disable the listener (default: true) */
  enabled?: boolean;
}

/**
 * Default options for keyboard event hooks
 */
export const DEFAULT_KEYBOARD_OPTIONS: Required<UseKeyboardOptions> = {
  preventDefault: true,
  stopPropagation: false,
  enabled: true,
};

/**
 * Mapping of special key names to their event.key values
 */
export const KEY_MAP: Record<string, string[]> = {
  enter: ['enter'],
  escape: ['escape'],
  tab: ['tab'],
  delete: ['delete'],
  backspace: ['backspace'],
  arrowup: ['arrowup'],
  arrowdown: ['arrowdown'],
  arrowleft: ['arrowleft'],
  arrowright: ['arrowright'],
  space: [' ', 'space'],
};

/**
 * Check if a keyboard event matches the given hotkey combination
 *
 * Supported formats:
 * - 'ctrl+s', 'ctrl+shift+s'
 * - 'cmd+s' (Mac alternative to ctrl)
 * - 'meta+s' (Windows key)
 * - 'alt+s'
 * - 'shift+s'
 * - Single key: 's'
 *
 * @param event - KeyboardEvent to check
 * @param hotkey - Hotkey combination string
 * @returns true if the event matches the hotkey
 */
export const isHotkeyPressed = (event: KeyboardEvent, hotkey: string): boolean => {
  const parts = hotkey.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  // Check modifier keys
  const hasCtrl = parts.includes('ctrl');
  const hasShift = parts.includes('shift');
  const hasAlt = parts.includes('alt');
  const hasMeta = parts.includes('meta') || parts.includes('cmd');

  const ctrlMatch = hasCtrl === event.ctrlKey && hasMeta === event.metaKey;
  const shiftMatch = hasShift === event.shiftKey;
  const altMatch = hasAlt === event.altKey;

  // Get the actual key pressed (case-insensitive)
  const eventKey = event.key.toLowerCase();

  // Handle special key names
  const validKeys = KEY_MAP[key] || [key];

  return ctrlMatch && shiftMatch && altMatch && validKeys.includes(eventKey);
};

/**
 * Apply event modifiers based on options
 *
 * @param event - KeyboardEvent to modify
 * @param options - Options containing preventDefault and stopPropagation flags
 */
export const applyEventModifiers = (
  event: KeyboardEvent,
  options: Pick<UseKeyboardOptions, 'preventDefault' | 'stopPropagation'>,
): void => {
  if (options.preventDefault) {
    event.preventDefault();
  }
  if (options.stopPropagation) {
    event.stopPropagation();
  }
};

/**
 * Low-level hook for keyboard event listening with automatic cleanup
 *
 * @param handler - Event handler function
 * @param enabled - Whether the listener is enabled
 * @param deps - Additional dependencies for the effect
 *
 * @example
 * ```tsx
 * useKeyboardListener(
 *   (event) => {
 *     if (event.key === 'Enter') {
 *       handleEnter();
 *     }
 *   },
 *   true,
 *   [handleEnter]
 * );
 * ```
 */
export const useKeyboardListener = (
  handler: (event: KeyboardEvent) => void,
  enabled: boolean = true,
  deps: React.DependencyList = [],
): void => {
  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handler);

    return () => {
      window.removeEventListener('keydown', handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, handler, ...deps]);
};

export default useKeyboardListener;
