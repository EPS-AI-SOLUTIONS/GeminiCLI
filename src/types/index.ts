// Re-export knowledge types from shared location
export * from './knowledge.types.js';

export type AgentRole =
  | 'dijkstra' | 'geralt' | 'yennefer' | 'triss'
  | 'vesemir' | 'jaskier' | 'ciri' | 'eskel'
  | 'lambert' | 'zoltan' | 'regis' | 'philippa'
  | 'serena';  // Code Intelligence Agent - uses real Serena MCP

export interface AgentPersona {
  name: AgentRole;
  role: string;
  description: string;
  model: string;
  temperature?: number;
}

export interface SwarmTask {
  id: number;
  agent: AgentRole;
  task: string;
  dependencies: number[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: string;
  retryCount: number;
}

export interface SwarmPlan {
  objective: string;
  tasks: SwarmTask[];
}

export interface SwarmMemory {
  id: string;
  timestamp: string;
  agent: AgentRole;
  type: 'observation' | 'fact' | 'pattern' | 'error';
  content: string;
  tags: string[];
}

export interface ExecutionResult {
  id: number;
  success: boolean;
  data?: any;
  error?: string;
  logs: string[];

  // === SOLUTION 15: SOURCE TRACKING ===
  sourceTracking?: {
    agent: string;                    // Which agent produced this result
    model: string;                    // Which model was used (gemini/ollama)
    timestamp: number;                // When was this produced
    taskDescription: string;          // Original task description
    filesAccessed: string[];          // Files that were actually read
    filesModified: string[];          // Files that were actually written
    commandsExecuted: string[];       // Shell commands that were run
    mcpToolsUsed: string[];           // MCP tools that were called
    validationScore: number;          // 0-100, hallucination detection score
    validationWarnings: string[];     // Any validation warnings
  };
}
