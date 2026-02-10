/**
 * GeminiHydra - Agents Configuration
 * Configuration for AI agent roles, colors, and fallback chains
 */

// ============================================================================
// AGENT ROLES
// ============================================================================

export const AGENT_ROLES = {
  /** Dijkstra - Supreme Coordinator, task routing and optimization */
  DIJKSTRA: 'dijkstra',
  /** Geralt - Lead Developer, complex problem solving */
  GERALT: 'geralt',
  /** Yennefer - Architect, system design and patterns */
  YENNEFER: 'yennefer',
  /** Triss - Data Specialist, data processing and analysis */
  TRISS: 'triss',
  /** Vesemir - Code Reviewer, quality and best practices */
  VESEMIR: 'vesemir',
  /** Jaskier - Documentation, communication and UX */
  JASKIER: 'jaskier',
  /** Ciri - Speed Demon, fast operations and caching */
  CIRI: 'ciri',
  /** Eskel - Testing Expert, test coverage and QA */
  ESKEL: 'eskel',
  /** Lambert - Security Specialist, security and validation */
  LAMBERT: 'lambert',
  /** Zoltan - DevOps, infrastructure and deployment */
  ZOLTAN: 'zoltan',
  /** Regis - Research, deep analysis and knowledge */
  REGIS: 'regis',
  /** Philippa - Strategy, planning and optimization */
  PHILIPPA: 'philippa',
  /** Serena - Code Intelligence Agent, uses real Serena MCP */
  SERENA: 'serena',
  /** Keira - Phase Verification Agent, inter-phase quality gate */
  KEIRA: 'keira',
} as const;

export type AgentRole = (typeof AGENT_ROLES)[keyof typeof AGENT_ROLES];

// ============================================================================
// AGENT DESCRIPTIONS
// ============================================================================

export interface AgentDescription {
  name: string;
  title: string;
  specialty: string;
  personality: string;
}

export const AGENT_DESCRIPTIONS: Record<AgentRole, AgentDescription> = {
  [AGENT_ROLES.DIJKSTRA]: {
    name: 'Dijkstra',
    title: 'Supreme Coordinator',
    specialty: 'Task routing, optimization, resource allocation',
    personality: 'Calculating, efficient, always finding the shortest path',
  },
  [AGENT_ROLES.GERALT]: {
    name: 'Geralt',
    title: 'Lead Developer',
    specialty: 'Complex problem solving, debugging, refactoring',
    personality: 'Pragmatic, experienced, focused on getting the job done',
  },
  [AGENT_ROLES.YENNEFER]: {
    name: 'Yennefer',
    title: 'System Architect',
    specialty: 'System design, patterns, architecture decisions',
    personality: 'Powerful, precise, demands excellence',
  },
  [AGENT_ROLES.TRISS]: {
    name: 'Triss',
    title: 'Data Specialist',
    specialty: 'Data processing, analysis, transformations',
    personality: 'Helpful, thorough, detail-oriented',
  },
  [AGENT_ROLES.VESEMIR]: {
    name: 'Vesemir',
    title: 'Code Reviewer',
    specialty: 'Code quality, best practices, mentoring',
    personality: 'Wise, experienced, patient teacher',
  },
  [AGENT_ROLES.JASKIER]: {
    name: 'Jaskier',
    title: 'Documentation Lead',
    specialty: 'Documentation, communication, user experience',
    personality: 'Creative, expressive, makes complex things simple',
  },
  [AGENT_ROLES.CIRI]: {
    name: 'Ciri',
    title: 'Speed Demon',
    specialty: 'Fast operations, caching, performance optimization',
    personality: 'Quick, agile, teleports through code',
  },
  [AGENT_ROLES.ESKEL]: {
    name: 'Eskel',
    title: 'Testing Expert',
    specialty: 'Test coverage, QA, edge case hunting',
    personality: 'Methodical, reliable, leaves no stone unturned',
  },
  [AGENT_ROLES.LAMBERT]: {
    name: 'Lambert',
    title: 'Security Specialist',
    specialty: 'Security, validation, vulnerability detection',
    personality: 'Suspicious, thorough, trusts nothing',
  },
  [AGENT_ROLES.ZOLTAN]: {
    name: 'Zoltan',
    title: 'DevOps Engineer',
    specialty: 'Infrastructure, deployment, CI/CD',
    personality: 'Practical, sturdy, builds things that last',
  },
  [AGENT_ROLES.REGIS]: {
    name: 'Regis',
    title: 'Research Lead',
    specialty: 'Deep analysis, knowledge extraction, research',
    personality: 'Scholarly, insightful, sees what others miss',
  },
  [AGENT_ROLES.PHILIPPA]: {
    name: 'Philippa',
    title: 'Strategy Lead',
    specialty: 'Planning, optimization, long-term strategy',
    personality: 'Strategic, ambitious, always three steps ahead',
  },
  [AGENT_ROLES.SERENA]: {
    name: 'Serena',
    title: 'Code Intelligence Agent',
    specialty: 'Code analysis, symbol navigation, refactoring via MCP',
    personality: 'Precise, structural, understands code at symbol level',
  },
  [AGENT_ROLES.KEIRA]: {
    name: 'Keira',
    title: 'Phase Verification Gate',
    specialty: 'Inter-phase verification, quality gating, verdict generation',
    personality: 'Analytical, exacting, trusts only evidence and structured proof',
  },
};

// ============================================================================
// AGENT COLORS (for chalk terminal output)
// ============================================================================

export const AGENT_COLORS: Record<AgentRole, string> = {
  [AGENT_ROLES.DIJKSTRA]: 'cyan',
  [AGENT_ROLES.GERALT]: 'white',
  [AGENT_ROLES.YENNEFER]: 'magenta',
  [AGENT_ROLES.TRISS]: 'red',
  [AGENT_ROLES.VESEMIR]: 'gray',
  [AGENT_ROLES.JASKIER]: 'yellow',
  [AGENT_ROLES.CIRI]: 'greenBright',
  [AGENT_ROLES.ESKEL]: 'blue',
  [AGENT_ROLES.LAMBERT]: 'redBright',
  [AGENT_ROLES.ZOLTAN]: 'yellowBright',
  [AGENT_ROLES.REGIS]: 'blueBright',
  [AGENT_ROLES.PHILIPPA]: 'magentaBright',
  [AGENT_ROLES.SERENA]: 'cyanBright',
  [AGENT_ROLES.KEIRA]: 'whiteBright',
};

// ============================================================================
// AGENT FALLBACK CHAINS
// ============================================================================

/**
 * When an agent fails or is unavailable, fallback to next in chain
 */
export const AGENT_FALLBACK_CHAINS: Record<AgentRole, AgentRole[]> = {
  [AGENT_ROLES.DIJKSTRA]: [AGENT_ROLES.PHILIPPA, AGENT_ROLES.YENNEFER],
  [AGENT_ROLES.GERALT]: [AGENT_ROLES.ESKEL, AGENT_ROLES.VESEMIR],
  [AGENT_ROLES.YENNEFER]: [AGENT_ROLES.PHILIPPA, AGENT_ROLES.TRISS],
  [AGENT_ROLES.TRISS]: [AGENT_ROLES.YENNEFER, AGENT_ROLES.REGIS],
  [AGENT_ROLES.VESEMIR]: [AGENT_ROLES.GERALT, AGENT_ROLES.ESKEL],
  [AGENT_ROLES.JASKIER]: [AGENT_ROLES.TRISS, AGENT_ROLES.CIRI],
  [AGENT_ROLES.CIRI]: [AGENT_ROLES.GERALT, AGENT_ROLES.JASKIER],
  [AGENT_ROLES.ESKEL]: [AGENT_ROLES.GERALT, AGENT_ROLES.LAMBERT],
  [AGENT_ROLES.LAMBERT]: [AGENT_ROLES.ESKEL, AGENT_ROLES.ZOLTAN],
  [AGENT_ROLES.ZOLTAN]: [AGENT_ROLES.LAMBERT, AGENT_ROLES.CIRI],
  [AGENT_ROLES.REGIS]: [AGENT_ROLES.TRISS, AGENT_ROLES.PHILIPPA],
  [AGENT_ROLES.PHILIPPA]: [AGENT_ROLES.DIJKSTRA, AGENT_ROLES.YENNEFER],
  [AGENT_ROLES.SERENA]: [AGENT_ROLES.GERALT, AGENT_ROLES.YENNEFER],
  [AGENT_ROLES.KEIRA]: [AGENT_ROLES.TRISS, AGENT_ROLES.VESEMIR],
};

// ============================================================================
// AGENT TASK ROUTING
// ============================================================================

export type TaskCategory =
  | 'coding'
  | 'architecture'
  | 'data'
  | 'testing'
  | 'security'
  | 'docs'
  | 'devops'
  | 'research'
  | 'planning'
  | 'review'
  | 'fast'
  | 'verification'
  | 'general';

/**
 * Map task categories to primary agents
 */
export const TASK_ROUTING: Record<TaskCategory, AgentRole> = {
  coding: AGENT_ROLES.GERALT,
  architecture: AGENT_ROLES.YENNEFER,
  data: AGENT_ROLES.TRISS,
  testing: AGENT_ROLES.ESKEL,
  security: AGENT_ROLES.LAMBERT,
  docs: AGENT_ROLES.JASKIER,
  devops: AGENT_ROLES.ZOLTAN,
  research: AGENT_ROLES.REGIS,
  planning: AGENT_ROLES.PHILIPPA,
  review: AGENT_ROLES.VESEMIR,
  fast: AGENT_ROLES.CIRI,
  verification: AGENT_ROLES.KEIRA,
  general: AGENT_ROLES.DIJKSTRA,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get agent description by role
 */
export function getAgentDescription(role: AgentRole): AgentDescription {
  return AGENT_DESCRIPTIONS[role];
}

/**
 * Get agent color by role
 */
export function getAgentColor(role: AgentRole): string {
  return AGENT_COLORS[role];
}

/**
 * Get fallback chain for an agent (returns agent roles to fall back to)
 * Note: This is different from model fallback chains in src/core/models/FallbackChains.ts
 */
export function getAgentFallbackChain(role: AgentRole): AgentRole[] {
  return AGENT_FALLBACK_CHAINS[role] || [];
}

/**
 * Get agent for a task category
 */
export function getAgentForTask(category: TaskCategory): AgentRole {
  return TASK_ROUTING[category] || AGENT_ROLES.DIJKSTRA;
}

/**
 * Get all agent roles as array
 */
export function getAllAgentRoles(): AgentRole[] {
  return Object.values(AGENT_ROLES);
}

/**
 * Resolve agent role from string (case-insensitive, fallback to geralt)
 */
export function resolveAgentRole(name: string): AgentRole {
  const normalized = name.toLowerCase();
  return (Object.values(AGENT_ROLES) as string[]).includes(normalized)
    ? (normalized as AgentRole)
    : 'geralt';
}
