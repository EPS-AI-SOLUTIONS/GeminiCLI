/**
 * AntiCreativityMode - Forces agents into strict factual mode
 * Solution 25: Prevents hallucination and invention when dealing with existing code/files
 *
 * This module ensures agents report ONLY what exists, without inventing,
 * suggesting, or hallucinating content that doesn't exist in the codebase.
 */

import chalk from 'chalk';

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

/**
 * Pattern definition for detecting anti-creativity triggers
 */
export interface AntiCreativityPattern {
  name: string;
  pattern: RegExp;
  category: 'file_operation' | 'code_analysis' | 'status_report' | 'directory_listing' | 'search';
  weight: number;  // How strongly this indicates need for anti-creativity (0-1)
  description: string;
}

/**
 * Result of anti-creativity analysis
 */
export interface AntiCreativityAnalysis {
  shouldEnable: boolean;
  confidence: number;           // 0-100
  matchedPatterns: string[];
  category: string | null;
  recommendation: string;
}

/**
 * Result of factual response validation
 */
export interface FactualValidationResult {
  isFactual: boolean;
  creativityScore: number;      // 0-100, higher = more creative (bad in this context)
  violations: FactualViolation[];
  summary: string;
}

/**
 * Individual violation of factual requirements
 */
export interface FactualViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern: string;
  matches: string[];
  message: string;
}

// =============================================================================
// ANTI-CREATIVITY PATTERNS
// =============================================================================

/**
 * Patterns that indicate when anti-creativity mode should be enabled
 * These are tasks where invention/suggestion is harmful
 */
export const ANTI_CREATIVITY_TRIGGERS: AntiCreativityPattern[] = [
  // === FILE OPERATIONS ===
  {
    name: 'read_file',
    pattern: /\b(?:read|view|show|display|open|cat|get content of|zawarto[sś][cć]|odczytaj|poka[zż])\s+(?:the\s+)?(?:file|plik)/gi,
    category: 'file_operation',
    weight: 1.0,
    description: 'Reading file content'
  },
  {
    name: 'file_exists',
    pattern: /\b(?:check if|does|czy)\s+(?:the\s+)?(?:file|plik)\s+(?:exists?|istnieje)/gi,
    category: 'file_operation',
    weight: 1.0,
    description: 'Checking file existence'
  },
  {
    name: 'file_content',
    pattern: /\b(?:what(?:'s| is) in|co jest w|what does .+ contain|zawiera)/gi,
    category: 'file_operation',
    weight: 0.9,
    description: 'Querying file contents'
  },

  // === DIRECTORY OPERATIONS ===
  {
    name: 'list_directory',
    pattern: /\b(?:list|show|display|ls|dir|wy[sś]wietl|poka[zż])\s+(?:the\s+)?(?:directory|folder|dir|katalog|files in)/gi,
    category: 'directory_listing',
    weight: 1.0,
    description: 'Listing directory contents'
  },
  {
    name: 'directory_structure',
    pattern: /\b(?:structure|tree|hierarchy|struktura|drzewo)\s+(?:of\s+)?(?:the\s+)?(?:directory|folder|project|katalog)/gi,
    category: 'directory_listing',
    weight: 0.95,
    description: 'Showing directory structure'
  },
  {
    name: 'find_files',
    pattern: /\b(?:find|locate|search for|look for|znajd[zź]|szukaj)\s+(?:all\s+)?(?:files|pliki)/gi,
    category: 'directory_listing',
    weight: 0.9,
    description: 'Finding files'
  },

  // === CODE ANALYSIS ===
  {
    name: 'analyze_code',
    pattern: /\b(?:analyze|analyse|review|examine|inspect|analizuj|przejrzyj|zbadaj)\s+(?:the\s+)?(?:code|function|class|method|kod|funkcj)/gi,
    category: 'code_analysis',
    weight: 0.95,
    description: 'Analyzing code'
  },
  {
    name: 'what_does_code_do',
    pattern: /\b(?:what does|co robi|explain|wyja[sś]nij)\s+(?:this|the|ta|ten)\s+(?:code|function|method|class)/gi,
    category: 'code_analysis',
    weight: 0.9,
    description: 'Explaining existing code'
  },
  {
    name: 'find_symbol',
    pattern: /\b(?:find|locate|where is|gdzie jest|znajd[zź])\s+(?:the\s+)?(?:function|class|method|variable|symbol|funkcj|klas|metod|zmienn)/gi,
    category: 'code_analysis',
    weight: 0.95,
    description: 'Finding code symbols'
  },
  {
    name: 'list_functions',
    pattern: /\b(?:list|show|get|wy[sś]wietl)\s+(?:all\s+)?(?:functions|methods|classes|exports|funkcje|metody|klasy)/gi,
    category: 'code_analysis',
    weight: 0.95,
    description: 'Listing code elements'
  },
  {
    name: 'find_references',
    pattern: /\b(?:find|show|where is .+ used|references to|u[zż]ycia|referencje)/gi,
    category: 'code_analysis',
    weight: 0.9,
    description: 'Finding code references'
  },

  // === STATUS REPORTS ===
  {
    name: 'git_status',
    pattern: /\b(?:git\s+)?(?:status|diff|log|changes|zmiany)/gi,
    category: 'status_report',
    weight: 0.95,
    description: 'Git status operations'
  },
  {
    name: 'project_status',
    pattern: /\b(?:current|present|existing)\s+(?:state|status|condition)\s+(?:of|projektu)/gi,
    category: 'status_report',
    weight: 0.9,
    description: 'Project status query'
  },
  {
    name: 'report_findings',
    pattern: /\b(?:report|summarize|list)\s+(?:what|findings|results|wyniki)/gi,
    category: 'status_report',
    weight: 0.85,
    description: 'Reporting findings'
  },

  // === SEARCH OPERATIONS ===
  {
    name: 'grep_search',
    pattern: /\b(?:grep|search|find|look for|szukaj)\s+(?:for\s+)?(?:text|string|pattern|tekst|wz[oó]r)/gi,
    category: 'search',
    weight: 0.95,
    description: 'Text search operations'
  },
  {
    name: 'count_occurrences',
    pattern: /\b(?:count|how many|ile|policz)\s+(?:occurrences|times|instances|wyst[aą]pie[nń])/gi,
    category: 'search',
    weight: 0.9,
    description: 'Counting occurrences'
  }
];

/**
 * Patterns that indicate creative/inventive responses (violations)
 */
export const CREATIVITY_VIOLATION_PATTERNS: Array<{
  type: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  weight: number;
  message: string;
}> = [
  // === INVENTION INDICATORS ===
  {
    type: 'future_tense',
    pattern: /\b(?:I will|I would|I'll|I can|Let me|I'm going to|Mog[eę]|B[eę]d[eę]|Zamierzam)\s+(?:create|make|add|implement|write|build|stworz|napisa[cć]|zaimplementowa[cć])/gi,
    severity: 'critical',
    weight: 25,
    message: 'Proposing future action instead of reporting facts'
  },
  {
    type: 'suggestion',
    pattern: /\b(?:you could|you should|consider|I suggest|I recommend|mo[zż]esz|powinie[nń]|rozwa[zż]|proponuj[eę]|zalecam)/gi,
    severity: 'high',
    weight: 20,
    message: 'Making suggestions instead of reporting'
  },
  {
    type: 'hypothetical',
    pattern: /\b(?:if you want|if needed|optionally|alternatively|je[sś]li chcesz|opcjonalnie|alternatywnie)/gi,
    severity: 'medium',
    weight: 10,
    message: 'Using hypothetical language'
  },

  // === NON-EXISTENT CONTENT ===
  {
    type: 'fake_path',
    pattern: /(?:\/path\/to\/|C:\\path\\to\\|\/your\/|\/home\/user\/|<path>|<file>|\[path\]|\[file\])/gi,
    severity: 'critical',
    weight: 30,
    message: 'Using placeholder/fake paths'
  },
  {
    type: 'example_code',
    pattern: /\b(?:for example|here's an example|such as|like this|na przyk[lł]ad|przyk[lł]adowo|oto przyk[lł]ad)/gi,
    severity: 'high',
    weight: 15,
    message: 'Providing example instead of actual content'
  },
  {
    type: 'generic_names',
    pattern: /\b(?:MyClass|MyFunction|YourFile|SomeMethod|ExampleService|TestHelper)\d*\b/g,
    severity: 'high',
    weight: 20,
    message: 'Using generic placeholder names'
  },

  // === UNCERTAINTY MARKERS ===
  {
    type: 'uncertainty',
    pattern: /\b(?:probably|maybe|perhaps|might|could be|I think|I believe|prawdopodobnie|mo[zż]e|chyba|my[sś]l[eę])/gi,
    severity: 'medium',
    weight: 10,
    message: 'Expressing uncertainty about factual content'
  },
  {
    type: 'assumption',
    pattern: /\b(?:I assume|assuming|presumably|zak[lł]adam|zak[lł]adaj[aą]c)/gi,
    severity: 'high',
    weight: 15,
    message: 'Making assumptions instead of verifying'
  },

  // === FABRICATION INDICATORS ===
  {
    type: 'typically_generally',
    pattern: /\b(?:typically|generally|usually|normally|often|zwykle|zazwyczaj|cz[eę]sto|normalnie)/gi,
    severity: 'medium',
    weight: 8,
    message: 'Using generalizations instead of specific facts'
  },
  {
    type: 'should_have',
    pattern: /\b(?:should have|should contain|should include|powinien mie[cć]|powinien zawiera[cć])/gi,
    severity: 'high',
    weight: 18,
    message: 'Describing what should be vs what is'
  },
  {
    type: 'would_look_like',
    pattern: /\b(?:would look like|might look like|could look like|wygl[aą]da[lł]oby)/gi,
    severity: 'critical',
    weight: 25,
    message: 'Describing hypothetical appearance'
  }
];

// =============================================================================
// ANTI-CREATIVITY WRAPPER INSTRUCTIONS
// =============================================================================

const ANTI_CREATIVITY_PREAMBLE = `
[ANTI-CREATIVITY MODE ENABLED - STRICT FACTUAL REPORTING]

CRITICAL INSTRUCTIONS:
- DO NOT invent content that doesn't exist
- DO NOT suggest what could be or should be
- DO NOT provide examples instead of actual content
- DO NOT use placeholder paths or names
- DO NOT make assumptions about what might exist
- ONLY report what ACTUALLY EXISTS in the codebase/filesystem
- If something doesn't exist, say "NOT FOUND" or "DOES NOT EXIST"
- If you cannot verify something, say "UNABLE TO VERIFY"
- Every path you mention MUST be a real path you have verified
- Every code snippet MUST be from an actual file you have read
- NEVER fabricate file contents, function signatures, or directory structures

YOUR RESPONSE MUST BE:
- 100% factual and verifiable
- Based only on actual file system reads and tool outputs
- Free of speculation, suggestions, or hypotheticals
- Honest about what you cannot determine

VIOLATION OF THESE RULES WILL RESULT IN RESPONSE REJECTION.

`;

const ANTI_CREATIVITY_SUFFIX = `

[END ANTI-CREATIVITY MODE - VERIFY ALL CLAIMS BEFORE SUBMISSION]
Remember: Report ONLY what EXISTS. If uncertain, state uncertainty explicitly.
`;

// =============================================================================
// ANTI-CREATIVITY MODE CLASS
// =============================================================================

/**
 * AntiCreativityMode - Enforces strict factual reporting
 */
export class AntiCreativityMode {
  private enabled: boolean = false;
  private strictnessLevel: number = 1.0;  // 0.5 = lenient, 1.0 = normal, 1.5 = strict
  private logViolations: boolean = true;

  constructor(options?: {
    strictnessLevel?: number;
    logViolations?: boolean;
  }) {
    if (options?.strictnessLevel) {
      this.strictnessLevel = Math.max(0.5, Math.min(1.5, options.strictnessLevel));
    }
    if (options?.logViolations !== undefined) {
      this.logViolations = options.logViolations;
    }
  }

  /**
   * Determine if anti-creativity mode should be enabled for a given task
   * @param task The task description/prompt
   * @returns boolean indicating if anti-creativity should be enabled
   */
  shouldEnableAntiCreativity(task: string): boolean {
    const analysis = this.analyzeTask(task);
    return analysis.shouldEnable;
  }

  /**
   * Analyze task to determine anti-creativity requirements
   * @param task The task description
   * @returns Detailed analysis of anti-creativity needs
   */
  analyzeTask(task: string): AntiCreativityAnalysis {
    const normalizedTask = task.toLowerCase();
    const matchedPatterns: string[] = [];
    let totalWeight = 0;
    let maxWeight = 0;
    let dominantCategory: string | null = null;
    const categoryWeights: Record<string, number> = {};

    for (const trigger of ANTI_CREATIVITY_TRIGGERS) {
      if (trigger.pattern.test(normalizedTask)) {
        matchedPatterns.push(trigger.name);
        totalWeight += trigger.weight;

        // Track category weights
        const cat = trigger.category;
        categoryWeights[cat] = (categoryWeights[cat] || 0) + trigger.weight;

        if (categoryWeights[cat] > maxWeight) {
          maxWeight = categoryWeights[cat];
          dominantCategory = cat;
        }

        // Reset regex lastIndex for global patterns
        trigger.pattern.lastIndex = 0;
      }
    }

    // Calculate confidence based on matched patterns
    const confidence = Math.min(100, Math.round(totalWeight * 50 * this.strictnessLevel));
    const shouldEnable = confidence >= 50;

    // Generate recommendation
    let recommendation: string;
    if (confidence >= 80) {
      recommendation = 'STRONGLY RECOMMENDED - High-confidence factual task';
    } else if (confidence >= 50) {
      recommendation = 'RECOMMENDED - Task requires factual accuracy';
    } else if (confidence >= 30) {
      recommendation = 'OPTIONAL - Some factual elements detected';
    } else {
      recommendation = 'NOT NEEDED - Task appears creative/generative';
    }

    return {
      shouldEnable,
      confidence,
      matchedPatterns,
      category: dominantCategory,
      recommendation
    };
  }

  /**
   * Wrap a prompt with anti-creativity instructions
   * @param prompt The original prompt
   * @returns Modified prompt with anti-creativity enforcement
   */
  wrapPromptWithAntiCreativity(prompt: string): string {
    // Check if already wrapped
    if (prompt.includes('[ANTI-CREATIVITY MODE ENABLED')) {
      return prompt;
    }

    return `${ANTI_CREATIVITY_PREAMBLE}

ORIGINAL TASK:
${prompt}

${ANTI_CREATIVITY_SUFFIX}`;
  }

  /**
   * Conditionally wrap prompt based on task analysis
   * @param task The task to analyze
   * @param prompt The prompt to potentially wrap
   * @returns Wrapped or original prompt
   */
  conditionalWrap(task: string, prompt: string): string {
    if (this.shouldEnableAntiCreativity(task)) {
      this.enabled = true;
      if (this.logViolations) {
        console.log(chalk.cyan('[AntiCreativity] Mode ENABLED for this task'));
      }
      return this.wrapPromptWithAntiCreativity(prompt);
    }
    this.enabled = false;
    return prompt;
  }

  /**
   * Validate that a response adheres to factual requirements
   * @param response The AI response to validate
   * @returns Validation result with creativity score and violations
   */
  validateFactualResponse(response: string): FactualValidationResult {
    const violations: FactualViolation[] = [];
    let totalWeight = 0;

    for (const check of CREATIVITY_VIOLATION_PATTERNS) {
      const matches = response.match(check.pattern);

      if (matches && matches.length > 0) {
        const adjustedWeight = check.weight * this.strictnessLevel;
        totalWeight += adjustedWeight * Math.min(matches.length, 3);

        violations.push({
          type: check.type,
          severity: check.severity,
          pattern: check.pattern.source,
          matches: matches.slice(0, 5),
          message: check.message
        });
      }

      // Reset regex lastIndex for global patterns
      check.pattern.lastIndex = 0;
    }

    // Calculate creativity score (0-100, higher is worse)
    const creativityScore = Math.min(100, Math.round(totalWeight));
    const isFactual = creativityScore < 30;

    // Generate summary
    let summary: string;
    if (creativityScore >= 70) {
      summary = 'REJECT - Response contains significant creative/inventive content';
    } else if (creativityScore >= 50) {
      summary = 'WARNING - Response may contain fabricated content';
    } else if (creativityScore >= 30) {
      summary = 'REVIEW - Minor factual concerns detected';
    } else {
      summary = 'PASS - Response appears factual';
    }

    return {
      isFactual,
      creativityScore,
      violations,
      summary
    };
  }

  /**
   * Log validation results to console
   * @param result The validation result to log
   * @param taskId Optional task identifier
   */
  logValidationResults(result: FactualValidationResult, taskId?: number): void {
    if (!this.logViolations) return;

    const prefix = taskId ? `[Task #${taskId}]` : '[AntiCreativity]';

    if (result.creativityScore === 0) {
      console.log(chalk.green(`${prefix} Response is factual - no violations`));
      return;
    }

    const color = result.creativityScore >= 70 ? chalk.red :
                  result.creativityScore >= 50 ? chalk.yellow :
                  result.creativityScore >= 30 ? chalk.cyan :
                  chalk.gray;

    console.log(color(`${prefix} Creativity Score: ${result.creativityScore}/100 - ${result.summary}`));

    for (const violation of result.violations) {
      const severityColor = violation.severity === 'critical' ? chalk.red :
                            violation.severity === 'high' ? chalk.yellow :
                            violation.severity === 'medium' ? chalk.cyan :
                            chalk.gray;

      console.log(severityColor(`  [${violation.severity.toUpperCase()}] ${violation.message}`));
      if (violation.matches.length > 0) {
        console.log(chalk.gray(`    Found: "${violation.matches.slice(0, 3).join('", "')}"`));
      }
    }
  }

  /**
   * Quick check if response is factual
   * @param response The response to check
   * @returns true if response is likely factual
   */
  quickFactualCheck(response: string): boolean {
    const result = this.validateFactualResponse(response);
    return result.isFactual;
  }

  /**
   * Get current enabled state
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Manually enable anti-creativity mode
   */
  enable(): void {
    this.enabled = true;
    if (this.logViolations) {
      console.log(chalk.cyan('[AntiCreativity] Mode manually ENABLED'));
    }
  }

  /**
   * Manually disable anti-creativity mode
   */
  disable(): void {
    this.enabled = false;
    if (this.logViolations) {
      console.log(chalk.cyan('[AntiCreativity] Mode DISABLED'));
    }
  }

  /**
   * Set strictness level
   * @param level 0.5 (lenient) to 1.5 (strict)
   */
  setStrictnessLevel(level: number): void {
    this.strictnessLevel = Math.max(0.5, Math.min(1.5, level));
  }

  /**
   * Get current strictness level
   */
  getStrictnessLevel(): number {
    return this.strictnessLevel;
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

/**
 * Default singleton instance for easy access
 */
export const antiCreativityMode = new AntiCreativityMode();

// =============================================================================
// CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Quick check if anti-creativity should be enabled for a task
 */
export function shouldEnableAntiCreativity(task: string): boolean {
  return antiCreativityMode.shouldEnableAntiCreativity(task);
}

/**
 * Wrap prompt with anti-creativity instructions
 */
export function wrapPromptWithAntiCreativity(prompt: string): string {
  return antiCreativityMode.wrapPromptWithAntiCreativity(prompt);
}

/**
 * Validate response for factual accuracy
 */
export function validateFactualResponse(response: string): FactualValidationResult {
  return antiCreativityMode.validateFactualResponse(response);
}

/**
 * Quick factual check
 */
export function quickFactualCheck(response: string): boolean {
  return antiCreativityMode.quickFactualCheck(response);
}

/**
 * Analyze task for anti-creativity needs
 */
export function analyzeTaskForAntiCreativity(task: string): AntiCreativityAnalysis {
  return antiCreativityMode.analyzeTask(task);
}

/**
 * Conditionally wrap prompt based on task
 */
export function conditionalAntiCreativityWrap(task: string, prompt: string): string {
  return antiCreativityMode.conditionalWrap(task, prompt);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  AntiCreativityMode,
  antiCreativityMode,
  shouldEnableAntiCreativity,
  wrapPromptWithAntiCreativity,
  validateFactualResponse,
  quickFactualCheck,
  analyzeTaskForAntiCreativity,
  conditionalAntiCreativityWrap,
  ANTI_CREATIVITY_TRIGGERS,
  CREATIVITY_VIOLATION_PATTERNS
};
