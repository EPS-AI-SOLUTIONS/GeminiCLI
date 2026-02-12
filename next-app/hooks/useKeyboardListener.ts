'use client';

/**
 * useKeyboardListener - Base Keyboard Event Hook
 * Provides common keyboard event handling logic.
 */

import { useEffect } from 'react';

export interface UseKeyboardOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enabled?: boolean;
}

export const DEFAULT_KEYBOARD_OPTIONS: Required<UseKeyboardOptions> = {
  preventDefault: true,
  stopPropagation: false,
  enabled: true,
};

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

export const isHotkeyPressed = (event: KeyboardEvent, hotkey: string): boolean => {
  const parts = hotkey.toLowerCase().split('+');
  const key = parts[parts.length - 1];

  const hasCtrl = parts.includes('ctrl');
  const hasShift = parts.includes('shift');
  const hasAlt = parts.includes('alt');
  const hasMeta = parts.includes('meta') || parts.includes('cmd');

  const ctrlMatch = hasCtrl === event.ctrlKey && hasMeta === event.metaKey;
  const shiftMatch = hasShift === event.shiftKey;
  const altMatch = hasAlt === event.altKey;

  const eventKey = event.key.toLowerCase();
  const validKeys = KEY_MAP[key] || [key];

  return ctrlMatch && shiftMatch && altMatch && validKeys.includes(eventKey);
};

export const applyEventModifiers = (
  event: KeyboardEvent,
  options: Pick<UseKeyboardOptions, 'preventDefault' | 'stopPropagation'>,
): void => {
  if (options.preventDefault) event.preventDefault();
  if (options.stopPropagation) event.stopPropagation();
};

export const useKeyboardListener = (
  handler: (event: KeyboardEvent) => void,
  enabled: boolean = true,
  deps: React.DependencyList = [],
): void => {
  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, handler, ...deps]);
};

export default useKeyboardListener;
