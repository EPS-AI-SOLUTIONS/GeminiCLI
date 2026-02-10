/**
 * ExplanationMode.ts - Feature #30: Explanation Mode
 *
 * Provides detailed explanations of what's happening during task execution.
 * Supports different verbosity levels and generates contextual explanations
 * with steps, assumptions, and risks.
 *
 * Part of ConversationLayer module extraction.
 */

import chalk from 'chalk';

// ============================================================
// Types & Interfaces
// ============================================================

export type VerbosityLevel = 'minimal' | 'normal' | 'detailed';

export interface ExplanationStep {
  action: string;
  why: string;
  how: string;
  alternatives?: string[];
}

export interface Explanation {
  overview: string;
  steps: ExplanationStep[];
  assumptions: string[];
  risks: string[];
  learningResources?: string[];
}

// ============================================================
// ExplanationMode Class
// ============================================================

export class ExplanationMode {
  private enabled: boolean = false;
  private verbosity: VerbosityLevel = 'normal';

  /**
   * Enables explanation mode
   * @param verbosity - Level of detail in explanations
   */
  enable(verbosity: VerbosityLevel = 'normal'): void {
    this.enabled = true;
    this.verbosity = verbosity;
    console.log(chalk.cyan(`[ExplanationMode] Enabled (${verbosity})`));
  }

  /**
   * Disables explanation mode
   */
  disable(): void {
    this.enabled = false;
    console.log(chalk.gray('[ExplanationMode] Disabled'));
  }

  /**
   * Toggles explanation mode on/off
   * @returns New enabled state
   */
  toggle(): boolean {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  }

  /**
   * Checks if explanation mode is enabled
   * @returns true if enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Gets current verbosity level
   * @returns Current VerbosityLevel
   */
  getVerbosity(): VerbosityLevel {
    return this.verbosity;
  }

  /**
   * Sets verbosity level
   * @param verbosity - New verbosity level
   */
  setVerbosity(verbosity: VerbosityLevel): void {
    this.verbosity = verbosity;
    console.log(chalk.gray(`[ExplanationMode] Verbosity set to: ${verbosity}`));
  }

  /**
   * Generates an explanation for an action
   * @param action - Action being performed
   * @param context - Optional additional context
   * @returns Explanation object or null if disabled
   */
  async explain(action: string, _context?: string): Promise<Explanation | null> {
    if (!this.enabled) return null;

    const explanation: Explanation = {
      overview: '',
      steps: [],
      assumptions: [],
      risks: [],
    };

    // Generate explanation based on action type
    const lowerAction = action.toLowerCase();

    if (lowerAction.includes('refactor') || lowerAction.includes('refaktor')) {
      explanation.overview =
        'Refaktoryzacja kodu polega na zmianie struktury bez zmiany zachowania';
      explanation.steps.push({
        action: 'Refaktoryzacja',
        why: 'Poprawa czytelnosci, wydajnosci lub latwosci utrzymania kodu',
        how: 'Zmiana nazw, wydzielenie funkcji, uproszczenie logiki',
        alternatives: ['Przepisanie od zera', 'Pozostawienie bez zmian'],
      });
      explanation.risks.push('Wprowadzenie regresji - zawsze uruchom testy po refaktoryzacji');
    }

    if (lowerAction.includes('test') || lowerAction.includes('testy')) {
      explanation.overview = 'Testy automatyczne weryfikuja poprawnosc kodu';
      explanation.steps.push({
        action: 'Generowanie testow',
        why: 'Zapewnienie jakosci i wykrywanie regresji',
        how: 'Utworzenie przypadkow testowych dla roznych scenariuszy',
        alternatives: ['Testy manualne', 'Code review'],
      });
      explanation.assumptions.push('Kod jest testowalny (ma zdefiniowane interfejsy)');
    }

    if (lowerAction.includes('api') || lowerAction.includes('endpoint')) {
      explanation.overview = 'API definiuje sposob komunikacji miedzy systemami';
      explanation.steps.push({
        action: 'Praca z API',
        why: 'Umozliwienie integracji i wymiany danych',
        how: 'Definicja endpointow, walidacja, obsluga bledow',
        alternatives: ['GraphQL', 'gRPC', 'WebSocket'],
      });
      explanation.risks.push('Zmiany w API moga zepsuc istniejace integracje');
    }

    if (lowerAction.includes('deploy') || lowerAction.includes('wdroz')) {
      explanation.overview = 'Wdrozenie przenosi kod z srodowiska developerskiego na produkcje';
      explanation.steps.push({
        action: 'Wdrozenie',
        why: 'Udostepnienie nowych funkcjonalnosci uzytkownikom',
        how: 'Build, testy, deploy na serwer produkcyjny',
        alternatives: ['Blue-green deployment', 'Canary release', 'Rolling update'],
      });
      explanation.risks.push('Potencjalne problemy z dostepnoscia w trakcie wdrozenia');
      explanation.assumptions.push('Srodowisko produkcyjne jest skonfigurowane poprawnie');
    }

    if (
      lowerAction.includes('debug') ||
      lowerAction.includes('blad') ||
      lowerAction.includes('error')
    ) {
      explanation.overview = 'Debugowanie to proces znajdowania i naprawiania bledow w kodzie';
      explanation.steps.push({
        action: 'Debugowanie',
        why: 'Naprawa nieprawidlowego dzialania aplikacji',
        how: 'Analiza logow, stack trace, breakpointy, testy jednostkowe',
        alternatives: ['Logi', 'Debugger IDE', 'Console.log', 'Testy'],
      });
      explanation.assumptions.push('Blad jest powtarzalny i mozliwy do zreprodukowania');
    }

    if (lowerAction.includes('migrate') || lowerAction.includes('migracja')) {
      explanation.overview = 'Migracja to przeniesienie danych lub kodu do nowej wersji/struktury';
      explanation.steps.push({
        action: 'Migracja',
        why: 'Aktualizacja do nowszej wersji lub zmiana struktury danych',
        how: 'Backup, wykonanie migracji, weryfikacja, rollback jesli potrzebne',
        alternatives: ['Migracja stopniowa', 'Big bang migration', 'Dual write'],
      });
      explanation.risks.push('Utrata danych przy niepoprawnej migracji');
      explanation.assumptions.push('Masz backup danych przed migracja');
    }

    // Add verbosity-dependent details
    if (this.verbosity === 'detailed') {
      explanation.learningResources = [
        'https://refactoring.guru/',
        'https://testing.googleblog.com/',
        'https://www.restapitutorial.com/',
        'https://martinfowler.com/',
        'https://12factor.net/',
      ];
    }

    return explanation;
  }

  /**
   * Formats an explanation as a human-readable string
   * @param explanation - Explanation to format
   * @returns Formatted string
   */
  formatExplanation(explanation: Explanation): string {
    const lines: string[] = [];

    lines.push(chalk.cyan('[EXPLANATION]:'));
    lines.push(explanation.overview);
    lines.push('');

    if (explanation.steps.length > 0) {
      lines.push(chalk.yellow('Steps:'));
      for (const step of explanation.steps) {
        lines.push(`  - ${step.action}`);
        lines.push(`    Why: ${step.why}`);
        lines.push(`    How: ${step.how}`);
        if (step.alternatives && this.verbosity !== 'minimal') {
          lines.push(`    Alternatives: ${step.alternatives.join(', ')}`);
        }
      }
    }

    if (explanation.assumptions.length > 0 && this.verbosity !== 'minimal') {
      lines.push('');
      lines.push(chalk.gray(`Assumptions: ${explanation.assumptions.join('; ')}`));
    }

    if (explanation.risks.length > 0) {
      lines.push('');
      lines.push(chalk.red(`[!] Risks: ${explanation.risks.join('; ')}`));
    }

    if (
      explanation.learningResources &&
      explanation.learningResources.length > 0 &&
      this.verbosity === 'detailed'
    ) {
      lines.push('');
      lines.push(chalk.blue('Learning Resources:'));
      for (const resource of explanation.learningResources) {
        lines.push(`  - ${resource}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Creates a simple explanation step
   * @param action - Action name
   * @param why - Reason for the action
   * @param how - How it's performed
   * @param alternatives - Optional alternatives
   * @returns ExplanationStep object
   */
  createStep(action: string, why: string, how: string, alternatives?: string[]): ExplanationStep {
    return { action, why, how, alternatives };
  }

  /**
   * Creates a complete explanation object
   * @param overview - Overview text
   * @param steps - Array of explanation steps
   * @param assumptions - Array of assumptions
   * @param risks - Array of risks
   * @param learningResources - Optional learning resources
   * @returns Explanation object
   */
  createExplanation(
    overview: string,
    steps: ExplanationStep[],
    assumptions: string[] = [],
    risks: string[] = [],
    learningResources?: string[],
  ): Explanation {
    return { overview, steps, assumptions, risks, learningResources };
  }
}

// ============================================================
// Singleton Instance
// ============================================================

export const explanationMode = new ExplanationMode();

// ============================================================
// Exports
// ============================================================

export default {
  ExplanationMode,
  explanationMode,
};
