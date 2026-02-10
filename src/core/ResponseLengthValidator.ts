/**
 * ResponseLengthValidator - Solution 35
 * Validates that response length is appropriate for the task type.
 * Helps detect potential padding/hallucination (too long) or incomplete responses (too short).
 */

/**
 * Result of length validation
 */
export interface LengthValidation {
  /** Whether the response length is within expected range */
  valid: boolean;
  /** Actual character count of the response */
  actualLength: number;
  /** Expected range [min, max] for this task type */
  expectedRange: [number, number];
  /** Warning message if length is suspicious */
  warning?: string;
  /** Suggestion for how to handle the validation result */
  suggestion?: string;
}

/**
 * Task type definitions with their expected length ranges
 */
export type TaskType = 'read' | 'write' | 'analyze' | 'fix' | 'list' | 'unknown';

/**
 * Complexity levels that modify expected ranges
 */
export type ComplexityLevel = 'low' | 'medium' | 'high' | 'unknown';

/**
 * Configuration for length expectations per task type
 */
interface LengthExpectation {
  min: number;
  max: number;
  description: string;
}

/**
 * ResponseLengthValidator validates that AI responses have appropriate length
 * for the given task type. This helps detect:
 * - Padding or hallucination (suspiciously long responses)
 * - Incomplete or truncated responses (too short)
 * - Mismatched expectations (wrong task type classification)
 */
export class ResponseLengthValidator {
  /**
   * Base length expectations per task type (in characters)
   * These are calibrated for typical AI assistant responses
   */
  private readonly lengthExpectations: Record<TaskType, LengthExpectation> = {
    read: {
      min: 100,
      max: 2000,
      description: 'Reading/reporting existing content - should be concise',
    },
    write: {
      min: 200,
      max: 5000,
      description: 'Writing code or content - includes code + confirmation',
    },
    analyze: {
      min: 500,
      max: 3000,
      description: 'Analysis tasks - detailed but focused',
    },
    fix: {
      min: 100,
      max: 1000,
      description: 'Bug fixes - targeted and specific',
    },
    list: {
      min: 50,
      max: 500,
      description: 'Listing items - concise enumeration',
    },
    unknown: {
      min: 100,
      max: 3000,
      description: 'Unknown task type - using moderate defaults',
    },
  };

  /**
   * Complexity multipliers adjust expected ranges
   */
  private readonly complexityMultipliers: Record<ComplexityLevel, number> = {
    low: 0.5,
    medium: 1.0,
    high: 2.0,
    unknown: 1.0,
  };

  /**
   * Threshold for flagging suspiciously long responses (percentage over max)
   */
  private readonly suspiciousLongThreshold = 1.5; // 150% of max

  /**
   * Threshold for flagging critically short responses (percentage of min)
   */
  private readonly criticallyShortThreshold = 0.5; // 50% of min

  /**
   * Validates the length of a response against expected ranges for the task type
   *
   * @param response - The response text to validate
   * @param taskType - The type of task (read, write, analyze, fix, list)
   * @param expectedComplexity - The complexity level (low, medium, high)
   * @returns LengthValidation with validation results and suggestions
   */
  validateLength(
    response: string,
    taskType: string,
    expectedComplexity: string = 'medium',
  ): LengthValidation {
    const actualLength = response.length;
    const normalizedTaskType = this.normalizeTaskType(taskType);
    const normalizedComplexity = this.normalizeComplexity(expectedComplexity);

    const baseExpectation = this.lengthExpectations[normalizedTaskType];
    const multiplier = this.complexityMultipliers[normalizedComplexity];

    // Calculate adjusted range based on complexity
    const expectedRange: [number, number] = [
      Math.floor(baseExpectation.min * multiplier),
      Math.ceil(baseExpectation.max * multiplier),
    ];

    // Determine if valid
    const valid = actualLength >= expectedRange[0] && actualLength <= expectedRange[1];

    // Build result
    const result: LengthValidation = {
      valid,
      actualLength,
      expectedRange,
    };

    // Add warnings and suggestions for invalid responses
    if (!valid) {
      if (actualLength < expectedRange[0]) {
        result.warning = this.generateShortWarning(actualLength, expectedRange, normalizedTaskType);
        result.suggestion = this.generateShortSuggestion(
          actualLength,
          expectedRange,
          normalizedTaskType,
        );
      } else {
        result.warning = this.generateLongWarning(actualLength, expectedRange, normalizedTaskType);
        result.suggestion = this.generateLongSuggestion(
          actualLength,
          expectedRange,
          normalizedTaskType,
        );
      }
    } else {
      // Even valid responses might have warnings at the edges
      const edgeWarning = this.checkEdgeCases(actualLength, expectedRange);
      if (edgeWarning) {
        result.warning = edgeWarning;
      }
    }

    return result;
  }

  /**
   * Normalizes task type string to known TaskType
   */
  private normalizeTaskType(taskType: string): TaskType {
    const normalized = taskType.toLowerCase().trim();

    // Map common variations to standard types
    const typeMapping: Record<string, TaskType> = {
      read: 'read',
      reading: 'read',
      get: 'read',
      fetch: 'read',
      retrieve: 'read',
      show: 'read',
      display: 'read',

      write: 'write',
      writing: 'write',
      create: 'write',
      generate: 'write',
      implement: 'write',
      add: 'write',

      analyze: 'analyze',
      analysis: 'analyze',
      analyse: 'analyze',
      review: 'analyze',
      examine: 'analyze',
      inspect: 'analyze',
      explain: 'analyze',

      fix: 'fix',
      fixing: 'fix',
      repair: 'fix',
      debug: 'fix',
      patch: 'fix',
      correct: 'fix',
      resolve: 'fix',

      list: 'list',
      listing: 'list',
      enumerate: 'list',
      find: 'list',
      search: 'list',
      count: 'list',
    };

    return typeMapping[normalized] || 'unknown';
  }

  /**
   * Normalizes complexity string to known ComplexityLevel
   */
  private normalizeComplexity(complexity: string): ComplexityLevel {
    const normalized = complexity.toLowerCase().trim();

    const complexityMapping: Record<string, ComplexityLevel> = {
      low: 'low',
      simple: 'low',
      basic: 'low',
      trivial: 'low',
      easy: 'low',

      medium: 'medium',
      moderate: 'medium',
      normal: 'medium',
      standard: 'medium',
      average: 'medium',

      high: 'high',
      complex: 'high',
      advanced: 'high',
      difficult: 'high',
      hard: 'high',
      comprehensive: 'high',
    };

    return complexityMapping[normalized] || 'unknown';
  }

  /**
   * Generates warning message for responses that are too short
   */
  private generateShortWarning(
    actual: number,
    expected: [number, number],
    taskType: TaskType,
  ): string {
    const percentOfMin = Math.round((actual / expected[0]) * 100);

    if (actual < expected[0] * this.criticallyShortThreshold) {
      return (
        `CRITICAL: Response is critically short (${actual} chars, only ${percentOfMin}% of minimum). ` +
        `Likely incomplete or truncated for ${taskType} task.`
      );
    }

    return (
      `Response may be incomplete: ${actual} chars is below the expected minimum of ${expected[0]} ` +
      `for ${taskType} tasks (${percentOfMin}% of minimum).`
    );
  }

  /**
   * Generates suggestion for responses that are too short
   */
  private generateShortSuggestion(
    _actual: number,
    _expected: [number, number],
    taskType: TaskType,
  ): string {
    const taskSuggestions: Record<TaskType, string> = {
      read: 'Verify the file/content exists and was read completely. Check for read errors.',
      write: 'Ensure all code was generated. Check if the response was truncated.',
      analyze: 'The analysis may be superficial. Consider requesting more detailed analysis.',
      fix: 'Verify the fix addresses the full issue. May need additional context.',
      list: 'Check if all items were enumerated. Verify search criteria are correct.',
      unknown: 'Request clarification or retry the operation with more context.',
    };

    return taskSuggestions[taskType];
  }

  /**
   * Generates warning message for responses that are too long
   */
  private generateLongWarning(
    actual: number,
    expected: [number, number],
    taskType: TaskType,
  ): string {
    const percentOfMax = Math.round((actual / expected[1]) * 100);

    if (actual > expected[1] * this.suspiciousLongThreshold) {
      return (
        `SUSPICIOUS: Response is unusually long (${actual} chars, ${percentOfMax}% of maximum). ` +
        `May contain padding, repetition, or hallucinated content for ${taskType} task.`
      );
    }

    return (
      `Response exceeds expected length: ${actual} chars is above the maximum of ${expected[1]} ` +
      `for ${taskType} tasks (${percentOfMax}% of maximum).`
    );
  }

  /**
   * Generates suggestion for responses that are too long
   */
  private generateLongSuggestion(
    _actual: number,
    _expected: [number, number],
    taskType: TaskType,
  ): string {
    const taskSuggestions: Record<TaskType, string> = {
      read: 'Review for unnecessary verbosity. May include unrelated content.',
      write:
        'Check for duplicated code or excessive comments. Consider splitting into smaller files.',
      analyze: 'Verify analysis stays focused on the topic. May contain tangential information.',
      fix: 'Fix may be over-engineered. Review for scope creep or unnecessary changes.',
      list: 'List may include irrelevant items. Apply stricter filtering criteria.',
      unknown: 'Review response for relevance and remove any padding or repetition.',
    };

    return taskSuggestions[taskType];
  }

  /**
   * Checks for edge cases that might warrant warnings even for valid responses
   */
  private checkEdgeCases(actual: number, expected: [number, number]): string | undefined {
    const range = expected[1] - expected[0];
    const lowerQuarter = expected[0] + range * 0.25;
    const upperQuarter = expected[1] - range * 0.25;

    if (actual < lowerQuarter) {
      return `Response is on the shorter end of expected range. Consider if more detail is needed.`;
    }

    if (actual > upperQuarter) {
      return `Response is on the longer end of expected range. Consider if content could be more concise.`;
    }

    return undefined;
  }

  /**
   * Batch validate multiple responses
   */
  validateBatch(
    responses: Array<{ response: string; taskType: string; complexity?: string }>,
  ): LengthValidation[] {
    return responses.map((item) =>
      this.validateLength(item.response, item.taskType, item.complexity || 'medium'),
    );
  }

  /**
   * Get length expectations for a task type (useful for UI display or debugging)
   */
  getExpectations(
    taskType: string,
    complexity: string = 'medium',
  ): LengthExpectation & { adjustedRange: [number, number] } {
    const normalizedTaskType = this.normalizeTaskType(taskType);
    const normalizedComplexity = this.normalizeComplexity(complexity);
    const base = this.lengthExpectations[normalizedTaskType];
    const multiplier = this.complexityMultipliers[normalizedComplexity];

    return {
      ...base,
      adjustedRange: [Math.floor(base.min * multiplier), Math.ceil(base.max * multiplier)],
    };
  }

  /**
   * Get all supported task types
   */
  getSupportedTaskTypes(): TaskType[] {
    return Object.keys(this.lengthExpectations) as TaskType[];
  }

  /**
   * Get all supported complexity levels
   */
  getSupportedComplexityLevels(): ComplexityLevel[] {
    return Object.keys(this.complexityMultipliers) as ComplexityLevel[];
  }
}

// Default export for convenience
export default ResponseLengthValidator;
