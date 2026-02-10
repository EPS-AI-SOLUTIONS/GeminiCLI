/**
 * VerificationAgent - Inter-Phase Quality Gate (Keira Metz)
 *
 * Validates outputs between each phase (A, B, C, D) of the Swarm execution pipeline.
 * Uses Gemini 3 Flash for fast, cost-effective verification with low temperature (0.3-0.5).
 *
 * @module core/VerificationAgent
 */

import type { ExecutionResult } from '../types/index.js';
import { type Agent, getAgent } from './agent/Agent.js';
import { getLogger } from './LiveLogger.js';
import { cleanJson } from './swarm/helpers.js';

// ============================================================================
// INTERFACES
// ============================================================================

/** Verdict from a single phase verification */
export interface PhaseVerdict {
  phase: 'A' | 'B' | 'C' | 'D';
  score: number;
  verdict: 'PASS' | 'FAIL' | 'REVIEW';
  issues: string[];
  strengths: string[];
  recommendations: string[];
  timestamp: number;
  verificationTimeMs: number;
}

/** Overall mission verdict aggregating all phases */
export interface MissionVerdict {
  overallScore: number;
  overallVerdict: 'PASS' | 'FAIL' | 'REVIEW';
  phaseVerdicts: PhaseVerdict[];
  criticalIssues: string[];
  summary: string;
  timestamp: number;
}

/** Configuration for VerificationAgent */
export interface VerificationConfig {
  enabled: boolean;
  passThreshold: number;
  reviewThreshold: number;
  failOnReview: boolean;
  verbose: boolean;
}

/** Simplified plan structure for verification */
export interface VerifiablePlan {
  tasks?: Array<{
    id?: number;
    description?: string;
    task?: string;
    agent?: string;
    dependencies?: number[];
    priority?: string;
    status?: string;
    context?: string;
  }>;
  objective?: string;
  complexity?: string;
  parallelGroups?: number[][];
  estimatedTime?: string;
}

/** Phase C healing result structure */
export interface HealingResult {
  repairCycles: number;
  repairedTasks: number;
  lessonsLearned?: string[];
  successRateBefore?: number;
  successRateAfter?: number;
  [key: string]: unknown;
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const DEFAULT_VERIFICATION_CONFIG: VerificationConfig = {
  enabled: true,
  passThreshold: 70,
  reviewThreshold: 40,
  failOnReview: false,
  verbose: false,
};

/** Phase weights for overall score calculation */
const PHASE_WEIGHTS: Record<string, number> = {
  A: 0.3,
  B: 0.3,
  C: 0.15,
  D: 0.25,
};

const VALID_AGENTS = [
  'geralt',
  'yennefer',
  'triss',
  'jaskier',
  'vesemir',
  'ciri',
  'eskel',
  'lambert',
  'zoltan',
  'regis',
  'dijkstra',
  'philippa',
  'serena',
  'keira',
];

// ============================================================================
// VERIFICATION AGENT CLASS
// ============================================================================

export class VerificationAgent {
  private config: VerificationConfig;
  private agent: Agent;
  private phaseVerdicts: PhaseVerdict[] = [];

  constructor(config: Partial<VerificationConfig> = {}) {
    this.config = { ...DEFAULT_VERIFICATION_CONFIG, ...config };
    this.agent = getAgent('keira');
  }

  /**
   * Verify Phase A output: Dijkstra's plan quality.
   */
  async verifyPhaseA(plan: VerifiablePlan, originalObjective: string): Promise<PhaseVerdict> {
    const startTime = Date.now();
    const logger = getLogger();
    logger.system('[Keira] Weryfikacja Phase A: Jakość planu...', 'info');

    const prompt = buildPhaseAPrompt(plan, originalObjective);

    try {
      const rawResponse = await this.agent.think(prompt);
      const verdict = parseVerdict(rawResponse, 'A', startTime, this.config);
      this.phaseVerdicts.push(verdict);
      this.logVerdict(verdict);
      return verdict;
    } catch (_error) {
      const fallback = createFallbackVerdict('A', startTime, 'Verification call failed');
      this.phaseVerdicts.push(fallback);
      this.logVerdict(fallback);
      return fallback;
    }
  }

  /**
   * Verify Phase B output: execution results.
   */
  async verifyPhaseB(
    results: ExecutionResult[],
    plan: VerifiablePlan,
    originalObjective: string,
  ): Promise<PhaseVerdict> {
    const startTime = Date.now();
    const logger = getLogger();
    logger.system('[Keira] Weryfikacja Phase B: Wyniki wykonania...', 'info');

    const prompt = buildPhaseBPrompt(results, plan, originalObjective);

    try {
      const rawResponse = await this.agent.think(prompt);
      const verdict = parseVerdict(rawResponse, 'B', startTime, this.config);
      this.phaseVerdicts.push(verdict);
      this.logVerdict(verdict);
      return verdict;
    } catch (_error) {
      const fallback = createFallbackVerdict('B', startTime, 'Verification call failed');
      this.phaseVerdicts.push(fallback);
      this.logVerdict(fallback);
      return fallback;
    }
  }

  /**
   * Verify Phase C output: self-healing effectiveness.
   */
  async verifyPhaseC(
    healingResult: HealingResult,
    originalResults: ExecutionResult[],
    originalObjective: string,
  ): Promise<PhaseVerdict> {
    const startTime = Date.now();
    const logger = getLogger();
    logger.system('[Keira] Weryfikacja Phase C: Efektywność napraw...', 'info');

    const prompt = buildPhaseCPrompt(healingResult, originalResults, originalObjective);

    try {
      const rawResponse = await this.agent.think(prompt);
      const verdict = parseVerdict(rawResponse, 'C', startTime, this.config);
      this.phaseVerdicts.push(verdict);
      this.logVerdict(verdict);
      return verdict;
    } catch (_error) {
      const fallback = createFallbackVerdict('C', startTime, 'Verification call failed');
      this.phaseVerdicts.push(fallback);
      this.logVerdict(fallback);
      return fallback;
    }
  }

  /**
   * Verify Phase D output: final synthesis quality.
   */
  async verifyPhaseD(
    synthesis: string,
    results: ExecutionResult[],
    originalObjective: string,
  ): Promise<PhaseVerdict> {
    const startTime = Date.now();
    const logger = getLogger();
    logger.system('[Keira] Weryfikacja Phase D: Jakość syntezy...', 'info');

    const prompt = buildPhaseDPrompt(synthesis, results, originalObjective);

    try {
      const rawResponse = await this.agent.think(prompt);
      const verdict = parseVerdict(rawResponse, 'D', startTime, this.config);
      this.phaseVerdicts.push(verdict);
      this.logVerdict(verdict);
      return verdict;
    } catch (_error) {
      const fallback = createFallbackVerdict('D', startTime, 'Verification call failed');
      this.phaseVerdicts.push(fallback);
      this.logVerdict(fallback);
      return fallback;
    }
  }

  /**
   * Generate overall mission verdict from all phase verdicts.
   */
  generateVerdict(): MissionVerdict {
    const now = Date.now();

    if (this.phaseVerdicts.length === 0) {
      return {
        overallScore: 0,
        overallVerdict: 'REVIEW',
        phaseVerdicts: [],
        criticalIssues: ['No phases were verified'],
        summary: 'Brak werdyktów faz do agregacji.',
        timestamp: now,
      };
    }

    // Weighted average
    let weightedSum = 0;
    let totalWeight = 0;

    for (const v of this.phaseVerdicts) {
      const weight = PHASE_WEIGHTS[v.phase] ?? 0.25;
      weightedSum += v.score * weight;
      totalWeight += weight;
    }

    const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

    // Collect critical issues (from FAIL verdicts)
    const criticalIssues: string[] = [];
    for (const v of this.phaseVerdicts) {
      if (v.verdict === 'FAIL') {
        for (const issue of v.issues) {
          criticalIssues.push(`[Phase ${v.phase}] ${issue}`);
        }
      }
    }

    // Determine overall verdict
    let overallVerdict: 'PASS' | 'FAIL' | 'REVIEW';
    if (overallScore >= this.config.passThreshold) {
      overallVerdict = 'PASS';
    } else if (overallScore >= this.config.reviewThreshold) {
      overallVerdict = 'REVIEW';
    } else {
      overallVerdict = 'FAIL';
    }

    // If any phase FAILed, overall cannot be PASS
    if (this.phaseVerdicts.some((v) => v.verdict === 'FAIL') && overallVerdict === 'PASS') {
      overallVerdict = 'REVIEW';
    }

    const phaseList = this.phaseVerdicts
      .map((v) => `${v.phase}:${v.verdict}(${v.score})`)
      .join(', ');
    const summary = `Werdykt misji: ${overallVerdict} (${overallScore}/100). Fazy: ${phaseList}.${criticalIssues.length > 0 ? ` Krytyczne problemy: ${criticalIssues.length}.` : ''}`;

    return {
      overallScore,
      overallVerdict,
      phaseVerdicts: [...this.phaseVerdicts],
      criticalIssues,
      summary,
      timestamp: now,
    };
  }

  /**
   * Check if pipeline should continue after a phase verdict.
   */
  shouldContinue(verdict: PhaseVerdict): boolean {
    if (verdict.verdict === 'FAIL') return false;
    if (verdict.verdict === 'REVIEW' && this.config.failOnReview) return false;
    return true;
  }

  /** Reset verdicts for new execution */
  reset(): void {
    this.phaseVerdicts = [];
  }

  /** Get current phase verdicts */
  getPhaseVerdicts(): readonly PhaseVerdict[] {
    return this.phaseVerdicts;
  }

  /** Get config */
  getConfig(): Readonly<VerificationConfig> {
    return this.config;
  }

  private logVerdict(verdict: PhaseVerdict): void {
    const logger = getLogger();
    const icon = verdict.verdict === 'PASS' ? '✅' : verdict.verdict === 'FAIL' ? '❌' : '⚠️';
    const level =
      verdict.verdict === 'FAIL' ? 'error' : verdict.verdict === 'REVIEW' ? 'warn' : 'info';

    logger.system(
      `[Keira] Phase ${verdict.phase}: ${icon} ${verdict.verdict} (${verdict.score}/100) [${verdict.verificationTimeMs}ms]`,
      level as 'info' | 'error' | 'warn',
    );

    if (this.config.verbose && verdict.issues.length > 0) {
      for (const issue of verdict.issues) {
        logger.system(`  → Problem: ${issue}`, 'warn');
      }
    }
  }
}

// ============================================================================
// PROMPT BUILDERS
// ============================================================================

function buildPhaseAPrompt(plan: VerifiablePlan, objective: string): string {
  const taskCount = plan.tasks?.length ?? 0;
  const agents = plan.tasks?.map((t) => t.agent).filter(Boolean) ?? [];
  const uniqueAgents = [...new Set(agents)];
  const invalidAgents = uniqueAgents.filter((a) => !VALID_AGENTS.includes(a as string));

  const hasDeps = plan.tasks?.some((t) => t.dependencies && t.dependencies.length > 0) ?? false;

  return `WERYFIKACJA PHASE A — PLAN DIJKSTRY

ORYGINALNY CEL: ${objective}

PLAN DO WERYFIKACJI:
- Liczba zadań: ${taskCount}
- Unikalni agenci: ${uniqueAgents.join(', ') || 'BRAK'}
- Nieprawidłowi agenci: ${invalidAgents.length > 0 ? invalidAgents.join(', ') : 'BRAK'}
- Czy plan ma zależności (DAG): ${hasDeps ? 'TAK' : 'NIE'}
- Struktura planu: ${JSON.stringify(plan.tasks?.slice(0, 5), null, 2) ?? 'BRAK ZADAŃ'}

KRYTERIA WERYFIKACJI:
1. Czy plan ma tablicę tasks z poprawnymi polami (id, description, agent)?
2. Czy agenci są z listy dozwolonych: ${VALID_AGENTS.join(', ')}?
3. Czy przypisania agentów pasują do typów zadań?
4. Czy plan pokrywa oryginalny cel?
5. Czy zależności tworzą poprawny DAG (brak cykli)?

Odpowiedz WYŁĄCZNIE w formacie JSON:
{"score": 0-100, "verdict": "PASS|FAIL|REVIEW", "issues": ["..."], "strengths": ["..."], "recommendations": ["..."]}`;
}

function buildPhaseBPrompt(
  results: ExecutionResult[],
  plan: VerifiablePlan,
  objective: string,
): string {
  const total = results.length;
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 0;

  const emptyResults = results.filter(
    (r) => r.success && (!r.content || r.content.trim().length < 20),
  ).length;

  const resultsSummary = results
    .slice(0, 10)
    .map(
      (r) =>
        `[Task ${r.id}] ${r.agent ?? 'unknown'}: ${r.success ? 'OK' : 'FAIL'} - ${(r.content ?? r.error ?? '').slice(0, 100)}`,
    )
    .join('\n');

  return `WERYFIKACJA PHASE B — WYNIKI WYKONANIA

ORYGINALNY CEL: ${objective}
PLAN MIAŁ ${plan.tasks?.length ?? 0} ZADAŃ.

STATYSTYKI WYKONANIA:
- Łącznie: ${total}, Sukces: ${successful}, Porażka: ${failed}
- Success rate: ${successRate}%
- Puste/zbyt krótkie odpowiedzi (wśród sukcesów): ${emptyResults}

PRÓBKA WYNIKÓW:
${resultsSummary}

KRYTERIA WERYFIKACJI:
1. Czy success rate jest akceptowalny (>70% = dobry, 40-70% = do przeglądu, <40% = fail)?
2. Czy wyniki mają substancjalną treść (nie są puste/ogólnikowe)?
3. Czy brak markerów halucynacji (wymyślone pliki, ogólnikowe nazwy)?
4. Czy wyniki referencują konkretne pliki/ścieżki gdy wymagane?
5. Czy wyniki pokrywają oryginalny cel?

Odpowiedz WYŁĄCZNIE w formacie JSON:
{"score": 0-100, "verdict": "PASS|FAIL|REVIEW", "issues": ["..."], "strengths": ["..."], "recommendations": ["..."]}`;
}

function buildPhaseCPrompt(
  healingResult: HealingResult,
  originalResults: ExecutionResult[],
  objective: string,
): string {
  const originalSuccessRate =
    healingResult.successRateBefore ??
    (originalResults.length > 0
      ? Math.round((originalResults.filter((r) => r.success).length / originalResults.length) * 100)
      : 0);

  return `WERYFIKACJA PHASE C — SELF-HEALING

ORYGINALNY CEL: ${objective}

RAPORT NAPRAW:
- Cykle napraw: ${healingResult.repairCycles}
- Naprawione zadania: ${healingResult.repairedTasks}
- Success rate PRZED: ${originalSuccessRate}%
- Success rate PO: ${healingResult.successRateAfter ?? 'nieznany'}%
- Wyciągnięte wnioski: ${healingResult.lessonsLearned?.join('; ') ?? 'BRAK'}

KRYTERIA WERYFIKACJI:
1. Czy naprawy poprawiły success rate?
2. Czy wyciągnięte wnioski są konkretne i przydatne?
3. Czy nie wystąpiła nieskończona pętla napraw?
4. Czy Phase C była potrzebna (czy Phase B miał problemy)?

Odpowiedz WYŁĄCZNIE w formacie JSON:
{"score": 0-100, "verdict": "PASS|FAIL|REVIEW", "issues": ["..."], "strengths": ["..."], "recommendations": ["..."]}`;
}

function buildPhaseDPrompt(
  synthesis: string,
  results: ExecutionResult[],
  objective: string,
): string {
  const synthesisLength = synthesis.length;
  const successfulResults = results.filter((r) => r.success).length;
  const synthesisPreview = synthesis.slice(0, 1500);

  return `WERYFIKACJA PHASE D — SYNTEZA KOŃCOWA

ORYGINALNY CEL: ${objective}

STATYSTYKI:
- Długość syntezy: ${synthesisLength} znaków
- Zadań zakończonych sukcesem: ${successfulResults}/${results.length}

SYNTEZA (preview):
${synthesisPreview}
${synthesis.length > 1500 ? '\n[... obcięto ...]' : ''}

KRYTERIA WERYFIKACJI:
1. Czy synteza jest spójna wewnętrznie?
2. Czy odpowiada na oryginalny cel?
3. Czy brak oznak halucynacji (wymyślone pliki, brak dowodów)?
4. Czy cytuje wyniki zadań lub podaje źródła?
5. Czy format jest poprawny i czytelny?
6. Czy nie zawiera placeholderów (TODO, FIXME, TBD)?

Odpowiedz WYŁĄCZNIE w formacie JSON:
{"score": 0-100, "verdict": "PASS|FAIL|REVIEW", "issues": ["..."], "strengths": ["..."], "recommendations": ["..."]}`;
}

// ============================================================================
// RESPONSE PARSER
// ============================================================================

interface RawVerdict {
  score?: number;
  verdict?: string;
  issues?: string[];
  strengths?: string[];
  recommendations?: string[];
}

function parseVerdict(
  rawResponse: string,
  phase: 'A' | 'B' | 'C' | 'D',
  startTime: number,
  config: VerificationConfig,
): PhaseVerdict {
  const verificationTimeMs = Date.now() - startTime;

  try {
    const jsonStr = cleanJson(rawResponse);
    const parsed: RawVerdict = JSON.parse(jsonStr);

    const score = typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : 50;

    let verdict: 'PASS' | 'FAIL' | 'REVIEW';
    if (parsed.verdict === 'PASS' || parsed.verdict === 'FAIL' || parsed.verdict === 'REVIEW') {
      verdict = parsed.verdict;
    } else {
      // Derive from score
      if (score >= config.passThreshold) verdict = 'PASS';
      else if (score >= config.reviewThreshold) verdict = 'REVIEW';
      else verdict = 'FAIL';
    }

    return {
      phase,
      score,
      verdict,
      issues: Array.isArray(parsed.issues) ? parsed.issues.map(String) : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.map(String)
        : [],
      timestamp: Date.now(),
      verificationTimeMs,
    };
  } catch {
    // Heuristic fallback: search for keywords in raw response
    return createFallbackVerdict(
      phase,
      startTime,
      'Failed to parse JSON verdict from agent response',
    );
  }
}

function createFallbackVerdict(
  phase: 'A' | 'B' | 'C' | 'D',
  startTime: number,
  reason: string,
): PhaseVerdict {
  return {
    phase,
    score: 50,
    verdict: 'REVIEW',
    issues: [reason],
    strengths: [],
    recommendations: ['Retry verification or inspect manually'],
    timestamp: Date.now(),
    verificationTimeMs: Date.now() - startTime,
  };
}

// ============================================================================
// SINGLETON & FACTORY
// ============================================================================

/** Default singleton instance */
export const verificationAgent = new VerificationAgent();

/** Factory for custom config */
export function createVerificationAgent(config?: Partial<VerificationConfig>): VerificationAgent {
  return new VerificationAgent(config);
}
