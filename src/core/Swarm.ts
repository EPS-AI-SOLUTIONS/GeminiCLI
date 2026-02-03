/**
 * Swarm - Main orchestration engine for GeminiHydra
 * Full Node.js implementation with all phases from PowerShell
 *
 * Protocol v14.0 "School of the Wolf" (Node.js Full Edition)
 *
 * Phases:
 * - PRE-A: Translation & Refinement
 * - A: Dijkstra Planning
 * - B: Graph Processor Execution
 * - C: Self-Healing Evaluation & Repair
 * - D: Final Synthesis
 */

import { Agent, AGENT_PERSONAS, initializeGeminiModels } from './Agent.js';
import { VectorStore, AgentVectorMemory, agentVectorMemory } from '../memory/VectorStore.js';
import { SessionCache, sessionCache } from '../memory/SessionCache.js';
import { SwarmPlan, SwarmTask, ExecutionResult, AgentRole } from '../types/index.js';
import { mcpManager, mcpBridge } from '../mcp/index.js';
import { ollamaManager } from './OllamaManager.js';
import { refineObjective, smartRefine, executePhasePreA, TaskClassification, EXECUTION_MODELS } from './PhasePreA.js';
import { selfHealingLoop, LessonLearned, RepairTask } from './PhaseC.js';
import { promptAudit } from './PromptAudit.js';
import { GraphProcessor, executeGraphTasks } from './GraphProcessor.js';
import { buildPlanningPrompt, AGENT_SYSTEM_PROMPTS } from './PromptSystem.js';
import {
  enhanceWithIntelligence,
  decomposeQuery,
  semanticCache,
  knowledgeGraph,
  contextManager,
  chainOfThought,
  IntelligenceConfig
} from './intelligence/index.js';
// NEW: Advanced reasoning modules from intelligence layer
import {
  treeOfThoughts,
  quickTreeOfThoughts,
  generateMetaPrompt,
  classifyTaskType,
  semanticChunk,
  findRelevantChunks,
  summarizeChunks,
  selfReflect
} from './intelligence/index.js';
import {
  adaptiveRetry,
  checkpointManager,
  executionProfiler,
  degradationManager,
  resourceScheduler,
  taskTemplateManager,
  autoDetectDependencies,
  detectTaskPriority,
  sortByPriority,
  initExecutionEngine,
  ExecutionEngineConfig,
  PrioritizedTask
} from './ExecutionEngine.js';
import { logger } from './LiveLogger.js';
import { codeAnalysisEngine, shouldUseCodeAnalysis, getCodeContext } from './CodeAnalysisEngine.js';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs/promises';
import path from 'path';

// Anti-hallucination solutions (Solutions 21-24)
import { responseDeduplicator } from './ResponseDeduplicator.js';
import { resultHashVerifier } from './ResultHashVerifier.js';
import { outputSanitizer, sanitizeOutput } from './OutputSanitizer.js';
import { finalReportValidator, validateFinalReport } from './FinalReportValidator.js';

/**
 * YOLO Configuration Interface
 */
interface YoloConfig {
  yolo?: boolean;
  fileAccess?: boolean;
  shellAccess?: boolean;
  networkAccess?: boolean;
  maxConcurrency?: number;
  enablePhasePreA?: boolean;
  enablePhaseC?: boolean;
  maxRepairCycles?: number;
  forceModel?: 'flash' | 'pro' | 'auto';  // Override model selection
  enableIntelligenceLayer?: boolean;      // Enable advanced reasoning
  intelligenceConfig?: IntelligenceConfig; // Intelligence layer configuration
  enableExecutionEngine?: boolean;         // Enable advanced execution features
  executionEngineConfig?: ExecutionEngineConfig; // Execution engine configuration
  enableAdvancedReasoning?: boolean;      // NEW: Enable Tree-of-Thoughts, Meta-Prompting, etc.
  rootDir?: string;                       // CRITICAL: Project root directory for path validation
  // Phase B Ollama optimization
  forceOllama?: boolean;                  // Force all Phase B agents to use Ollama
  ollamaModel?: string;                   // Specific Ollama model for Phase B (default: llama3.2:3b)
}

const DEFAULT_CONFIG: YoloConfig = {
  yolo: true,
  fileAccess: true,
  shellAccess: true,
  networkAccess: true,
  maxConcurrency: 12,     // High concurrency for parallel execution
  enablePhasePreA: true,
  enablePhaseC: true,
  maxRepairCycles: 1,     // Single repair cycle only (reduced for speed)
  forceModel: 'auto',
  enableIntelligenceLayer: true,  // Enable advanced reasoning by default
  enableAdvancedReasoning: true,  // NEW: Enable Tree-of-Thoughts, Meta-Prompting, Semantic Chunking
  // Phase B Ollama optimization - enables maximum parallel agent execution
  forceOllama: true,              // Force Ollama for all Phase B agents
  ollamaModel: 'llama3.2:3b',     // Fast local model for parallel execution
  intelligenceConfig: {
    useChainOfThought: true,
    useSelfReflection: true,
    useConfidenceScoring: true,
    useMultiPerspective: false,   // Only for critical tasks
    useSemanticCache: true,
    useKnowledgeGraph: true,
    useQueryDecomposition: true,
    useAnalogicalReasoning: true,
    useTreeOfThoughts: false,     // Only for exploration problems (expensive)
    useMetaPrompting: true,       // Enabled - optimize prompts dynamically
    useSemanticChunking: true,    // Enabled - handle long contexts
    confidenceThreshold: 70
  },
  enableExecutionEngine: true,  // Enable advanced execution features by default
  executionEngineConfig: {
    enableAdaptiveRetry: true,
    enablePartialCompletion: true,
    enableParallelExecution: true,
    enableAutoDependencies: true,
    enableCheckpoints: true,
    enablePrioritization: true,
    enableResourceScheduling: true,
    enableGracefulDegradation: true,
    enableTemplating: true,
    enableProfiling: true
  }
};

/**
 * Swarm - Main orchestration class
 */
export class Swarm {
  private memory: VectorStore;
  private agentMemory: AgentVectorMemory;
  private config: YoloConfig;
  private graphProcessor: GraphProcessor;

  constructor(memoryPath: string, config: YoloConfig = {}) {
    this.memory = new VectorStore(memoryPath);
    this.agentMemory = agentVectorMemory;
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize default graph processor (will be recreated per-task with optimal model)
    this.graphProcessor = new GraphProcessor({
      yolo: this.config.yolo,
      maxConcurrency: this.config.maxConcurrency,
      rootDir: this.config.rootDir  // CRITICAL: Pass project root for path validation
    });
  }

  /**
   * Create GraphProcessor with specific model for task
   * If forceOllama is enabled, all agents will use Ollama for parallel execution
   */
  private createGraphProcessor(preferredModel?: string): GraphProcessor {
    return new GraphProcessor({
      yolo: this.config.yolo,
      maxConcurrency: this.config.maxConcurrency,
      preferredModel: preferredModel,
      rootDir: this.config.rootDir,  // CRITICAL: Pass project root for path validation
      forceOllama: this.config.forceOllama,  // Phase B optimization
      ollamaModel: this.config.ollamaModel   // Specific Ollama model
    });
  }

  /**
   * Initialize all systems (PARALLEL for speed - saves ~500ms)
   */
  async initialize() {
    console.log(chalk.gray('[Swarm] Initializing systems...'));

    // PARALLEL INIT - all independent systems at once
    await Promise.all([
      // Group 1: Memory systems
      this.memory.load(),
      sessionCache.load(),

      // Group 2: Gemini (fast, just checks API)
      initializeGeminiModels(),

      // Group 3: Ollama (can be slow, but independent)
      ollamaManager.ensure().then(() => {
        // Start health monitoring after Ollama is up
        ollamaManager.startMonitoring(15000); // Check every 15 seconds
      }).catch((e: any) => {
        console.log(chalk.yellow(`[Swarm] Ollama warning: ${e.message}`));
      }),

      // Group 4: MCP (independent, parallel already)
      mcpManager.init({ projectRoot: this.config.rootDir }).catch(() => {
        console.log(chalk.gray('[Swarm] MCP initialization skipped'));
      }),

      // Group 5: Execution Engine (templates, etc.)
      this.config.enableExecutionEngine
        ? initExecutionEngine(this.config.executionEngineConfig)
        : Promise.resolve()
    ]);

    console.log(chalk.green('[Swarm] Systems ready'));
  }

  /**
   * Execute an objective through the full protocol
   */
  async executeObjective(objective: string): Promise<string> {
    // === SOLUTION 1: IMMUTABLE ORIGINAL OBJECTIVE ===
    // CRITICAL: This value MUST NEVER be modified after this point
    // All downstream processes should reference this for user intent validation
    const ORIGINAL_OBJECTIVE: Readonly<string> = Object.freeze(objective);

    // Initialize prompt audit trail
    promptAudit.initialize(objective);

    const startTime = Date.now();

    console.log(chalk.cyan('\n' + '='.repeat(60)));
    console.log(chalk.cyan('  SCHOOL OF THE WOLF: PROTOCOL v14.0 (Node.js Full)'));
    console.log(chalk.cyan('='.repeat(60)));

    // Initialize session
    await sessionCache.clear();
    await sessionCache.setObjective(ORIGINAL_OBJECTIVE);
    await sessionCache.appendChronicle('Mission started');

    // =========================================
    // PHASE PRE-A: TRANSLATION, REFINEMENT & CLASSIFICATION
    // =========================================
    logger.phaseStart('PRE-A', 'TRANSLATION, REFINEMENT & CLASSIFICATION');

    let refinedObjective = objective;
    let taskClassification: TaskClassification | null = null;
    let selectedModel: string = EXECUTION_MODELS.flash; // Default to flash

    if (this.config.enablePhasePreA) {
      logger.agentThinking('system', 'Executing Phase PRE-A pipeline...');

      const preAResult = await executePhasePreA(objective);
      refinedObjective = preAResult.refinedObjective;
      taskClassification = preAResult.classification;

      // Determine model based on classification or force override
      if (this.config.forceModel === 'auto' || !this.config.forceModel) {
        selectedModel = taskClassification?.recommendedModel === 'pro'
          ? EXECUTION_MODELS.pro
          : EXECUTION_MODELS.flash;
      } else {
        selectedModel = this.config.forceModel === 'pro'
          ? EXECUTION_MODELS.pro
          : EXECUTION_MODELS.flash;
      }

      await sessionCache.setRefinedObjective(refinedObjective);
      await sessionCache.appendChronicle(
        `Objective refined. Difficulty: ${taskClassification?.difficulty ?? 'unknown'}, Model: ${selectedModel}`
      );

      // Record Phase PRE-A transformation
      if (refinedObjective !== objective) {
        promptAudit.recordTransformation(
          'PhasePreA',
          'Translation and classification',
          refinedObjective
        );
      }

      // =========================================
      // DISPLAY PRE-A RESULT IN TERMINAL
      // =========================================
      console.log(chalk.cyan('\n╔══════════════════════════════════════════════════════════════════╗'));
      console.log(chalk.cyan('║') + chalk.bold.white('                    📋 PHASE PRE-A RESULT                         ') + chalk.cyan('║'));
      console.log(chalk.cyan('╠══════════════════════════════════════════════════════════════════╣'));
      console.log(chalk.cyan('║') + chalk.gray(' Original: ') + chalk.white(objective.substring(0, 50) + (objective.length > 50 ? '...' : '').padEnd(53)) + chalk.cyan('║'));
      console.log(chalk.cyan('╠══════════════════════════════════════════════════════════════════╣'));
      console.log(chalk.cyan('║') + chalk.yellow(' Refined:                                                          ') + chalk.cyan('║'));

      // Word-wrap refined objective for display
      const maxLineLen = 64;
      const words = refinedObjective.split(' ');
      let currentLine = '';
      for (const word of words) {
        if ((currentLine + ' ' + word).trim().length <= maxLineLen) {
          currentLine = (currentLine + ' ' + word).trim();
        } else {
          if (currentLine) {
            console.log(chalk.cyan('║') + chalk.green(' ' + currentLine.padEnd(65)) + chalk.cyan('║'));
          }
          currentLine = word;
        }
      }
      if (currentLine) {
        console.log(chalk.cyan('║') + chalk.green(' ' + currentLine.padEnd(65)) + chalk.cyan('║'));
      }

      console.log(chalk.cyan('╠══════════════════════════════════════════════════════════════════╣'));
      console.log(chalk.cyan('║') + chalk.gray(` Difficulty: ${(taskClassification?.difficulty?.toUpperCase() ?? 'UNKNOWN').padEnd(15)} Model: ${selectedModel.padEnd(25)}`) + chalk.cyan('║'));
      console.log(chalk.cyan('║') + chalk.gray(` Agents: ${String(taskClassification?.estimatedAgents ?? 'N/A').padEnd(19)} Recommended: ${String(taskClassification?.recommendedModel ?? 'N/A').padEnd(15)}`) + chalk.cyan('║'));
      console.log(chalk.cyan('╚══════════════════════════════════════════════════════════════════╝\n'));

      logger.system(`Task Classification: ${taskClassification?.difficulty?.toUpperCase() ?? 'UNKNOWN'}`, 'info');
      logger.system(`Execution Model: ${selectedModel}`, 'info');
      logger.system(`Estimated Agents: ${taskClassification?.estimatedAgents ?? 'N/A'}`, 'debug');

      // =========================================
      // ADVANCED REASONING: Chain-of-Thought / Tree-of-Thoughts
      // =========================================
      if (this.config.enableAdvancedReasoning && taskClassification) {
        const difficulty = taskClassification.difficulty;

        // Use Chain-of-Thought for complex/critical tasks
        if ((difficulty === 'complex' || difficulty === 'critical') &&
            this.config.intelligenceConfig?.useChainOfThought) {
          console.log(chalk.magenta('\n🧠 ADVANCED: Chain-of-Thought reasoning'));
          try {
            const cotResult = await chainOfThought(refinedObjective);
            if (cotResult.steps.length > 1) {
              // Add reasoning context for better planning
              contextManager.add(
                `CoT Reasoning: ${cotResult.steps.join(' -> ')}`,
                'system',
                0.8
              );
              console.log(chalk.gray(`   ${cotResult.steps.length} reasoning steps generated`));
            }
          } catch (e: any) {
            console.log(chalk.yellow(`   CoT failed: ${e.message}`));
          }
        }

        // Use Tree-of-Thoughts for exploration-heavy problems (critical only)
        if (difficulty === 'critical' &&
            this.config.intelligenceConfig?.useTreeOfThoughts) {
          console.log(chalk.magenta('\n🌳 ADVANCED: Tree-of-Thoughts exploration'));
          try {
            const totResult = await treeOfThoughts(refinedObjective, {
              maxDepth: 2,
              beamWidth: 2,
              minScore: 50
            });
            if (totResult.bestScore > 60) {
              // === SOLUTION 4: DO NOT REPLACE OBJECTIVE ===
              // ToT insights are added as CONTEXT, not as replacement
              // The original refined objective MUST remain unchanged
              const totInsights = totResult.finalSolution;
              contextManager.add(
                `ToT Analysis Insights: ${totInsights}`,
                'system',
                0.7  // Lower priority than original objective
              );
              contextManager.add(
                `ToT Best Path: ${totResult.bestPath.map(n => n.thought).join(' -> ')}`,
                'system',
                0.9
              );
              console.log(chalk.gray(`   ToT insights added to context (score: ${totResult.bestScore}%)`));
              console.log(chalk.yellow(`   NOTE: Objective NOT modified - preserving user intent`));
              // DO NOT: refinedObjective = totResult.finalSolution;
            }
          } catch (e: any) {
            console.log(chalk.yellow(`   ToT failed: ${e.message}`));
          }
        }

        // Use Meta-Prompting for prompt optimization
        if (this.config.intelligenceConfig?.useMetaPrompting) {
          const taskType = classifyTaskType(refinedObjective);
          console.log(chalk.gray(`   Task type detected: ${taskType}`));
        }
      }
    }

    // =========================================
    // INTELLIGENCE: QUERY DECOMPOSITION (for complex tasks)
    // =========================================
    let decomposedQueries: string[] = [refinedObjective];

    if (this.config.enableIntelligenceLayer &&
        this.config.intelligenceConfig?.useQueryDecomposition &&
        taskClassification?.difficulty !== 'simple') {
      console.log(chalk.magenta('\n🧠 INTELLIGENCE: Query Decomposition'));

      const decomposition = await decomposeQuery(refinedObjective);
      if (decomposition.subQueries.length > 1) {
        // Map SubQuery objects to strings (query text)
        decomposedQueries = decomposition.subQueries.map(sq => sq.query);
        console.log(chalk.gray(`   Decomposed into ${decomposedQueries.length} sub-queries`));

        // Add decomposition info to context
        contextManager.add(
          `Zadanie rozłożone na: ${decomposedQueries.join('; ')}`,
          'system',
          0.7
        );
      }
    }

    // End PRE-A phase
    logger.phaseEnd('PRE-A', { success: true });

    // =========================================
    // PHASE A: DIJKSTRA PLANNING
    // =========================================
    logger.phaseStart('A', 'DIJKSTRA PLANNING');

    const planner = new Agent('dijkstra');
    logger.agentStart('dijkstra', 'Creating execution plan', 'gemini-cloud');

    // Gather context
    logger.agentThinking('dijkstra', 'Gathering memory context...');
    const legacyMemories = await this.memory.search(refinedObjective);
    const dijkstraMemories = await this.agentMemory.getContextual('dijkstra', refinedObjective);

    // Get MCP tools context
    logger.agentThinking('dijkstra', 'Building MCP tools context...');
    const mcpContext = this.buildMcpContext();

    // =========================================
    // GEMINI 3 + SERENA: Code Analysis (for code tasks)
    // =========================================
    let codeAnalysisContext = '';
    const rootDir = this.config.rootDir || process.cwd();

    if (shouldUseCodeAnalysis(refinedObjective)) {
      logger.agentThinking('dijkstra', 'Detected code task - activating Gemini 3 + Serena analysis...');
      console.log(chalk.magenta('\n🔍 CODE ANALYSIS: Gemini 3 + Serena integration active'));

      try {
        // Initialize code analysis engine
        await codeAnalysisEngine.init(rootDir);

        // Get quick code context for planning
        codeAnalysisContext = await getCodeContext(refinedObjective, rootDir);

        if (codeAnalysisContext) {
          console.log(chalk.gray(`   Found relevant code symbols via LSP/Serena`));
          logger.system('[Phase A] Code context added to planning', 'debug');
        }
      } catch (error: any) {
        console.log(chalk.yellow(`   Code analysis skipped: ${error.message}`));
      }
    }

    // Build planning prompt (with code context if available)
    const planPrompt = buildPlanningPrompt({
      objective: refinedObjective,
      availableAgents: Object.keys(AGENT_PERSONAS),
      mcpTools: mcpContext + codeAnalysisContext,  // Include code context
      memories: dijkstraMemories || JSON.stringify(legacyMemories)
    });

    logger.agentThinking('dijkstra', `Planning prompt: ${planPrompt.length} chars`);

    let plan: SwarmPlan;
    try {
      const planStart = Date.now();
      const planJsonRaw = await planner.think(planPrompt);
      const planTime = Date.now() - planStart;

      // Clean and parse JSON
      const jsonStr = this.cleanJson(planJsonRaw);
      plan = JSON.parse(jsonStr);

      // Validate plan structure
      if (!plan.tasks || !Array.isArray(plan.tasks)) {
        throw new Error('Invalid plan structure: missing tasks array');
      }

      // Normalize agent names to lowercase (fix: Dijkstra may return "Geralt" instead of "geralt")
      const validAgentRoles = Object.keys(AGENT_PERSONAS);
      for (const task of plan.tasks) {
        if (task.agent) {
          const normalizedAgent = String(task.agent).toLowerCase();
          if (validAgentRoles.includes(normalizedAgent)) {
            task.agent = normalizedAgent as AgentRole;
          } else {
            // Fallback to geralt for unknown agents
            console.log(chalk.yellow(`[Swarm] Unknown agent "${task.agent}" -> mapping to geralt`));
            task.agent = 'geralt' as AgentRole;
          }
        }
      }

      // NAPRAWKA: Walidacja i ulepszanie zadań w planie
      const rootDir = this.config.rootDir || process.cwd();
      for (const task of plan.tasks) {
        const taskLower = task.task.toLowerCase();

        // Wykryj zadania które są zbyt ogólne i popraw je
        const tooVaguePatterns = [
          { pattern: /^odczytaj\s+(kod|zawartość|plik)/i, fix: (t: string) => `${t} - użyj EXEC: type "ścieżka"` },
          { pattern: /^przeanalizuj\s+/i, fix: (t: string) => `${t} w katalogu ${rootDir}` },
          { pattern: /^napraw\s+/i, fix: (t: string) => `${t} - najpierw odczytaj plik, potem użyj ===ZAPIS===` },
          { pattern: /^zidentyfikuj\s+/i, fix: (t: string) => `${t} w plikach .ts w ${rootDir}/src` },
        ];

        for (const { pattern, fix } of tooVaguePatterns) {
          if (pattern.test(task.task) && !task.task.includes(rootDir) && !task.task.includes('EXEC:')) {
            const improved = fix(task.task);
            console.log(chalk.yellow(`│ [Plan] Ulepszam zadanie: "${task.task.substring(0, 40)}..." → dodaję kontekst`));
            task.task = improved;
          }
        }

        // Dodaj kontekst projektu do zadań które tego nie mają
        if (!task.task.includes(rootDir) && !task.task.includes('src/') && !task.task.includes('EXEC:')) {
          // Sprawdź czy zadanie wymaga kontekstu ścieżki
          if (/plik|kod|moduł|katalog|folder|directory/i.test(taskLower)) {
            task.task = `${task.task} (projekt: ${rootDir})`;
          }
        }

        // Wymuszenie TypeScript dla zadań kodowania
        if (/napisz|stwórz|zaimplementuj|dodaj.*funkcj|dodaj.*interfejs/i.test(taskLower)) {
          if (!task.task.includes('TypeScript') && !task.task.includes('.ts')) {
            task.task = `${task.task} [TypeScript, NIE Python/Ruby]`;
          }
        }
      }

      logger.agentSuccess('dijkstra', { chars: planJsonRaw.length, time: planTime });
      logger.system(`Plan created: ${plan.tasks.length} tasks in ${(planTime/1000).toFixed(1)}s`, 'info');
      await sessionCache.setPlan(JSON.stringify(plan));
      await sessionCache.appendChronicle(`Plan created with ${plan.tasks.length} tasks`);

      logger.phaseEnd('A', { tasks: plan.tasks.length, success: true });

    } catch (e: any) {
      logger.agentError('dijkstra', e.message, false);
      logger.phaseEnd('A', { success: false, error: e.message });
      await sessionCache.appendChronicle(`Planning failed: ${e.message}`);
      return `Critical Error: Planning failed - ${e.message}`;
    }

    // =========================================
    // PHASE B: EXECUTION (GraphProcessor with optimal model)
    // =========================================
    // Create GraphProcessor with model selected by PRE-A classification
    const taskProcessor = this.createGraphProcessor(selectedModel);
    const executionResults = await taskProcessor.process(plan.tasks);

    await sessionCache.appendChronicle(`Execution completed: ${executionResults.length} tasks (model: ${selectedModel})`);

    // =========================================
    // PHASE C: SELF-HEALING EVALUATION
    // =========================================
    logger.phaseStart('C', 'SELF-HEALING EVALUATION');

    let finalResults = executionResults;
    let missionSuccess = true;

    // Phase C skip logic - LESS AGGRESSIVE to catch MCP errors
    // Check for real errors in logs (not just success flag)
    const hasRealErrors = executionResults.some(r => {
      if (!r.success) return true;
      // Also check logs for MCP error patterns
      const logs = r.logs?.join(' ') || '';
      return /error|denied|not found|ENOENT|failed|outside allowed/i.test(logs);
    });

    // Skip Phase C ONLY for truly simple successful tasks
    const skipPhaseC =
      taskClassification?.difficulty === 'simple' &&
      plan.tasks.length === 1 &&
      executionResults.every(r => r.success) &&
      !hasRealErrors;

    if (this.config.enablePhaseC && !skipPhaseC) {
      logger.system(`Analyzing ${executionResults.length} task results for errors...`, 'info');
      const phaseCResult = await selfHealingLoop(
        refinedObjective,
        executionResults,
        {
          maxRetries: this.config.maxRepairCycles,
          saveLesson: true,
          onLessonLearned: async (lesson: LessonLearned) => {
            // Save lesson to Dijkstra's memory
            await this.agentMemory.add(
              'dijkstra',
              'LessonLearned',
              `Objective: ${lesson.objective}\nProblem: ${lesson.problem}\nSolution: ${lesson.solution}`,
              'lesson,repair,self-healing'
            );
          }
        },
        // Repair executor
        async (repairTasks: RepairTask[]) => {
          console.log(chalk.yellow(`[PHASE C] Executing ${repairTasks.length} repair tasks...`));
          // Convert RepairTask to full SwarmTask with required fields
          const fullTasks: SwarmTask[] = repairTasks.map(rt => ({
            id: rt.id,
            agent: rt.agent,
            task: rt.task,
            dependencies: rt.dependencies || [],
            status: 'pending' as const,
            retryCount: 0
          }));
          return executeGraphTasks(fullTasks, {
            yolo: this.config.yolo,
            maxRetries: 2
          });
        }
      );

      finalResults = phaseCResult.finalResults;
      missionSuccess = phaseCResult.success;

      await sessionCache.appendChronicle(
        `Self-healing: ${phaseCResult.repairCycles} cycles, success: ${missionSuccess}`
      );

      // Save workflow pattern if successful
      if (missionSuccess && plan.tasks.length > 1) {
        await this.agentMemory.add(
          'dijkstra',
          'WorkflowPattern',
          `Objective: ${refinedObjective}\nTasks: ${plan.tasks.map(t => t.task).join('; ')}`,
          'workflow,success,pattern'
        );
      }
    } else if (skipPhaseC) {
      // Log that Phase C was skipped
      logger.system('Skipped (simple task or all tasks succeeded)', 'debug');
      missionSuccess = executionResults.every(r => r.success);
    }

    logger.phaseEnd('C', { success: missionSuccess });

    // Validate prompt hasn't drifted too far from original
    if (!promptAudit.validateIntent(70)) {
      console.log(chalk.yellow('[WARNING] Prompt drift detected! Using original objective for synthesis.'));
      console.log(promptAudit.getSummary());
    }

    // =========================================
    // PHASE D: FINAL SYNTHESIS (Always uses Flash for speed)
    // =========================================
    logger.phaseStart('D', 'FINAL SYNTHESIS');

    const synthesisSpinner = logger.spin('synthesis', 'Regis is synthesizing final report...');
    logger.agentStart('regis', 'Synthesizing final report', EXECUTION_MODELS.flash);
    // Synthesis always uses Flash model (fast, cheap) - override Regis default
    const synthesizer = new Agent('regis', EXECUTION_MODELS.flash);

    // === WALIDACJA WYNIKÓW PRZED SYNTEZĄ (ANTY-HALUCYNACJE) ===
    // Sprawdzamy czy wyniki nie wyglądają na halucynacje AI
    const hallucinationWarnings: string[] = [];
    const validateAgentResults = (results: ExecutionResult[]): ExecutionResult[] => {
      return results.map(r => {
        const content = r.logs?.[0] || '';

        // Wzorce sugerujące że agent "proponuje" zamiast faktycznie wykonuje
        const suspiciousPatterns = [
          { pattern: /(?:Oto|Tutaj|Poniżej).*(?:przykład|propozycja|implementacja)/i,
            warning: 'Agent mógł wygenerować PRZYKŁADOWY kod zamiast rzeczywistych zmian' },
          { pattern: /(?:można|należy|warto|sugeruję|zalecam).*(?:dodać|zaimplementować|stworzyć)/i,
            warning: 'Agent opisał co MOŻNA zrobić zamiast CO FAKTYCZNIE ZROBIŁ' },
          { pattern: /(?:w pliku|do pliku|plik)\s+[a-zA-Z]+\d+\.(ts|js|tsx|jsx)/i,
            warning: 'Agent użył GENERYCZNEJ nazwy pliku (file1.ts, Class1.ts) - prawdopodobnie halucynacja' },
          { pattern: /(?:Class|File|Test|Helper|Utils?)\d+\.(ts|js|tsx)/i,
            warning: 'Wykryto generyczną nazwę klasy/pliku - może być halucynacja' }
        ];

        for (const { pattern, warning } of suspiciousPatterns) {
          if (pattern.test(content)) {
            hallucinationWarnings.push(`⚠️ Zadanie #${r.id}: ${warning}`);
          }
        }

        return r;
      });
    };

    // Waliduj wyniki i wyświetl ostrzeżenia
    const validatedResults = validateAgentResults(finalResults);
    if (hallucinationWarnings.length > 0) {
      console.log(chalk.yellow('\n[OSTRZEŻENIE] Wykryto potencjalne halucynacje w wynikach agentów:'));
      hallucinationWarnings.forEach(w => console.log(chalk.yellow(`  ${w}`)));
    }

    // Prepare results for synthesis - include full content for successful tasks
    const synthesisResults = validatedResults.map(r => ({
      id: r.id,
      success: r.success,
      // Include up to 6000 chars of actual results (increased from 2000)
      content: r.logs[0]?.substring(0, 6000) || '',
      error: r.error
    }));

    // Calculate total content size
    const totalContentSize = synthesisResults.reduce((sum, r) => sum + r.content.length, 0);
    const successfulTasks = synthesisResults.filter(r => r.success);

    // SMART PASSTHROUGH: If single successful task with substantial content,
    // skip Regis synthesis and return directly (avoid losing content)
    if (successfulTasks.length === 1 &&
        successfulTasks[0].content.length > 1000 &&
        missionSuccess) {
      logger.spinSuccess('synthesis', 'Mission Complete (Direct Output)');

      const directResult = successfulTasks[0].content;
      // Add minimal header
      const report = `🐺 **Misja zakończona sukcesem**\n\n${directResult}`;

      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      await sessionCache.appendChronicle(`Mission completed in ${duration}s. Success: ${missionSuccess} (passthrough)`);
      await sessionCache.flush();

      console.log(chalk.cyan('\n' + '='.repeat(60)));
      console.log(chalk.cyan('  MISSION SUCCESSFUL (DIRECT OUTPUT)'));
      console.log(chalk.gray(`  Original objective: "${objective.substring(0, 50)}..."`));
      console.log(chalk.gray(`  Duration: ${duration}s | Tasks: ${finalResults.length}`));
      console.log(chalk.cyan('='.repeat(60) + '\n'));

      return report;
    }

    const synthesisPrompt = `
═══════════════════════════════════════════════════════════════════
⛔ KRYTYCZNE ZASADY ANTY-HALUCYNACYJNE - PRZECZYTAJ PRZED SYNTEZĄ!
═══════════════════════════════════════════════════════════════════

BEZWZGLĘDNIE ZABRONIONYCH JEST:
1. WYMYŚLANIE nazw plików, klas, funkcji które NIE pojawiły się w wynikach agentów
2. GENEROWANIE kodu którego agent NIE dostarczył
3. PODAWANIE ścieżek do plików bez DOSŁOWNEGO cytowania z wyników
4. TWORZENIE fikcyjnych szczegółów implementacji
5. UŻYWANIE generycznych nazw jak: file1.ts, Class1.ts, test1.test.ts, helpers.ts

WYMAGANIA CYTOWANIA:
6. KAŻDA informacja MUSI być oznaczona źródłem: [Zadanie #X]
7. Format cytatu: "tekst dosłowny" [Zadanie #X]
8. Jeśli łączysz informacje z wielu zadań: [Zadania #X, #Y]
9. Bez cytatu = bez informacji - nie podawaj niczego co nie ma źródła
10. Przykład poprawny: "Plik został zmodyfikowany" [Zadanie #3]
11. Przykład niepoprawny: Plik został zmodyfikowany (brak źródła!)

OBOWIĄZKOWE:
- KAŻDA nazwa pliku w raporcie MUSI DOSŁOWNIE pochodzić z sekcji WYNIKI poniżej
- Gdy agent NIE podał szczegółów - pisz: "[Agenci nie dostarczyli szczegółów]"
- CYTUJ DOSŁOWNIE wyniki agentów lub NIE CYTUJ WCALE
- Jeśli nie ma konkretnych artefaktów - napisz to wprost

═══════════════════════════════════════════════════════════════════

ORYGINALNY CEL UŻYTKOWNIKA: ${objective}
CEL PO PRZETWORZENIU: ${refinedObjective}

WYNIKI WYKONANIA PRZEZ AGENTÓW:
${synthesisResults.map(r => `
=== ZADANIE #${r.id} (${r.success ? 'SUKCES' : 'BŁĄD'}) ===
${r.content}
${r.error ? `BŁĄD: ${r.error}` : ''}
`).join('\n')}

STATUS MISJI: ${missionSuccess ? 'SUKCES' : 'CZĘŚCIOWY/NIEUDANY'}

═══════════════════════════════════════════════════════════════════
OBOWIĄZKOWY FORMAT RAPORTU (5 SEKCJI):
═══════════════════════════════════════════════════════════════════

## Podsumowanie
[2-3 zdania - CZY cel "${objective}" został zrealizowany?]

## Zgodność z celem użytkownika
- **ORYGINALNY CEL UŻYTKOWNIKA (NIEZMIENIONY):** ${objective}
- **Cel po przetworzeniu:** ${refinedObjective}
- **Czy cel po przetworzeniu odpowiada oryginałowi?:** [TAK/NIE - jeśli NIE, opisz rozbieżność]
- **Zrealizowano oryginalny cel:** [TAK/NIE/CZĘŚCIOWO - oceniaj względem ORYGINALNEGO celu, nie przetworzonego!]
- **Dostarczone artefakty:** [TYLKO te które DOSŁOWNIE pojawiły się w wynikach]
- **Czego brakuje do pełnej realizacji ORYGINALNEGO celu:** [jeśli cokolwiek]

## Wyniki
[TYLKO DOSŁOWNE CYTATY z wyników agentów - KAŻDY z oznaczeniem [Zadanie #X]!]
[Format: "cytat" [Zadanie #X]]
[Jeśli agent podał listę - przepisz DOSŁOWNIE z [Zadanie #X]]
[Jeśli agent NIE podał szczegółów - napisz: "Brak szczegółów" [Zadanie #X]]
[NIE WYMYŚLAJ - każda informacja MUSI mieć źródło!]

## Problemy
[Cytuj błędy DOSŁOWNIE z wyników lub: "Brak problemów."]

## Rekomendacje
[Oparte TYLKO na faktycznych wynikach - nie wymyślaj co można zrobić]

ZASADY:
- PIERWSZA linia = ## Podsumowanie
- Pisz PO POLSKU
- NIE WYMYŚLAJ - tylko cytuj dosłownie
- Lepiej napisać "brak danych" niż wymyślić cokolwiek
`;

    let report = await synthesizer.think(synthesisPrompt, `Original objective: ${objective}`);

    // =========================================
    // ANTI-HALLUCINATION: Solutions 21-24
    // =========================================

    // Solution 21: Check for duplicate/near-duplicate content in results
    const deduplicationResult = responseDeduplicator.checkDuplicates(finalResults.map(r => r.logs?.[0] || ''));
    if (deduplicationResult.hasDuplicates) {
      console.log(chalk.yellow(`[Anti-Hallucination] Detected ${deduplicationResult.duplicates.length} duplicate responses`));
      deduplicationResult.duplicates.forEach(d => {
        console.log(chalk.gray(`  - Tasks ${d.indices.join(', ')}: ${(d.similarity * 100).toFixed(0)}% similarity`));
      });
    }

    // Solution 22: Verify result hashes for tampering detection
    const hashResults = finalResults.map(r => ({
      id: r.id,
      hash: resultHashVerifier.computeHash(r.logs?.[0] || ''),
      content: r.logs?.[0] || ''
    }));
    resultHashVerifier.registerHashes(hashResults.map(h => ({ id: h.id, hash: h.hash })));

    // Solution 23: Sanitize output - remove speculative language and unverified claims
    const sanitizeResult = sanitizeOutput(report);
    report = sanitizeResult.content;

    // Solution 24: Validate final report against agent results and original objective
    const validationResult = validateFinalReport(report, ORIGINAL_OBJECTIVE, finalResults);
    if (!validationResult.isValid) {
      console.log(chalk.yellow(`[Anti-Hallucination] Report validation issues:`));
      validationResult.issues.forEach(issue => {
        console.log(chalk.yellow(`  - ${issue}`));
      });

      // Add warning to report if validation failed
      if (validationResult.issues.length > 0) {
        report += `\n\n⚠️ **Ostrzeżenia walidacji:**\n${validationResult.issues.map(i => `- ${i}`).join('\n')}`;
      }
    } else {
      console.log(chalk.green(`[Anti-Hallucination] Report validation passed (score: ${validationResult.score}%)`));
    }

    // =========================================
    // ADVANCED REASONING: Self-Reflection before final report
    // DISABLED: Self-reflection changes the required Markdown format
    // =========================================
    // if (this.config.enableAdvancedReasoning &&
    //     this.config.intelligenceConfig?.useSelfReflection) {
    //   logger.spinUpdate('synthesis', 'Self-Reflection: improving final report...');
    //   try {
    //     const reflectionResult = await selfReflect(
    //       refinedObjective,
    //       report,
    //       2  // Max 2 iterations
    //     );
    //     if (reflectionResult.confidenceImprovement > 15) {
    //       report = reflectionResult.improvedResponse;
    //       console.log(chalk.gray(`[Self-Reflect] Improved report by ${reflectionResult.confidenceImprovement}%`));
    //     }
    //   } catch (e: any) {
    //     console.log(chalk.yellow(`[Self-Reflect] Failed: ${e.message}`));
    //   }
    // }

    // =========================================
    // INTELLIGENCE LAYER ENHANCEMENT
    // =========================================
    if (this.config.enableIntelligenceLayer) {
      logger.spinUpdate('synthesis', 'Enhancing with Intelligence Layer...');

      // Enable multi-perspective for critical/complex tasks
      const intelligenceConfig = {
        ...this.config.intelligenceConfig,
        useMultiPerspective: taskClassification?.difficulty === 'critical' ||
                             taskClassification?.difficulty === 'complex',
        // Skip self-reflection here since we did it above
        useSelfReflection: false
      };

      report = await enhanceWithIntelligence(
        refinedObjective,
        report,
        intelligenceConfig
      );

      // Record in knowledge graph for future learning
      knowledgeGraph.recordExecution(refinedObjective, report, missionSuccess);

      // Add to context manager for session continuity
      contextManager.add(report, 'result', missionSuccess ? 0.8 : 0.5);
    }

    logger.spinSuccess('synthesis', 'Mission Complete');
    logger.agentSuccess('regis', { chars: report.length, time: Date.now() - startTime });
    logger.phaseEnd('D', { success: true });

    // === SOLUTION 8: ALWAYS SHOW ORIGINAL OBJECTIVE IN REPORT ===
    // Prepend original objective to report for transparency
    const originalObjectiveHeader = `
═══════════════════════════════════════════════════════════════════
📋 ORYGINALNY CEL UŻYTKOWNIKA: ${objective}
═══════════════════════════════════════════════════════════════════

`;

    // Add header to report if not already present
    if (!report.includes('ORYGINALNY CEL UŻYTKOWNIKA')) {
      report = originalObjectiveHeader + report;
    }

    // Final chronicle entry
    const duration = Date.now() - startTime;
    await sessionCache.appendChronicle(`Mission completed in ${(duration/1000).toFixed(1)}s. Success: ${missionSuccess}`);
    await sessionCache.flush();

    // Calculate stats
    const successCount = finalResults.filter(r => r.success).length;
    const failedCount = finalResults.length - successCount;
    const estimatedInputTokens = refinedObjective.length / 4 + (plan.tasks.length * 500);
    const estimatedOutputTokens = report.length / 4 + finalResults.reduce((sum, r) => sum + (r.logs?.[0]?.length || 0) / 4, 0);

    // Show comprehensive summary
    logger.summary({
      totalTime: duration,
      phases: 4, // PRE-A, A, B, C/D
      tasks: {
        total: finalResults.length,
        success: successCount,
        failed: failedCount
      },
      tokens: {
        input: Math.round(estimatedInputTokens),
        output: Math.round(estimatedOutputTokens)
      },
      cost: (estimatedInputTokens * 0.000075 + estimatedOutputTokens * 0.0003) / 1000
    });

    // Intelligence layer stats
    if (this.config.enableIntelligenceLayer) {
      const cacheStats = semanticCache.getStats();
      const graphStats = knowledgeGraph.getStats();
      logger.system(`Intelligence: Cache ${cacheStats.size} entries (${cacheStats.totalHits} hits) | Knowledge ${graphStats.nodes} nodes`, 'debug');
    }

    // Generate next step suggestions based on completed task
    const suggestions = await this.generateNextStepSuggestions(refinedObjective, report, finalResults, missionSuccess);
    if (suggestions.length > 0) {
      console.log('');
      console.log(chalk.cyan('════════════════════════════════════════════════════════════'));
      console.log(chalk.cyan.bold('  💡 SUGESTIE DALSZYCH KROKÓW'));
      console.log(chalk.cyan('════════════════════════════════════════════════════════════'));
      suggestions.forEach((suggestion, i) => {
        console.log(chalk.white(`  ${i + 1}. ${suggestion}`));
      });
      console.log(chalk.cyan('────────────────────────────────────────────────────────────'));
      console.log(chalk.gray('  Wpisz numer lub opis aby kontynuować'));
      console.log('');
    }

    return report;
  }

  /**
   * Build MCP tools context for planning
   */
  private buildMcpContext(): string {
    const mcpTools = mcpManager.getAllTools();

    if (mcpTools.length === 0) return '';

    let context = `
AVAILABLE MCP TOOLS (Model Context Protocol):
These are external tools that agents can use. Assign Philippa for tasks requiring MCP tools.
`;

    // Group tools by server
    const toolsByServer: Map<string, string[]> = new Map();

    for (const tool of mcpTools) {
      if (!toolsByServer.has(tool.serverName)) {
        toolsByServer.set(tool.serverName, []);
      }
      const desc = tool.description?.substring(0, 60) || 'No description';
      toolsByServer.get(tool.serverName)!.push(`  - ${tool.name}: ${desc}...`);
    }

    for (const [server, tools] of toolsByServer) {
      context += `\n[${server}]:\n${tools.slice(0, 5).join('\n')}`;
      if (tools.length > 5) {
        context += `\n  ... and ${tools.length - 5} more tools`;
      }
    }

    context += `\n
To use an MCP tool, include in the task:
  "Use MCP tool: serverName__toolName with params: {...}"
`;

    return context;
  }

  /**
   * Generate 5 suggestions for next steps based on completed task
   */
  private async generateNextStepSuggestions(
    objective: string,
    report: string,
    results: ExecutionResult[],
    success: boolean
  ): Promise<string[]> {
    const suggestions: string[] = [];
    const objectiveLower = objective.toLowerCase();
    const failedTasks = results.filter(r => !r.success);
    const successTasks = results.filter(r => r.success);

    // 1. Sugestie oparte na statusie wykonania
    if (!success || failedTasks.length > 0) {
      suggestions.push(`Napraw ${failedTasks.length} nieudanych zadań: "${failedTasks[0]?.error?.substring(0, 50)}..."`);
      suggestions.push('Uruchom ponownie z trybem debugowania: @lambert diagnozuj błędy');
    }

    // 2. Sugestie oparte na typie zadania
    if (objectiveLower.includes('walidacj') || objectiveLower.includes('pydantic') || objectiveLower.includes('schema')) {
      suggestions.push('Uruchom testy jednostkowe dla nowych schematów walidacji');
      suggestions.push('Dodaj walidację dla pozostałych narzędzi MCP');
      suggestions.push('Wygeneruj dokumentację API dla schematów Pydantic');
    }

    if (objectiveLower.includes('test') || objectiveLower.includes('regresj')) {
      suggestions.push('Uruchom pełen zestaw testów: npm test');
      suggestions.push('Sprawdź pokrycie kodu testami: npm run coverage');
      suggestions.push('Dodaj testy integracyjne dla edge cases');
    }

    if (objectiveLower.includes('cli') || objectiveLower.includes('pętl')) {
      suggestions.push('Przetestuj CLI w trybie interaktywnym');
      suggestions.push('Sprawdź obsługę błędów w różnych środowiskach (cmd, PowerShell, Git Bash)');
      suggestions.push('Dodaj testy E2E dla sekwencji komend');
    }

    if (objectiveLower.includes('mcp') || objectiveLower.includes('tool')) {
      suggestions.push('Zweryfikuj połączenie z serwerami MCP: /mcp status');
      suggestions.push('Przetestuj każde narzędzie MCP z przykładowymi danymi');
      suggestions.push('Dodaj retry logic dla niestabilnych połączeń MCP');
    }

    // 3. Sugestie generyczne (jeśli brakuje specyficznych)
    if (suggestions.length < 3) {
      suggestions.push('Zbuduj projekt i sprawdź błędy kompilacji: npm run build');
    }
    if (suggestions.length < 4) {
      suggestions.push('Sprawdź logi i metryki wykonania: /status');
    }
    if (suggestions.length < 5) {
      suggestions.push('Zaktualizuj dokumentację z wprowadzonymi zmianami');
    }

    // 4. Sugestie oparte na wynikach
    if (successTasks.length > 5) {
      suggestions.push(`Przejrzyj ${successTasks.length} ukończonych zadań i zoptymalizuj powtarzalne operacje`);
    }

    // Ogranicz do 5 sugestii
    return suggestions.slice(0, 5);
  }

  /**
   * Solution 17: Check multi-agent consensus on key facts
   * Compares results from multiple agents to detect inconsistencies
   */
  private checkMultiAgentConsensus(results: ExecutionResult[]): {
    hasConsensus: boolean;
    agreements: string[];
    conflicts: { topic: string; agents: string[]; values: string[] }[];
    consensusScore: number;
  } {
    const agreements: string[] = [];
    const conflicts: { topic: string; agents: string[]; values: string[] }[] = [];

    // Extract key facts from each result
    const factsByAgent = new Map<number, Set<string>>();

    for (const result of results) {
      if (!result.success || !result.logs[0]) continue;

      const content = result.logs[0];
      const facts = new Set<string>();

      // Extract file paths mentioned
      const filePaths = content.match(/(?:src|lib|app)\/[\w\/-]+\.\w+/g) || [];
      filePaths.forEach(p => facts.add(`file:${p}`));

      // Extract function/class names
      const definitions = content.match(/(?:function|class|interface|type)\s+(\w+)/g) || [];
      definitions.forEach(d => facts.add(`def:${d}`));

      // Extract commands executed
      const commands = content.match(/EXEC:\s*([^\n]+)/g) || [];
      commands.forEach(c => facts.add(`cmd:${c}`));

      factsByAgent.set(result.id, facts);
    }

    // Find agreements (facts mentioned by multiple agents)
    const allFacts = new Map<string, number[]>();
    for (const [taskId, facts] of factsByAgent) {
      for (const fact of facts) {
        if (!allFacts.has(fact)) {
          allFacts.set(fact, []);
        }
        allFacts.get(fact)!.push(taskId);
      }
    }

    for (const [fact, taskIds] of allFacts) {
      if (taskIds.length > 1) {
        agreements.push(`${fact} (Zadania: ${taskIds.join(', ')})`);
      }
    }

    // Detect conflicts (same file, different content claims)
    const fileVersions = new Map<string, Map<number, string>>();
    for (const result of results) {
      if (!result.success || !result.logs[0]) continue;

      // Look for file write operations
      const writeOps = result.logs[0].match(/===ZAPIS===\s*([^\n]+)\n([\s\S]*?)(?====|$)/g) || [];
      for (const op of writeOps) {
        const match = op.match(/===ZAPIS===\s*([^\n]+)/);
        if (match) {
          const filePath = match[1].trim();
          if (!fileVersions.has(filePath)) {
            fileVersions.set(filePath, new Map());
          }
          fileVersions.get(filePath)!.set(result.id, op.substring(0, 100));
        }
      }
    }

    // Check for conflicting file versions
    for (const [file, versions] of fileVersions) {
      if (versions.size > 1) {
        conflicts.push({
          topic: `Plik: ${file}`,
          agents: Array.from(versions.keys()).map(id => `Zadanie #${id}`),
          values: Array.from(versions.values())
        });
      }
    }

    // Calculate consensus score
    const totalFacts = allFacts.size;
    const agreedFacts = agreements.length;
    const conflictCount = conflicts.length;

    let consensusScore = 100;
    if (totalFacts > 0) {
      consensusScore = Math.round((agreedFacts / totalFacts) * 100);
    }
    consensusScore -= conflictCount * 20;
    consensusScore = Math.max(0, Math.min(100, consensusScore));

    return {
      hasConsensus: conflicts.length === 0 && consensusScore >= 50,
      agreements,
      conflicts,
      consensusScore
    };
  }

  /**
   * Clean JSON string from markdown and artifacts
   */
  private cleanJson(raw: string): string {
    return raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .replace(/^\s*[\r\n]+/gm, '')
      .trim();
  }

  // =========================================
  // YOLO Helper Methods
  // =========================================

  async readFile(filepath: string): Promise<string> {
    if (!this.config.fileAccess) throw new Error('File access disabled');
    return fs.readFile(filepath, 'utf-8');
  }

  async writeFile(filepath: string, content: string): Promise<void> {
    if (!this.config.fileAccess) throw new Error('File access disabled');
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    await fs.writeFile(filepath, content, 'utf-8');
  }

  async executeCommand(command: string): Promise<string> {
    if (!this.config.shellAccess) throw new Error('Shell access disabled');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    const { stdout, stderr } = await execAsync(command);
    return stdout + (stderr ? `\nSTDERR: ${stderr}` : '');
  }

  async fetchUrl(url: string): Promise<string> {
    if (!this.config.networkAccess) throw new Error('Network access disabled');
    const response = await fetch(url);
    return response.text();
  }

  /**
   * Get swarm status
   */
  getStatus(): { config: YoloConfig; graphStatus: any } {
    return {
      config: this.config,
      graphStatus: this.graphProcessor.getStatus()
    };
  }
}

export { YoloConfig };
