/**
 * useCommandExecution - Command execution hook
 *
 * Handles system command execution via Tauri backend.
 * Extracted from App.tsx for better separation of concerns.
 */

import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { STATUS, TAURI_COMMANDS } from '../constants';

export interface UseCommandExecutionOptions {
  /** Function to add a message to the chat */
  addMessage: (msg: { role: string; content: string; timestamp: number }) => void;
  /** Function to update the last message content */
  updateLastMessage: (content: string) => void;
  /** Whether running in Tauri environment */
  isTauri: boolean;
}

export interface UseCommandExecutionReturn {
  /** Execute a system command */
  executeCommand: (cmd: string) => Promise<void>;
}

/**
 * Hook for executing system commands
 *
 * @example
 * ```tsx
 * const { executeCommand } = useCommandExecution({
 *   addMessage,
 *   updateLastMessage,
 *   isTauri,
 * });
 *
 * await executeCommand('ls -la');
 * ```
 */
export function useCommandExecution(
  options: UseCommandExecutionOptions
): UseCommandExecutionReturn {
  const { addMessage, updateLastMessage, isTauri } = options;

  const executeCommand = useCallback(
    async (cmd: string) => {
      addMessage({
        role: 'system',
        content: `> ${STATUS.EXECUTING} ${cmd}`,
        timestamp: Date.now(),
      });

      if (!isTauri) {
        updateLastMessage('\n\n[WEB SIMULATION] Command executed: ' + cmd);
        return;
      }

      try {
        const result = await invoke<string>(TAURI_COMMANDS.RUN_SYSTEM_COMMAND, {
          command: cmd,
        });
        updateLastMessage('\n\nRESULT:\n```\n' + result + '\n```\n');
      } catch (err) {
        updateLastMessage('\n\nERROR:\n' + String(err));
        toast.error(`Błąd komendy: ${err}`);
      }
    },
    [addMessage, updateLastMessage, isTauri]
  );

  return { executeCommand };
}

export default useCommandExecution;
