/**
 * useCommandExecution - Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCommandExecution } from './useCommandExecution';

// Mock Tauri invoke
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';

describe('useCommandExecution', () => {
  const mockAddMessage = vi.fn();
  const mockUpdateLastMessage = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add system message when executing command', async () => {
    const { result } = renderHook(() =>
      useCommandExecution({
        addMessage: mockAddMessage,
        updateLastMessage: mockUpdateLastMessage,
        isTauri: false,
      })
    );

    await act(async () => {
      await result.current.executeCommand('ls -la');
    });

    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        role: 'system',
        content: expect.stringContaining('ls -la'),
      })
    );
  });

  it('should simulate command in web mode', async () => {
    const { result } = renderHook(() =>
      useCommandExecution({
        addMessage: mockAddMessage,
        updateLastMessage: mockUpdateLastMessage,
        isTauri: false,
      })
    );

    await act(async () => {
      await result.current.executeCommand('echo test');
    });

    expect(mockUpdateLastMessage).toHaveBeenCalledWith(
      expect.stringContaining('[WEB SIMULATION]')
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it('should call Tauri invoke in Tauri mode', async () => {
    vi.mocked(invoke).mockResolvedValueOnce('command output');

    const { result } = renderHook(() =>
      useCommandExecution({
        addMessage: mockAddMessage,
        updateLastMessage: mockUpdateLastMessage,
        isTauri: true,
      })
    );

    await act(async () => {
      await result.current.executeCommand('dir');
    });

    expect(invoke).toHaveBeenCalledWith('run_system_command', {
      command: 'dir',
    });
    expect(mockUpdateLastMessage).toHaveBeenCalledWith(
      expect.stringContaining('command output')
    );
  });

  it('should handle errors in Tauri mode', async () => {
    const errorMessage = 'Command failed';
    vi.mocked(invoke).mockRejectedValueOnce(new Error(errorMessage));

    const { result } = renderHook(() =>
      useCommandExecution({
        addMessage: mockAddMessage,
        updateLastMessage: mockUpdateLastMessage,
        isTauri: true,
      })
    );

    await act(async () => {
      await result.current.executeCommand('invalid-command');
    });

    expect(mockUpdateLastMessage).toHaveBeenCalledWith(
      expect.stringContaining('ERROR')
    );
    expect(toast.error).toHaveBeenCalled();
  });

  it('should return stable executeCommand function', () => {
    const options = {
      addMessage: mockAddMessage,
      updateLastMessage: mockUpdateLastMessage,
      isTauri: true,
    };

    const { result, rerender } = renderHook(() =>
      useCommandExecution(options)
    );

    const firstExecuteCommand = result.current.executeCommand;
    rerender();
    const secondExecuteCommand = result.current.executeCommand;

    expect(firstExecuteCommand).toBe(secondExecuteCommand);
  });
});
