import { invoke } from '@tauri-apps/api/core';
import type {
  ApprovalHistoryEntry,
  ApprovalRule,
  SessionStatus,
} from '../types/claude';

// Check if running in Tauri (v2 uses __TAURI_INTERNALS__)
const isTauri = () => typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

// Safe invoke that returns mock data in browser mode
const safeInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauri()) {
    console.warn(`[IPC] Tauri not available, skipping: ${cmd}`);
    throw new Error('Not running in Tauri');
  }
  return invoke<T>(cmd, args);
};

// Claude IPC wrapper for Tauri commands
export const claudeIpc = {
  // Session management
  startSession: (
    workingDir: string,
    cliPath: string,
    initialPrompt?: string
  ): Promise<string> =>
    safeInvoke('start_claude_session', {
      workingDir,
      cliPath,
      initialPrompt,
    }),

  stopSession: (): Promise<void> => safeInvoke('stop_claude_session'),

  getStatus: (): Promise<SessionStatus> =>
    isTauri()
      ? safeInvoke('get_session_status')
      : Promise.resolve({
          is_active: false,
          pending_approval: false,
          auto_approve_all: false,
          approved_count: 0,
          denied_count: 0,
          auto_approved_count: 0,
        }),

  // Input/Output
  sendInput: (input: string): Promise<void> =>
    safeInvoke('send_input', { input }),

  // Approval actions
  approve: (): Promise<void> => safeInvoke('approve_action'),

  deny: (): Promise<void> => safeInvoke('deny_action'),

  // Auto-approve settings
  toggleAutoApproveAll: (enabled: boolean): Promise<void> =>
    safeInvoke('toggle_auto_approve_all', { enabled }),

  // Rules management
  getRules: (): Promise<ApprovalRule[]> =>
    isTauri() ? safeInvoke('get_approval_rules') : Promise.resolve([]),

  updateRules: (rules: ApprovalRule[]): Promise<void> =>
    safeInvoke('update_approval_rules', { rules }),

  // History
  getHistory: (): Promise<ApprovalHistoryEntry[]> =>
    isTauri() ? safeInvoke('get_approval_history') : Promise.resolve([]),

  clearHistory: (): Promise<void> => safeInvoke('clear_approval_history'),
};

// CPU & Parallel Processing IPC
export interface CpuInfo {
  logical_cores: number;
  physical_cores: number;
  rayon_threads: number;
}

export interface BatchResult {
  index: number;
  prompt: string;
  response: string | null;
  error: string | null;
  duration_ms: number;
}

export const parallelIpc = {
  // Get CPU info for performance monitoring
  getCpuInfo: (): Promise<CpuInfo> =>
    isTauri()
      ? safeInvoke('get_cpu_info')
      : Promise.resolve({
          logical_cores: navigator.hardwareConcurrency || 4,
          physical_cores: Math.ceil((navigator.hardwareConcurrency || 4) / 2),
          rayon_threads: navigator.hardwareConcurrency || 4,
        }),

  // Batch generate - process multiple prompts in parallel
  batchGenerate: (
    model: string,
    prompts: string[],
    options?: Record<string, unknown>
  ): Promise<BatchResult[]> =>
    safeInvoke('ollama_batch_generate', { model, prompts, options }),
};

