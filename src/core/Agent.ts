import { AgentRole, AgentPersona } from '../types/index.js';
import ollama from 'ollama';
import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import 'dotenv/config';
import { getBestAvailableModel, DEFAULT_MODEL } from './GeminiCLI.js';
import { GEMINI_MODELS } from '../config/models.config.js';
import { ollamaSemaphore, geminiSemaphore, withRetry } from './TrafficControl.js';
import { AGENT_SYSTEM_PROMPTS, getPlatformPromptPrefix, EXECUTION_EVIDENCE_RULES } from './PromptSystem.js';
import { logger } from './LiveLogger.js';

// Anti-hallucination solutions (Solutions 25-26)
import { antiCreativityMode } from './AntiCreativityMode.js';
import { promptInjectionDetector } from './PromptInjectionDetector.js';

// ============================================================================
// ADVANCED ADAPTIVE TEMPERATURE SYSTEM v2.0
// ============================================================================

/**
 * Configuration for adaptive temperature system
 */
export interface AdaptiveTemperatureConfig {
  // Per-agent temperature profiles
  agentProfiles: Record<string, AgentTemperatureProfile>;

  // Global settings
  enableDynamicAdjustment: boolean;
  enableAnnealing: boolean;
  enableContextAwareness: boolean;
  enableUncertaintyBoost: boolean;
  enableLearning: boolean;

  // Annealing settings
  annealingRate: number;           // How fast temperature decreases (0.01 - 0.1)
  annealingMinTemp: number;        // Minimum temperature floor (0.05 - 0.2)

  // Uncertainty settings
  uncertaintyBoostFactor: number;  // How much to boost temp when uncertain (1.1 - 1.5)
  uncertaintyThreshold: number;    // Confidence threshold below which to boost (0.0 - 1.0)

  // Learning settings
  learningRate: number;            // How fast to adjust from results (0.01 - 0.2)
  historySize: number;             // Number of past results to consider
}

/**
 * Per-agent temperature profile
 */
export interface AgentTemperatureProfile {
  name: string;
  role: string;

  // Base temperature ranges per task type
  baseRanges: Record<TaskType, [number, number]>;

  // Agent-specific modifiers
  creativityBias: number;          // -0.2 to +0.2 - adjust for creative agents
  precisionBias: number;           // -0.2 to +0.2 - adjust for precise agents

  // Preferred temperature for this agent's primary function
  preferredTemp: number;

  // Historical performance
  performanceHistory: TemperaturePerformanceRecord[];
}

/**
 * Record of temperature vs performance for learning
 */
export interface TemperaturePerformanceRecord {
  timestamp: number;
  temperature: number;
  taskType: TaskType;
  qualityScore: number;           // 0.0 - 1.0
  responseTime: number;           // milliseconds
  wasSuccessful: boolean;
}

/**
 * Context for current generation session
 */
export interface TemperatureContext {
  agentName: string;
  taskType: TaskType;
  task: string;

  // Progress tracking for annealing
  generationProgress: number;     // 0.0 - 1.0
  currentStep: number;
  totalSteps: number;

  // Previous results for context awareness
  previousResults: Array<{
    temperature: number;
    quality: number;
    wasSuccessful: boolean;
  }>;

  // Uncertainty indicators
  confidenceLevel: number;        // 0.0 - 1.0
  retryCount: number;
  errorCount: number;
}

/**
 * Default agent temperature profiles for GeminiHydra agents
 */
/**
 * GEMINI 3 OPTIMIZED Agent Temperature Profiles
 *
 * Gemini 3 recommended defaults:
 * - Default: 1.0 (optimal for most tasks)
 * - Range: 0.0-2.0 (but 0.7-2.0 recommended for quality)
 * - Creative: 1.4-1.9 (higher diversity)
 * - Precise: 0.8-1.0 (focused, lower hallucination)
 *
 * Profile ranges scaled from old 0.05-0.75 to new 0.7-1.9
 */
const DEFAULT_AGENT_PROFILES: Record<string, AgentTemperatureProfile> = {
  dijkstra: {
    name: 'dijkstra',
    role: 'Strategist',
    baseRanges: {
      code: [0.85, 1.0],           // Precise code generation
      fix: [0.80, 0.95],           // Focused fixes
      analysis: [0.95, 1.1],       // Balanced analysis
      creative: [1.2, 1.5],        // Strategic creativity
      planning: [0.85, 1.05],      // Focused strategic precision
      general: [0.95, 1.1]
    },
    creativityBias: -0.05,         // Slightly lower for structured planning
    precisionBias: 0.05,           // Higher precision for strategy
    preferredTemp: 0.95,           // Near Gemini 3 default
    performanceHistory: []
  },

  ciri: {
    name: 'ciri',
    role: 'Scout',
    baseRanges: {
      code: [0.95, 1.15],          // Exploratory code
      fix: [0.90, 1.1],
      analysis: [1.0, 1.2],
      creative: [1.4, 1.7],        // High creativity for exploration
      planning: [1.0, 1.2],
      general: [1.1, 1.4]
    },
    creativityBias: 0.10,          // Higher for exploratory tasks
    precisionBias: -0.05,          // Speed over precision
    preferredTemp: 1.15,           // Above default for exploration
    performanceHistory: []
  },

  yennefer: {
    name: 'yennefer',
    role: 'Architect',
    baseRanges: {
      code: [0.80, 0.95],          // Very precise for architecture
      fix: [0.80, 0.95],
      analysis: [0.95, 1.1],
      creative: [1.2, 1.5],        // Creative design
      planning: [0.85, 1.05],
      general: [0.95, 1.15]
    },
    creativityBias: 0.05,          // Some creativity for design
    precisionBias: 0.10,           // High precision for patterns
    preferredTemp: 0.90,           // Precise but creative
    performanceHistory: []
  },

  geralt: {
    name: 'geralt',
    role: 'Security',
    baseRanges: {
      code: [0.75, 0.90],          // Very focused for security
      fix: [0.75, 0.90],
      analysis: [0.85, 1.0],
      creative: [1.0, 1.2],        // Limited creativity for security
      planning: [0.80, 0.95],
      general: [0.85, 1.0]
    },
    creativityBias: -0.10,         // Low creativity - security is precise
    precisionBias: 0.15,           // Highest precision for security
    preferredTemp: 0.85,           // Lower end for accuracy
    performanceHistory: []
  },

  triss: {
    name: 'triss',
    role: 'QA',
    baseRanges: {
      code: [0.80, 0.95],
      fix: [0.80, 0.95],
      analysis: [0.95, 1.1],
      creative: [1.2, 1.5],        // Creative test scenarios
      planning: [0.95, 1.1],
      general: [1.0, 1.2]
    },
    creativityBias: 0.05,          // Some creativity for test cases
    precisionBias: 0.05,           // Precise for bug detection
    preferredTemp: 1.0,            // Gemini 3 default
    performanceHistory: []
  },

  lambert: {
    name: 'lambert',
    role: 'Debugger',
    baseRanges: {
      code: [0.78, 0.92],
      fix: [0.75, 0.90],           // Very precise for bug fixes
      analysis: [0.85, 1.05],
      creative: [1.0, 1.2],
      planning: [0.85, 1.05],
      general: [0.95, 1.1]
    },
    creativityBias: -0.05,
    precisionBias: 0.10,           // High precision for debugging
    preferredTemp: 0.88,           // Focused debugging
    performanceHistory: []
  },

  jaskier: {
    name: 'jaskier',
    role: 'Bard',
    baseRanges: {
      code: [1.0, 1.2],
      fix: [0.95, 1.1],
      analysis: [1.1, 1.3],
      creative: [1.5, 1.9],        // High creativity for summaries
      planning: [1.1, 1.3],
      general: [1.3, 1.6]
    },
    creativityBias: 0.15,          // Highest creativity for bard
    precisionBias: -0.10,          // Less precision, more flair
    preferredTemp: 1.45,           // High creative output
    performanceHistory: []
  },

  regis: {
    name: 'regis',
    role: 'Researcher',
    baseRanges: {
      code: [0.85, 1.0],
      fix: [0.85, 1.0],
      analysis: [1.0, 1.2],        // Balanced for deep analysis
      creative: [1.3, 1.55],
      planning: [0.95, 1.1],
      general: [1.1, 1.3]
    },
    creativityBias: 0.05,
    precisionBias: 0.05,           // Balanced
    preferredTemp: 1.1,            // Slightly above default
    performanceHistory: []
  },

  vesemir: {
    name: 'vesemir',
    role: 'Mentor',
    baseRanges: {
      code: [0.85, 1.0],
      fix: [0.85, 1.0],
      analysis: [1.0, 1.2],
      creative: [1.2, 1.5],
      planning: [0.95, 1.1],
      general: [1.0, 1.2]
    },
    creativityBias: 0.0,           // Balanced mentor
    precisionBias: 0.05,
    preferredTemp: 1.05,           // Balanced teaching
    performanceHistory: []
  },

  eskel: {
    name: 'eskel',
    role: 'DevOps',
    baseRanges: {
      code: [0.80, 0.95],
      fix: [0.80, 0.95],
      analysis: [0.95, 1.1],
      creative: [1.1, 1.3],
      planning: [0.85, 1.05],
      general: [0.95, 1.1]
    },
    creativityBias: -0.05,
    precisionBias: 0.10,           // Precision for deployment
    preferredTemp: 0.95,           // Reliable operations
    performanceHistory: []
  },

  zoltan: {
    name: 'zoltan',
    role: 'Data',
    baseRanges: {
      code: [0.80, 0.95],
      fix: [0.80, 0.95],
      analysis: [0.95, 1.1],
      creative: [1.1, 1.35],
      planning: [0.95, 1.1],
      general: [1.0, 1.2]
    },
    creativityBias: 0.0,
    precisionBias: 0.10,           // Precise for data handling
    preferredTemp: 0.95,           // Data accuracy
    performanceHistory: []
  },

  philippa: {
    name: 'philippa',
    role: 'API',
    baseRanges: {
      code: [0.80, 0.95],
      fix: [0.80, 0.95],
      analysis: [0.95, 1.1],
      creative: [1.1, 1.35],
      planning: [0.85, 1.05],
      general: [0.95, 1.1]
    },
    creativityBias: 0.0,
    precisionBias: 0.10,           // Precise for API work
    preferredTemp: 0.90,           // Reliable API integration
    performanceHistory: []
  }
};

/**
 * Default configuration for adaptive temperature system
 */
/**
 * GEMINI 3 OPTIMIZED Temperature Configuration
 *
 * Updated for Gemini 3 recommended range (0.7-2.0):
 * - annealingMinTemp raised from 0.08 to 0.75 (Gemini 3 safe minimum)
 * - annealingRate adjusted for larger temperature space
 * - uncertaintyBoostFactor scaled appropriately
 */
const DEFAULT_TEMPERATURE_CONFIG: AdaptiveTemperatureConfig = {
  agentProfiles: DEFAULT_AGENT_PROFILES,
  enableDynamicAdjustment: true,
  enableAnnealing: true,
  enableContextAwareness: true,
  enableUncertaintyBoost: true,
  enableLearning: true,
  annealingRate: 0.02,             // Slower annealing in wider range
  annealingMinTemp: 0.75,          // Gemini 3 safe minimum
  uncertaintyBoostFactor: 1.15,    // Scaled for Gemini 3 range
  uncertaintyThreshold: 0.5,
  learningRate: 0.05,
  historySize: 50
};

/**
 * TEMPERATURE CONTROLLER CLASS
 * Central controller for all adaptive temperature functionality
 */
export class TemperatureController {
  private config: AdaptiveTemperatureConfig;
  private globalHistory: TemperaturePerformanceRecord[] = [];
  private sessionStartTime: number;

  constructor(config: Partial<AdaptiveTemperatureConfig> = {}) {
    this.config = { ...DEFAULT_TEMPERATURE_CONFIG, ...config };
    this.sessionStartTime = Date.now();

    // Merge agent profiles if provided
    if (config.agentProfiles) {
      this.config.agentProfiles = {
        ...DEFAULT_AGENT_PROFILES,
        ...config.agentProfiles
      };
    }
  }

  /**
   * Get temperature for a specific agent and task type
   * Combines agent profile with task-specific adjustments
   */
  getTemperatureForAgent(
    agentName: string,
    taskType: TaskType,
    task: string = ''
  ): number {
    const profile = this.config.agentProfiles[agentName] ||
                   this.createDefaultProfile(agentName);

    // Get base range for task type
    const [minTemp, maxTemp] = profile.baseRanges[taskType] ||
                               profile.baseRanges.general;

    // Start with middle of range
    let temperature = (minTemp + maxTemp) / 2;

    // Apply agent biases
    temperature += profile.creativityBias;
    temperature -= profile.precisionBias;

    // Apply task length factor (longer = slightly lower for coherence)
    if (task) {
      const lengthFactor = Math.min(task.length / 3000, 1);
      temperature -= lengthFactor * 0.05;
    }

    // Apply learned adjustments if enabled
    if (this.config.enableLearning && profile.performanceHistory.length > 5) {
      const optimalTemp = this.calculateOptimalFromHistory(
        profile.performanceHistory,
        taskType
      );
      // Blend current with learned optimal (80% current, 20% learned)
      temperature = temperature * 0.8 + optimalTemp * 0.2;
    }

    // Clamp to valid range
    temperature = Math.max(minTemp, Math.min(maxTemp, temperature));

    return this.round(temperature);
  }

  /**
   * Adjust temperature during generation based on progress
   * Implements temperature annealing and dynamic adjustment
   */
  adjustTemperatureDuringGeneration(
    currentTemp: number,
    context: TemperatureContext
  ): number {
    let adjustedTemp = currentTemp;

    // 1. ANNEALING: Reduce temperature as generation progresses
    if (this.config.enableAnnealing) {
      const progress = context.generationProgress;
      const annealingFactor = 1 - (progress * this.config.annealingRate);
      adjustedTemp *= annealingFactor;

      // Don't go below minimum
      adjustedTemp = Math.max(adjustedTemp, this.config.annealingMinTemp);
    }

    // 2. UNCERTAINTY BOOST: Increase temperature if confidence is low
    if (this.config.enableUncertaintyBoost) {
      if (context.confidenceLevel < this.config.uncertaintyThreshold) {
        const uncertaintyMultiplier = 1 + (
          (this.config.uncertaintyThreshold - context.confidenceLevel) *
          (this.config.uncertaintyBoostFactor - 1)
        );
        adjustedTemp *= uncertaintyMultiplier;
      }

      // Boost more if retries are happening
      if (context.retryCount > 0) {
        adjustedTemp *= (1 + context.retryCount * 0.05);
      }
    }

    // 3. CONTEXT AWARENESS: Adjust based on previous results
    if (this.config.enableContextAwareness && context.previousResults.length > 0) {
      const recentResults = context.previousResults.slice(-3);
      const avgQuality = recentResults.reduce((sum, r) => sum + r.quality, 0) /
                        recentResults.length;

      // If quality was high with certain temps, move toward those
      if (avgQuality > 0.7) {
        const avgSuccessTemp = recentResults
          .filter(r => r.wasSuccessful)
          .reduce((sum, r) => sum + r.temperature, 0) /
          (recentResults.filter(r => r.wasSuccessful).length || 1);

        // Blend toward successful temperature
        adjustedTemp = adjustedTemp * 0.7 + avgSuccessTemp * 0.3;
      }

      // If quality was low, try different temperature direction
      if (avgQuality < 0.4) {
        const lastTemp = recentResults[recentResults.length - 1]?.temperature || adjustedTemp;
        // Swing temperature in opposite direction
        adjustedTemp = adjustedTemp + (adjustedTemp - lastTemp) * 0.2;
      }
    }

    // 4. DYNAMIC STEP ADJUSTMENT
    if (this.config.enableDynamicAdjustment && context.totalSteps > 1) {
      const stepProgress = context.currentStep / context.totalSteps;

      // Early steps: slightly higher temp for exploration
      // Later steps: lower temp for convergence
      if (stepProgress < 0.3) {
        adjustedTemp *= 1.05;
      } else if (stepProgress > 0.7) {
        adjustedTemp *= 0.95;
      }
    }

    // Clamp to valid range [0.05, 1.0]
    adjustedTemp = Math.max(0.05, Math.min(1.0, adjustedTemp));

    return this.round(adjustedTemp);
  }

  /**
   * Learn from generation result to improve future temperature selection
   */
  learnFromResult(
    agentName: string,
    temperature: number,
    taskType: TaskType,
    qualityScore: number,
    responseTime: number = 0,
    wasSuccessful: boolean = true
  ): void {
    if (!this.config.enableLearning) return;

    const record: TemperaturePerformanceRecord = {
      timestamp: Date.now(),
      temperature,
      taskType,
      qualityScore: Math.max(0, Math.min(1, qualityScore)),
      responseTime,
      wasSuccessful
    };

    // Add to agent's history
    const profile = this.config.agentProfiles[agentName];
    if (profile) {
      profile.performanceHistory.push(record);

      // Trim to max history size
      if (profile.performanceHistory.length > this.config.historySize) {
        profile.performanceHistory = profile.performanceHistory.slice(
          -this.config.historySize
        );
      }

      // Update preferred temperature based on best performing temps
      this.updatePreferredTemperature(profile);
    }

    // Add to global history
    this.globalHistory.push(record);
    if (this.globalHistory.length > this.config.historySize * 2) {
      this.globalHistory = this.globalHistory.slice(-this.config.historySize * 2);
    }
  }

  /**
   * Get temperature statistics for an agent
   */
  getAgentStats(agentName: string): {
    preferredTemp: number;
    avgQuality: number;
    bestTaskType: TaskType | null;
    totalSamples: number;
  } {
    const profile = this.config.agentProfiles[agentName];
    if (!profile || profile.performanceHistory.length === 0) {
      return {
        preferredTemp: profile?.preferredTemp || 0.3,
        avgQuality: 0,
        bestTaskType: null,
        totalSamples: 0
      };
    }

    const history = profile.performanceHistory;
    const avgQuality = history.reduce((sum, r) => sum + r.qualityScore, 0) /
                      history.length;

    // Find best performing task type
    const taskTypeScores: Record<string, { sum: number; count: number }> = {};
    for (const record of history) {
      if (!taskTypeScores[record.taskType]) {
        taskTypeScores[record.taskType] = { sum: 0, count: 0 };
      }
      taskTypeScores[record.taskType].sum += record.qualityScore;
      taskTypeScores[record.taskType].count++;
    }

    let bestTaskType: TaskType | null = null;
    let bestAvg = 0;
    for (const [taskType, scores] of Object.entries(taskTypeScores)) {
      const avg = scores.sum / scores.count;
      if (avg > bestAvg) {
        bestAvg = avg;
        bestTaskType = taskType as TaskType;
      }
    }

    return {
      preferredTemp: profile.preferredTemp,
      avgQuality: this.round(avgQuality),
      bestTaskType,
      totalSamples: history.length
    };
  }

  /**
   * Calculate optimal temperature from historical performance
   */
  private calculateOptimalFromHistory(
    history: TemperaturePerformanceRecord[],
    taskType: TaskType
  ): number {
    // Filter to relevant task type and successful results
    const relevant = history.filter(
      r => r.taskType === taskType && r.wasSuccessful && r.qualityScore > 0.5
    );

    if (relevant.length === 0) {
      // Fall back to all successful results
      const allSuccessful = history.filter(r => r.wasSuccessful);
      if (allSuccessful.length === 0) return 0.3;

      // Weight by quality score
      const weightedSum = allSuccessful.reduce(
        (sum, r) => sum + r.temperature * r.qualityScore, 0
      );
      const weightTotal = allSuccessful.reduce(
        (sum, r) => sum + r.qualityScore, 0
      );
      return weightedSum / weightTotal;
    }

    // Calculate weighted average (higher quality = higher weight)
    const weightedSum = relevant.reduce(
      (sum, r) => sum + r.temperature * r.qualityScore, 0
    );
    const weightTotal = relevant.reduce(
      (sum, r) => sum + r.qualityScore, 0
    );

    return weightedSum / weightTotal;
  }

  /**
   * Update agent's preferred temperature based on performance
   */
  private updatePreferredTemperature(profile: AgentTemperatureProfile): void {
    const recentHistory = profile.performanceHistory.slice(-20);
    const successfulRecords = recentHistory.filter(
      r => r.wasSuccessful && r.qualityScore > 0.6
    );

    if (successfulRecords.length < 3) return;

    // Calculate new preferred temp with exponential decay (recent matters more)
    let weightedSum = 0;
    let weightTotal = 0;

    for (let i = 0; i < successfulRecords.length; i++) {
      const record = successfulRecords[i];
      const recency = Math.exp(i / successfulRecords.length); // More recent = higher weight
      const weight = record.qualityScore * recency;

      weightedSum += record.temperature * weight;
      weightTotal += weight;
    }

    const newPreferred = weightedSum / weightTotal;

    // Blend with current preferred (gradual learning)
    profile.preferredTemp = profile.preferredTemp * (1 - this.config.learningRate) +
                           newPreferred * this.config.learningRate;

    // Clamp to reasonable range
    profile.preferredTemp = Math.max(0.1, Math.min(0.7, profile.preferredTemp));
  }

  /**
   * Create a default profile for unknown agents
   */
  private createDefaultProfile(agentName: string): AgentTemperatureProfile {
    return {
      name: agentName,
      role: 'Unknown',
      baseRanges: {
        code: [0.15, 0.25],
        fix: [0.10, 0.20],
        analysis: [0.25, 0.40],
        creative: [0.40, 0.60],
        planning: [0.20, 0.35],
        general: [0.25, 0.45]
      },
      creativityBias: 0,
      precisionBias: 0,
      preferredTemp: 0.3,
      performanceHistory: []
    };
  }

  /**
   * Round temperature to 2 decimal places
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Export current learning state for persistence
   */
  exportLearningState(): {
    profiles: Record<string, Pick<AgentTemperatureProfile, 'name' | 'preferredTemp' | 'performanceHistory'>>;
    globalHistory: TemperaturePerformanceRecord[];
  } {
    const profiles: Record<string, Pick<AgentTemperatureProfile, 'name' | 'preferredTemp' | 'performanceHistory'>> = {};

    for (const [name, profile] of Object.entries(this.config.agentProfiles)) {
      profiles[name] = {
        name: profile.name,
        preferredTemp: profile.preferredTemp,
        performanceHistory: profile.performanceHistory
      };
    }

    return { profiles, globalHistory: this.globalHistory };
  }

  /**
   * Import previously saved learning state
   */
  importLearningState(state: ReturnType<typeof this.exportLearningState>): void {
    if (state.profiles) {
      for (const [name, savedProfile] of Object.entries(state.profiles)) {
        const existingProfile = this.config.agentProfiles[name];
        if (existingProfile) {
          existingProfile.preferredTemp = savedProfile.preferredTemp;
          existingProfile.performanceHistory = savedProfile.performanceHistory || [];
        }
      }
    }

    if (state.globalHistory) {
      this.globalHistory = state.globalHistory;
    }
  }

  /**
   * Reset learning for a specific agent or all agents
   */
  resetLearning(agentName?: string): void {
    if (agentName) {
      const profile = this.config.agentProfiles[agentName];
      if (profile) {
        profile.performanceHistory = [];
        // Reset to default preferred temp
        const defaultProfile = DEFAULT_AGENT_PROFILES[agentName];
        if (defaultProfile) {
          profile.preferredTemp = defaultProfile.preferredTemp;
        }
      }
    } else {
      // Reset all
      for (const profile of Object.values(this.config.agentProfiles)) {
        profile.performanceHistory = [];
        const defaultProfile = DEFAULT_AGENT_PROFILES[profile.name];
        if (defaultProfile) {
          profile.preferredTemp = defaultProfile.preferredTemp;
        }
      }
      this.globalHistory = [];
    }
  }
}

// Global temperature controller instance
let globalTemperatureController: TemperatureController | null = null;

/**
 * Get or create the global temperature controller
 */
export function getTemperatureController(): TemperatureController {
  if (!globalTemperatureController) {
    globalTemperatureController = new TemperatureController();
  }
  return globalTemperatureController;
}

/**
 * Initialize temperature controller with custom config
 */
export function initializeTemperatureController(
  config?: Partial<AdaptiveTemperatureConfig>
): TemperatureController {
  globalTemperatureController = new TemperatureController(config);
  return globalTemperatureController;
}

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * DIJKSTRA GEMINI-ONLY CHAIN
 * Ported from AgentSwarm.psm1 lines 354-427
 * Dijkstra NEVER uses Ollama - only Gemini with fallback chain
 */
const DIJKSTRA_CHAIN = [
  { name: GEMINI_MODELS.PRO, role: 'Flagowiec (Flagship)', temperature: 0.2 },
  { name: GEMINI_MODELS.PRO, role: 'Pierwszy oficer (First Officer)', temperature: 0.25 },
  { name: GEMINI_MODELS.FLASH, role: 'Szybki zwiadowca (Fast Scout)', temperature: 0.3 },
  { name: GEMINI_MODELS.FLASH, role: 'Ostatnia deska ratunku (Last Resort)', temperature: 0.35 }
];

// Model tiers for intelligent routing (Gemini 3 only)
const MODEL_TIERS = {
  classifier: GEMINI_MODELS.FLASH, // Fast classification
  fast: GEMINI_MODELS.FLASH,       // Fast for simple tasks
  standard: GEMINI_MODELS.FLASH,   // Balanced
  pro: GEMINI_MODELS.FLASH,        // Quality
  best: GEMINI_MODELS.PRO          // Best quality (for critical tasks)
};

// Task complexity levels
type TaskComplexity = 'trivial' | 'simple' | 'medium' | 'complex' | 'critical';

// Task types for adaptive temperature
type TaskType = 'code' | 'fix' | 'analysis' | 'creative' | 'planning' | 'general';

/**
 * ADAPTIVE TEMPERATURE SYSTEM v2.0
 * Dynamically adjusts temperature based on:
 * - Task type and content
 * - Agent personality/role
 * - Historical performance
 * - Context awareness
 * - Uncertainty detection
 *
 * Temperature ranges:
 * - Code/Fix: 0.1-0.2 (precision, deterministic output)
 * - Analysis: 0.3-0.4 (balanced exploration)
 * - Creative/Proposals: 0.5-0.7 (creative diversity)
 * - Strategic Planning (Dijkstra): 0.2-0.3 (structured creativity)
 */
function getAdaptiveTemperature(
  task: string,
  taskType: TaskType,
  agentName?: string,
  context?: Partial<TemperatureContext>
): number {
  const taskLower = task.toLowerCase();

  // Auto-detect task type from content if not explicitly set
  let detectedType: TaskType = taskType;

  if (taskType === 'general') {
    detectedType = detectTaskType(taskLower);
  }

  // If we have an agent name, use the advanced temperature controller
  if (agentName) {
    const controller = getTemperatureController();
    let temperature = controller.getTemperatureForAgent(agentName, detectedType, task);

    // Apply context adjustments if provided
    if (context) {
      const fullContext: TemperatureContext = {
        agentName,
        taskType: detectedType,
        task,
        generationProgress: context.generationProgress || 0,
        currentStep: context.currentStep || 0,
        totalSteps: context.totalSteps || 1,
        previousResults: context.previousResults || [],
        confidenceLevel: context.confidenceLevel || 0.8,
        retryCount: context.retryCount || 0,
        errorCount: context.errorCount || 0
      };

      temperature = controller.adjustTemperatureDuringGeneration(temperature, fullContext);
    }

    return temperature;
  }

  // Fallback to basic temperature calculation (legacy mode)
  return getBasicAdaptiveTemperature(task, detectedType);
}

/**
 * Detect task type from content keywords
 */
function detectTaskType(taskLower: string): TaskType {
  // Code-related keywords (precision needed)
  const codeKeywords = [
    'implementuj', 'implement', 'kod', 'code', 'funkcj', 'function',
    'class', 'klasa', 'metod', 'method', 'zapis', 'write', 'stwórz',
    'create', 'dodaj', 'add', 'refactor', 'typescript', 'javascript',
    'python', 'rust', 'programuj', 'compile', 'build'
  ];

  // Fix-related keywords (high precision needed)
  const fixKeywords = [
    'napraw', 'fix', 'bug', 'błąd', 'error', 'debug', 'issue',
    'problem', 'popraw', 'correct', 'repair', 'resolve', 'hotfix'
  ];

  // Analysis keywords (balanced)
  const analysisKeywords = [
    'analiz', 'analy', 'sprawdź', 'check', 'review', 'przegląd',
    'evaluate', 'assess', 'audit', 'inspect', 'examine', 'verify',
    'test', 'validate', 'compare', 'porównaj'
  ];

  // Creative keywords (higher temperature)
  const creativeKeywords = [
    'propozycj', 'propos', 'sugest', 'suggest', 'pomysł', 'idea',
    'creative', 'kreatywn', 'innowac', 'innovat', 'alternatyw',
    'alternative', 'brainstorm', 'design', 'projekt', 'koncept',
    'concept', 'vision', 'wizja', 'możliwoś', 'possibil'
  ];

  // Planning keywords (Dijkstra-style)
  const planningKeywords = [
    'plan', 'strateg', 'roadmap', 'harmonogram', 'schedule',
    'organize', 'struktur', 'architektur', 'architect', 'blueprint',
    'diagram', 'workflow', 'process', 'procedur', 'krok', 'step'
  ];

  // Detect type based on keywords
  if (fixKeywords.some(kw => taskLower.includes(kw))) {
    return 'fix';
  } else if (codeKeywords.some(kw => taskLower.includes(kw))) {
    return 'code';
  } else if (planningKeywords.some(kw => taskLower.includes(kw))) {
    return 'planning';
  } else if (creativeKeywords.some(kw => taskLower.includes(kw))) {
    return 'creative';
  } else if (analysisKeywords.some(kw => taskLower.includes(kw))) {
    return 'analysis';
  }

  return 'general';
}

/**
 * Basic adaptive temperature (legacy fallback)
 */
function getBasicAdaptiveTemperature(task: string, taskType: TaskType): number {
  // Temperature ranges per task type
  const temperatureRanges: Record<TaskType, [number, number]> = {
    code: [0.1, 0.2],      // Precision for code generation
    fix: [0.1, 0.2],       // Precision for bug fixes
    analysis: [0.3, 0.4],  // Balance for analysis
    creative: [0.5, 0.7],  // Creativity for proposals
    planning: [0.2, 0.3],  // Structured for Dijkstra planning
    general: [0.3, 0.5]    // Default balanced range
  };

  const [minTemp, maxTemp] = temperatureRanges[taskType];

  // Fine-tune within range based on task length/complexity
  // Longer tasks tend to benefit from slightly lower temperature for coherence
  const taskLength = task.length;
  const lengthFactor = Math.min(taskLength / 2000, 1); // Normalize to 0-1

  // Shorter tasks → higher end of range, longer tasks → lower end
  const temperature = maxTemp - (lengthFactor * (maxTemp - minTemp));

  // Round to 2 decimal places
  return Math.round(temperature * 100) / 100;
}

/**
 * Enhanced adaptive temperature with full context
 * Use this for advanced scenarios requiring all features
 */
function getEnhancedAdaptiveTemperature(
  agentName: string,
  task: string,
  options: {
    taskType?: TaskType;
    generationProgress?: number;
    currentStep?: number;
    totalSteps?: number;
    previousResults?: Array<{ temperature: number; quality: number; wasSuccessful: boolean }>;
    confidenceLevel?: number;
    retryCount?: number;
  } = {}
): {
  temperature: number;
  taskType: TaskType;
  adjustments: string[];
} {
  const controller = getTemperatureController();
  const taskType = options.taskType || detectTaskType(task.toLowerCase());
  const adjustments: string[] = [];

  // Get base temperature for agent
  let temperature = controller.getTemperatureForAgent(agentName, taskType, task);
  adjustments.push(`Base for ${agentName}/${taskType}: ${temperature}`);

  // Build full context
  const context: TemperatureContext = {
    agentName,
    taskType,
    task,
    generationProgress: options.generationProgress || 0,
    currentStep: options.currentStep || 0,
    totalSteps: options.totalSteps || 1,
    previousResults: options.previousResults || [],
    confidenceLevel: options.confidenceLevel || 0.8,
    retryCount: options.retryCount || 0,
    errorCount: 0
  };

  // Apply adjustments
  const adjusted = controller.adjustTemperatureDuringGeneration(temperature, context);

  if (adjusted !== temperature) {
    if (context.generationProgress > 0) {
      adjustments.push(`Annealing (${Math.round(context.generationProgress * 100)}% progress)`);
    }
    if (context.confidenceLevel < 0.5) {
      adjustments.push(`Uncertainty boost (confidence: ${context.confidenceLevel})`);
    }
    if (context.retryCount > 0) {
      adjustments.push(`Retry adjustment (attempt ${context.retryCount + 1})`);
    }
    if (context.previousResults.length > 0) {
      adjustments.push(`Context awareness (${context.previousResults.length} previous results)`);
    }
    temperature = adjusted;
    adjustments.push(`Final adjusted: ${temperature}`);
  }

  return { temperature, taskType, adjustments };
}

// Dynamic model selection state
let availableModels: Set<string> = new Set();
let modelInitialized = false;

/**
 * Initialize available models from Gemini API (lazy, fast)
 * Note: We skip fetching full model list for speed - use predefined tiers
 */
export async function initializeGeminiModels(): Promise<void> {
  if (modelInitialized) return;

  try {
    // Just check if we have a working model, don't fetch full list (saves ~500ms)
    const bestModel = await getBestAvailableModel();
    console.log(chalk.cyan(`[Gemini] Best available model: ${bestModel}`));

    // Pre-populate with known working models - Gemini 3 only
    availableModels.add(GEMINI_MODELS.FLASH);
    availableModels.add(GEMINI_MODELS.PRO);

    modelInitialized = true;
  } catch (error) {
    console.warn(chalk.yellow('[Gemini] Could not verify models, using defaults'));
    modelInitialized = true;
  }
}

/**
 * Classify task complexity using ultra-fast model
 */
async function classifyTaskComplexity(task: string): Promise<TaskComplexity> {
  try {
    const classifierModel = genAI.getGenerativeModel({
      model: MODEL_TIERS.classifier,
      generationConfig: { temperature: 0, maxOutputTokens: 20 }
    });

    const prompt = `Classify this task complexity. Reply with ONLY one word: trivial, simple, medium, complex, or critical.

Task: ${task.substring(0, 500)}

Complexity:`;

    const result = await classifierModel.generateContent(prompt);
    const response = result.response.text().toLowerCase().trim();

    const validLevels: TaskComplexity[] = ['trivial', 'simple', 'medium', 'complex', 'critical'];
    const matched = validLevels.find(level => response.includes(level));

    return matched || 'medium';
  } catch (error) {
    // If classifier fails, default to medium
    return 'medium';
  }
}

/**
 * Select optimal model based on task complexity
 */
function selectModelForComplexity(complexity: TaskComplexity): string {
  const modelMap: Record<TaskComplexity, string> = {
    trivial: MODEL_TIERS.fast,
    simple: MODEL_TIERS.fast,
    medium: MODEL_TIERS.standard,
    complex: MODEL_TIERS.pro,
    critical: MODEL_TIERS.best
  };

  const selectedModel = modelMap[complexity];

  // Check if selected model is available, fallback to next best
  if (availableModels.size > 0 && !availableModels.has(selectedModel)) {
    // Fallback chain
    const fallbacks = [MODEL_TIERS.pro, MODEL_TIERS.standard, MODEL_TIERS.fast, DEFAULT_MODEL];
    for (const fallback of fallbacks) {
      if (availableModels.has(fallback)) {
        return fallback;
      }
    }
  }

  return selectedModel;
}

export const AGENT_PERSONAS: Record<AgentRole, AgentPersona> = {
  dijkstra: { name: 'dijkstra', role: 'Strategist', model: 'gemini-cloud', description: 'Master strategist using Gemini 2.0 Flash. Create JSON plans.' },
  geralt:   { name: 'geralt',   role: 'Security',   model: 'llama3.2:3b',      description: 'Oversee security. VETO unsafe changes.' },
  yennefer: { name: 'yennefer', role: 'Architect',  model: 'qwen2.5-coder:1.5b', description: 'Focus on design patterns and code purity.' },
  triss:    { name: 'triss',    role: 'QA',         model: 'qwen2.5-coder:1.5b', description: 'QA role. Create test scenarios.' },
  vesemir:  { name: 'vesemir',  role: 'Mentor',     model: 'llama3.2:3b',      description: 'Mentor. Review plans.' },
  jaskier:  { name: 'jaskier',  role: 'Bard',       model: 'llama3.2:3b',      description: 'Translate technical reports into summaries.' },
  ciri:     { name: 'ciri',     role: 'Scout',      model: 'llama3.2:1b',      description: 'Speed role. Execute simple, atomic tasks.' },
  eskel:    { name: 'eskel',    role: 'DevOps',     model: 'llama3.2:3b',      description: 'DevOps specialist. Build and deploy.' },
  lambert:  { name: 'lambert',  role: 'Debugger',   model: 'qwen2.5-coder:1.5b', description: 'Debugger. Analyze and fix errors.' },
  zoltan:   { name: 'zoltan',   role: 'Data',       model: 'llama3.2:3b',      description: 'Data master. Analyze JSON/CSV/YML.' },
  regis:    { name: 'regis',    role: 'Researcher', model: 'gemini-cloud',     description: 'Synthesizer and Researcher. Deep analysis with Gemini.' },
  philippa: { name: 'philippa', role: 'API',        model: 'qwen2.5-coder:1.5b', description: 'API specialist.' },
  serena:   { name: 'serena',   role: 'CodeIntel',  model: 'gemini-cloud',     description: 'Code Intelligence via real Serena MCP. LSP-powered symbol search, refactoring, deep code analysis.' }
};

/**
 * Options for Agent.think() method
 */
export interface ThinkOptions {
  /** Timeout in milliseconds (default: 60000 = 60s) */
  timeout?: number;
  /** AbortSignal for external cancellation */
  signal?: AbortSignal;
}

export class Agent {
  private persona: AgentPersona;
  private modelOverride?: string;

  constructor(role: AgentRole, modelOverride?: string) {
    this.persona = AGENT_PERSONAS[role];
    // Defensive check: fallback to geralt if persona not found (prevents "Cannot read properties of undefined")
    if (!this.persona) {
      console.log(chalk.yellow(`[Agent] Invalid role "${role}" - falling back to geralt`));
      this.persona = AGENT_PERSONAS['geralt'];
    }
    this.modelOverride = modelOverride;
  }

  /**
   * Execute thinking/reasoning with timeout support
   * @param prompt - The prompt to process
   * @param context - Optional context string
   * @param options - Timeout and abort options
   */
  async think(prompt: string, context: string = '', options?: ThinkOptions): Promise<string> {
    const timeoutMs = options?.timeout || 180000; // Default 180 seconds (3 min) for Ollama
    const externalSignal = options?.signal;

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Agent ${this.persona.name} timeout after ${timeoutMs}ms`));
      }, timeoutMs);

      // Clear timeout if external signal aborts
      if (externalSignal) {
        externalSignal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error(`Agent ${this.persona.name} aborted by external signal`));
        });
      }
    });

    // Execute actual thinking with timeout race
    try {
      return await Promise.race([
        this.thinkInternal(prompt, context),
        timeoutPromise
      ]);
    } catch (error: any) {
      // Re-throw with better context
      if (error.message.includes('timeout') || error.message.includes('aborted')) {
        console.log(chalk.red(`[${this.persona.name}] ${error.message}`));
      }
      throw error;
    }
  }

  /**
   * Internal thinking logic (separated for timeout wrapper)
   * Tasks are passed as JSON for Ollama parallel execution
   * Solution 20: Now includes EXECUTION_EVIDENCE_RULES to prevent hallucinations
   * Solutions 25-26: AntiCreativityMode and PromptInjectionDetector
   */
  private async thinkInternal(prompt: string, context: string): Promise<string> {
    // Solution 26: Check for prompt injection attacks
    // Enabled by default. Set DISABLE_PROMPT_INJECTION_DETECTION=true to turn off
    const enableInjectionDetection = process.env.DISABLE_PROMPT_INJECTION_DETECTION !== 'true';

    if (enableInjectionDetection) {
      const injectionCheck = promptInjectionDetector.detectInjection(prompt);
      if (injectionCheck.detected) {
        console.log(chalk.red(`[PromptInjection] Detected potential injection attack!`));
        console.log(chalk.yellow(`[PromptInjection] Severity: ${injectionCheck.severity}, Risk Score: ${injectionCheck.riskScore}`));
        injectionCheck.details.forEach(d => {
          console.log(chalk.gray(`  - ${d.type}: ${d.description}`));
        });

        // For high/critical severity, reject the prompt entirely
        if (injectionCheck.severity === 'high' || injectionCheck.severity === 'critical') {
          throw new Error(`Prompt injection detected (${injectionCheck.severity}): ${injectionCheck.details.map(d => d.type).join(', ')}`);
        }

        // For medium severity, sanitize the prompt
        if (injectionCheck.sanitizedContent && injectionCheck.severity === 'medium') {
          prompt = injectionCheck.sanitizedContent;
          console.log(chalk.yellow(`[PromptInjection] Prompt sanitized, continuing with cleaned version`));
        }
      }
    }

    // Solution 25: Apply AntiCreativityMode for read/analysis tasks
    // SKIP for dijkstra (needs JSON output) and other structured-output agents
    const skipAntiCreativity = ['dijkstra', 'yennefer'].includes(this.persona.name);
    const taskLower = prompt.toLowerCase();
    const isReadOrAnalysisTask = taskLower.includes('odczytaj') ||
                                  taskLower.includes('przeczytaj') ||
                                  taskLower.includes('przeanalizuj') ||
                                  taskLower.includes('zidentyfikuj') ||
                                  taskLower.includes('sprawdź') ||
                                  taskLower.includes('read') ||
                                  taskLower.includes('analyze') ||
                                  taskLower.includes('check');

    if (isReadOrAnalysisTask && !skipAntiCreativity) {
      const wrappedPrompt = antiCreativityMode.conditionalWrap(prompt, prompt);
      if (wrappedPrompt !== prompt) {
        prompt = wrappedPrompt;
        console.log(chalk.gray(`[AntiCreativity] Applied strict factual mode for ${this.persona.name}`));
      }
    }

    // Użyj polskiego promptu systemowego z PromptSystem.ts
    const polishSystemPrompt = AGENT_SYSTEM_PROMPTS[this.persona.name] ||
      `Jesteś ${this.persona.name} (${this.persona.role}). ${this.persona.description}`;

    // Build JSON task structure for Ollama
    const taskJson = JSON.stringify({
      agent: this.persona.name,
      role: this.persona.role,
      task: prompt,
      context: context || null
    });

    // DIJKSTRA: Use dedicated Gemini-only chain with CLEAN prompt (no EXEC rules - needs pure JSON output)
    if (this.persona.name === 'dijkstra') {
      // Dijkstra gets clean prompt - the planning prompt already contains JSON format instructions
      return this.dijkstraChainThink(prompt);
    }

    // Solution 20: Include execution evidence rules to prevent hallucinations (for non-dijkstra agents)
    // Identity context (TOŻSAMOŚĆ) is injected centrally via sessionMemory init message — see getIdentityContext()
    const fullPrompt = `
SYSTEM: ${polishSystemPrompt}

${EXECUTION_EVIDENCE_RULES}

TASK_JSON: ${taskJson}
INSTRUKCJA: Wykonaj zadanie z TASK_JSON. Odpowiadaj PO POLSKU. Zwróć tylko wynik, bez markdown.
WAŻNE: Dołącz dowody wykonania (===ZAPIS===, [ODCZYTANO], EXEC:, [MCP:], etc.)!
    `.trim();

    // REGIS: Use standard Gemini (cloud model) for deep research
    if (this.persona.model === 'gemini-cloud') {
      return this.geminiThink(fullPrompt);
    }

    // OTHER AGENTS: Primary Ollama with retry + Gemini fallback
    const MAX_OLLAMA_RETRIES = 2;

    for (let attempt = 1; attempt <= MAX_OLLAMA_RETRIES; attempt++) {
      try {
        // Get adaptive temperature for this agent
        const tempResult = getEnhancedAdaptiveTemperature(
          this.persona.name,
          prompt,
          { taskType: 'general' }
        );

        // Use modelOverride only if it's a valid Ollama model, otherwise use persona model or default
        // Ollama models typically contain ':' (e.g., llama3.2:3b) or start with known prefixes
        const isOllamaModelOverride = this.modelOverride && (
          this.modelOverride.includes(':') ||
          this.modelOverride.startsWith('llama') ||
          this.modelOverride.startsWith('qwen') ||
          this.modelOverride.startsWith('mistral') ||
          this.modelOverride.startsWith('codellama') ||
          this.modelOverride.startsWith('deepseek') ||
          this.modelOverride.startsWith('phi')
        );
        const modelToUse: string = isOllamaModelOverride
          ? this.modelOverride!
          : (this.persona.model && this.persona.model !== 'gemini-cloud' ? this.persona.model : 'llama3.2:3b');

        const startTime = Date.now();

        // Enhanced logging with LiveLogger
        if (attempt === 1) {
          logger.apiCall('ollama', modelToUse, 'start');
          logger.agentStart(this.persona.name, prompt.substring(0, 80), modelToUse);
          logger.agentThinking(this.persona.name, `Temperature: ${tempResult.temperature} | Prompt: ${fullPrompt.length} chars`);
        } else {
          logger.agentRetry(this.persona.name, attempt, MAX_OLLAMA_RETRIES, 'Previous attempt failed');
        }

        // Use semaphore to limit concurrent Ollama requests
        const responseText = await ollamaSemaphore.withPermit(async () => {
          logger.agentThinking(this.persona.name, 'Acquired semaphore, streaming...');

          // Stream response for live output
          let fullResponse = '';
          let tokenCount = 0;
          let lastPreview = '';
          const streamStart = Date.now();

          const stream = await ollama.generate({
            model: modelToUse,
            prompt: fullPrompt,
            stream: true,
            options: {
              temperature: tempResult.temperature,
              num_predict: 4096
            }
          });

          for await (const chunk of stream) {
            fullResponse += chunk.response;
            tokenCount++;

            // Show live streaming with content preview every 10 tokens
            if (tokenCount % 10 === 0) {
              const newContent = fullResponse.substring(lastPreview.length);
              logger.agentStream(this.persona.name, newContent.substring(0, 50), tokenCount);
              lastPreview = fullResponse;
            }
          }

          logger.agentStreamEnd(this.persona.name);
          return fullResponse;
        });

        const elapsed = Date.now() - startTime;
        logger.agentSuccess(this.persona.name, {
          chars: responseText.length,
          tokens: Math.round(responseText.length / 4),
          time: elapsed
        });
        logger.apiCall('ollama', modelToUse, 'end', `${responseText.length} chars in ${(elapsed/1000).toFixed(1)}s`);

        return responseText;

      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        const isTimeout = errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT');
        const isConnection = errorMsg.includes('ECONNREFUSED') || errorMsg.includes('ECONNRESET') || errorMsg.includes('fetch failed');
        const isBusy = errorMsg.includes('busy') || errorMsg.includes('overloaded');
        const isModelNotFound = errorMsg.includes('not found') || errorMsg.includes('model');

        // Detailed error logging
        let errorType = 'UNKNOWN';
        if (isTimeout) errorType = 'TIMEOUT';
        else if (isConnection) errorType = 'CONNECTION';
        else if (isBusy) errorType = 'BUSY';
        else if (isModelNotFound) errorType = 'MODEL_NOT_FOUND';

        const willRetry = attempt < MAX_OLLAMA_RETRIES;
        logger.agentError(this.persona.name, `Ollama ${errorType}: ${errorMsg.substring(0, 100)}`, willRetry);
        logger.apiCall('ollama', 'unknown', 'error', `${errorType} - attempt ${attempt}/${MAX_OLLAMA_RETRIES}`);

        // If last attempt, fallback to Gemini
        if (attempt === MAX_OLLAMA_RETRIES) {
          logger.agentFallback(this.persona.name, 'Ollama', 'Gemini');
          return this.geminiFallback(fullPrompt);
        }

        // Wait before retry (exponential backoff: 1s, 2s)
        const waitMs = attempt * 1000;
        logger.agentThinking(this.persona.name, `Waiting ${waitMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    // Should never reach here, but just in case
    return this.geminiFallback(fullPrompt);
  }

  private async geminiThink(prompt: string): Promise<string> {
    try {
      // OPTIMIZATION: Skip initializeGeminiModels() - already done in Swarm.initialize()
      // OPTIMIZATION: Skip per-task classification - use PRE-A result or safe default

      // IMPORTANT: Don't use modelOverride if it's an Ollama model (not valid for Gemini API)
      const isOllamaModel = this.modelOverride?.includes(':') || this.modelOverride?.startsWith('llama') || this.modelOverride?.startsWith('qwen');
      const selectedModel = (this.modelOverride && !isOllamaModel) ? this.modelOverride : MODEL_TIERS.fast;

      // ENHANCED ADAPTIVE TEMPERATURE v2.0:
      // Use agent-specific temperature profile with context awareness
      const tempResult = getEnhancedAdaptiveTemperature(
        this.persona.name,
        prompt,
        { taskType: 'general' }
      );

      // Enhanced logging
      logger.apiCall('gemini', selectedModel, 'start');
      logger.agentStart(this.persona.name, prompt.substring(0, 80), selectedModel);
      logger.agentThinking(this.persona.name, `Task: ${tempResult.taskType} | Temp: ${tempResult.temperature} | MaxTokens: 8192`);

      // Execute with selected model and adaptive temperature
      const model = genAI.getGenerativeModel({
        model: selectedModel,
        generationConfig: {
          temperature: tempResult.temperature,  // Agent-specific adaptive temperature
          maxOutputTokens: 8192                 // Increased for longer reports
        }
      });

      const startTime = Date.now();
      logger.agentThinking(this.persona.name, 'Sending request to Gemini API...');

      const result = await model.generateContent(prompt);
      const response = result.response;
      const responseText = response.text();
      const responseTime = Date.now() - startTime;

      // Log success with details
      const tokenEstimate = Math.round(responseText.length / 4);
      logger.agentSuccess(this.persona.name, {
        chars: responseText.length,
        tokens: tokenEstimate,
        time: responseTime
      });
      logger.apiCall('gemini', selectedModel, 'end', `${responseText.length} chars | ~${tokenEstimate} tokens | ${(responseTime/1000).toFixed(1)}s`);

      // Learn from this generation (quality estimated from response length/structure)
      const estimatedQuality = this.estimateResponseQuality(responseText, prompt);
      const controller = getTemperatureController();
      controller.learnFromResult(
        this.persona.name,
        tempResult.temperature,
        tempResult.taskType,
        estimatedQuality,
        responseTime,
        true
      );

      return responseText;
    } catch (error: any) {
      logger.agentError(this.persona.name, `Gemini API: ${error.message}`, false);
      logger.apiCall('gemini', 'unknown', 'error', error.message);
      throw error;
    }
  }

  /**
   * Estimate response quality for temperature learning
   * Simple heuristics - can be enhanced with more sophisticated analysis
   */
  private estimateResponseQuality(response: string, prompt: string): number {
    let quality = 0.5; // Base quality

    // Length check - too short or too long reduces quality
    const responseLength = response.length;
    const promptLength = prompt.length;
    const lengthRatio = responseLength / Math.max(promptLength, 100);

    if (lengthRatio > 0.5 && lengthRatio < 5) {
      quality += 0.1; // Good length ratio
    } else if (lengthRatio < 0.1 || lengthRatio > 20) {
      quality -= 0.2; // Suspicious length
    }

    // Check for code blocks if code-related task
    const hasCodeBlocks = response.includes('```');
    const isCodeTask = prompt.toLowerCase().includes('kod') ||
                      prompt.toLowerCase().includes('code') ||
                      prompt.toLowerCase().includes('function') ||
                      prompt.toLowerCase().includes('implement');
    if (isCodeTask && hasCodeBlocks) {
      quality += 0.15;
    }

    // Check for structure (headers, lists)
    if (response.includes('##') || response.includes('- ') || response.includes('1.')) {
      quality += 0.1; // Has structure
    }

    // Check for error indicators
    if (response.toLowerCase().includes('error') ||
        response.toLowerCase().includes('cannot') ||
        response.toLowerCase().includes('unable')) {
      quality -= 0.1;
    }

    // Check for JSON if expected
    const expectsJson = prompt.toLowerCase().includes('json');
    if (expectsJson) {
      try {
        // Try to find and parse JSON
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          JSON.parse(jsonMatch[0]);
          quality += 0.2; // Valid JSON found
        }
      } catch {
        quality -= 0.1; // Invalid JSON when expected
      }
    }

    // Clamp to 0-1 range
    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Solution 12: Validate code blocks in response
   * Checks for complete, non-truncated code
   */
  validateCodeBlocks(response: string): {
    valid: boolean;
    codeBlocks: { language: string; lines: number; complete: boolean }[];
    warnings: string[];
  } {
    const warnings: string[] = [];
    const codeBlocks: { language: string; lines: number; complete: boolean }[] = [];

    // Extract code blocks (```language ... ```)
    const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      const language = match[1] || 'unknown';
      const code = match[2];
      const lines = code.split('\n').length;

      // Check for truncation indicators
      const truncationPatterns = [
        /\.\.\.$/m,                           // Ends with ...
        /\/\/ \.\.\./m,                       // // ...
        /# \.\.\./m,                          // # ...
        /\/\* \.\.\. \*\//m,                  // /* ... */
        /\.\.\. more code/i,                  // ... more code
        /\.\.\. kontynuacja/i,                // ... kontynuacja
        /\(truncated\)/i,                     // (truncated)
        /\(skrócone\)/i,                      // (skrócone)
      ];

      const isTruncated = truncationPatterns.some(p => p.test(code));

      // Check for incomplete syntax
      const openBraces = (code.match(/\{/g) || []).length;
      const closeBraces = (code.match(/\}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;

      const hasUnbalancedBraces = Math.abs(openBraces - closeBraces) > 1;
      const hasUnbalancedParens = Math.abs(openParens - closeParens) > 2;

      const complete = !isTruncated && !hasUnbalancedBraces && !hasUnbalancedParens;

      codeBlocks.push({ language, lines, complete });

      if (isTruncated) {
        warnings.push(`Blok kodu ${language} wygląda na obcięty`);
      }
      if (hasUnbalancedBraces) {
        warnings.push(`Blok kodu ${language} ma niezbalansowane nawiasy {}`);
      }
      if (hasUnbalancedParens) {
        warnings.push(`Blok kodu ${language} ma niezbalansowane nawiasy ()`);
      }
    }

    // Check for code without proper blocks
    if (codeBlocks.length === 0 && response.includes('function ')) {
      warnings.push('Kod bez bloku ``` może być źle sformatowany');
    }

    return {
      valid: warnings.length === 0,
      codeBlocks,
      warnings
    };
  }

  /**
   * Solution 16: Calculate confidence score for response
   * Analyzes response patterns to estimate reliability
   */
  calculateConfidenceScore(response: string, task: string): {
    score: number;          // 0-100
    factors: { name: string; impact: number; reason: string }[];
    recommendation: string;
  } {
    const factors: { name: string; impact: number; reason: string }[] = [];
    let baseScore = 70; // Start with neutral-positive

    // Factor 1: Response length relative to task complexity
    const taskWords = task.split(/\s+/).length;
    const responseWords = response.split(/\s+/).length;
    const lengthRatio = responseWords / Math.max(taskWords, 1);

    if (lengthRatio < 0.5) {
      factors.push({ name: 'length', impact: -15, reason: 'Odpowiedź bardzo krótka' });
      baseScore -= 15;
    } else if (lengthRatio > 5) {
      factors.push({ name: 'length', impact: 5, reason: 'Szczegółowa odpowiedź' });
      baseScore += 5;
    }

    // Factor 2: Contains specific file paths (not generic)
    const hasSpecificPaths = /(?:src|lib|app|components)\/[\w\/-]+\.\w+/.test(response);
    const hasGenericPaths = /(?:file\d+|path\/to|example\.)/.test(response);

    if (hasSpecificPaths && !hasGenericPaths) {
      factors.push({ name: 'paths', impact: 10, reason: 'Konkretne ścieżki plików' });
      baseScore += 10;
    } else if (hasGenericPaths) {
      factors.push({ name: 'paths', impact: -20, reason: 'Generyczne/fikcyjne ścieżki' });
      baseScore -= 20;
    }

    // Factor 3: Contains actual code blocks
    const codeBlocks = (response.match(/```[\s\S]*?```/g) || []).length;
    if (codeBlocks > 0) {
      factors.push({ name: 'code', impact: 10, reason: `${codeBlocks} bloków kodu` });
      baseScore += Math.min(codeBlocks * 5, 15);
    }

    // Factor 4: Contains uncertainty markers
    const uncertaintyMarkers = response.match(/\b(?:I think|maybe|probably|might|could be|myślę|prawdopodobnie|może|chyba)\b/gi) || [];
    if (uncertaintyMarkers.length > 2) {
      factors.push({ name: 'uncertainty', impact: -10, reason: 'Wiele wskaźników niepewności' });
      baseScore -= 10;
    }

    // Factor 5: Contains action evidence (EXEC, ===ZAPIS===)
    const hasExecEvidence = /EXEC:|===ZAPIS===|wykonano|created|modified|saved/.test(response);
    if (hasExecEvidence) {
      factors.push({ name: 'evidence', impact: 15, reason: 'Dowody wykonania akcji' });
      baseScore += 15;
    }

    // Factor 6: Contains "I will" / future tense (bad)
    const futureTense = response.match(/\b(?:I will|I would|Let me|I'll|I'm going to|Mogę|Będę|Zamierzam)\b/gi) || [];
    if (futureTense.length > 1) {
      factors.push({ name: 'future', impact: -20, reason: 'Czas przyszły zamiast wykonania' });
      baseScore -= 20;
    }

    // Clamp score to 0-100
    const score = Math.max(0, Math.min(100, baseScore));

    // Recommendation
    let recommendation: string;
    if (score >= 80) {
      recommendation = 'Wysoka pewność - odpowiedź wiarygodna';
    } else if (score >= 60) {
      recommendation = 'Średnia pewność - wymaga weryfikacji';
    } else if (score >= 40) {
      recommendation = 'Niska pewność - podejrzana odpowiedź';
    } else {
      recommendation = 'Bardzo niska pewność - prawdopodobna halucynacja';
    }

    return { score, factors, recommendation };
  }

  private async geminiFallback(prompt: string): Promise<string> {
    // IMPORTANT: Don't use modelOverride if it's an Ollama model (not valid for Gemini API)
    const isOllamaModel = this.modelOverride?.includes(':') || this.modelOverride?.startsWith('llama') || this.modelOverride?.startsWith('qwen');
    const fallbackModel = (this.modelOverride && !isOllamaModel) ? this.modelOverride : GEMINI_MODELS.FLASH;

    return geminiSemaphore.withPermit(async () => {
      try {
        logger.apiCall('gemini', fallbackModel, 'start');
        logger.agentThinking(this.persona.name, `Fallback to Gemini: ${fallbackModel} | Temp: 0.3`);

        const startTime = Date.now();
        const model = genAI.getGenerativeModel({
          model: fallbackModel,
          generationConfig: { temperature: 0.3, maxOutputTokens: 8192 }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        const elapsed = Date.now() - startTime;

        logger.agentSuccess(this.persona.name, {
          chars: responseText.length,
          tokens: Math.round(responseText.length / 4),
          time: elapsed
        });
        logger.apiCall('gemini', fallbackModel, 'end', `Fallback success: ${responseText.length} chars in ${(elapsed/1000).toFixed(1)}s`);

        return responseText;
      } catch (err: any) {
        logger.agentError(this.persona.name, `Gemini fallback failed: ${err.message}`, false);
        logger.apiCall('gemini', fallbackModel, 'error', 'Agent Lobotomized');
        throw new Error(`Agent Lobotomized: Gemini fallback failed - ${err.message}`);
      }
    });
  }

  /**
   * DIJKSTRA GEMINI-ONLY CHAIN v2.0
   * Strategic planning ONLY uses Gemini - never Ollama
   * Tries models in order: Pro → 2.5 Pro → Flash → 2.5 Flash
   * Uses ENHANCED ADAPTIVE TEMPERATURE with:
   * - Agent-specific profile for Dijkstra
   * - Temperature annealing across chain
   * - Uncertainty boost on retries
   * - Learning from results
   * Ported from AgentSwarm.psm1 lines 354-427
   */
  private async dijkstraChainThink(prompt: string): Promise<string> {
    console.log(chalk.magenta(`[Dijkstra] Activating Gemini Strategic Chain v2.0...`));

    const controller = getTemperatureController();

    // Track results for context-aware temperature adjustment
    const chainResults: Array<{
      temperature: number;
      quality: number;
      wasSuccessful: boolean;
    }> = [];

    // Get Dijkstra-specific base temperature
    const tempResult = getEnhancedAdaptiveTemperature(
      'dijkstra',
      prompt,
      {
        taskType: 'planning',
        totalSteps: DIJKSTRA_CHAIN.length
      }
    );

    console.log(chalk.gray(
      `[Dijkstra] Base Adaptive Temperature: ${tempResult.temperature} | ` +
      `Adjustments: ${tempResult.adjustments.join(', ')}`
    ));

    for (let i = 0; i < DIJKSTRA_CHAIN.length; i++) {
      const modelConfig = DIJKSTRA_CHAIN[i];

      try {
        // Calculate temperature with full context
        const stepTempResult = getEnhancedAdaptiveTemperature(
          'dijkstra',
          prompt,
          {
            taskType: 'planning',
            currentStep: i,
            totalSteps: DIJKSTRA_CHAIN.length,
            previousResults: chainResults,
            // Confidence decreases with each retry
            confidenceLevel: 1 - (i * 0.2),
            retryCount: i
          }
        );

        const currentTemp = stepTempResult.temperature;

        console.log(chalk.gray(
          `[Dijkstra] Attempting: ${modelConfig.name} [${modelConfig.role}] | ` +
          `Temp: ${currentTemp} | Step: ${i + 1}/${DIJKSTRA_CHAIN.length}`
        ));

        const startTime = Date.now();

        const result = await geminiSemaphore.withPermit(async () => {
          const model = genAI.getGenerativeModel({
            model: modelConfig.name,
            generationConfig: {
              temperature: currentTemp,  // Context-aware adaptive temperature
              maxOutputTokens: 8192
            }
          });

          return model.generateContent(prompt);
        });

        const response = result.response.text().trim();
        const responseTime = Date.now() - startTime;

        if (!response) {
          throw new Error('Empty response');
        }

        // Estimate quality and record for learning
        const estimatedQuality = this.estimateResponseQuality(response, prompt);

        // Record successful result
        chainResults.push({
          temperature: currentTemp,
          quality: estimatedQuality,
          wasSuccessful: true
        });

        // Learn from successful generation
        controller.learnFromResult(
          'dijkstra',
          currentTemp,
          'planning',
          estimatedQuality,
          responseTime,
          true
        );

        console.log(chalk.green(
          `[Dijkstra] SUCCESS with ${modelConfig.name} | ` +
          `Temp: ${currentTemp} | Quality: ${(estimatedQuality * 100).toFixed(0)}% | ` +
          `Time: ${responseTime}ms`
        ));

        return response;
      } catch (error: any) {
        // Record failed attempt
        chainResults.push({
          temperature: tempResult.temperature + (i * 0.05),
          quality: 0,
          wasSuccessful: false
        });

        // Learn from failure
        controller.learnFromResult(
          'dijkstra',
          tempResult.temperature + (i * 0.05),
          'planning',
          0,
          0,
          false
        );

        console.log(chalk.yellow(
          `[Dijkstra] ${modelConfig.name} failed: ${error.message} | ` +
          `Attempting next model with adjusted temperature...`
        ));
        // Continue to next model in chain
      }
    }

    throw new Error('CRITICAL ERROR: Dijkstra chain exhausted. All Gemini models failed. Check API key and network.');
  }
}

// Export Dijkstra chain for external use
export { DIJKSTRA_CHAIN };

// Export model tiers for external use
export { MODEL_TIERS, classifyTaskComplexity, selectModelForComplexity };

// Export adaptive temperature function and types
export { getAdaptiveTemperature, getEnhancedAdaptiveTemperature, detectTaskType, TaskType };

// Export temperature controller related types (TemperatureController class is already exported at definition)
// Note: Types are exported at their definitions, not re-exported here to avoid conflicts
export { DEFAULT_AGENT_PROFILES };
