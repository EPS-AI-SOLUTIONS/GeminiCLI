/**
 * TemperatureController.ts - Solution 21: Model Temperature for Anti-Hallucination
 *
 * GeminiHydra Temperature Control System
 *
 * This controller provides phase-aware and task-type-aware temperature management
 * to reduce hallucinations and improve response quality.
 *
 * Key Features:
 * - Lower temperature (0.1-0.3) for factual tasks to reduce hallucinations
 * - Higher temperature (0.7-0.9) for creative tasks
 * - Auto-detection of task types from prompt content
 * - Phase-specific temperatures aligned with GeminiHydra's execution phases
 *
 * @author GeminiHydra Team
 * @version 1.0.0
 */

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Task types for temperature optimization
 * - factual: Facts, data retrieval, verification - needs lowest temp for accuracy
 * - analytical: Analysis, comparison, evaluation - moderate temp for reasoning
 * - creative: Ideas, proposals, brainstorming - higher temp for diversity
 * - code-generation: Writing code, implementation - low temp for correctness
 */
export type ControllerTaskType = 'factual' | 'analytical' | 'creative' | 'code-generation';

/**
 * GeminiHydra execution phases
 * - PRE-A: Pre-analysis phase (Dijkstra planning) - low temp for strategic precision
 * - A: Analysis phase - moderate temp for thorough analysis
 * - B: Build/Implementation phase - balanced temp
 * - C: Consensus/Verification phase - lower temp for accuracy
 * - D: Delivery/Summary phase - moderate temp for clarity
 */
export type ExecutionPhase = 'PRE-A' | 'A' | 'B' | 'C' | 'D';

/**
 * Temperature configuration for the controller
 */
export interface TemperatureControllerConfig {
  /** Enable automatic task type detection */
  enableAutoDetection: boolean;

  /** Enable phase-based temperature adjustment */
  enablePhaseAdjustment: boolean;

  /** Custom temperature ranges per task type [min, max] */
  taskTypeRanges: Record<ControllerTaskType, [number, number]>;

  /** Phase-specific base temperatures */
  phaseTemperatures: Record<ExecutionPhase, number>;

  /** Uncertainty penalty - reduce temp when confidence is low */
  uncertaintyPenalty: number;

  /** Minimum allowed temperature (floor) */
  minTemperature: number;

  /** Maximum allowed temperature (ceiling) */
  maxTemperature: number;
}

/**
 * Result from temperature calculation with metadata
 */
export interface TemperatureResult {
  /** The calculated optimal temperature */
  temperature: number;

  /** Detected or specified task type */
  taskType: ControllerTaskType;

  /** Current execution phase */
  phase: ExecutionPhase;

  /** Explanation of temperature calculation */
  reasoning: string[];

  /** Confidence in the temperature selection (0-1) */
  confidence: number;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

/**
 * Default temperature ranges per task type
 *
 * GEMINI 3 OPTIMIZED (2026):
 * - Gemini 3 recommends 1.0 as default, warns against going below
 * - Full range is 0.0-2.0, with 1.0-1.5 being sweet spot
 * - Higher temps (1.5-2.0) for creative diversity
 * - Lower temps (0.7-1.0) still acceptable for precision tasks
 */
const DEFAULT_TASK_TYPE_RANGES: Record<ControllerTaskType, [number, number]> = {
  // Factual: Lower range for accuracy, but respecting Gemini 3 minimum
  factual: [0.8, 1.0],

  // Analytical: Default range for balanced reasoning
  analytical: [0.9, 1.2],

  // Creative: Higher temperature for diverse, creative outputs
  creative: [1.4, 1.9],

  // Code-generation: Slightly below default for correctness
  'code-generation': [0.8, 1.1],
};

/**
 * Phase-specific recommended temperatures
 * Aligned with GeminiHydra's multi-phase execution model
 *
 * GEMINI 3 OPTIMIZED: All phases use 1.0+ for optimal performance
 */
const DEFAULT_PHASE_TEMPERATURES: Record<ExecutionPhase, number> = {
  'PRE-A': 0.9, // Planning phase - slightly below default for precision
  A: 1.0, // Analysis phase - Gemini 3 default
  B: 1.2, // Build phase - moderate creativity for implementation
  C: 1.0, // Consensus phase - default for verification
  D: 1.0, // Delivery phase - default for clear output
};

/**
 * Default controller configuration
 *
 * GEMINI 3 OPTIMIZED: Extended max to 2.0, raised min to 0.7
 */
const DEFAULT_CONFIG: TemperatureControllerConfig = {
  enableAutoDetection: true,
  enablePhaseAdjustment: true,
  taskTypeRanges: DEFAULT_TASK_TYPE_RANGES,
  phaseTemperatures: DEFAULT_PHASE_TEMPERATURES,
  uncertaintyPenalty: 0.05, // Reduced penalty to avoid going too low
  minTemperature: 0.7, // Gemini 3 safe minimum
  maxTemperature: 2.0, // Gemini 3 maximum
};

// =============================================================================
// TASK TYPE DETECTION
// =============================================================================

/**
 * Keywords for auto-detecting task types from prompt content
 */
const TASK_TYPE_KEYWORDS: Record<ControllerTaskType, string[]> = {
  factual: [
    // English
    'what is',
    'who is',
    'when did',
    'where is',
    'how many',
    'list',
    'define',
    'describe',
    'explain',
    'tell me about',
    'facts',
    'true or false',
    'verify',
    'check',
    'confirm',
    'validate',
    'retrieve',
    'find',
    'search',
    'lookup',
    'get information',
    // Polish
    'co to jest',
    'kto to',
    'kiedy',
    'gdzie',
    'ile',
    'wymien',
    'zdefiniuj',
    'opisz',
    'wyjasni',
    'powiedz mi',
    'fakty',
    'prawda czy falsz',
    'zweryfikuj',
    'sprawdz',
    'potwierdz',
    'pobierz',
    'znajdz',
    'szukaj',
    'odczytaj',
  ],

  analytical: [
    // English
    'analyze',
    'compare',
    'evaluate',
    'assess',
    'review',
    'investigate',
    'examine',
    'study',
    'research',
    'audit',
    'critique',
    'pros and cons',
    'trade-offs',
    'implications',
    'why',
    'how does',
    'what causes',
    'relationship between',
    // Polish
    'analizuj',
    'porownaj',
    'ocen',
    'zbadaj',
    'przegladnij',
    'sprawdz',
    'zbadaj',
    'badaj',
    'audyt',
    'krytyka',
    'za i przeciw',
    'kompromisy',
    'implikacje',
    'dlaczego',
    'jak dziala',
    'co powoduje',
    'zaleznosc miedzy',
  ],

  creative: [
    // English
    'create',
    'design',
    'imagine',
    'brainstorm',
    'invent',
    'generate ideas',
    'propose',
    'suggest',
    'come up with',
    'creative',
    'innovative',
    'novel',
    'unique',
    'original',
    'what if',
    'alternative',
    'possibilities',
    'vision',
    // Polish
    'stworz',
    'zaprojektuj',
    'wyobraz',
    'burza mozgow',
    'wynajdz',
    'generuj pomysly',
    'zaproponuj',
    'sugeruj',
    'wymysl',
    'kreatywny',
    'innowacyjny',
    'nowy',
    'unikalny',
    'oryginalny',
    'co jesli',
    'alternatywa',
    'mozliwosci',
    'wizja',
  ],

  'code-generation': [
    // English
    'implement',
    'code',
    'write function',
    'create class',
    'program',
    'develop',
    'build',
    'script',
    'algorithm',
    'typescript',
    'javascript',
    'python',
    'rust',
    'java',
    'function',
    'method',
    'api',
    'endpoint',
    'module',
    'fix bug',
    'debug',
    'refactor',
    'optimize code',
    // Polish
    'implementuj',
    'koduj',
    'napisz funkcje',
    'stworz klase',
    'programuj',
    'rozwijaj',
    'buduj',
    'skrypt',
    'algorytm',
    'funkcja',
    'metoda',
    'modul',
    'napraw blad',
    'debuguj',
    'refaktoryzuj',
    'optymalizuj kod',
  ],
};

/**
 * Detect task type from prompt content using keyword analysis
 */
function detectTaskTypeFromPrompt(prompt: string): {
  taskType: ControllerTaskType;
  confidence: number;
  matchedKeywords: string[];
} {
  const promptLower = prompt.toLowerCase();
  const scores: Record<ControllerTaskType, { count: number; keywords: string[] }> = {
    factual: { count: 0, keywords: [] },
    analytical: { count: 0, keywords: [] },
    creative: { count: 0, keywords: [] },
    'code-generation': { count: 0, keywords: [] },
  };

  // Count keyword matches for each task type
  for (const [taskType, keywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (promptLower.includes(keyword.toLowerCase())) {
        scores[taskType as ControllerTaskType].count++;
        scores[taskType as ControllerTaskType].keywords.push(keyword);
      }
    }
  }

  // Find the task type with highest score
  let maxScore = 0;
  let detectedType: ControllerTaskType = 'analytical'; // Default fallback
  let matchedKeywords: string[] = [];

  for (const [taskType, { count, keywords }] of Object.entries(scores)) {
    if (count > maxScore) {
      maxScore = count;
      detectedType = taskType as ControllerTaskType;
      matchedKeywords = keywords;
    }
  }

  // Calculate confidence based on keyword density
  const totalWords = prompt.split(/\s+/).length;
  const confidence = Math.min(1.0, (maxScore * 5) / Math.max(totalWords, 1));

  return {
    taskType: detectedType,
    confidence: maxScore > 0 ? Math.max(0.3, confidence) : 0.3,
    matchedKeywords,
  };
}

// =============================================================================
// TEMPERATURE CONTROLLER CLASS
// =============================================================================

/**
 * TemperatureController - Central temperature management for anti-hallucination
 *
 * This class provides intelligent temperature selection based on:
 * 1. Task type (factual, analytical, creative, code-generation)
 * 2. Execution phase (PRE-A, A, B, C, D)
 * 3. Prompt content analysis
 *
 * Usage:
 * ```typescript
 * const controller = new TemperatureController();
 * const temp = controller.getOptimalTemperature('code-generation', 'A');
 * // or with auto-detection:
 * const result = controller.getOptimalTemperatureWithAnalysis('implement a sort function', 'B');
 * ```
 */
export class TemperatureController {
  private config: TemperatureControllerConfig;
  private history: Array<{
    timestamp: number;
    taskType: ControllerTaskType;
    phase: ExecutionPhase;
    temperature: number;
    wasSuccessful?: boolean;
  }> = [];

  constructor(config: Partial<TemperatureControllerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Merge task type ranges if provided
    if (config.taskTypeRanges) {
      this.config.taskTypeRanges = {
        ...DEFAULT_TASK_TYPE_RANGES,
        ...config.taskTypeRanges,
      };
    }

    // Merge phase temperatures if provided
    if (config.phaseTemperatures) {
      this.config.phaseTemperatures = {
        ...DEFAULT_PHASE_TEMPERATURES,
        ...config.phaseTemperatures,
      };
    }
  }

  // ===========================================================================
  // CORE TEMPERATURE CALCULATION METHODS
  // ===========================================================================

  /**
   * Get optimal temperature for a given task type and phase
   *
   * This is the primary method for temperature selection.
   * It combines task type ranges with phase-specific adjustments.
   *
   * @param taskType - The type of task (factual, analytical, creative, code-generation)
   * @param phase - The current execution phase (PRE-A, A, B, C, D)
   * @returns The optimal temperature value (0.05 - 1.0)
   */
  getOptimalTemperature(taskType: ControllerTaskType, phase: ExecutionPhase): number {
    // Get base range for task type
    const [minTemp, maxTemp] = this.config.taskTypeRanges[taskType];

    // Get phase-specific base temperature
    const phaseTemp = this.config.phaseTemperatures[phase];

    // Calculate weighted temperature
    // - 60% weight from task type midpoint
    // - 40% weight from phase temperature
    const taskTypeMid = (minTemp + maxTemp) / 2;
    let temperature = taskTypeMid * 0.6 + phaseTemp * 0.4;

    // Apply phase-specific adjustments
    temperature = this.applyPhaseAdjustments(temperature, phase, taskType);

    // Clamp to valid range
    temperature = this.clamp(temperature, this.config.minTemperature, this.config.maxTemperature);

    // Also ensure within task type bounds
    temperature = this.clamp(temperature, minTemp, maxTemp);

    // Record to history
    this.recordUsage(taskType, phase, temperature);

    return this.round(temperature);
  }

  /**
   * Get optimal temperature with full analysis and reasoning
   *
   * This method performs auto-detection of task type and provides
   * detailed reasoning about the temperature selection.
   *
   * @param prompt - The prompt to analyze
   * @param phase - The current execution phase
   * @param overrideTaskType - Optional override for task type (skips detection)
   * @returns Full temperature result with analysis
   */
  getOptimalTemperatureWithAnalysis(
    prompt: string,
    phase: ExecutionPhase,
    overrideTaskType?: ControllerTaskType,
  ): TemperatureResult {
    const reasoning: string[] = [];
    let taskType: ControllerTaskType;
    let detectionConfidence = 1.0;

    // Step 1: Determine task type
    if (overrideTaskType) {
      taskType = overrideTaskType;
      reasoning.push(`Task type specified: ${taskType}`);
    } else if (this.config.enableAutoDetection) {
      const detection = detectTaskTypeFromPrompt(prompt);
      taskType = detection.taskType;
      detectionConfidence = detection.confidence;
      reasoning.push(
        `Auto-detected task type: ${taskType} (confidence: ${(detection.confidence * 100).toFixed(0)}%)`,
      );
      if (detection.matchedKeywords.length > 0) {
        reasoning.push(`Matched keywords: ${detection.matchedKeywords.slice(0, 5).join(', ')}`);
      }
    } else {
      taskType = 'analytical'; // Default
      reasoning.push('Auto-detection disabled, using default: analytical');
    }

    // Step 2: Get base temperature from task type range
    const [minTemp, maxTemp] = this.config.taskTypeRanges[taskType];
    reasoning.push(`Task type range: [${minTemp}, ${maxTemp}]`);

    // Step 3: Get phase temperature
    const phaseTemp = this.config.phaseTemperatures[phase];
    reasoning.push(`Phase ${phase} base temperature: ${phaseTemp}`);

    // Step 4: Calculate weighted temperature
    const taskTypeMid = (minTemp + maxTemp) / 2;
    let temperature = taskTypeMid * 0.6 + phaseTemp * 0.4;
    reasoning.push(
      `Weighted calculation: (${taskTypeMid.toFixed(2)} * 0.6) + (${phaseTemp} * 0.4) = ${temperature.toFixed(2)}`,
    );

    // Step 5: Apply phase adjustments
    const beforeAdjust = temperature;
    temperature = this.applyPhaseAdjustments(temperature, phase, taskType);
    if (temperature !== beforeAdjust) {
      reasoning.push(
        `Phase adjustment applied: ${beforeAdjust.toFixed(2)} -> ${temperature.toFixed(2)}`,
      );
    }

    // Step 6: Apply uncertainty penalty if detection confidence is low
    if (detectionConfidence < 0.5) {
      const penalty = this.config.uncertaintyPenalty * (1 - detectionConfidence);
      temperature -= penalty;
      reasoning.push(`Uncertainty penalty applied: -${penalty.toFixed(2)} (low confidence)`);
    }

    // Step 7: Clamp to valid ranges
    const beforeClamp = temperature;
    temperature = this.clamp(temperature, this.config.minTemperature, this.config.maxTemperature);
    temperature = this.clamp(temperature, minTemp, maxTemp);
    if (temperature !== beforeClamp) {
      reasoning.push(`Clamped to valid range: ${temperature.toFixed(2)}`);
    }

    // Final result
    const finalTemp = this.round(temperature);
    reasoning.push(`Final optimal temperature: ${finalTemp}`);

    // Record to history
    this.recordUsage(taskType, phase, finalTemp);

    return {
      temperature: finalTemp,
      taskType,
      phase,
      reasoning,
      confidence: detectionConfidence,
    };
  }

  // ===========================================================================
  // PHASE-SPECIFIC ADJUSTMENTS
  // ===========================================================================

  /**
   * Apply phase-specific temperature adjustments
   *
   * Each phase has unique requirements:
   * - PRE-A: Planning needs low temp for precision
   * - A: Analysis benefits from moderate exploration
   * - B: Build phase needs balance
   * - C: Consensus/verification needs accuracy
   * - D: Delivery needs clarity
   */
  private applyPhaseAdjustments(
    temperature: number,
    phase: ExecutionPhase,
    taskType: ControllerTaskType,
  ): number {
    switch (phase) {
      case 'PRE-A':
        // Planning phase: reduce temperature for strategic precision
        // Dijkstra needs deterministic, well-structured plans
        if (taskType === 'creative') {
          // Even creative tasks in planning need more structure
          temperature *= 0.8;
        }
        break;

      case 'A':
        // Analysis phase: slight boost for thorough exploration
        if (taskType === 'analytical') {
          temperature *= 1.05;
        }
        break;

      case 'B':
        // Build phase: balanced approach
        // Code generation gets slight reduction for correctness
        if (taskType === 'code-generation') {
          temperature *= 0.95;
        }
        break;

      case 'C':
        // Consensus phase: reduce for accuracy in verification
        // All task types benefit from lower temp here
        temperature *= 0.9;
        break;

      case 'D':
        // Delivery phase: moderate for clear, coherent output
        // Factual tasks get extra precision
        if (taskType === 'factual') {
          temperature *= 0.85;
        }
        break;
    }

    return temperature;
  }

  // ===========================================================================
  // CONVENIENCE METHODS
  // ===========================================================================

  /**
   * Get temperature for factual tasks (anti-hallucination optimized)
   * Uses lowest temperature range for maximum accuracy
   */
  getFactualTemperature(phase: ExecutionPhase = 'A'): number {
    return this.getOptimalTemperature('factual', phase);
  }

  /**
   * Get temperature for analytical tasks
   * Balanced temperature for reasoned analysis
   */
  getAnalyticalTemperature(phase: ExecutionPhase = 'A'): number {
    return this.getOptimalTemperature('analytical', phase);
  }

  /**
   * Get temperature for creative tasks
   * Higher temperature for diverse, creative outputs
   */
  getCreativeTemperature(phase: ExecutionPhase = 'B'): number {
    return this.getOptimalTemperature('creative', phase);
  }

  /**
   * Get temperature for code generation tasks
   * Low temperature for syntactically correct code
   */
  getCodeGenerationTemperature(phase: ExecutionPhase = 'B'): number {
    return this.getOptimalTemperature('code-generation', phase);
  }

  /**
   * Quick temperature lookup by phase only (uses analytical as default task type)
   */
  getPhaseTemperature(phase: ExecutionPhase): number {
    return this.config.phaseTemperatures[phase];
  }

  // ===========================================================================
  // CONFIGURATION & HISTORY
  // ===========================================================================

  /**
   * Update configuration at runtime
   */
  updateConfig(updates: Partial<TemperatureControllerConfig>): void {
    this.config = { ...this.config, ...updates };

    if (updates.taskTypeRanges) {
      this.config.taskTypeRanges = {
        ...this.config.taskTypeRanges,
        ...updates.taskTypeRanges,
      };
    }

    if (updates.phaseTemperatures) {
      this.config.phaseTemperatures = {
        ...this.config.phaseTemperatures,
        ...updates.phaseTemperatures,
      };
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<TemperatureControllerConfig> {
    return { ...this.config };
  }

  /**
   * Record temperature usage for history tracking
   */
  private recordUsage(
    taskType: ControllerTaskType,
    phase: ExecutionPhase,
    temperature: number,
  ): void {
    this.history.push({
      timestamp: Date.now(),
      taskType,
      phase,
      temperature,
    });

    // Keep only last 100 entries
    if (this.history.length > 100) {
      this.history = this.history.slice(-100);
    }
  }

  /**
   * Mark a temperature usage as successful or failed (for future learning)
   */
  markResult(wasSuccessful: boolean): void {
    if (this.history.length > 0) {
      this.history[this.history.length - 1].wasSuccessful = wasSuccessful;
    }
  }

  /**
   * Get usage statistics
   */
  getStatistics(): {
    totalUsages: number;
    averageTemperature: number;
    byTaskType: Record<ControllerTaskType, { count: number; avgTemp: number }>;
    byPhase: Record<ExecutionPhase, { count: number; avgTemp: number }>;
    successRate: number;
  } {
    const stats = {
      totalUsages: this.history.length,
      averageTemperature: 0,
      byTaskType: {} as Record<ControllerTaskType, { count: number; avgTemp: number }>,
      byPhase: {} as Record<ExecutionPhase, { count: number; avgTemp: number }>,
      successRate: 0,
    };

    if (this.history.length === 0) {
      return stats;
    }

    // Calculate averages
    let tempSum = 0;
    let successCount = 0;
    let totalWithResult = 0;

    const taskTypeTotals: Record<string, { sum: number; count: number }> = {};
    const phaseTotals: Record<string, { sum: number; count: number }> = {};

    for (const entry of this.history) {
      tempSum += entry.temperature;

      // Task type stats
      if (!taskTypeTotals[entry.taskType]) {
        taskTypeTotals[entry.taskType] = { sum: 0, count: 0 };
      }
      taskTypeTotals[entry.taskType].sum += entry.temperature;
      taskTypeTotals[entry.taskType].count++;

      // Phase stats
      if (!phaseTotals[entry.phase]) {
        phaseTotals[entry.phase] = { sum: 0, count: 0 };
      }
      phaseTotals[entry.phase].sum += entry.temperature;
      phaseTotals[entry.phase].count++;

      // Success rate
      if (entry.wasSuccessful !== undefined) {
        totalWithResult++;
        if (entry.wasSuccessful) {
          successCount++;
        }
      }
    }

    stats.averageTemperature = this.round(tempSum / this.history.length);
    stats.successRate = totalWithResult > 0 ? this.round(successCount / totalWithResult) : 0;

    // Convert to final format
    for (const [taskType, data] of Object.entries(taskTypeTotals)) {
      stats.byTaskType[taskType as ControllerTaskType] = {
        count: data.count,
        avgTemp: this.round(data.sum / data.count),
      };
    }

    for (const [phase, data] of Object.entries(phaseTotals)) {
      stats.byPhase[phase as ExecutionPhase] = {
        count: data.count,
        avgTemp: this.round(data.sum / data.count),
      };
    }

    return stats;
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.history = [];
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  /**
   * Clamp value to range
   */
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  /**
   * Round to 2 decimal places
   */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

// =============================================================================
// SINGLETON INSTANCE & FACTORY
// =============================================================================

/**
 * Global singleton instance
 */
let globalController: TemperatureController | null = null;

/**
 * Get the global TemperatureController instance
 * Creates one with default config if not initialized
 */
export function getPhaseTemperatureController(): TemperatureController {
  if (!globalController) {
    globalController = new TemperatureController();
  }
  return globalController;
}

/**
 * Initialize the global controller with custom configuration
 */
export function initializePhaseTemperatureController(
  config?: Partial<TemperatureControllerConfig>,
): TemperatureController {
  globalController = new TemperatureController(config);
  return globalController;
}

/**
 * Reset the global controller to default state
 */
export function resetPhaseTemperatureController(): void {
  globalController = null;
}

// =============================================================================
// QUICK ACCESS FUNCTIONS
// =============================================================================

/**
 * Quick function to get optimal temperature for a task and phase
 * Uses the global controller instance
 */
export function getOptimalTemp(taskType: ControllerTaskType, phase: ExecutionPhase): number {
  return getPhaseTemperatureController().getOptimalTemperature(taskType, phase);
}

/**
 * Quick function to analyze prompt and get optimal temperature
 * Uses the global controller instance
 */
export function analyzeAndGetTemp(prompt: string, phase: ExecutionPhase): TemperatureResult {
  return getPhaseTemperatureController().getOptimalTemperatureWithAnalysis(prompt, phase);
}

/**
 * Detect task type from prompt content
 */
export function detectControllerTaskType(prompt: string): {
  taskType: ControllerTaskType;
  confidence: number;
  matchedKeywords: string[];
} {
  return detectTaskTypeFromPrompt(prompt);
}

// =============================================================================
// EXPORTS
// =============================================================================

export { DEFAULT_TASK_TYPE_RANGES, DEFAULT_PHASE_TEMPERATURES, DEFAULT_CONFIG };
