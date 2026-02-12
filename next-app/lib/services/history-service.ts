/**
 * History Service
 * Business logic layer for message history management
 * Migrated from src/api/services/HistoryService.ts
 */

import type { ExecutePlan, ExecutionMode, Message, MessageMetadata } from '../api-types';
import { historyStore } from '../stores';

// ═══════════════════════════════════════════════════════════════════════════
// Service Class
// ═══════════════════════════════════════════════════════════════════════════

export class HistoryService {
  addUserMessage(content: string): Message {
    return historyStore.add({ role: 'user', content });
  }

  addAssistantMessage(
    content: string,
    plan: ExecutePlan,
    options: {
      duration: number;
      mode: ExecutionMode;
      streaming?: boolean;
    },
  ): Message {
    return historyStore.add({
      role: 'assistant',
      content,
      agent: plan.agent,
      tier: plan.tier,
      metadata: {
        duration: options.duration,
        mode: options.mode,
        streaming: options.streaming,
      },
    });
  }

  addSystemMessage(content: string, metadata?: MessageMetadata): Message {
    return historyStore.add({ role: 'system', content, metadata });
  }

  addErrorMessage(error: string): Message {
    return historyStore.add({
      role: 'system',
      content: `Error: ${error}`,
      metadata: { error: true },
    });
  }

  getMessages(limit?: number): Message[] {
    return historyStore.get(limit);
  }

  getCount(): number {
    return historyStore.count();
  }

  clear(): number {
    return historyStore.clear();
  }

  search(query: string): Message[] {
    return historyStore.search(query);
  }

  getById(id: string): Message | undefined {
    return historyStore.getById(id);
  }

  delete(id: string): boolean {
    return historyStore.delete(id);
  }

  getByRole(role: 'user' | 'assistant' | 'system'): Message[] {
    return historyStore.getByRole(role);
  }

  getByAgent(agent: string): Message[] {
    return historyStore.getByAgent(agent);
  }
}

// Singleton
export const historyService = new HistoryService();
