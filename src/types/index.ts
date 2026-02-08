// Re-export all types from provider (LLMProvider, ChatMessage, TaskDifficulty, etc.)
export * from './provider.js';

// Re-export swarm types (AgentRole, SwarmTask, SwarmPlan, etc.)
export * from './swarm.js';

// Re-export knowledge types from shared location
export * from './knowledge.types.js';

// === Unique types not in other files ===

export interface SwarmMemory {
  id: string;
  timestamp: string;
  agent: import('./swarm.js').AgentRole;
  type: 'observation' | 'fact' | 'pattern' | 'error';
  content: string;
  tags: string[];
}
