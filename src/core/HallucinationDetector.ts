/**
 * HallucinationDetector - Detects AI hallucinations in agent responses
 * Solution 10: Comprehensive hallucination pattern detection
 */

import chalk from 'chalk';

export interface HallucinationCheck {
  type: string;
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
}

export interface HallucinationResult {
  hasHallucinations: boolean;
  totalScore: number; // 0-100, higher = more suspicious
  checks: {
    type: string;
    triggered: boolean;
    severity: string;
    message: string;
    matches?: string[];
  }[];
  recommendation: string;
}

/**
 * Hallucination patterns organized by category
 */
export const HALLUCINATION_PATTERNS: HallucinationCheck[] = [
  // === GENERIC NAMES ===
  {
    type: 'generic_filename',
    pattern: /\b(?:file|class|function|method|test|helper|util)\d+\.(ts|js|tsx|jsx|py)\b/gi,
    severity: 'high',
    message: 'Generyczna nazwa pliku (file1.ts, class2.js)',
  },
  {
    type: 'generic_class',
    pattern: /\b(?:Class|File|Test|Helper|Utils?|Service|Component|Module|Handler)\d+\b/g,
    severity: 'high',
    message: 'Generyczna nazwa klasy (Class1, Helper2)',
  },
  {
    type: 'placeholder_name',
    pattern: /\b(?:foo|bar|baz|qux|example|sample|test|dummy|mock|fake)\w*\.(ts|js)\b/gi,
    severity: 'medium',
    message: 'Placeholder zamiast prawdziwej nazwy',
  },

  // === PROPOSAL INSTEAD OF EXECUTION ===
  {
    type: 'future_promise_en',
    pattern:
      /\b(?:I will|I would|I can|Let me|I'll|I'm going to)\s+(?:create|write|implement|add|fix|modify|build|develop)\b/gi,
    severity: 'critical',
    message: 'Agent proponuje działanie zamiast je wykonać (EN)',
  },
  {
    type: 'future_promise_pl',
    pattern:
      /\b(?:Mogę|Będę|Zamierzam|Powinienem|Należy|Można)\s+(?:stworzyć|napisać|zaimplementować|dodać|naprawić|zmodyfikować)\b/gi,
    severity: 'critical',
    message: 'Agent proponuje działanie zamiast je wykonać (PL)',
  },
  {
    type: 'suggestion_instead_action',
    pattern: /\b(?:you could|you can|you should|consider|możesz|powinieneś|rozważ|warto)\b/gi,
    severity: 'high',
    message: 'Agent sugeruje zamiast wykonać',
  },

  // === EXAMPLE PATTERNS ===
  {
    type: 'example_code',
    pattern:
      /(?:for example|na przykład|przykładowo|here's an example|oto przykład|such as|like this)/gi,
    severity: 'medium',
    message: 'Kod przykładowy zamiast rzeczywistego',
  },
  {
    type: 'hypothetical',
    pattern:
      /\b(?:if you want|jeśli chcesz|optionally|opcjonalnie|alternatively|alternatywnie)\b/gi,
    severity: 'low',
    message: 'Odpowiedź hipotetyczna',
  },

  // === FAKE PATHS ===
  {
    type: 'fake_path',
    pattern: /(?:\/path\/to\/|C:\\path\\to\\|\/your\/|C:\\your\\|\/home\/user\/project)/gi,
    severity: 'high',
    message: 'Fikcyjna ścieżka do pliku',
  },
  {
    type: 'nonexistent_dir',
    pattern: /\b(?:src\/components\/|lib\/utils\/|app\/services\/)[A-Z]\w+\d+\//g,
    severity: 'medium',
    message: 'Potencjalnie nieistniejący katalog',
  },

  // === VAGUE DESCRIPTIONS ===
  {
    type: 'vague_implementation',
    pattern:
      /\b(?:implement the logic|add the code|write the function|implement this|dodaj kod|zaimplementuj logikę)\b/gi,
    severity: 'medium',
    message: 'Opis zamiast implementacji',
  },
  {
    type: 'todo_placeholder',
    pattern: /\b(?:TODO|FIXME|XXX|HACK|implement here|add implementation)\b/gi,
    severity: 'medium',
    message: 'Placeholder TODO w kodzie',
  },

  // === CONFIDENCE INDICATORS ===
  {
    type: 'uncertainty',
    pattern:
      /\b(?:I think|I believe|probably|maybe|perhaps|might|should work|myślę|prawdopodobnie|może|chyba)\b/gi,
    severity: 'low',
    message: 'Wskaźniki niepewności',
  },
  {
    type: 'assumption',
    pattern: /\b(?:assuming|I assume|zakładam|zakładając)\b/gi,
    severity: 'medium',
    message: 'Agent robi założenia',
  },
];

/**
 * Severity weights for scoring
 */
const SEVERITY_WEIGHTS: Record<string, number> = {
  low: 5,
  medium: 15,
  high: 30,
  critical: 50,
};

/**
 * Detect hallucinations in agent response
 */
export function detectHallucinations(
  response: string,
  _context?: { task?: string; agent?: string },
): HallucinationResult {
  const checks: HallucinationResult['checks'] = [];
  let totalScore = 0;

  for (const check of HALLUCINATION_PATTERNS) {
    const matches = response.match(check.pattern);
    const triggered = matches !== null && matches.length > 0;

    if (triggered) {
      totalScore += SEVERITY_WEIGHTS[check.severity] * Math.min(matches?.length, 3);
    }

    checks.push({
      type: check.type,
      triggered,
      severity: check.severity,
      message: check.message,
      matches: matches ? matches.slice(0, 5) : undefined,
    });
  }

  // Cap score at 100
  totalScore = Math.min(totalScore, 100);

  // Determine recommendation
  let recommendation: string;
  if (totalScore >= 70) {
    recommendation = 'ODRZUĆ - wysoka pewność halucynacji';
  } else if (totalScore >= 40) {
    recommendation = 'WERYFIKUJ - możliwe halucynacje';
  } else if (totalScore >= 20) {
    recommendation = 'SPRAWDŹ - drobne ostrzeżenia';
  } else {
    recommendation = 'OK - brak podejrzanych wzorców';
  }

  return {
    hasHallucinations: totalScore >= 40,
    totalScore,
    checks: checks.filter((c) => c.triggered),
    recommendation,
  };
}

/**
 * Log hallucination detection results
 */
export function logHallucinationResults(result: HallucinationResult, taskId?: number): void {
  const prefix = taskId ? `[Task #${taskId}]` : '[Hallucination]';

  if (result.totalScore === 0) {
    console.log(chalk.green(`${prefix} Brak wykrytych halucynacji`));
    return;
  }

  const color =
    result.totalScore >= 70 ? chalk.red : result.totalScore >= 40 ? chalk.yellow : chalk.gray;

  console.log(color(`${prefix} Score: ${result.totalScore}/100 - ${result.recommendation}`));

  for (const check of result.checks) {
    const severityColor =
      check.severity === 'critical'
        ? chalk.red
        : check.severity === 'high'
          ? chalk.yellow
          : check.severity === 'medium'
            ? chalk.cyan
            : chalk.gray;

    console.log(severityColor(`  [${check.severity.toUpperCase()}] ${check.message}`));
    if (check.matches && check.matches.length > 0) {
      console.log(chalk.gray(`    Matches: ${check.matches.join(', ')}`));
    }
  }
}

/**
 * Quick check - returns true if response likely contains hallucinations
 */
export function quickHallucinationCheck(response: string): boolean {
  const result = detectHallucinations(response);
  return result.hasHallucinations;
}

export default {
  detectHallucinations,
  logHallucinationResults,
  quickHallucinationCheck,
  HALLUCINATION_PATTERNS,
};
