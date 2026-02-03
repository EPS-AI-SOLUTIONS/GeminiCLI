/**
 * MetaPrompting - Advanced prompt optimization and generation system
 *
 * Meta-prompting is a technique where AI analyzes and improves prompts
 * to achieve better results from language models.
 *
 * Features:
 * - Recursive meta-prompting (self-optimization)
 * - Prompt evolution with genetic algorithms
 * - A/B testing for prompt comparison
 * - Prompt compression without quality loss
 * - Domain-specific optimization
 * - Few-shot injection
 * - Template library
 *
 * This is the canonical implementation. Import from here or from '../MetaPrompting.js'
 */

import { generate, selectModel } from '../GeminiCLI.js';
import {
  FEW_SHOT_EXAMPLES,
  getFewShotExamples,
  mapTaskTypeToExampleCategory,
  getEnhancedFewShotExamples,
  EXTENDED_FEW_SHOT_EXAMPLES,
  selectBestExamples,
  getAgentSpecificExamples
} from '../PromptSystem.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { geminiSemaphore } from '../TrafficControl.js';
import { GEMINI_MODELS } from '../../config/models.config.js';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Interface representing the result of prompt optimization
 */
export interface PromptOptimization {
  /** The original prompt before optimization */
  originalPrompt: string;
  /** The optimized version of the prompt */
  optimizedPrompt: string;
  /** List of improvements made to the prompt */
  improvements: string[];
  /** Expected quality gain (0.0 - 1.0 scale) */
  expectedGain: number;
}

/**
 * Meta-prompting configuration options
 */
export interface MetaPromptingConfig {
  /** Model to use for meta-prompting operations */
  model?: string;
  /** Temperature for generation (lower = more deterministic) */
  temperature?: number;
  /** Language for prompts and responses */
  language?: 'pl' | 'en';
  /** Maximum tokens for responses */
  maxTokens?: number;
}

/**
 * Prompt evolution configuration
 */
export interface EvolutionConfig {
  /** Population size for genetic algorithm */
  populationSize: number;
  /** Number of generations to evolve */
  generations: number;
  /** Mutation rate (0.0 - 1.0) */
  mutationRate: number;
  /** Selection pressure (higher = more selective) */
  selectionPressure: number;
  /** Crossover rate (0.0 - 1.0) */
  crossoverRate: number;
  /** Elitism count - number of best individuals to keep */
  elitismCount: number;
}

/**
 * A/B test result interface
 */
export interface ABTestResult {
  /** Variant A prompt */
  variantA: string;
  /** Variant B prompt */
  variantB: string;
  /** Score for variant A (0.0 - 1.0) */
  scoreA: number;
  /** Score for variant B (0.0 - 1.0) */
  scoreB: number;
  /** Winner: 'A', 'B', or 'tie' */
  winner: 'A' | 'B' | 'tie';
  /** Statistical confidence (0.0 - 1.0) */
  confidence: number;
  /** Detailed comparison analysis */
  analysis: string;
  /** Recommendations for improvement */
  recommendations: string[];
}

/**
 * Prompt compression result
 */
export interface CompressionResult {
  /** Original prompt */
  originalPrompt: string;
  /** Compressed prompt */
  compressedPrompt: string;
  /** Compression ratio (original / compressed) */
  compressionRatio: number;
  /** Estimated semantic preservation (0.0 - 1.0) */
  semanticPreservation: number;
  /** Elements removed during compression */
  removedElements: string[];
  /** Original token count estimate */
  originalTokens: number;
  /** Compressed token count estimate */
  compressedTokens: number;
}

/**
 * Domain-specific optimization result
 */
export interface DomainOptimizationResult {
  /** Domain name */
  domain: string;
  /** Original prompt */
  originalPrompt: string;
  /** Domain-optimized prompt */
  optimizedPrompt: string;
  /** Domain-specific enhancements applied */
  enhancements: string[];
  /** Domain vocabulary injected */
  vocabularyInjected: string[];
  /** Expected domain relevance score */
  domainRelevance: number;
}

/**
 * Prompt template interface
 */
export interface PromptTemplate {
  /** Unique template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template category */
  category: TemplateCategory;
  /** Template description */
  description: string;
  /** Template string with {{placeholders}} */
  template: string;
  /** Required variables */
  requiredVars: string[];
  /** Optional variables with defaults */
  optionalVars: Record<string, string>;
  /** Tags for searchability */
  tags: string[];
  /** Usage examples */
  examples: Array<{ vars: Record<string, string>; result: string }>;
  /** Quality rating (0.0 - 1.0) */
  rating: number;
  /** Usage count */
  usageCount: number;
}

/**
 * Template categories
 */
export type TemplateCategory =
  | 'code_generation'
  | 'code_review'
  | 'debugging'
  | 'documentation'
  | 'architecture'
  | 'testing'
  | 'refactoring'
  | 'analysis'
  | 'creative'
  | 'planning'
  | 'data_processing'
  | 'custom';

/**
 * Individual in genetic algorithm population
 */
interface PromptIndividual {
  /** Prompt content */
  prompt: string;
  /** Fitness score (0.0 - 1.0) */
  fitness: number;
  /** Generation number */
  generation: number;
  /** Parent IDs for lineage tracking */
  parents: string[];
  /** Unique ID */
  id: string;
  /** Mutations applied */
  mutations: string[];
}

/**
 * Recursive optimization result
 */
export interface RecursiveOptimizationResult {
  /** Original prompt */
  originalPrompt: string;
  /** Final optimized prompt */
  finalPrompt: string;
  /** All iterations */
  iterations: Array<{
    iteration: number;
    prompt: string;
    score: number;
    improvements: string[];
  }>;
  /** Total improvement score */
  totalImprovement: number;
  /** Convergence reached */
  converged: boolean;
  /** Number of iterations performed */
  iterationsPerformed: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default configuration for MetaPrompter
 */
const DEFAULT_CONFIG: MetaPromptingConfig = {
  model: undefined, // Will use selectModel dynamically
  temperature: 0.4,
  language: 'pl',
  maxTokens: 4096
};

/**
 * Default evolution configuration
 */
const DEFAULT_EVOLUTION_CONFIG: EvolutionConfig = {
  populationSize: 8,
  generations: 5,
  mutationRate: 0.3,
  selectionPressure: 2.0,
  crossoverRate: 0.7,
  elitismCount: 2
};

// ============================================================================
// PROMPT TEMPLATE LIBRARY
// ============================================================================

/**
 * PromptTemplateLibrary - Collection of pre-built, tested prompt templates
 */
export class PromptTemplateLibrary {
  private templates: Map<string, PromptTemplate> = new Map();
  private customTemplates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.initializeBuiltInTemplates();
  }

  /**
   * Initialize built-in templates
   */
  private initializeBuiltInTemplates(): void {
    const builtInTemplates: PromptTemplate[] = [
      // Code Generation Templates
      {
        id: 'code-gen-function',
        name: 'Function Generator',
        category: 'code_generation',
        description: 'Generates a well-documented function with error handling',
        template: `Jestes ekspertem w jezyku {{language}}.

ZADANIE: Napisz funkcje {{functionName}} ktora:
{{requirements}}

WYMAGANIA:
- Pelna obsluga bledow z odpowiednimi komunikatami
- Dokumentacja JSDoc/docstring
- Typowanie (jesli jezyk wspiera)
- Testy jednostkowe (3-5 przypadkow)
{{#if additionalConstraints}}
- {{additionalConstraints}}
{{/if}}

FORMAT ODPOWIEDZI:
1. Kod funkcji
2. Komentarze wyjasniajace kluczowe decyzje
3. Przyklady uzycia
4. Testy jednostkowe`,
        requiredVars: ['language', 'functionName', 'requirements'],
        optionalVars: { additionalConstraints: '' },
        tags: ['code', 'function', 'generation'],
        examples: [
          {
            vars: {
              language: 'TypeScript',
              functionName: 'calculateDiscount',
              requirements: '- Przyjmuje cene i procent rabatu\n- Zwraca cene po rabacie\n- Waliduje zakres rabatu (0-100%)'
            },
            result: '// Generated function with full implementation...'
          }
        ],
        rating: 0.92,
        usageCount: 0
      },
      {
        id: 'code-gen-class',
        name: 'Class Generator',
        category: 'code_generation',
        description: 'Generates a well-structured class with SOLID principles',
        template: `Jestes architektem oprogramowania specjalizujacym sie w {{language}}.

ZADANIE: Zaprojektuj i zaimplementuj klase {{className}} odpowiedzialna za:
{{responsibility}}

WYMAGANIA PROJEKTOWE:
- Single Responsibility Principle
- Dependency Injection dla zaleznosci
- Interfejsy dla abstrakcji
- Immutability gdzie mozliwe
- Builder pattern jesli konstruktor ma wiele parametrow

STRUKTURA ODPOWIEDZI:
1. Interfejs/kontrakt klasy
2. Implementacja klasy
3. Fabryka/Builder (jesli potrzebne)
4. Testy jednostkowe
5. Przyklad uzycia`,
        requiredVars: ['language', 'className', 'responsibility'],
        optionalVars: {},
        tags: ['code', 'class', 'oop', 'solid'],
        examples: [],
        rating: 0.89,
        usageCount: 0
      },

      // Code Review Templates
      {
        id: 'code-review-security',
        name: 'Security Code Review',
        category: 'code_review',
        description: 'Security-focused code review template',
        template: `Jestes ekspertem od bezpieczenstwa aplikacji (AppSec).

KOD DO PRZEGLADU:
\`\`\`{{language}}
{{code}}
\`\`\`

PRZEPROWADZ AUDYT BEZPIECZENSTWA:

1. **OWASP Top 10** - Sprawdz pod katem:
   - Injection (SQL, NoSQL, Command, LDAP)
   - Broken Authentication
   - Sensitive Data Exposure
   - XML External Entities (XXE)
   - Broken Access Control
   - Security Misconfiguration
   - XSS (Cross-Site Scripting)
   - Insecure Deserialization
   - Using Components with Known Vulnerabilities
   - Insufficient Logging & Monitoring

2. **Analiza danych wejsciowych** - Walidacja, sanityzacja

3. **Kryptografia** - Uzycie bezpiecznych algorytmow

4. **Secrets management** - Hardcoded credentials

5. **Error handling** - Information leakage

FORMAT ODPOWIEDZI:
| Severity | Kategoria | Linia | Opis | Rekomendacja |
|----------|-----------|-------|------|--------------|
| CRITICAL/HIGH/MEDIUM/LOW | ... | ... | ... | ... |`,
        requiredVars: ['language', 'code'],
        optionalVars: {},
        tags: ['security', 'review', 'owasp', 'audit'],
        examples: [],
        rating: 0.95,
        usageCount: 0
      },
      {
        id: 'code-review-performance',
        name: 'Performance Code Review',
        category: 'code_review',
        description: 'Performance-focused code review template',
        template: `Jestes ekspertem od wydajnosci i optymalizacji kodu.

KOD DO ANALIZY:
\`\`\`{{language}}
{{code}}
\`\`\`

KONTEKST: {{context}}

PRZEPROWADZ ANALIZE WYDAJNOSCI:

1. **Zlozonosc algorytmiczna**
   - Zlozonosc czasowa (Big O)
   - Zlozonosc pamieciowa
   - Potencjalne waskie gardla

2. **Wzorce anty-wydajnosciowe**
   - N+1 queries
   - Nadmierna alokacja pamieci
   - Blocking operations w async code
   - Unnecessary object creation
   - String concatenation w petlach

3. **Mozliwosci optymalizacji**
   - Caching
   - Lazy loading
   - Batch processing
   - Parallel processing

4. **Metryki do zmierzenia**
   - Sugerowane benchmarki
   - KPIs wydajnosci

ODPOWIEDZ W FORMACIE:
## Podsumowanie
[1-2 zdania]

## Problemy wydajnosciowe
| Priorytet | Problem | Lokalizacja | Potencjalny zysk |
|-----------|---------|-------------|------------------|

## Rekomendowane optymalizacje
[Lista z kodem przed/po]`,
        requiredVars: ['language', 'code'],
        optionalVars: { context: 'Aplikacja webowa' },
        tags: ['performance', 'optimization', 'review'],
        examples: [],
        rating: 0.91,
        usageCount: 0
      },

      // Debugging Templates
      {
        id: 'debug-error-analysis',
        name: 'Error Analysis',
        category: 'debugging',
        description: 'Systematic error analysis and debugging template',
        template: `Jestes doswiadczonym debuggerem i detektywem kodu.

BLAD/PROBLEM:
{{errorDescription}}

STACK TRACE (jesli dostepny):
\`\`\`
{{stackTrace}}
\`\`\`

RELEVANTNY KOD:
\`\`\`{{language}}
{{code}}
\`\`\`

KONTEKST SRODOWISKA:
{{environment}}

PRZEPROWADZ SLEDZTWO:

1. **Analiza bledu**
   - Typ bledu i jego znaczenie
   - Bezposrednia przyczyna
   - Glowna przyczyna (root cause)

2. **Hipotezy**
   - Lista mozliwych przyczyn (ranking prawdopodobienstwa)
   - Jak zweryfikowac kazda hipoteze

3. **Kroki debugowania**
   - Konkretne akcje do wykonania
   - Breakpointy do ustawienia
   - Logi do dodania

4. **Rozwiazanie**
   - Kod naprawiajacy problem
   - Testy weryfikujace naprawe
   - Zapobieganie regresji`,
        requiredVars: ['errorDescription', 'language', 'code'],
        optionalVars: { stackTrace: 'Brak', environment: 'Development' },
        tags: ['debug', 'error', 'troubleshooting'],
        examples: [],
        rating: 0.93,
        usageCount: 0
      },

      // Architecture Templates
      {
        id: 'arch-system-design',
        name: 'System Design',
        category: 'architecture',
        description: 'System design and architecture template',
        template: `Jestes glownym architektem oprogramowania.

WYMAGANIA SYSTEMU:
{{requirements}}

OGRANICZENIA:
- Skala: {{scale}}
- Budzet: {{budget}}
- Zespol: {{teamSize}} osob
- Deadline: {{deadline}}

ZAPROJEKTUJ ARCHITEKTURE:

1. **High-Level Architecture**
   - Diagram komponentow (ASCII art)
   - Przeplywy danych
   - Integracje zewnetrzne

2. **Wybor technologii**
   | Warstwa | Technologia | Uzasadnienie |
   |---------|-------------|--------------|

3. **Skalowanie**
   - Horizontal vs Vertical scaling
   - Caching strategy
   - Database sharding/replication

4. **Bezpieczenstwo**
   - Authentication/Authorization
   - Data encryption
   - Network security

5. **Monitoring & Observability**
   - Metryki do sledzenia
   - Alerting rules
   - Logging strategy

6. **Disaster Recovery**
   - Backup strategy
   - RTO/RPO
   - Failover procedures

7. **Estymacja kosztow**
   | Komponent | Miesieczny koszt | Roczny koszt |
   |-----------|------------------|--------------|`,
        requiredVars: ['requirements', 'scale'],
        optionalVars: {
          budget: 'Nieograniczony',
          teamSize: '5',
          deadline: '6 miesiecy'
        },
        tags: ['architecture', 'system-design', 'planning'],
        examples: [],
        rating: 0.94,
        usageCount: 0
      },

      // Testing Templates
      {
        id: 'test-generation',
        name: 'Test Suite Generator',
        category: 'testing',
        description: 'Comprehensive test suite generation template',
        template: `Jestes ekspertem od testowania oprogramowania.

KOD DO PRZETESTOWANIA:
\`\`\`{{language}}
{{code}}
\`\`\`

WYGENERUJ KOMPLEKSOWY ZESTAW TESTOW:

1. **Testy jednostkowe**
   - Happy path (3-5 przypadkow)
   - Edge cases (5-10 przypadkow)
   - Error cases (3-5 przypadkow)

2. **Testy parametryczne**
   - Data-driven tests dla roznych wejsc

3. **Testy integracyjne** (jesli dotyczy)
   - Interakcje miedzy komponentami

4. **Testy wydajnosciowe** (jesli dotyczy)
   - Benchmark dla duzych danych

5. **Testy bezpieczenstwa** (jesli dotyczy)
   - Fuzzing inputs
   - Boundary testing

FRAMEWORK: {{testFramework}}

FORMAT ODPOWIEDZI:
- Pelny kod testow gotowy do uruchomienia
- Komentarze wyjasniajace kazdy przypadek testowy
- Setup/teardown jesli potrzebne`,
        requiredVars: ['language', 'code', 'testFramework'],
        optionalVars: {},
        tags: ['testing', 'unit-tests', 'quality'],
        examples: [],
        rating: 0.90,
        usageCount: 0
      },

      // Refactoring Templates
      {
        id: 'refactor-legacy',
        name: 'Legacy Code Refactoring',
        category: 'refactoring',
        description: 'Safe refactoring of legacy code',
        template: `Jestes specjalista od refaktoryzacji legacy code.

LEGACY KOD:
\`\`\`{{language}}
{{code}}
\`\`\`

PROBLEMY DO ROZWIAZANIA:
{{problems}}

OGRANICZENIA:
- Brak regresji funkcjonalnej
- Zachowanie API (backward compatibility)
- Mozliwosc refaktora w iteracjach

PRZEPROWADZ REFAKTORYZACJE:

1. **Analiza stanu obecnego**
   - Code smells
   - Technical debt
   - Coupling/Cohesion

2. **Plan refaktoryzacji**
   - Kolejnosc zmian (od najbezpieczniejszych)
   - Punkty kontrolne (checkpoints)
   - Testy zabezpieczajace

3. **Refaktoryzacja krok po kroku**
   - Krok 1: [opis] + kod
   - Krok 2: [opis] + kod
   - ...

4. **Kod koncowy**
   - Pelny zrefaktoryzowany kod
   - Dokumentacja zmian
   - Testy regresji`,
        requiredVars: ['language', 'code'],
        optionalVars: { problems: 'Ogolna poprawa jakosci kodu' },
        tags: ['refactoring', 'legacy', 'clean-code'],
        examples: [],
        rating: 0.88,
        usageCount: 0
      },

      // Documentation Templates
      {
        id: 'doc-api',
        name: 'API Documentation',
        category: 'documentation',
        description: 'Comprehensive API documentation generator',
        template: `Jestes technical writerem specjalizujacym sie w dokumentacji API.

KOD API:
\`\`\`{{language}}
{{code}}
\`\`\`

WYGENERUJ DOKUMENTACJE W FORMACIE {{format}}:

1. **Przeglad API**
   - Cel i zastosowanie
   - Uwierzytelnianie
   - Limity i rate limiting

2. **Endpointy**
   Dla kazdego endpointu:
   - Metoda HTTP + sciezka
   - Opis
   - Parametry (query, path, body)
   - Odpowiedzi (200, 400, 401, 500)
   - Przyklady curl/fetch

3. **Modele danych**
   - Schematy JSON
   - Walidacje
   - Przykladowe dane

4. **Przyklady uzycia**
   - Typowe scenariusze
   - Best practices
   - Czeste bledy

5. **Changelog** (jesli dotyczy)`,
        requiredVars: ['language', 'code'],
        optionalVars: { format: 'Markdown' },
        tags: ['documentation', 'api', 'swagger'],
        examples: [],
        rating: 0.87,
        usageCount: 0
      },

      // Data Processing Templates
      {
        id: 'data-pipeline',
        name: 'Data Pipeline Design',
        category: 'data_processing',
        description: 'Data pipeline and ETL design template',
        template: `Jestes data engineerem specjalizujacym sie w pipelinach danych.

ZRODLO DANYCH:
{{dataSource}}

CEL PRZETWARZANIA:
{{objective}}

WYMAGANIA:
- Wolumen: {{volume}}
- Czestotliwosc: {{frequency}}
- SLA: {{sla}}

ZAPROJEKTUJ PIPELINE:

1. **Architektura**
   - Diagram przeplywu danych (ASCII)
   - Komponenty i ich odpowiedzialnosci

2. **Extract**
   - Zrodla danych
   - Metody ekstrakcji
   - Harmonogram

3. **Transform**
   - Reguly czyszczenia
   - Transformacje
   - Walidacje
   - Obsluga bledow

4. **Load**
   - Cel (warehouse, lake, mart)
   - Strategia ladowania (full, incremental, CDC)
   - Indeksy i partycjonowanie

5. **Monitoring**
   - Data quality checks
   - Alerting
   - Metryki SLA

6. **Implementacja**
   \`\`\`{{language}}
   [Kod pipeline'u]
   \`\`\``,
        requiredVars: ['dataSource', 'objective', 'language'],
        optionalVars: {
          volume: 'Sredni (GB/dzien)',
          frequency: 'Dzienny',
          sla: '99.9%'
        },
        tags: ['data', 'etl', 'pipeline', 'engineering'],
        examples: [],
        rating: 0.86,
        usageCount: 0
      },

      // Planning Templates
      {
        id: 'plan-sprint',
        name: 'Sprint Planning',
        category: 'planning',
        description: 'Sprint planning and task breakdown template',
        template: `Jestes doswiadczonym Scrum Masterem/Tech Leadem.

CEL SPRINTU:
{{sprintGoal}}

DOSTEPNY ZESPOL:
{{team}}

CZAS TRWANIA: {{duration}}

BACKLOG ITEMS:
{{backlogItems}}

PRZEPROWADZ PLANOWANIE:

1. **Analiza backloga**
   - Priorytetyzacja (MoSCoW)
   - Zaleznosci miedzy zadaniami
   - Ryzyka

2. **Podzial na zadania**
   | User Story | Task | Estymacja (h) | Assignee | Zaleznosci |
   |------------|------|---------------|----------|------------|

3. **Capacity planning**
   - Dostepnosc zespolu
   - Buffer na niespodzianki (20%)
   - Realistyczny commitment

4. **Definition of Done**
   - Kryteria akceptacji
   - Checklist techniczny

5. **Sprint timeline**
   - Daily milestones
   - Review/Retro terminy

6. **Ryzyka i mitygacje**
   | Ryzyko | Prawdopodobienstwo | Impact | Mitygacja |
   |--------|-------------------|--------|-----------|`,
        requiredVars: ['sprintGoal', 'backlogItems'],
        optionalVars: {
          team: '5 developerow',
          duration: '2 tygodnie'
        },
        tags: ['planning', 'sprint', 'agile', 'scrum'],
        examples: [],
        rating: 0.85,
        usageCount: 0
      }
    ];

    // Register all built-in templates
    for (const template of builtInTemplates) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get a template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id) || this.customTemplates.get(id);
  }

  /**
   * Get all templates in a category
   */
  getTemplatesByCategory(category: TemplateCategory): PromptTemplate[] {
    const results: PromptTemplate[] = [];

    for (const template of this.templates.values()) {
      if (template.category === category) {
        results.push(template);
      }
    }

    for (const template of this.customTemplates.values()) {
      if (template.category === category) {
        results.push(template);
      }
    }

    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Search templates by tags
   */
  searchByTags(tags: string[]): PromptTemplate[] {
    const results: PromptTemplate[] = [];
    const tagSet = new Set(tags.map(t => t.toLowerCase()));

    const allTemplates = [...this.templates.values(), ...this.customTemplates.values()];

    for (const template of allTemplates) {
      const matchCount = template.tags.filter(t => tagSet.has(t.toLowerCase())).length;
      if (matchCount > 0) {
        results.push({ ...template, rating: template.rating * (matchCount / tags.length) });
      }
    }

    return results.sort((a, b) => b.rating - a.rating);
  }

  /**
   * Apply a template with variables
   */
  applyTemplate(id: string, variables: Record<string, string>): string {
    const template = this.getTemplate(id);
    if (!template) {
      throw new Error(`Template not found: ${id}`);
    }

    // Check required variables
    for (const reqVar of template.requiredVars) {
      if (!(reqVar in variables)) {
        throw new Error(`Missing required variable: ${reqVar}`);
      }
    }

    // Merge with defaults
    const allVars = { ...template.optionalVars, ...variables };

    // Apply template
    let result = template.template;

    // Handle conditional blocks {{#if var}}...{{/if}}
    result = result.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, varName, content) => {
      return allVars[varName] && allVars[varName].trim() ? content : '';
    });

    // Replace variables
    for (const [key, value] of Object.entries(allVars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    // Update usage count
    template.usageCount++;

    return result;
  }

  /**
   * Add a custom template
   */
  addCustomTemplate(template: Omit<PromptTemplate, 'usageCount'>): void {
    const fullTemplate: PromptTemplate = {
      ...template,
      usageCount: 0
    };
    this.customTemplates.set(template.id, fullTemplate);
  }

  /**
   * List all templates
   */
  listTemplates(): Array<{ id: string; name: string; category: TemplateCategory; rating: number }> {
    const allTemplates = [...this.templates.values(), ...this.customTemplates.values()];
    return allTemplates.map(t => ({
      id: t.id,
      name: t.name,
      category: t.category,
      rating: t.rating
    }));
  }

  /**
   * Get template statistics
   */
  getStats(): { totalTemplates: number; byCategory: Record<string, number>; mostUsed: string[] } {
    const allTemplates = [...this.templates.values(), ...this.customTemplates.values()];
    const byCategory: Record<string, number> = {};

    for (const t of allTemplates) {
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
    }

    const mostUsed = [...allTemplates]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
      .map(t => t.id);

    return {
      totalTemplates: allTemplates.length,
      byCategory,
      mostUsed
    };
  }
}

// ============================================================================
// BASE META PROMPTER
// ============================================================================

/**
 * MetaPrompter - Class for advanced prompt engineering through AI
 *
 * This class uses AI to analyze, optimize, and generate prompts,
 * implementing meta-prompting techniques for improved LLM interactions.
 */
export class MetaPrompter {
  protected config: MetaPromptingConfig;

  constructor(config: Partial<MetaPromptingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Optimize an existing prompt based on context
   * Analyzes the prompt structure, clarity, and specificity,
   * then generates an improved version.
   *
   * @param prompt - The original prompt to optimize
   * @param context - Additional context about the task or domain
   * @returns Promise with optimization results including improvements made
   */
  async optimizePrompt(prompt: string, context: string): Promise<PromptOptimization> {
    const model = this.config.model || selectModel('analysis');
    const isPolish = this.config.language === 'pl';

    const metaPrompt = isPolish
      ? `Jestes ekspertem w inzynierii promptow (prompt engineering).

ZADANIE: Przeanalizuj i ulepsz ponizszy prompt, aby uzyskac lepsze wyniki z modeli jezykowych.

ORYGINALNY PROMPT:
"""
${prompt}
"""

KONTEKST ZADANIA:
${context || 'Brak dodatkowego kontekstu'}

ZASADY OPTYMALIZACJI:
1. Dodaj jasne instrukcje strukturalne
2. Usun niejednoznacznosci
3. Dodaj format oczekiwanej odpowiedzi
4. Uwzglednij edge cases
5. Uzyj technik Chain-of-Thought jesli stosowne
6. Zachowaj oryginalny cel prompta

ZWROC ODPOWIEDZ W FORMACIE JSON:
{
  "optimizedPrompt": "ulepszona wersja prompta",
  "improvements": ["lista ulepszen wprowadzonych"],
  "expectedGain": 0.0-1.0
}

Zwroc TYLKO JSON, bez dodatkowych komentarzy.`
      : `You are an expert in prompt engineering.

TASK: Analyze and improve the following prompt to achieve better results from language models.

ORIGINAL PROMPT:
"""
${prompt}
"""

TASK CONTEXT:
${context || 'No additional context provided'}

OPTIMIZATION RULES:
1. Add clear structural instructions
2. Remove ambiguities
3. Add expected response format
4. Consider edge cases
5. Use Chain-of-Thought techniques if appropriate
6. Preserve the original intent of the prompt

RETURN RESPONSE IN JSON FORMAT:
{
  "optimizedPrompt": "improved version of the prompt",
  "improvements": ["list of improvements made"],
  "expectedGain": 0.0-1.0
}

Return ONLY JSON, no additional comments.`;

    try {
      const response = await generate(metaPrompt, {
        model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format - no JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        originalPrompt: prompt,
        optimizedPrompt: parsed.optimizedPrompt || prompt,
        improvements: parsed.improvements || [],
        expectedGain: Math.max(0, Math.min(1, parsed.expectedGain || 0.5))
      };
    } catch (error) {
      console.error('[MetaPrompter] Optimization failed:', error);
      // Return original prompt on error
      return {
        originalPrompt: prompt,
        optimizedPrompt: prompt,
        improvements: [],
        expectedGain: 0
      };
    }
  }

  /**
   * Generate an optimal prompt for a given task description
   * Creates a well-structured prompt from scratch based on task requirements.
   *
   * @param taskDescription - Description of what the prompt should accomplish
   * @returns Promise with the generated optimal prompt
   */
  async generatePromptForTask(taskDescription: string): Promise<string> {
    const model = this.config.model || selectModel('creative');
    const isPolish = this.config.language === 'pl';

    const metaPrompt = isPolish
      ? `Jestes ekspertem w tworzeniu promptow dla modeli jezykowych AI.

OPIS ZADANIA:
${taskDescription}

WYGENERUJ OPTYMALNY PROMPT, ktory:
1. Jest jasny i precyzyjny
2. Zawiera kontekst potrzebny do wykonania zadania
3. Okresla oczekiwany format odpowiedzi
4. Uzywa technik prompt engineering (few-shot, CoT, role-playing)
5. Uwzglednia potencjalne edge cases
6. Jest napisany w jezyku polskim

TECHNIKI DO ROZWAZENIA:
- Role-playing: "Jestes ekspertem w..."
- Chain-of-Thought: "Przeanalizuj krok po kroku..."
- Few-shot: Daj przyklady oczekiwanego wyniku
- Structured output: Zdefiniuj format odpowiedzi
- Constraints: Okresl ograniczenia i zasady

ZWROC TYLKO WYGENEROWANY PROMPT (bez dodatkowych komentarzy):`
      : `You are an expert in creating prompts for AI language models.

TASK DESCRIPTION:
${taskDescription}

GENERATE AN OPTIMAL PROMPT that:
1. Is clear and precise
2. Contains context needed for the task
3. Specifies expected response format
4. Uses prompt engineering techniques (few-shot, CoT, role-playing)
5. Considers potential edge cases
6. Is written in English

TECHNIQUES TO CONSIDER:
- Role-playing: "You are an expert in..."
- Chain-of-Thought: "Analyze step by step..."
- Few-shot: Provide examples of expected output
- Structured output: Define response format
- Constraints: Specify limitations and rules

RETURN ONLY THE GENERATED PROMPT (no additional comments):`;

    try {
      const response = await generate(metaPrompt, {
        model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      return response.trim();
    } catch (error) {
      console.error('[MetaPrompter] Prompt generation failed:', error);
      // Return a basic prompt on error
      return isPolish
        ? `Wykonaj nastepujace zadanie:\n\n${taskDescription}\n\nOdpowiedz szczegolowo i precyzyjnie.`
        : `Complete the following task:\n\n${taskDescription}\n\nRespond with detailed and precise output.`;
    }
  }

  /**
   * Analyze weaknesses in a prompt
   * Identifies potential issues that could lead to poor LLM responses.
   *
   * @param prompt - The prompt to analyze
   * @returns Promise with list of identified weaknesses
   */
  async analyzePromptWeaknesses(prompt: string): Promise<string[]> {
    const model = this.config.model || selectModel('analysis');
    const isPolish = this.config.language === 'pl';

    const metaPrompt = isPolish
      ? `Jestes ekspertem w analizie promptow dla modeli jezykowych.

PROMPT DO ANALIZY:
"""
${prompt}
"""

ZNAJDZ SLABOSCI tego prompta, uwzgledniajac:
1. Niejednoznacznosc - czy instrukcje sa jasne?
2. Brak kontekstu - czy model ma wystarczajace informacje?
3. Niejasny format - czy oczekiwany wynik jest okreslony?
4. Zbyt ogolne instrukcje - czy zadanie jest konkretne?
5. Brak przykladow - czy przyklady poprawilyby zrozumienie?
6. Problemy jezykowe - czy sformulowania sa precyzyjne?
7. Brak ograniczen - czy sa jasne granice?
8. Potencjalne halucynacje - czy cos moze prowadzic do nieprawdziwych odpowiedzi?
9. Brak Chain-of-Thought - czy rozumowanie powinno byc jawne?
10. Konflikt instrukcji - czy instrukcje sie nie wykluczaja?

ZWROC ODPOWIEDZ W FORMACIE JSON:
{
  "weaknesses": ["lista slabosci ze szczegolowymi opisami"]
}

Zwroc TYLKO JSON, bez dodatkowych komentarzy.`
      : `You are an expert in analyzing prompts for language models.

PROMPT TO ANALYZE:
"""
${prompt}
"""

FIND WEAKNESSES in this prompt, considering:
1. Ambiguity - are instructions clear?
2. Lack of context - does the model have enough information?
3. Unclear format - is expected output specified?
4. Too general instructions - is the task specific?
5. Lack of examples - would examples improve understanding?
6. Language issues - are formulations precise?
7. Missing constraints - are there clear boundaries?
8. Potential hallucinations - could something lead to false responses?
9. Missing Chain-of-Thought - should reasoning be explicit?
10. Conflicting instructions - do any instructions contradict each other?

RETURN RESPONSE IN JSON FORMAT:
{
  "weaknesses": ["list of weaknesses with detailed descriptions"]
}

Return ONLY JSON, no additional comments.`;

    try {
      const response = await generate(metaPrompt, {
        model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      // Parse JSON response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format - no JSON found');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.weaknesses || [];
    } catch (error) {
      console.error('[MetaPrompter] Weakness analysis failed:', error);
      return [];
    }
  }

  /**
   * Combine multiple prompts into a single optimized prompt
   * Takes the best elements from each prompt and creates a unified version.
   *
   * @param prompts - Array of prompts to combine
   * @returns Promise with the combined optimal prompt
   */
  async combinePrompts(prompts: string[]): Promise<string> {
    if (prompts.length === 0) {
      return '';
    }

    if (prompts.length === 1) {
      return prompts[0];
    }

    const model = this.config.model || selectModel('creative');
    const isPolish = this.config.language === 'pl';

    const promptsList = prompts.map((p, i) => `PROMPT ${i + 1}:\n"""\n${p}\n"""`).join('\n\n');

    const metaPrompt = isPolish
      ? `Jestes ekspertem w inzynierii promptow.

ZADANIE: Polacz ponizsze prompty w jeden optymalny prompt, biorac najlepsze elementy z kazdego.

${promptsList}

ZASADY LACZENIA:
1. Zidentyfikuj wspolny cel wszystkich promptow
2. Wybierz najlepsze sformulowania z kazdego
3. Usun redundancje i sprzecznosci
4. Zachowaj unikalne wartosciowe elementy
5. Utworz spojny, dobrze zorganizowany prompt
6. Dodaj brakujace elementy (format, przyklady) jesli potrzebne

KRYTERIA WYBORU NAJLEPSZYCH ELEMENTOW:
- Jasnosc i precyzja instrukcji
- Konkretnosc zadan
- Kompletnosc kontekstu
- Okreslony format wyjscia
- Przyklady i ograniczenia

ZWROC TYLKO POLACZONY PROMPT (bez dodatkowych komentarzy):`
      : `You are an expert in prompt engineering.

TASK: Combine the following prompts into a single optimal prompt, taking the best elements from each.

${promptsList}

COMBINATION RULES:
1. Identify common goal of all prompts
2. Select best formulations from each
3. Remove redundancies and contradictions
4. Keep unique valuable elements
5. Create a coherent, well-organized prompt
6. Add missing elements (format, examples) if needed

CRITERIA FOR SELECTING BEST ELEMENTS:
- Clarity and precision of instructions
- Specificity of tasks
- Completeness of context
- Defined output format
- Examples and constraints

RETURN ONLY THE COMBINED PROMPT (no additional comments):`;

    try {
      const response = await generate(metaPrompt, {
        model,
        temperature: this.config.temperature,
        maxTokens: this.config.maxTokens
      });

      return response.trim();
    } catch (error) {
      console.error('[MetaPrompter] Prompt combination failed:', error);
      // Return concatenated prompts on error
      return prompts.join('\n\n---\n\n');
    }
  }

  /**
   * Update configuration
   * @param config - Partial configuration to merge
   */
  updateConfig(config: Partial<MetaPromptingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): MetaPromptingConfig {
    return { ...this.config };
  }
}

// ============================================================================
// ADVANCED META PROMPTER
// ============================================================================

/**
 * AdvancedMetaPrompter - Extended MetaPrompter with advanced features
 *
 * Features:
 * - Recursive meta-prompting (self-optimization)
 * - Prompt evolution with genetic algorithms
 * - A/B testing for prompt comparison
 * - Prompt compression
 * - Domain-specific optimization
 * - Few-shot injection
 */
export class AdvancedMetaPrompter extends MetaPrompter {
  private templateLibrary: PromptTemplateLibrary;
  private evolutionConfig: EvolutionConfig;

  constructor(
    config: Partial<MetaPromptingConfig> = {},
    evolutionConfig: Partial<EvolutionConfig> = {}
  ) {
    super(config);
    this.templateLibrary = new PromptTemplateLibrary();
    this.evolutionConfig = { ...DEFAULT_EVOLUTION_CONFIG, ...evolutionConfig };
  }

  // ==========================================================================
  // RECURSIVE META-PROMPTING
  // ==========================================================================

  /**
   * Recursively optimize a prompt until convergence or max iterations
   * The prompt optimizes itself iteratively, each iteration improving on the previous
   *
   * @param prompt - Initial prompt to optimize
   * @param context - Task context
   * @param maxIterations - Maximum optimization iterations (default: 5)
   * @param convergenceThreshold - Stop if improvement < threshold (default: 0.05)
   */
  async recursiveOptimize(
    prompt: string,
    context: string,
    maxIterations: number = 5,
    convergenceThreshold: number = 0.05
  ): Promise<RecursiveOptimizationResult> {
    const iterations: RecursiveOptimizationResult['iterations'] = [];
    let currentPrompt = prompt;
    let previousScore = 0;
    let converged = false;

    // Score the initial prompt
    const initialScore = await this.scorePrompt(prompt, context);
    iterations.push({
      iteration: 0,
      prompt: prompt,
      score: initialScore,
      improvements: ['Initial prompt']
    });
    previousScore = initialScore;

    for (let i = 1; i <= maxIterations; i++) {
      // Optimize current prompt
      const optimization = await this.optimizePrompt(currentPrompt, context);

      // Score the optimized prompt
      const newScore = await this.scorePrompt(optimization.optimizedPrompt, context);

      iterations.push({
        iteration: i,
        prompt: optimization.optimizedPrompt,
        score: newScore,
        improvements: optimization.improvements
      });

      // Check for convergence
      const improvement = newScore - previousScore;
      if (improvement < convergenceThreshold) {
        converged = true;
        break;
      }

      currentPrompt = optimization.optimizedPrompt;
      previousScore = newScore;
    }

    const finalIteration = iterations[iterations.length - 1];

    return {
      originalPrompt: prompt,
      finalPrompt: finalIteration.prompt,
      iterations,
      totalImprovement: finalIteration.score - initialScore,
      converged,
      iterationsPerformed: iterations.length - 1
    };
  }

  /**
   * Score a prompt based on quality criteria
   */
  private async scorePrompt(prompt: string, context: string): Promise<number> {
    const model = this.config.model || selectModel('analysis');
    const isPolish = this.config.language === 'pl';

    const scoringPrompt = isPolish
      ? `Ocen jakosc ponizszego prompta w skali 0.0 - 1.0.

PROMPT:
"""
${prompt}
"""

KONTEKST UZYCIA:
${context}

KRYTERIA OCENY (kazde 0-1, srednia = wynik koncowy):
1. Jasnosc instrukcji
2. Kompletnosc kontekstu
3. Precyzja formatu wyjscia
4. Obsluga edge cases
5. Efektywnosc (brak zbednych slow)
6. Struktura i organizacja
7. Potencjal do dobrych odpowiedzi

ZWROC TYLKO JSON:
{"score": 0.XX, "breakdown": {"clarity": 0.X, "context": 0.X, "format": 0.X, "edgeCases": 0.X, "efficiency": 0.X, "structure": 0.X, "potential": 0.X}}`
      : `Rate the quality of the following prompt on a scale of 0.0 - 1.0.

PROMPT:
"""
${prompt}
"""

USAGE CONTEXT:
${context}

SCORING CRITERIA (each 0-1, average = final score):
1. Clarity of instructions
2. Completeness of context
3. Precision of output format
4. Edge case handling
5. Efficiency (no unnecessary words)
6. Structure and organization
7. Potential for good responses

RETURN ONLY JSON:
{"score": 0.XX, "breakdown": {"clarity": 0.X, "context": 0.X, "format": 0.X, "edgeCases": 0.X, "efficiency": 0.X, "structure": 0.X, "potential": 0.X}}`;

    try {
      const response = await generate(scoringPrompt, {
        model,
        temperature: 0.2, // Lower temperature for more consistent scoring
        maxTokens: 500
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return 0.5; // Default score
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return Math.max(0, Math.min(1, parsed.score || 0.5));
    } catch {
      return 0.5;
    }
  }

  // ==========================================================================
  // PROMPT EVOLUTION (Genetic Algorithm)
  // ==========================================================================

  /**
   * Evolve a prompt using genetic algorithm principles
   * Creates variations, scores them, and selects the best through generations
   *
   * @param prompt - Seed prompt to evolve
   * @param context - Task context for evaluation
   * @param config - Optional evolution configuration override
   */
  async evolvePrompt(
    prompt: string,
    context: string,
    config?: Partial<EvolutionConfig>
  ): Promise<{
    bestPrompt: string;
    bestFitness: number;
    generations: Array<{ generation: number; bestFitness: number; avgFitness: number }>;
    lineage: string[];
  }> {
    const evoConfig = { ...this.evolutionConfig, ...config };
    const generations: Array<{ generation: number; bestFitness: number; avgFitness: number }> = [];

    // Initialize population
    let population = await this.initializePopulation(prompt, context, evoConfig.populationSize);

    // Score initial population
    for (const individual of population) {
      individual.fitness = await this.scorePrompt(individual.prompt, context);
    }

    // Sort by fitness
    population.sort((a, b) => b.fitness - a.fitness);

    generations.push({
      generation: 0,
      bestFitness: population[0].fitness,
      avgFitness: population.reduce((sum, p) => sum + p.fitness, 0) / population.length
    });

    // Evolution loop
    for (let gen = 1; gen <= evoConfig.generations; gen++) {
      const newPopulation: PromptIndividual[] = [];

      // Elitism - keep best individuals
      for (let i = 0; i < evoConfig.elitismCount; i++) {
        newPopulation.push({ ...population[i], generation: gen });
      }

      // Fill rest of population
      while (newPopulation.length < evoConfig.populationSize) {
        // Selection (tournament)
        const parent1 = this.tournamentSelect(population, evoConfig.selectionPressure);
        const parent2 = this.tournamentSelect(population, evoConfig.selectionPressure);

        let offspring: PromptIndividual;

        // Crossover
        if (Math.random() < evoConfig.crossoverRate) {
          offspring = await this.crossover(parent1, parent2, gen);
        } else {
          offspring = { ...parent1, generation: gen, id: this.generateId() };
        }

        // Mutation
        if (Math.random() < evoConfig.mutationRate) {
          offspring = await this.mutate(offspring, context);
        }

        // Score offspring
        offspring.fitness = await this.scorePrompt(offspring.prompt, context);
        newPopulation.push(offspring);
      }

      population = newPopulation;
      population.sort((a, b) => b.fitness - a.fitness);

      generations.push({
        generation: gen,
        bestFitness: population[0].fitness,
        avgFitness: population.reduce((sum, p) => sum + p.fitness, 0) / population.length
      });
    }

    // Get best individual and its lineage
    const best = population[0];
    const lineage = this.traceLineage(best, population);

    return {
      bestPrompt: best.prompt,
      bestFitness: best.fitness,
      generations,
      lineage
    };
  }

  /**
   * Initialize population with variations of seed prompt
   */
  private async initializePopulation(
    seedPrompt: string,
    context: string,
    size: number
  ): Promise<PromptIndividual[]> {
    const population: PromptIndividual[] = [];

    // Add original prompt
    population.push({
      prompt: seedPrompt,
      fitness: 0,
      generation: 0,
      parents: [],
      id: this.generateId(),
      mutations: []
    });

    // Generate variations
    const variationPrompt = this.config.language === 'pl'
      ? `Wygeneruj ${size - 1} roznych wariantow ponizszego prompta.
Kazdy wariant powinien zachowac oryginalny cel, ale roznowac sie:
- Struktura
- Sformulowania
- Dodatkowe instrukcje
- Styl

ORYGINALNY PROMPT:
"""
${seedPrompt}
"""

KONTEKST: ${context}

ZWROC JSON:
{"variants": ["wariant1", "wariant2", ...]}`
      : `Generate ${size - 1} different variants of the following prompt.
Each variant should preserve the original goal but vary in:
- Structure
- Wording
- Additional instructions
- Style

ORIGINAL PROMPT:
"""
${seedPrompt}
"""

CONTEXT: ${context}

RETURN JSON:
{"variants": ["variant1", "variant2", ...]}`;

    try {
      const response = await generate(variationPrompt, {
        model: this.config.model || selectModel('creative'),
        temperature: 0.8,
        maxTokens: this.config.maxTokens
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const variants = parsed.variants || [];

        for (const variant of variants.slice(0, size - 1)) {
          population.push({
            prompt: variant,
            fitness: 0,
            generation: 0,
            parents: [population[0].id],
            id: this.generateId(),
            mutations: ['initial_variation']
          });
        }
      }
    } catch (error) {
      console.error('[AdvancedMetaPrompter] Population initialization failed:', error);
    }

    // Fill remaining slots with simple mutations if needed
    while (population.length < size) {
      const base = population[Math.floor(Math.random() * population.length)];
      population.push({
        prompt: this.simpleTextMutation(base.prompt),
        fitness: 0,
        generation: 0,
        parents: [base.id],
        id: this.generateId(),
        mutations: ['simple_mutation']
      });
    }

    return population;
  }

  /**
   * Tournament selection
   */
  private tournamentSelect(population: PromptIndividual[], pressure: number): PromptIndividual {
    const tournamentSize = Math.max(2, Math.floor(pressure));
    let best: PromptIndividual | null = null;

    for (let i = 0; i < tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      if (!best || candidate.fitness > best.fitness) {
        best = candidate;
      }
    }

    return best!;
  }

  /**
   * Crossover two prompts
   */
  private async crossover(
    parent1: PromptIndividual,
    parent2: PromptIndividual,
    generation: number
  ): Promise<PromptIndividual> {
    // Use AI to intelligently combine prompts
    const crossoverPrompt = this.config.language === 'pl'
      ? `Polacz te dwa prompty w jeden, biorac najlepsze elementy z kazdego:

PROMPT A:
"""
${parent1.prompt}
"""

PROMPT B:
"""
${parent2.prompt}
"""

Stworz nowy prompt ktory laczy mocne strony obu. ZWROC TYLKO nowy prompt, bez komentarzy.`
      : `Combine these two prompts into one, taking the best elements from each:

PROMPT A:
"""
${parent1.prompt}
"""

PROMPT B:
"""
${parent2.prompt}
"""

Create a new prompt that combines the strengths of both. RETURN ONLY the new prompt, no comments.`;

    try {
      const response = await generate(crossoverPrompt, {
        model: this.config.model || selectModel('creative'),
        temperature: 0.5,
        maxTokens: this.config.maxTokens
      });

      return {
        prompt: response.trim(),
        fitness: 0,
        generation,
        parents: [parent1.id, parent2.id],
        id: this.generateId(),
        mutations: ['crossover']
      };
    } catch {
      // Fallback to simple crossover
      const p1Parts = parent1.prompt.split('\n\n');
      const p2Parts = parent2.prompt.split('\n\n');
      const combined = p1Parts.map((part, i) =>
        Math.random() < 0.5 ? part : (p2Parts[i] || part)
      ).join('\n\n');

      return {
        prompt: combined,
        fitness: 0,
        generation,
        parents: [parent1.id, parent2.id],
        id: this.generateId(),
        mutations: ['simple_crossover']
      };
    }
  }

  /**
   * Mutate a prompt
   */
  private async mutate(
    individual: PromptIndividual,
    context: string
  ): Promise<PromptIndividual> {
    const mutationTypes = [
      'rephrase', 'add_constraint', 'add_example', 'restructure',
      'simplify', 'elaborate', 'change_format'
    ];
    const mutationType = mutationTypes[Math.floor(Math.random() * mutationTypes.length)];

    const mutationPrompt = this.config.language === 'pl'
      ? `Zmutuj (zmodyfikuj) ponizszy prompt stosujac operacje: ${mutationType}

PROMPT:
"""
${individual.prompt}
"""

KONTEKST: ${context}

OPERACJE MUTACJI:
- rephrase: Przeformuluj instrukcje innymi slowami
- add_constraint: Dodaj nowe ograniczenie lub regule
- add_example: Dodaj przyklad oczekiwanego wyniku
- restructure: Zmien strukture/kolejnosc sekcji
- simplify: Uprosci przekaz, usun zbedne elementy
- elaborate: Rozwin krotkie instrukcje
- change_format: Zmien format wyjscia (np. lista -> tabela)

ZWROC TYLKO zmutowany prompt, bez komentarzy.`
      : `Mutate (modify) the following prompt using operation: ${mutationType}

PROMPT:
"""
${individual.prompt}
"""

CONTEXT: ${context}

MUTATION OPERATIONS:
- rephrase: Rephrase instructions with different words
- add_constraint: Add a new constraint or rule
- add_example: Add an example of expected output
- restructure: Change structure/order of sections
- simplify: Simplify the message, remove unnecessary elements
- elaborate: Expand short instructions
- change_format: Change output format (e.g., list -> table)

RETURN ONLY the mutated prompt, no comments.`;

    try {
      const response = await generate(mutationPrompt, {
        model: this.config.model || selectModel('creative'),
        temperature: 0.7,
        maxTokens: this.config.maxTokens
      });

      return {
        prompt: response.trim(),
        fitness: 0,
        generation: individual.generation,
        parents: individual.parents,
        id: this.generateId(),
        mutations: [...individual.mutations, mutationType]
      };
    } catch {
      return {
        ...individual,
        prompt: this.simpleTextMutation(individual.prompt),
        mutations: [...individual.mutations, 'simple_text_mutation']
      };
    }
  }

  /**
   * Simple text-based mutation (fallback)
   */
  private simpleTextMutation(prompt: string): string {
    const mutations = [
      // Add emphasis
      (p: string) => p.replace(/(\w+)/i, '**$1**'),
      // Add instruction
      (p: string) => p + '\n\nBadz precyzyjny w odpowiedzi.',
      // Reorder sentences
      (p: string) => {
        const sentences = p.split('. ');
        const i = Math.floor(Math.random() * sentences.length);
        const j = Math.floor(Math.random() * sentences.length);
        [sentences[i], sentences[j]] = [sentences[j], sentences[i]];
        return sentences.join('. ');
      }
    ];

    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    return mutation(prompt);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `ind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Trace lineage of an individual
   */
  private traceLineage(individual: PromptIndividual, population: PromptIndividual[]): string[] {
    const lineage: string[] = [individual.prompt];
    // Note: Full lineage tracking would require storing all generations
    // This simplified version just returns the current prompt's mutations
    return [...individual.mutations, ...lineage];
  }

  // ==========================================================================
  // A/B TESTING
  // ==========================================================================

  /**
   * A/B test two prompts and determine the better one
   *
   * @param variantA - First prompt variant
   * @param variantB - Second prompt variant
   * @param context - Task context for evaluation
   * @param testCases - Optional test cases for evaluation
   */
  async abTestPrompts(
    variantA: string,
    variantB: string,
    context: string,
    testCases?: string[]
  ): Promise<ABTestResult> {
    const model = this.config.model || selectModel('analysis');
    const isPolish = this.config.language === 'pl';

    // Score both variants
    const scoreA = await this.scorePrompt(variantA, context);
    const scoreB = await this.scorePrompt(variantB, context);

    // Detailed comparison
    const comparisonPrompt = isPolish
      ? `Porownaj te dwa prompty i okresli ktory jest lepszy dla zadania.

WARIANT A:
"""
${variantA}
"""

WARIANT B:
"""
${variantB}
"""

KONTEKST ZADANIA: ${context}

${testCases ? `PRZYPADKI TESTOWE:\n${testCases.join('\n')}\n` : ''}

PRZEANALIZUJ:
1. Jasnosc instrukcji (ktory jest klarowniejszy?)
2. Kompletnosc (ktory ma wiecej niezbednych informacji?)
3. Struktura (ktory jest lepiej zorganizowany?)
4. Potencjal odpowiedzi (ktory da lepsze wyniki?)
5. Efektywnosc (ktory jest bardziej zwiezly bez utraty jakosci?)

ZWROC JSON:
{
  "winner": "A" lub "B" lub "tie",
  "confidence": 0.0-1.0,
  "analysis": "szczegolowa analiza porownawcza",
  "recommendations": ["lista rekomendacji dla poprawy obu wariantow"]
}`
      : `Compare these two prompts and determine which is better for the task.

VARIANT A:
"""
${variantA}
"""

VARIANT B:
"""
${variantB}
"""

TASK CONTEXT: ${context}

${testCases ? `TEST CASES:\n${testCases.join('\n')}\n` : ''}

ANALYZE:
1. Clarity of instructions (which is clearer?)
2. Completeness (which has more necessary information?)
3. Structure (which is better organized?)
4. Response potential (which will yield better results?)
5. Efficiency (which is more concise without losing quality?)

RETURN JSON:
{
  "winner": "A" or "B" or "tie",
  "confidence": 0.0-1.0,
  "analysis": "detailed comparative analysis",
  "recommendations": ["list of recommendations for improving both variants"]
}`;

    try {
      const response = await generate(comparisonPrompt, {
        model,
        temperature: 0.3,
        maxTokens: this.config.maxTokens
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        variantA,
        variantB,
        scoreA,
        scoreB,
        winner: parsed.winner || (scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie'),
        confidence: parsed.confidence || Math.abs(scoreA - scoreB),
        analysis: parsed.analysis || '',
        recommendations: parsed.recommendations || []
      };
    } catch (error) {
      console.error('[AdvancedMetaPrompter] A/B test failed:', error);

      // Fallback to simple score comparison
      return {
        variantA,
        variantB,
        scoreA,
        scoreB,
        winner: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'tie',
        confidence: Math.abs(scoreA - scoreB),
        analysis: 'Comparison based on automated scoring only.',
        recommendations: []
      };
    }
  }

  // ==========================================================================
  // PROMPT COMPRESSION
  // ==========================================================================

  /**
   * Compress a prompt while preserving semantic meaning
   * Removes redundancy and unnecessary verbosity
   *
   * @param prompt - Prompt to compress
   * @param targetRatio - Target compression ratio (e.g., 0.5 = half size)
   */
  async compressPrompt(
    prompt: string,
    targetRatio: number = 0.7
  ): Promise<CompressionResult> {
    const model = this.config.model || selectModel('analysis');
    const isPolish = this.config.language === 'pl';
    const originalTokens = this.estimateTokens(prompt);

    const compressionPrompt = isPolish
      ? `Skompresuj ponizszy prompt zachowujac jego PELNE znaczenie semantyczne.

ORYGINALNY PROMPT:
"""
${prompt}
"""

DOCELOWA KOMPRESJA: ${Math.round(targetRatio * 100)}% oryginalnej dlugosci

ZASADY KOMPRESJI:
1. Usun zbedne slowa (bardzo, naprawde, absolutnie)
2. Polacz powtarzajace sie instrukcje
3. Uzyj list zamiast zdani opisowych
4. Zachowaj WSZYSTKIE kluczowe wymagania
5. Nie usuwaj informacji o formacie wyjscia
6. Zachowaj przyklady (skrocone jesli mozliwe)

ZWROC JSON:
{
  "compressedPrompt": "skompresowany prompt",
  "removedElements": ["lista usunietych elementow"],
  "semanticPreservation": 0.0-1.0
}`
      : `Compress the following prompt while preserving its FULL semantic meaning.

ORIGINAL PROMPT:
"""
${prompt}
"""

TARGET COMPRESSION: ${Math.round(targetRatio * 100)}% of original length

COMPRESSION RULES:
1. Remove unnecessary words (very, really, absolutely)
2. Combine repeating instructions
3. Use lists instead of descriptive sentences
4. Preserve ALL key requirements
5. Don't remove output format information
6. Keep examples (shortened if possible)

RETURN JSON:
{
  "compressedPrompt": "compressed prompt",
  "removedElements": ["list of removed elements"],
  "semanticPreservation": 0.0-1.0
}`;

    try {
      const response = await generate(compressionPrompt, {
        model,
        temperature: 0.3,
        maxTokens: this.config.maxTokens
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      const compressedTokens = this.estimateTokens(parsed.compressedPrompt);

      return {
        originalPrompt: prompt,
        compressedPrompt: parsed.compressedPrompt,
        compressionRatio: originalTokens / compressedTokens,
        semanticPreservation: parsed.semanticPreservation || 0.9,
        removedElements: parsed.removedElements || [],
        originalTokens,
        compressedTokens
      };
    } catch (error) {
      console.error('[AdvancedMetaPrompter] Compression failed:', error);

      // Fallback to simple compression
      const simpleCompressed = this.simpleCompress(prompt);

      return {
        originalPrompt: prompt,
        compressedPrompt: simpleCompressed,
        compressionRatio: prompt.length / simpleCompressed.length,
        semanticPreservation: 0.8,
        removedElements: ['Redundant whitespace', 'Filler words'],
        originalTokens,
        compressedTokens: this.estimateTokens(simpleCompressed)
      };
    }
  }

  /**
   * Simple compression fallback
   */
  private simpleCompress(prompt: string): string {
    return prompt
      // Remove multiple spaces
      .replace(/\s+/g, ' ')
      // Remove filler words
      .replace(/\b(bardzo|naprawde|absolutnie|calkowicie|szczegolnie)\b/gi, '')
      // Clean up punctuation
      .replace(/\s+([.,!?])/g, '$1')
      // Remove empty lines
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English/Polish
    return Math.ceil(text.length / 4);
  }

  // ==========================================================================
  // DOMAIN-SPECIFIC OPTIMIZATION
  // ==========================================================================

  /**
   * Optimize a prompt for a specific domain
   * Injects domain-specific vocabulary, patterns, and best practices
   *
   * @param prompt - Prompt to optimize
   * @param domain - Target domain
   */
  async optimizeForDomain(
    prompt: string,
    domain: DomainType
  ): Promise<DomainOptimizationResult> {
    const model = this.config.model || selectModel('analysis');
    const isPolish = this.config.language === 'pl';

    const domainContext = this.getDomainContext(domain);

    const domainPrompt = isPolish
      ? `Zoptymalizuj ponizszy prompt dla domeny: ${domain}

ORYGINALNY PROMPT:
"""
${prompt}
"""

KONTEKST DOMENY:
${domainContext.description}

SLOWNICTWO DOMENOWE:
${domainContext.vocabulary.join(', ')}

BEST PRACTICES DLA TEJ DOMENY:
${domainContext.bestPractices.join('\n')}

ZADANIE:
1. Wzbogac prompt o terminologie domenowa
2. Dodaj domain-specific constraints
3. Uwzglednij typowe wzorce tej domeny
4. Zachowaj oryginalny cel prompta

ZWROC JSON:
{
  "optimizedPrompt": "zoptymalizowany prompt",
  "enhancements": ["lista wprowadzonych ulepszen"],
  "vocabularyInjected": ["lista dodanych terminow"],
  "domainRelevance": 0.0-1.0
}`
      : `Optimize the following prompt for domain: ${domain}

ORIGINAL PROMPT:
"""
${prompt}
"""

DOMAIN CONTEXT:
${domainContext.description}

DOMAIN VOCABULARY:
${domainContext.vocabulary.join(', ')}

BEST PRACTICES FOR THIS DOMAIN:
${domainContext.bestPractices.join('\n')}

TASK:
1. Enrich prompt with domain terminology
2. Add domain-specific constraints
3. Include typical patterns of this domain
4. Preserve the original goal of the prompt

RETURN JSON:
{
  "optimizedPrompt": "optimized prompt",
  "enhancements": ["list of enhancements made"],
  "vocabularyInjected": ["list of added terms"],
  "domainRelevance": 0.0-1.0
}`;

    try {
      const response = await generate(domainPrompt, {
        model,
        temperature: 0.4,
        maxTokens: this.config.maxTokens
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid response format');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        domain,
        originalPrompt: prompt,
        optimizedPrompt: parsed.optimizedPrompt || prompt,
        enhancements: parsed.enhancements || [],
        vocabularyInjected: parsed.vocabularyInjected || [],
        domainRelevance: parsed.domainRelevance || 0.7
      };
    } catch (error) {
      console.error('[AdvancedMetaPrompter] Domain optimization failed:', error);

      return {
        domain,
        originalPrompt: prompt,
        optimizedPrompt: prompt,
        enhancements: [],
        vocabularyInjected: [],
        domainRelevance: 0.5
      };
    }
  }

  /**
   * Get domain context information
   */
  private getDomainContext(domain: DomainType): {
    description: string;
    vocabulary: string[];
    bestPractices: string[];
  } {
    const domains: Record<DomainType, { description: string; vocabulary: string[]; bestPractices: string[] }> = {
      'web-development': {
        description: 'Tworzenie aplikacji webowych, frontend i backend',
        vocabulary: ['API', 'REST', 'GraphQL', 'SPA', 'SSR', 'CSR', 'responsive', 'accessibility', 'SEO', 'PWA', 'WebSocket', 'CORS', 'JWT', 'OAuth'],
        bestPractices: [
          'Uwzgledniaj rozne przegladarki i urzadzenia',
          'Pamietaj o dostepnosci (WCAG)',
          'Optymalizuj wydajnosc (Core Web Vitals)',
          'Stosuj bezpieczne praktyki (OWASP)'
        ]
      },
      'data-science': {
        description: 'Analiza danych, machine learning, statystyka',
        vocabulary: ['DataFrame', 'feature engineering', 'overfitting', 'cross-validation', 'hyperparameter', 'pipeline', 'EDA', 'correlation', 'regression', 'classification'],
        bestPractices: [
          'Zawsze rozpoczynaj od eksploracji danych (EDA)',
          'Dziel dane na train/validation/test',
          'Dokumentuj transformacje i preprocessing',
          'Wybieraj metryki odpowiednie do problemu'
        ]
      },
      'devops': {
        description: 'Infrastruktura, CI/CD, automatyzacja operacji',
        vocabulary: ['container', 'orchestration', 'pipeline', 'artifact', 'deployment', 'rollback', 'monitoring', 'alerting', 'IaC', 'GitOps', 'SRE', 'SLA/SLO'],
        bestPractices: [
          'Infrastructure as Code - wszystko w repo',
          'Immutable infrastructure',
          'Blue-green/canary deployments',
          'Comprehensive monitoring and logging'
        ]
      },
      'security': {
        description: 'Cyberbezpieczenstwo, pentesting, compliance',
        vocabulary: ['vulnerability', 'exploit', 'CVE', 'CVSS', 'zero-day', 'hardening', 'encryption', 'authentication', 'authorization', 'audit', 'compliance', 'SIEM'],
        bestPractices: [
          'Defense in depth - wiele warstw ochrony',
          'Principle of least privilege',
          'Regularne audyty i testy penetracyjne',
          'Security by design'
        ]
      },
      'mobile': {
        description: 'Aplikacje mobilne (iOS, Android, cross-platform)',
        vocabulary: ['native', 'hybrid', 'React Native', 'Flutter', 'widget', 'state management', 'push notification', 'deep linking', 'app store', 'APK', 'IPA'],
        bestPractices: [
          'Mobile-first design',
          'Optymalizacja zuzycia baterii',
          'Offline-first architecture',
          'Testowanie na roznych urzadzeniach'
        ]
      },
      'database': {
        description: 'Bazy danych, SQL, NoSQL, optymalizacja zapytan',
        vocabulary: ['index', 'query optimization', 'normalization', 'denormalization', 'sharding', 'replication', 'ACID', 'CAP theorem', 'transaction', 'deadlock', 'schema'],
        bestPractices: [
          'Projektuj schema pod query patterns',
          'Indeksuj madrze (nie wszystko)',
          'Monitoruj slow queries',
          'Planuj backup i disaster recovery'
        ]
      },
      'ai-ml': {
        description: 'Sztuczna inteligencja, deep learning, NLP, computer vision',
        vocabulary: ['neural network', 'transformer', 'attention', 'embedding', 'fine-tuning', 'inference', 'GPU', 'tensor', 'gradient descent', 'loss function', 'epoch', 'batch'],
        bestPractices: [
          'Zaczynaj od prostych baseline models',
          'Dokumentuj eksperymenty (MLflow, W&B)',
          'Monitoruj drift w production',
          'Uwzgledniaj etyczne aspekty AI'
        ]
      },
      'general': {
        description: 'Ogolne programowanie i inzynieria oprogramowania',
        vocabulary: ['algorithm', 'data structure', 'complexity', 'design pattern', 'refactoring', 'debugging', 'testing', 'documentation', 'version control', 'code review'],
        bestPractices: [
          'Clean code i SOLID principles',
          'Test-driven development',
          'Code review jako standard',
          'Continuous learning'
        ]
      }
    };

    return domains[domain] || domains['general'];
  }

  // ==========================================================================
  // FEW-SHOT INJECTION
  // ==========================================================================

  /**
   * Automatically inject relevant few-shot examples into a prompt
   * Uses FEW_SHOT_EXAMPLES from PromptSystem.ts
   *
   * @param prompt - Prompt to enhance
   * @param taskType - Type of task (auto-detected if not provided)
   * @param exampleCount - Number of examples to inject
   */
  async injectFewShot(
    prompt: string,
    taskType?: string,
    exampleCount: number = 2
  ): Promise<string> {
    // Auto-detect task type if not provided
    const detectedType = taskType || await this.detectTaskType(prompt);

    // Map to example category
    const exampleCategory = mapTaskTypeToExampleCategory(detectedType);

    if (!exampleCategory) {
      // No matching examples, return original
      return prompt;
    }

    // Get few-shot examples
    const examples = getFewShotExamples(exampleCategory, exampleCount);

    if (!examples) {
      return prompt;
    }

    // Inject examples before the main prompt
    const isPolish = this.config.language === 'pl';
    const header = isPolish
      ? '\n\n--- UCZ SIE Z PONIZSZYCH PRZYKLADOW ---\n'
      : '\n\n--- LEARN FROM THE FOLLOWING EXAMPLES ---\n';

    const footer = isPolish
      ? '\n--- KONIEC PRZYKLADOW ---\n\nTERAZ WYKONAJ NASTEPUJACE ZADANIE:\n\n'
      : '\n--- END OF EXAMPLES ---\n\nNOW COMPLETE THE FOLLOWING TASK:\n\n';

    return `${header}${examples}${footer}${prompt}`;
  }

  /**
   * Detect task type from prompt content
   */
  private async detectTaskType(prompt: string): Promise<string> {
    const lowerPrompt = prompt.toLowerCase();

    // Simple keyword-based detection
    if (lowerPrompt.includes('napraw') || lowerPrompt.includes('fix') || lowerPrompt.includes('bug')) {
      return 'code';
    }
    if (lowerPrompt.includes('przeanalizuj') || lowerPrompt.includes('review') || lowerPrompt.includes('analiz')) {
      return 'analysis';
    }
    if (lowerPrompt.includes('lista') || lowerPrompt.includes('wymien') || lowerPrompt.includes('list') || lowerPrompt.includes('zaproponuj')) {
      return 'list';
    }
    if (lowerPrompt.includes('architektur') || lowerPrompt.includes('zaprojektuj') || lowerPrompt.includes('design')) {
      return 'proposal';
    }

    return 'general';
  }

  /**
   * Generate custom few-shot examples for a specific task
   */
  async generateFewShotExamples(
    taskDescription: string,
    count: number = 3
  ): Promise<Array<{ input: string; output: string }>> {
    const model = this.config.model || selectModel('creative');
    const isPolish = this.config.language === 'pl';

    const generationPrompt = isPolish
      ? `Wygeneruj ${count} przykladow few-shot dla nastepujacego typu zadania:

OPIS ZADANIA:
${taskDescription}

Dla kazdego przykladu stworz:
1. INPUT: Konkretne zadanie tego typu
2. OUTPUT: Idealny przyklad odpowiedzi

ZWROC JSON:
{
  "examples": [
    {"input": "przyklad zadania", "output": "idealna odpowiedz"},
    ...
  ]
}`
      : `Generate ${count} few-shot examples for the following task type:

TASK DESCRIPTION:
${taskDescription}

For each example create:
1. INPUT: A specific task of this type
2. OUTPUT: An ideal example response

RETURN JSON:
{
  "examples": [
    {"input": "example task", "output": "ideal response"},
    ...
  ]
}`;

    try {
      const response = await generate(generationPrompt, {
        model,
        temperature: 0.7,
        maxTokens: this.config.maxTokens
      });

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.examples || [];
    } catch (error) {
      console.error('[AdvancedMetaPrompter] Few-shot generation failed:', error);
      return [];
    }
  }

  // ==========================================================================
  // TEMPLATE LIBRARY ACCESS
  // ==========================================================================

  /**
   * Get the template library instance
   */
  getTemplateLibrary(): PromptTemplateLibrary {
    return this.templateLibrary;
  }

  /**
   * Apply a template with automatic few-shot injection
   */
  async applyTemplateWithFewShot(
    templateId: string,
    variables: Record<string, string>,
    injectExamples: boolean = true
  ): Promise<string> {
    let prompt = this.templateLibrary.applyTemplate(templateId, variables);

    if (injectExamples) {
      prompt = await this.injectFewShot(prompt);
    }

    return prompt;
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Update evolution configuration
   */
  updateEvolutionConfig(config: Partial<EvolutionConfig>): void {
    this.evolutionConfig = { ...this.evolutionConfig, ...config };
  }

  /**
   * Get current evolution configuration
   */
  getEvolutionConfig(): EvolutionConfig {
    return { ...this.evolutionConfig };
  }
}

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export type DomainType =
  | 'web-development'
  | 'data-science'
  | 'devops'
  | 'security'
  | 'mobile'
  | 'database'
  | 'ai-ml'
  | 'general';

// ============================================================================
// SINGLETON INSTANCES
// ============================================================================

/**
 * Singleton instance of MetaPrompter (basic)
 * Pre-configured for Polish language as default
 */
export const metaPrompter = new MetaPrompter({
  language: 'pl',
  temperature: 0.4
});

/**
 * Singleton instance of AdvancedMetaPrompter
 * Pre-configured with all advanced features
 */
export const advancedMetaPrompter = new AdvancedMetaPrompter(
  {
    language: 'pl',
    temperature: 0.4
  },
  {
    populationSize: 8,
    generations: 5,
    mutationRate: 0.3
  }
);

/**
 * Singleton instance of PromptTemplateLibrary
 */
export const promptTemplateLibrary = new PromptTemplateLibrary();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick optimization - single call to optimize a prompt
 */
export async function quickOptimize(prompt: string, context: string = ''): Promise<string> {
  const result = await metaPrompter.optimizePrompt(prompt, context);
  return result.optimizedPrompt;
}

/**
 * Quick evolution - evolve a prompt with default settings
 */
export async function quickEvolve(prompt: string, context: string = ''): Promise<string> {
  const result = await advancedMetaPrompter.evolvePrompt(prompt, context, {
    populationSize: 4,
    generations: 3
  });
  return result.bestPrompt;
}

/**
 * Quick compression - compress a prompt with default settings
 */
export async function quickCompress(prompt: string): Promise<string> {
  const result = await advancedMetaPrompter.compressPrompt(prompt);
  return result.compressedPrompt;
}

/**
 * Quick A/B test - compare two prompts
 */
export async function quickABTest(
  variantA: string,
  variantB: string,
  context: string = ''
): Promise<'A' | 'B' | 'tie'> {
  const result = await advancedMetaPrompter.abTestPrompts(variantA, variantB, context);
  return result.winner;
}

// ============================================================================
// LEGACY API (for backward compatibility with intelligence/ imports)
// ============================================================================

// Initialize Gemini client for legacy API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const INTELLIGENCE_MODEL = GEMINI_MODELS.FLASH;

/**
 * Legacy MetaPromptResult interface
 */
export interface MetaPromptResult {
  originalTask: string;
  taskType: TaskType;
  optimizedPrompt: string;
  suggestedTechniques: string[];
  expectedOutputFormat: string;
  confidence: number;
}

/**
 * Legacy TaskType
 */
export type TaskType =
  | 'analysis'
  | 'creative'
  | 'coding'
  | 'research'
  | 'planning'
  | 'debugging'
  | 'explanation'
  | 'transformation'
  | 'evaluation'
  | 'unknown';

/**
 * Task type patterns for classification
 */
const TASK_PATTERNS: Record<TaskType, RegExp[]> = {
  analysis: [/analiz/i, /zbadaj/i, /ocen/i, /porownaj/i, /wykryj/i],
  creative: [/napisz/i, /stworz/i, /wymysl/i, /zaprojektuj/i, /opowiedz/i],
  coding: [/kod/i, /funkcj/i, /implement/i, /napraw/i, /refaktor/i, /typescript/i, /javascript/i],
  research: [/znajdz/i, /wyszukaj/i, /sprawdz/i, /zbierz/i, /zgromadz/i],
  planning: [/zaplanuj/i, /rozloz/i, /harmonogram/i, /strategia/i, /krok/i],
  debugging: [/debug/i, /blad/i, /error/i, /napraw/i, /dlaczego nie/i],
  explanation: [/wyjasn/i, /opowiedz/i, /jak dziala/i, /co to/i, /dlaczego/i],
  transformation: [/przeksztalc/i, /konwertuj/i, /zmien/i, /przetlumacz/i, /formatuj/i],
  evaluation: [/ocen/i, /zrecenzuj/i, /sprawdz jakosc/i, /czy dobrze/i],
  unknown: []
};

/**
 * Technique recommendations per task type
 */
const TECHNIQUE_MAP: Record<TaskType, string[]> = {
  analysis: ['Chain-of-Thought', 'Multi-Perspective', 'Structured Output'],
  creative: ['Few-Shot Examples', 'Role-Playing', 'Brainstorming'],
  coding: ['Step-by-Step', 'Code Review', 'Test-Driven'],
  research: ['Query Decomposition', 'Source Verification', 'Summarization'],
  planning: ['Tree-of-Thoughts', 'Dependency Analysis', 'Risk Assessment'],
  debugging: ['Root Cause Analysis', 'Hypothesis Testing', 'Trace Analysis'],
  explanation: ['Analogies', 'Progressive Complexity', 'Visual Representation'],
  transformation: ['Template-Based', 'Rule Application', 'Validation'],
  evaluation: ['Criteria-Based', 'Comparative Analysis', 'Scoring Rubric'],
  unknown: ['Chain-of-Thought', 'Self-Reflection']
};

/**
 * Classify task type based on content
 */
export function classifyTaskType(task: string): TaskType {
  const taskLower = task.toLowerCase();

  for (const [type, patterns] of Object.entries(TASK_PATTERNS) as [TaskType, RegExp[]][]) {
    if (type === 'unknown') continue;
    for (const pattern of patterns) {
      if (pattern.test(taskLower)) {
        return type;
      }
    }
  }

  return 'unknown';
}

/**
 * Generate optimized prompt using meta-prompting (legacy API)
 * Uses AdvancedMetaPrompter internally
 */
export async function generateMetaPrompt(
  task: string,
  context: string = ''
): Promise<MetaPromptResult> {
  const taskType = classifyTaskType(task);
  const techniques = TECHNIQUE_MAP[taskType];

  try {
    const result = await metaPrompter.optimizePrompt(task, context);

    return {
      originalTask: task,
      taskType,
      optimizedPrompt: result.optimizedPrompt,
      suggestedTechniques: techniques,
      expectedOutputFormat: 'text',
      confidence: Math.round(result.expectedGain * 100)
    };

  } catch (error: any) {
    return {
      originalTask: task,
      taskType,
      optimizedPrompt: enhancePromptManually(task, taskType),
      suggestedTechniques: techniques,
      expectedOutputFormat: 'text',
      confidence: 50
    };
  }
}

/**
 * Manual prompt enhancement fallback
 */
function enhancePromptManually(task: string, taskType: TaskType): string {
  const prefixes: Record<TaskType, string> = {
    analysis: 'Przeprowadz szczegolowa analize nastepujacego problemu. Przedstaw wnioski w formie punktowej:\n\n',
    creative: 'Wykorzystaj swoja kreatywnosc do wykonania nastepujacego zadania. Badz oryginalny i innowacyjny:\n\n',
    coding: 'Napisz czysty, dobrze udokumentowany kod dla nastepujacego zadania. Uwzglednij obsluge bledow:\n\n',
    research: 'Zbierz i zsyntetyzuj informacje na temat:\n\n',
    planning: 'Stworz szczegolowy plan wykonania. Uwzglednij zaleznosci i ryzyka:\n\n',
    debugging: 'Zidentyfikuj przyczyne problemu i zaproponuj rozwiazanie:\n\n',
    explanation: 'Wyjasni w prosty i zrozumialy sposob:\n\n',
    transformation: 'Przeksztalc nastepujaca tresc zgodnie z wymaganiami:\n\n',
    evaluation: 'Ocen ponizsze wedlug jasnych kryteriow:\n\n',
    unknown: 'Wykonaj nastepujace zadanie najlepiej jak potrafisz:\n\n'
  };

  const suffixes: Record<TaskType, string> = {
    analysis: '\n\nFormat: lista wnioskow z uzasadnieniem',
    creative: '\n\nFormat: kreatywna odpowiedz z uzasadnieniem wyborow',
    coding: '\n\nFormat: kod z komentarzami i przykladem uzycia',
    research: '\n\nFormat: podsumowanie z zrodlami',
    planning: '\n\nFormat: numerowana lista krokow z timeline',
    debugging: '\n\nFormat: przyczyna -> rozwiazanie -> zapobieganie',
    explanation: '\n\nFormat: wyjasnienie od prostego do zlozonego',
    transformation: '\n\nFormat: przetworzona tresc',
    evaluation: '\n\nFormat: ocena z punktacja i uzasadnieniem',
    unknown: ''
  };

  return prefixes[taskType] + task + suffixes[taskType];
}

/**
 * Apply meta-prompting and execute (legacy API)
 */
export async function executeWithMetaPrompt(
  task: string,
  context: string = ''
): Promise<{ result: string; metaInfo: MetaPromptResult }> {
  const metaInfo = await generateMetaPrompt(task, context);

  try {
    const response = await geminiSemaphore.withPermit(async () => {
      const model = genAI.getGenerativeModel({
        model: INTELLIGENCE_MODEL,
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
      });
      const result = await model.generateContent(metaInfo.optimizedPrompt);
      return result.response.text();
    });

    return {
      result: response.trim(),
      metaInfo
    };

  } catch (error: any) {
    return {
      result: `Blad wykonania: ${error.message}`,
      metaInfo
    };
  }
}

/**
 * Generate prompt template for specific task type (legacy API)
 */
export function getPromptTemplate(taskType: TaskType): string {
  const templates: Record<TaskType, string> = {
    analysis: `Przeanalizuj {TEMAT} uwzgledniajac:
1. Kontekst i tlo
2. Kluczowe elementy
3. Zaleznosci i powiazania
4. Wnioski i rekomendacje

Format odpowiedzi: strukturalna analiza z punktami`,

    creative: `Stworz {TEMAT} uwzgledniajac:
- Oryginalnosc i innowacyjnosc
- Spojnosc z kontekstem
- Estetyka/jakosc
- Praktycznosc

Badz kreatywny i oryginalny.`,

    coding: `Zaimplementuj {TEMAT}:
1. Analiza wymagan
2. Projekt rozwiazania
3. Implementacja (czysty kod)
4. Testy i walidacja
5. Dokumentacja

Jezyk: {JEZYK}
Format: kod z komentarzami`,

    research: `Zbadaj {TEMAT}:
1. Zbierz informacje
2. Zweryfikuj zrodla
3. Zsyntetyzuj wnioski
4. Przedstaw podsumowanie

Format: raport z odniesieniami`,

    planning: `Zaplanuj {TEMAT}:
1. Cel i zakres
2. Kroki wykonania
3. Zaleznosci
4. Timeline
5. Ryzyka i mitygacja

Format: plan projektowy`,

    debugging: `Zdebuguj {TEMAT}:
1. Opis problemu
2. Reprodukcja
3. Analiza przyczyn
4. Rozwiazanie
5. Zapobieganie

Format: raport debugowania`,

    explanation: `Wyjasn {TEMAT}:
1. Prosta definicja
2. Jak to dziala
3. Przyklady
4. Zastosowania
5. Powiazane koncepty

Format: wyjasnienie progresywne`,

    transformation: `Przeksztalc {TEMAT}:
- Wejscie: {FORMAT_WE}
- Wyjscie: {FORMAT_WY}
- Zasady transformacji

Format: przetworzona tresc`,

    evaluation: `Ocen {TEMAT} wedlug kryteriow:
1. {KRYTERIUM_1}
2. {KRYTERIUM_2}
3. {KRYTERIUM_3}

Skala: 1-10
Format: ocena z uzasadnieniem`,

    unknown: `Wykonaj zadanie: {TEMAT}
Opisz swoje podejscie i przedstaw wynik.`
  };

  return templates[taskType];
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Classes
  MetaPrompter,
  AdvancedMetaPrompter,
  PromptTemplateLibrary,

  // Instances
  metaPrompter,
  advancedMetaPrompter,
  promptTemplateLibrary,

  // Quick functions
  quickOptimize,
  quickEvolve,
  quickCompress,
  quickABTest,

  // Legacy API
  generateMetaPrompt,
  executeWithMetaPrompt,
  classifyTaskType,
  getPromptTemplate
};
