'use client';

/**
 * useCommandExecution - Command execution hook
 *
 * Handles system command execution via HTTP API backend.
 * Extracted from App.tsx for better separation of concerns.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import { STATUS } from '../constants';
import { SystemService } from '../services';
import type { Message } from '../types';

export interface CommandResult {
  command: string;
  success: boolean;
  output: string;
}

export interface UseCommandExecutionOptions {
  /** Function to add a message to the chat */
  addMessage: (msg: Message) => void;
  /** Function to update the last message content */
  updateLastMessage: (content: string) => void;
}

export interface UseCommandExecutionReturn {
  /** Execute a system command and return the result */
  executeCommand: (cmd: string) => Promise<CommandResult>;
}

/**
 * Hook for executing system commands via HTTP API
 */
export function useCommandExecution(
  options: UseCommandExecutionOptions,
): UseCommandExecutionReturn {
  const { addMessage, updateLastMessage } = options;

  const executeCommand = useCallback(
    async (cmd: string): Promise<CommandResult> => {
      addMessage({
        role: 'system',
        content: `> ${STATUS.EXECUTING} ${cmd}`,
        timestamp: Date.now(),
      });

      try {
        const result = await SystemService.runCommand(cmd);
        updateLastMessage(`\n\nRESULT:\n\`\`\`\n${result}\n\`\`\`\n`);
        return { command: cmd, success: true, output: result };
      } catch (err) {
        const errorStr = String(err);
        updateLastMessage(`\n\nERROR:\n${errorStr}`);
        toast.error(`Błąd komendy: ${err}`);
        return { command: cmd, success: false, output: errorStr };
      }
    },
    [addMessage, updateLastMessage],
  );

  return { executeCommand };
}

export default useCommandExecution;
