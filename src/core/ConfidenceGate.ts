/**
 * ConfidenceGate - Solution 34: Confidence Threshold Gate
 *
 * Blocks responses below a configurable confidence threshold.
 * Analyzes multiple factors to determine response quality and
 * recommends appropriate actions (pass, retry, escalate, reject).
 *
 * @module ConfidenceGate
 */

import chalk from 'chalk';

// =============================================================================
// INTERFACES
// =============================================================================

/**
 * Context information for confidence evaluation
 */
export interface GateContext {
  /** Unique task identifier */
  taskId: number;
  /** Agent that produced the response */
  agentId: string;
  /** Type of task being evaluated */
  taskType: string;
  /** Number of previous attempts for this task */
  previousAttempts: number;
}

/**
 * Individual factor contributing to confidence score
 */
export interface ConfidenceFactor {
  /** Name of the factor being evaluated */
  name: string;
  /** Weight of this factor in overall score (0-1) */
  weight: number;
  /** Score for this factor (0-100) */
  score: number;
  /** Explanation for the score */
  reason: string;
}

/**
 * Result of confidence gate evaluation
 */
export interface GateResult {
  /** Whether the response passed the confidence threshold */
  passed: boolean;
  /** Overall confidence score (0-100) */
  confidence: number;
  /** Individual factors that contributed to the score */
  factors: ConfidenceFactor[];
  /** Recommended action based on confidence and context */
  action: 'pass' | 'retry' | 'escalate' | 'reject';
  /** Human-readable summary of the evaluation */
  summary?: string;
  /** Suggestions for improvement if not passed */
  suggestions?: string[];
}

/**
 * Configuration for ConfidenceGate
 */
export interface ConfidenceGateConfig {
  /** Default threshold (0-100) */
  threshold: number;
  /** Maximum retries before escalation */
  maxRetries: number;
  /** Whether to log evaluations */
  verbose: boolean;
  /** Custom factor weights */
  factorWeights?: Partial<FactorWeights>;
}

/**
 * Weights for each confidence factor
 */
interface FactorWeights {
  responseLength: number;
  specificity: number;
  evidenceMarkers: number;
  uncertaintyWords: number;
  structureQuality: number;
  taskRelevance: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Default confidence threshold */
export const DEFAULT_THRESHOLD = 60;

/** Maximum retries before escalation */
const DEFAULT_MAX_RETRIES = 3;

/** Default factor weights (must sum to 1.0) */
const DEFAULT_FACTOR_WEIGHTS: FactorWeights = {
  responseLength: 0.15,
  specificity: 0.25,
  evidenceMarkers: 0.20,
  uncertaintyWords: 0.20,
  structureQuality: 0.10,
  taskRelevance: 0.10
};

/** Words indicating uncertainty or hedging */
export const UNCERTAINTY_WORDS = [
  'maybe', 'perhaps', 'possibly', 'might', 'could be',
  'not sure', 'uncertain', 'unclear', 'I think', 'I believe',
  'probably', 'likely', 'potentially', 'seems', 'appears',
  'moze', 'byc moze', 'prawdopodobnie', 'chyba', 'wydaje sie',
  'nie jestem pewien', 'mozliwe', 'przypuszczalnie'
];

/** Markers indicating evidence or concrete examples */
export const EVIDENCE_MARKERS = [
  'because', 'since', 'therefore', 'for example', 'such as',
  'specifically', 'according to', 'based on', 'evidence',
  'data shows', 'research indicates', 'demonstrates',
  'poniewaz', 'dlatego', 'na przyklad', 'takie jak',
  'konkretnie', 'wedlug', 'na podstawie', 'dowody',
  'dane pokazuja', 'badania wskazuja'
];

/** Patterns indicating specific/concrete content */
const SPECIFICITY_PATTERNS = [
  /\d+(\.\d+)?%/,           // Percentages
  /\d{4}-\d{2}-\d{2}/,      // Dates
  /\d+(\.\d+)?\s*(KB|MB|GB|TB|ms|s|min)/i, // Measurements
  /```[\s\S]*?```/,         // Code blocks
  /`[^`]+`/,                // Inline code
  /\[[^\]]+\]\([^)]+\)/,    // Links
  /https?:\/\/[^\s]+/,      // URLs
  /"[^"]+"/,                // Quoted text
  /\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/, // CamelCase identifiers
  /\b[a-z_]+\([^)]*\)/      // Function calls
];

/** Patterns indicating good structure */
const STRUCTURE_PATTERNS = [
  /^#{1,6}\s/m,             // Markdown headers
  /^\d+\.\s/m,              // Numbered lists
  /^[-*]\s/m,               // Bullet lists
  /^>\s/m,                  // Block quotes
  /\n\n/,                   // Paragraph breaks
  /:\n\s*[-*\d]/            // Lists after colons
];

// =============================================================================
// CONFIDENCE GATE CLASS
// =============================================================================

/**
 * ConfidenceGate - Blocks responses below confidence threshold
 *
 * Evaluates responses based on multiple factors:
 * - Response length and completeness
 * - Specificity (concrete details vs vague statements)
 * - Evidence markers (reasoning and citations)
 * - Uncertainty words (hedging language)
 * - Structure quality (formatting and organization)
 * - Task relevance (keyword matching)
 */
export class ConfidenceGate {
  private threshold: number;
  private maxRetries: number;
  private verbose: boolean;
  private factorWeights: FactorWeights;
  private evaluationHistory: Map<string, GateResult[]> = new Map();

  constructor(config: Partial<ConfidenceGateConfig> = {}) {
    this.threshold = config.threshold ?? DEFAULT_THRESHOLD;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.verbose = config.verbose ?? false;
    this.factorWeights = {
      ...DEFAULT_FACTOR_WEIGHTS,
      ...config.factorWeights
    };
  }

  /**
   * Set the confidence threshold
   * @param threshold Value between 0-100
   */
  setThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 100) {
      throw new Error('Threshold must be between 0 and 100');
    }
    this.threshold = threshold;
    if (this.verbose) {
      console.log(chalk.blue(`[ConfidenceGate] Threshold set to ${threshold}%`));
    }
  }

  /**
   * Get the current threshold
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Check confidence of a response and determine action
   * @param response The response text to evaluate
   * @param context Context information about the task
   * @returns GateResult with pass/fail status and recommended action
   */
  checkConfidence(response: string, context: GateContext): GateResult {
    const factors: ConfidenceFactor[] = [];

    // Evaluate each factor
    factors.push(this.evaluateResponseLength(response, context));
    factors.push(this.evaluateSpecificity(response));
    factors.push(this.evaluateEvidenceMarkers(response));
    factors.push(this.evaluateUncertaintyWords(response));
    factors.push(this.evaluateStructureQuality(response));
    factors.push(this.evaluateTaskRelevance(response, context));

    // Calculate weighted confidence score
    const confidence = this.calculateWeightedScore(factors);

    // Determine action based on confidence and attempts
    const action = this.determineAction(confidence, context);
    const passed = action === 'pass';

    // Generate result
    const result: GateResult = {
      passed,
      confidence,
      factors,
      action,
      summary: this.generateSummary(confidence, factors, action),
      suggestions: passed ? undefined : this.generateSuggestions(factors)
    };

    // Store in history
    const historyKey = `${context.agentId}-${context.taskId}`;
    const history = this.evaluationHistory.get(historyKey) || [];
    history.push(result);
    this.evaluationHistory.set(historyKey, history);

    // Log if verbose
    if (this.verbose) {
      this.logResult(result, context);
    }

    return result;
  }

  /**
   * Evaluate response length factor
   */
  private evaluateResponseLength(response: string, context: GateContext): ConfidenceFactor {
    const words = response.split(/\s+/).filter(w => w.length > 0).length;
    const chars = response.length;

    // Dynamic expectations based on task type
    let minWords = 20;
    let optimalWords = 100;
    let maxWords = 2000;

    switch (context.taskType.toLowerCase()) {
      case 'analysis':
      case 'research':
        minWords = 50;
        optimalWords = 200;
        maxWords = 3000;
        break;
      case 'code':
      case 'implementation':
        minWords = 10;
        optimalWords = 50;
        maxWords = 1000;
        break;
      case 'summary':
      case 'quick':
        minWords = 10;
        optimalWords = 50;
        maxWords = 200;
        break;
    }

    let score: number;
    let reason: string;

    if (words < minWords) {
      score = Math.max(0, (words / minWords) * 50);
      reason = `Response too short (${words} words, minimum ${minWords})`;
    } else if (words > maxWords) {
      score = Math.max(40, 100 - ((words - maxWords) / maxWords) * 30);
      reason = `Response may be too verbose (${words} words)`;
    } else if (words >= optimalWords) {
      score = 100;
      reason = `Response length optimal (${words} words)`;
    } else {
      score = 50 + ((words - minWords) / (optimalWords - minWords)) * 50;
      reason = `Response length acceptable (${words} words)`;
    }

    return {
      name: 'responseLength',
      weight: this.factorWeights.responseLength,
      score: Math.round(score),
      reason
    };
  }

  /**
   * Evaluate specificity of the response
   */
  private evaluateSpecificity(response: string): ConfidenceFactor {
    let specificityScore = 0;
    const matchedPatterns: string[] = [];

    for (const pattern of SPECIFICITY_PATTERNS) {
      const matches = response.match(pattern);
      if (matches && matches.length > 0) {
        specificityScore += Math.min(15, matches.length * 5);
        matchedPatterns.push(pattern.toString().slice(1, 20) + '...');
      }
    }

    // Cap at 100
    specificityScore = Math.min(100, specificityScore);

    // Penalize generic responses
    const genericPhrases = [
      'in general', 'typically', 'usually', 'often',
      'it depends', 'varies', 'context-dependent'
    ];

    let genericCount = 0;
    for (const phrase of genericPhrases) {
      if (response.toLowerCase().includes(phrase)) {
        genericCount++;
      }
    }

    if (genericCount > 2) {
      specificityScore = Math.max(0, specificityScore - genericCount * 10);
    }

    let reason: string;
    if (specificityScore >= 70) {
      reason = `High specificity with concrete details`;
    } else if (specificityScore >= 40) {
      reason = `Moderate specificity`;
    } else {
      reason = `Low specificity - response may be too vague`;
    }

    return {
      name: 'specificity',
      weight: this.factorWeights.specificity,
      score: Math.round(specificityScore),
      reason
    };
  }

  /**
   * Evaluate presence of evidence markers
   */
  private evaluateEvidenceMarkers(response: string): ConfidenceFactor {
    const responseLower = response.toLowerCase();
    let evidenceCount = 0;

    for (const marker of EVIDENCE_MARKERS) {
      if (responseLower.includes(marker.toLowerCase())) {
        evidenceCount++;
      }
    }

    // Scale score based on evidence markers found
    // 0 markers = 20, 1-2 = 50, 3-4 = 70, 5+ = 100
    let score: number;
    if (evidenceCount === 0) {
      score = 20;
    } else if (evidenceCount <= 2) {
      score = 50 + (evidenceCount - 1) * 10;
    } else if (evidenceCount <= 4) {
      score = 70 + (evidenceCount - 3) * 15;
    } else {
      score = 100;
    }

    const reason = evidenceCount > 0
      ? `Found ${evidenceCount} evidence marker(s)`
      : `No evidence markers found - response may lack supporting reasoning`;

    return {
      name: 'evidenceMarkers',
      weight: this.factorWeights.evidenceMarkers,
      score,
      reason
    };
  }

  /**
   * Evaluate uncertainty/hedging words (lower = better)
   */
  private evaluateUncertaintyWords(response: string): ConfidenceFactor {
    const responseLower = response.toLowerCase();
    const words = response.split(/\s+/).length;
    let uncertaintyCount = 0;

    for (const word of UNCERTAINTY_WORDS) {
      const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s+')}\\b`, 'gi');
      const matches = responseLower.match(regex);
      if (matches) {
        uncertaintyCount += matches.length;
      }
    }

    // Calculate ratio of uncertainty words to total words
    const ratio = uncertaintyCount / Math.max(words, 1);

    // Score inversely proportional to uncertainty
    // 0% uncertainty = 100, 5%+ uncertainty = 20
    let score: number;
    if (ratio === 0) {
      score = 100;
    } else if (ratio < 0.01) {
      score = 90;
    } else if (ratio < 0.02) {
      score = 70;
    } else if (ratio < 0.05) {
      score = 50;
    } else {
      score = 20;
    }

    const reason = uncertaintyCount === 0
      ? `No uncertainty markers - response is confident`
      : `Found ${uncertaintyCount} uncertainty marker(s) (${(ratio * 100).toFixed(1)}%)`;

    return {
      name: 'uncertaintyWords',
      weight: this.factorWeights.uncertaintyWords,
      score,
      reason
    };
  }

  /**
   * Evaluate structure and formatting quality
   */
  private evaluateStructureQuality(response: string): ConfidenceFactor {
    let structureScore = 30; // Base score
    const featuresFound: string[] = [];

    for (const pattern of STRUCTURE_PATTERNS) {
      if (pattern.test(response)) {
        structureScore += 12;
        featuresFound.push(pattern.toString().slice(1, 15));
      }
    }

    // Cap at 100
    structureScore = Math.min(100, structureScore);

    // Check for consistent formatting
    const lines = response.split('\n');
    const hasConsistentIndentation = lines.filter(l => /^\s{2,}/.test(l)).length > 2;
    if (hasConsistentIndentation) {
      structureScore = Math.min(100, structureScore + 10);
    }

    const reason = structureScore >= 70
      ? `Good structure with ${featuresFound.length} formatting feature(s)`
      : `Basic structure - consider better organization`;

    return {
      name: 'structureQuality',
      weight: this.factorWeights.structureQuality,
      score: structureScore,
      reason
    };
  }

  /**
   * Evaluate relevance to the task
   */
  private evaluateTaskRelevance(response: string, context: GateContext): ConfidenceFactor {
    const responseLower = response.toLowerCase();
    const taskTypeLower = context.taskType.toLowerCase();

    // Extract keywords from task type
    const taskKeywords = taskTypeLower.split(/[\s_-]+/);
    let matchCount = 0;

    for (const keyword of taskKeywords) {
      if (keyword.length > 2 && responseLower.includes(keyword)) {
        matchCount++;
      }
    }

    // Score based on keyword presence
    const ratio = taskKeywords.length > 0
      ? matchCount / taskKeywords.length
      : 0.5;

    const score = Math.round(30 + ratio * 70);

    const reason = matchCount > 0
      ? `Response addresses task type (${matchCount}/${taskKeywords.length} keywords)`
      : `Task relevance unclear - verify response addresses the request`;

    return {
      name: 'taskRelevance',
      weight: this.factorWeights.taskRelevance,
      score,
      reason
    };
  }

  /**
   * Calculate weighted confidence score
   */
  private calculateWeightedScore(factors: ConfidenceFactor[]): number {
    let totalWeight = 0;
    let weightedSum = 0;

    for (const factor of factors) {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    }

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Determine action based on confidence and context
   */
  private determineAction(
    confidence: number,
    context: GateContext
  ): 'pass' | 'retry' | 'escalate' | 'reject' {
    // High confidence = pass
    if (confidence >= this.threshold) {
      return 'pass';
    }

    // Low confidence with retries remaining = retry
    if (context.previousAttempts < this.maxRetries) {
      return 'retry';
    }

    // Near threshold after max retries = escalate
    if (confidence >= this.threshold - 15) {
      return 'escalate';
    }

    // Very low confidence after max retries = reject
    return 'reject';
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    confidence: number,
    factors: ConfidenceFactor[],
    action: string
  ): string {
    const lowestFactor = factors.reduce((min, f) =>
      f.score < min.score ? f : min
    );

    const highestFactor = factors.reduce((max, f) =>
      f.score > max.score ? f : max
    );

    let summary = `Confidence: ${confidence}% (threshold: ${this.threshold}%). `;
    summary += `Strongest: ${highestFactor.name} (${highestFactor.score}%). `;
    summary += `Weakest: ${lowestFactor.name} (${lowestFactor.score}%). `;
    summary += `Action: ${action.toUpperCase()}.`;

    return summary;
  }

  /**
   * Generate improvement suggestions for failed evaluations
   */
  private generateSuggestions(factors: ConfidenceFactor[]): string[] {
    const suggestions: string[] = [];

    // Sort by score to get weakest factors
    const sortedFactors = [...factors].sort((a, b) => a.score - b.score);

    for (const factor of sortedFactors.slice(0, 3)) {
      if (factor.score < 50) {
        switch (factor.name) {
          case 'responseLength':
            suggestions.push('Provide a more detailed response with additional context');
            break;
          case 'specificity':
            suggestions.push('Include specific examples, numbers, or concrete details');
            break;
          case 'evidenceMarkers':
            suggestions.push('Add reasoning with "because", "therefore", or citations');
            break;
          case 'uncertaintyWords':
            suggestions.push('Use more confident language; avoid hedging words');
            break;
          case 'structureQuality':
            suggestions.push('Improve formatting with headers, lists, or code blocks');
            break;
          case 'taskRelevance':
            suggestions.push('Ensure response directly addresses the task requirements');
            break;
        }
      }
    }

    return suggestions;
  }

  /**
   * Log evaluation result
   */
  private logResult(result: GateResult, context: GateContext): void {
    const color = result.passed ? chalk.green : chalk.red;
    const icon = result.passed ? '[PASS]' : '[FAIL]';

    console.log(color(
      `[ConfidenceGate] ${icon} Task ${context.taskId} (${context.agentId}): ` +
      `${result.confidence}% (threshold: ${this.threshold}%)`
    ));

    if (!result.passed) {
      console.log(chalk.yellow(`[ConfidenceGate] Action: ${result.action}`));
      for (const factor of result.factors) {
        const factorColor = factor.score >= 50 ? chalk.gray : chalk.yellow;
        console.log(factorColor(`  - ${factor.name}: ${factor.score}% - ${factor.reason}`));
      }
    }
  }

  /**
   * Get evaluation history for a task
   */
  getHistory(agentId: string, taskId: number): GateResult[] {
    return this.evaluationHistory.get(`${agentId}-${taskId}`) || [];
  }

  /**
   * Clear evaluation history
   */
  clearHistory(): void {
    this.evaluationHistory.clear();
  }

  /**
   * Get statistics about evaluations
   */
  getStats(): {
    totalEvaluations: number;
    passRate: number;
    averageConfidence: number;
    actionBreakdown: Record<string, number>;
  } {
    let total = 0;
    let passed = 0;
    let totalConfidence = 0;
    const actions: Record<string, number> = {
      pass: 0,
      retry: 0,
      escalate: 0,
      reject: 0
    };

    for (const history of this.evaluationHistory.values()) {
      for (const result of history) {
        total++;
        totalConfidence += result.confidence;
        if (result.passed) passed++;
        actions[result.action]++;
      }
    }

    return {
      totalEvaluations: total,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      averageConfidence: total > 0 ? Math.round(totalConfidence / total) : 0,
      actionBreakdown: actions
    };
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/** Default singleton instance */
export const confidenceGate = new ConfidenceGate({
  threshold: DEFAULT_THRESHOLD,
  verbose: false
});

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick confidence check with default gate
 */
export function checkResponseConfidence(
  response: string,
  context: GateContext
): GateResult {
  return confidenceGate.checkConfidence(response, context);
}

/**
 * Set global threshold
 */
export function setGlobalThreshold(threshold: number): void {
  confidenceGate.setThreshold(threshold);
}

/**
 * Get current global threshold
 */
export function getGlobalThreshold(): number {
  return confidenceGate.getThreshold();
}

/**
 * Quick pass/fail check
 */
export function doesPassConfidence(
  response: string,
  context: GateContext
): boolean {
  return confidenceGate.checkConfidence(response, context).passed;
}

/**
 * Get recommended action for a response
 */
export function getRecommendedAction(
  response: string,
  context: GateContext
): 'pass' | 'retry' | 'escalate' | 'reject' {
  return confidenceGate.checkConfidence(response, context).action;
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  ConfidenceGate,
  confidenceGate,
  checkResponseConfidence,
  setGlobalThreshold,
  getGlobalThreshold,
  doesPassConfidence,
  getRecommendedAction,
  DEFAULT_THRESHOLD,
  UNCERTAINTY_WORDS,
  EVIDENCE_MARKERS
};
