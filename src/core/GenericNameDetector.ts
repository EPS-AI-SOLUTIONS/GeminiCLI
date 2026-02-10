/**
 * GenericNameDetector - Detects generic/placeholder names in code
 * Solution 14: Specialized generic name detection
 *
 * Generic names like file1.ts, Class1, helper2 are strong indicators
 * that an AI is hallucinating rather than working with real files.
 */

import chalk from 'chalk';

export interface GenericNameMatch {
  name: string;
  type: 'file' | 'class' | 'function' | 'variable' | 'path';
  severity: 'low' | 'medium' | 'high';
  reason: string;
}

export interface GenericNameResult {
  hasGenericNames: boolean;
  matches: GenericNameMatch[];
  score: number; // 0-100
  recommendation: string;
}

/**
 * Patterns for detecting generic names
 */
const GENERIC_PATTERNS = {
  // File names with numbers
  numberedFiles: {
    pattern:
      /\b(?:file|class|component|module|service|helper|util|test|spec)\d+\.(ts|js|tsx|jsx|py|java|go|rs)\b/gi,
    type: 'file' as const,
    severity: 'high' as const,
    reason: 'Plik z numerem (file1.ts) - prawdopodobnie halucynacja',
  },

  // Classes with numbers
  numberedClasses: {
    pattern: /\b(?:Class|Component|Service|Helper|Utils?|Handler|Manager|Controller|Factory)\d+\b/g,
    type: 'class' as const,
    severity: 'high' as const,
    reason: 'Klasa z numerem (Class1) - prawdopodobnie halucynacja',
  },

  // Common placeholder names
  placeholderNames: {
    pattern: /\b(?:foo|bar|baz|qux|quux|corge|grault|garply|waldo|fred|plugh|xyzzy|thud)\b/gi,
    type: 'variable' as const,
    severity: 'medium' as const,
    reason: 'Placeholder programistyczny (foo, bar)',
  },

  // Example/sample files
  exampleFiles: {
    pattern: /\b(?:example|sample|demo|test|dummy|mock|fake|temp|tmp)\.(ts|js|tsx|jsx)\b/gi,
    type: 'file' as const,
    severity: 'medium' as const,
    reason: 'Plik przykładowy (example.ts)',
  },

  // Generic function names
  genericFunctions: {
    pattern: /\bfunction\s+(?:doSomething|handleIt|processData|myFunction|testFunc|func\d*)\b/gi,
    type: 'function' as const,
    severity: 'medium' as const,
    reason: 'Generyczna nazwa funkcji',
  },

  // Fake paths
  fakePaths: {
    pattern:
      /(?:\/path\/to\/|C:\\path\\to\\|\/your\/|\/user\/project\/|src\/components\/Example)/gi,
    type: 'path' as const,
    severity: 'high' as const,
    reason: 'Fikcyjna ścieżka (/path/to/)',
  },

  // MyXxx naming pattern
  myPrefix: {
    pattern: /\b(?:My[A-Z][a-zA-Z]+|my[A-Z][a-zA-Z]+)\.(ts|js|tsx|jsx)\b/g,
    type: 'file' as const,
    severity: 'low' as const,
    reason: 'Wzorzec MyXxx (MyComponent.ts)',
  },

  // Numbered variables
  numberedVars: {
    pattern: /\b(?:var|let|const)\s+(?:data|result|value|item|element|obj|arr)\d+\b/gi,
    type: 'variable' as const,
    severity: 'low' as const,
    reason: 'Zmienna z numerem (data1, result2)',
  },
};

/**
 * Known real project files that should not be flagged
 */
const WHITELIST_PATTERNS = [
  /index\.(ts|js|tsx|jsx)$/i,
  /main\.(ts|js|tsx|jsx)$/i,
  /App\.(ts|js|tsx|jsx)$/i,
  /utils?\.(ts|js)$/i,
  /helpers?\.(ts|js)$/i,
  /types?\.(ts|d\.ts)$/i,
  /config\.(ts|js|json)$/i,
];

/**
 * Detect generic names in text
 */
export function detectGenericNames(text: string): GenericNameResult {
  const matches: GenericNameMatch[] = [];
  let totalScore = 0;

  for (const [_key, config] of Object.entries(GENERIC_PATTERNS)) {
    const found = text.match(config.pattern);
    if (found) {
      for (const name of found) {
        // Skip whitelisted names
        if (WHITELIST_PATTERNS.some((wp) => wp.test(name))) {
          continue;
        }

        matches.push({
          name,
          type: config.type,
          severity: config.severity,
          reason: config.reason,
        });

        // Add to score based on severity
        totalScore += config.severity === 'high' ? 25 : config.severity === 'medium' ? 15 : 5;
      }
    }
  }

  // Cap score at 100
  totalScore = Math.min(totalScore, 100);

  // Determine recommendation
  let recommendation: string;
  if (totalScore >= 50) {
    recommendation = 'ODRZUĆ - wysokie prawdopodobieństwo halucynacji';
  } else if (totalScore >= 25) {
    recommendation = 'WERYFIKUJ - podejrzane nazwy wykryte';
  } else if (totalScore > 0) {
    recommendation = 'OK Z UWAGAMI - drobne ostrzeżenia';
  } else {
    recommendation = 'OK - brak generycznych nazw';
  }

  return {
    hasGenericNames: matches.length > 0,
    matches,
    score: totalScore,
    recommendation,
  };
}

/**
 * Log detection results
 */
export function logGenericNameResults(result: GenericNameResult, prefix: string = ''): void {
  if (!result.hasGenericNames) {
    return;
  }

  const color = result.score >= 50 ? chalk.red : result.score >= 25 ? chalk.yellow : chalk.gray;

  console.log(
    color(`${prefix}[GenericNames] Score: ${result.score}/100 - ${result.recommendation}`),
  );

  // Group by type
  const byType = new Map<string, GenericNameMatch[]>();
  for (const match of result.matches) {
    if (!byType.has(match.type)) {
      byType.set(match.type, []);
    }
    byType.get(match.type)?.push(match);
  }

  for (const [type, typeMatches] of byType) {
    console.log(chalk.gray(`  ${type}: ${typeMatches.map((m) => m.name).join(', ')}`));
  }
}

/**
 * Quick check for generic names
 */
export function hasGenericNames(text: string): boolean {
  return detectGenericNames(text).hasGenericNames;
}

export default {
  detectGenericNames,
  logGenericNameResults,
  hasGenericNames,
};
