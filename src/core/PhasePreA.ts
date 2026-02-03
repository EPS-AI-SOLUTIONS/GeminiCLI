/**
 * PhasePreA - Translation, Refinement and Classification of Objectives
 * Ported from AgentSwarm.psm1 lines 739-780
 *
 * This phase runs BEFORE planning to:
 * 1. Translate non-English objectives to English
 * 2. Refine vague objectives into precise, actionable goals
 * 3. Optimize the objective for AI agent processing
 * 4. CLASSIFY task difficulty and select optimal model tier
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import chalk from 'chalk';
import 'dotenv/config';
import { geminiSemaphore } from './TrafficControl.js';

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Fast model for refinement and classification (low latency)
const REFINEMENT_MODEL = 'gemini-3-flash-preview';
const CLASSIFIER_MODEL = 'gemini-3-flash-preview';

// Model tiers for task execution
export const EXECUTION_MODELS = {
  flash: 'gemini-3-flash-preview',    // Fast, simple tasks
  pro: 'gemini-3-pro-preview'         // Complex, critical tasks
};

// Task difficulty levels
export type TaskDifficulty = 'simple' | 'moderate' | 'complex' | 'critical';

// Classification result
export interface TaskClassification {
  difficulty: TaskDifficulty;
  recommendedModel: 'flash' | 'pro';
  reasoning: string;
  estimatedAgents: number;
  requiresResearch: boolean;
  requiresCodeGeneration: boolean;
}

/**
 * Classification prompt template
 */
const CLASSIFICATION_PROMPT = `You are an expert task complexity analyzer for an AI agent swarm.

Analyze the following task and classify its difficulty level.

TASK: {objective}

CLASSIFICATION CRITERIA:
- SIMPLE: Single-step tasks, quick answers, simple file operations, basic questions
  Examples: "What is X?", "List files in folder", "Fix this typo", "Rename variable"

- MODERATE: Multi-step tasks requiring some planning, moderate code changes
  Examples: "Add a new endpoint", "Refactor this function", "Write unit tests for X"

- COMPLEX: Tasks requiring deep analysis, multiple agents, significant code generation
  Examples: "Build a new feature", "Migrate to new architecture", "Debug complex issue"

- CRITICAL: Mission-critical tasks, security audits, major refactoring, production deployments
  Examples: "Security audit", "Database migration", "System architecture redesign"

OUTPUT FORMAT (JSON only, no markdown):
{
  "difficulty": "simple|moderate|complex|critical",
  "recommendedModel": "flash|pro",
  "reasoning": "Brief explanation (max 50 words)",
  "estimatedAgents": 1-5,
  "requiresResearch": true/false,
  "requiresCodeGeneration": true/false
}

Rules:
- Use "flash" for simple/moderate tasks (faster, cheaper)
- Use "pro" for complex/critical tasks (better quality)
- Be conservative - when uncertain, choose higher difficulty`;

/**
 * Refinement prompt template - STRICT TRANSLATION ONLY
 */
const REFINEMENT_PROMPT = `You are a STRICT translator. Your ONLY job is to translate text to English.

CRITICAL RULES:
1. If input is already in English - return it EXACTLY as-is, unchanged
2. If input is in another language - translate to English LITERALLY
3. DO NOT add, remove, or change ANY meaning
4. DO NOT "improve", "clarify", or "optimize" the text
5. DO NOT add technical jargon that wasn't there
6. DO NOT interpret or expand the request
7. Preserve the EXACT intent and scope of the original

Input: {objective}

OUTPUT ONLY THE ENGLISH TRANSLATION. NOTHING ELSE.`;

/**
 * Configuration for Phase PRE-A
 */
export interface PhasePreAConfig {
  enabled?: boolean;
  model?: string;
  maxRetries?: number;
  timeout?: number;
}

const DEFAULT_CONFIG: PhasePreAConfig = {
  enabled: true,
  model: REFINEMENT_MODEL,
  maxRetries: 2,
  timeout: 30000
};

/**
 * Execute Phase PRE-A: Objective Refinement
 *
 * @param objective - Raw user objective
 * @param config - Optional configuration
 * @returns Refined objective in English
 */
export async function refineObjective(
  objective: string,
  config: PhasePreAConfig = {}
): Promise<string> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Skip if disabled
  if (!cfg.enabled) {
    console.log(chalk.gray('[PRE-A] Refinement disabled, using original objective'));
    return objective;
  }

  console.log(chalk.cyan('\n--- PHASE PRE-A: TRANSLATION & REFINEMENT ---'));
  console.log(chalk.gray(`[PRE-A] Original: "${objective.substring(0, 100)}${objective.length > 100 ? '...' : ''}"`));

  const prompt = REFINEMENT_PROMPT.replace('{objective}', objective);

  for (let attempt = 0; attempt < cfg.maxRetries!; attempt++) {
    try {
      const refined = await geminiSemaphore.withPermit(async () => {
        const model = genAI.getGenerativeModel({
          model: cfg.model!,
          generationConfig: {
            temperature: 0.1, // Low temperature for consistency
            maxOutputTokens: 256 // Short output
          }
        });

        const result = await model.generateContent(prompt);
        return result.response.text().trim();
      });

      // Validate response
      if (!refined || refined.length < 5) {
        throw new Error('Response too short');
      }

      // Check for error markers
      if (refined.toLowerCase().includes('error') && refined.length < 50) {
        throw new Error('Response contains error marker');
      }

      console.log(chalk.green(`[PRE-A] Refined:  "${refined.substring(0, 100)}${refined.length > 100 ? '...' : ''}"`));
      return refined;

    } catch (error: any) {
      console.log(chalk.yellow(`[PRE-A] Attempt ${attempt + 1} failed: ${error.message}`));

      if (attempt === cfg.maxRetries! - 1) {
        console.log(chalk.yellow('[PRE-A] All attempts failed. Using original objective.'));
        return objective;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  return objective;
}

/**
 * Check if objective needs translation (simple heuristic)
 */
export function needsTranslation(text: string): boolean {
  // Check for non-ASCII characters (rough heuristic for non-English)
  const nonAsciiRatio = (text.match(/[^\x00-\x7F]/g) || []).length / text.length;
  return nonAsciiRatio > 0.1; // More than 10% non-ASCII suggests non-English
}

/**
 * Check if objective is vague (needs refinement)
 */
export function isVagueObjective(text: string): boolean {
  const vagueWords = ['somehow', 'maybe', 'perhaps', 'something', 'stuff', 'things', 'etc', 'whatever', 'jakoś', 'coś'];
  const lowerText = text.toLowerCase();
  return vagueWords.some(word => lowerText.includes(word)) || text.length < 10;
}

/**
 * Quick refinement (skip API call if objective is already good)
 */
export async function smartRefine(
  objective: string,
  config: PhasePreAConfig = {}
): Promise<string> {
  // Skip refinement for already good objectives
  if (!needsTranslation(objective) && !isVagueObjective(objective) && objective.length > 20) {
    console.log(chalk.gray('[PRE-A] Objective looks good, minimal refinement...'));

    // Just clean up whitespace and punctuation
    let cleaned = objective.trim();
    if (!cleaned.endsWith('.') && !cleaned.endsWith('?') && !cleaned.endsWith('!')) {
      cleaned += '.';
    }
    return cleaned;
  }

  // Full refinement needed
  return refineObjective(objective, config);
}

/**
 * Solution 3: Validate translation didn't significantly alter meaning
 * Compares word overlap between original and translated
 */
export function validateTranslation(original: string, translated: string): {
  valid: boolean;
  similarity: number;
  warning?: string;
} {
  // Skip validation for English-only text (no change expected)
  const hasNonAscii = /[^\x00-\x7F]/.test(original);
  if (!hasNonAscii && original === translated) {
    return { valid: true, similarity: 100 };
  }

  // Extract key content words (nouns, verbs - skip articles, prepositions)
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'or', 'and', 'but', 'if', 'then', 'be', 'have', 'do', 'this', 'that', 'it', 'i', 'you', 'we', 'they']);

  const extractKeyWords = (text: string): Set<string> => {
    return new Set(
      text.toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w))
    );
  };

  const originalWords = extractKeyWords(original);
  const translatedWords = extractKeyWords(translated);

  // Calculate Jaccard similarity
  const intersection = new Set([...originalWords].filter(w => translatedWords.has(w)));
  const union = new Set([...originalWords, ...translatedWords]);

  const similarity = union.size > 0
    ? Math.round((intersection.size / union.size) * 100)
    : 100;

  // If translation is significantly shorter, that's suspicious
  const lengthRatio = translated.length / Math.max(original.length, 1);
  const tooShort = lengthRatio < 0.5;
  const tooLong = lengthRatio > 2.0;

  if (similarity < 30 || tooShort || tooLong) {
    return {
      valid: false,
      similarity,
      warning: `Translation may have altered meaning. Similarity: ${similarity}%, Length ratio: ${lengthRatio.toFixed(2)}`
    };
  }

  return { valid: true, similarity };
}

/**
 * Classify task difficulty using Gemini Flash
 * Returns classification with recommended model tier
 */
export async function classifyTaskDifficulty(
  objective: string
): Promise<TaskClassification> {
  console.log(chalk.cyan('[PRE-A] Classifying task difficulty...'));

  const prompt = CLASSIFICATION_PROMPT.replace('{objective}', objective);

  try {
    const classification = await geminiSemaphore.withPermit(async () => {
      const model = genAI.getGenerativeModel({
        model: CLASSIFIER_MODEL,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 256
        }
      });

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    });

    // Parse JSON response - extract JSON object from potentially messy response
    let jsonStr = classification
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    // Extract JSON object - find first { and last } to handle nested objects
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      // Heuristic classification when API response is invalid
      const lowerObj = objective.toLowerCase();

      // Simple tasks: short queries, questions, basic operations
      const simplePatterns = /^(what|how|why|when|where|who|is|are|can|does|do|list|show|get|check|find|tell|say|count|calculate|policz|sprawdź|pokaż|lista|powiedz|ile|czy|co|jak|gdzie|kiedy|cześć|hello|hi|hey)/i;
      const simpleMathPatterns = /^\d|[\+\-\*\/\=]|\b\d+\s*[\+\-\*\/]\s*\d+\b/;
      const isSimple = lowerObj.length < 40 || simplePatterns.test(lowerObj) || simpleMathPatterns.test(lowerObj);

      // Complex tasks: architecture, refactoring, major features
      const complexPatterns = /(refactor|migrate|architect|security|audit|redesign|rewrite|overhaul|infrastructure|deployment|pipeline|database.*(migrat|schema)|full.*(feature|system)|major)/i;
      const isComplex = complexPatterns.test(lowerObj);

      // Moderate: code generation, testing, debugging
      const moderatePatterns = /(implement|create|build|write|add|fix|debug|test|update|modify|change|enhance|improve)/i;
      const isModerate = moderatePatterns.test(lowerObj) && !isComplex;

      const difficulty: TaskDifficulty = isComplex ? 'complex' : isModerate ? 'moderate' : isSimple ? 'simple' : 'moderate';

      console.log(chalk.gray(`[PRE-A] Heuristic: ${difficulty.toUpperCase()}`));

      return {
        difficulty,
        recommendedModel: difficulty === 'complex' ? 'pro' : 'flash',
        reasoning: 'Heuristic classification (API response invalid)',
        estimatedAgents: isComplex ? 3 : isModerate ? 2 : 1,
        requiresResearch: /(research|analyze|investigate|explore|search|find.*information)/i.test(lowerObj),
        requiresCodeGeneration: /(code|function|class|implement|write|create|build|script)/i.test(lowerObj)
      };
    }
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);

    const parsed = JSON.parse(jsonStr) as TaskClassification;

    // Validate and sanitize
    const validDifficulties: TaskDifficulty[] = ['simple', 'moderate', 'complex', 'critical'];
    if (!validDifficulties.includes(parsed.difficulty)) {
      parsed.difficulty = 'moderate';
    }

    if (parsed.recommendedModel !== 'flash' && parsed.recommendedModel !== 'pro') {
      parsed.recommendedModel = parsed.difficulty === 'simple' || parsed.difficulty === 'moderate' ? 'flash' : 'pro';
    }

    // Log classification result
    const modelColor = parsed.recommendedModel === 'pro' ? chalk.yellow : chalk.green;
    const difficultyColor =
      parsed.difficulty === 'critical' ? chalk.red :
      parsed.difficulty === 'complex' ? chalk.yellow :
      parsed.difficulty === 'moderate' ? chalk.cyan :
      chalk.green;

    console.log(chalk.gray(`[PRE-A] Difficulty: `) + difficultyColor(parsed.difficulty.toUpperCase()));
    console.log(chalk.gray(`[PRE-A] Model: `) + modelColor(parsed.recommendedModel === 'pro' ? 'Gemini Pro (Quality)' : 'Gemini Flash (Speed)'));
    console.log(chalk.gray(`[PRE-A] Agents: ~${parsed.estimatedAgents} | Research: ${parsed.requiresResearch ? 'Yes' : 'No'} | Code: ${parsed.requiresCodeGeneration ? 'Yes' : 'No'}`));
    console.log(chalk.gray(`[PRE-A] Reason: ${parsed.reasoning}`));

    return parsed;

  } catch (error: any) {
    console.log(chalk.yellow(`[PRE-A] Classification failed: ${error.message}. Using defaults.`));

    // Default: moderate difficulty, flash model
    return {
      difficulty: 'moderate',
      recommendedModel: 'flash',
      reasoning: 'Classification failed, using safe defaults',
      estimatedAgents: 2,
      requiresResearch: false,
      requiresCodeGeneration: true
    };
  }
}

/**
 * Solution 5: Separate context from task in user prompt
 * Prevents AI from confusing background info with actionable tasks
 */
export interface SeparatedPrompt {
  context: string;      // Background information, references
  task: string;         // The actual actionable request
  originalFull: string; // Original unchanged prompt
}

export function separateContextFromTask(prompt: string): SeparatedPrompt {
  const originalFull = prompt;

  // Patterns that typically indicate context vs task
  const contextPatterns = [
    /^(?:w projekcie|in project|projekt zawiera|the project has).+?[.!]\s*/i,
    /^(?:mam|i have|jest|there is|znajduje się).+?[.!]\s*/i,
    /^(?:kontekst|context|background|wcześniej|previously):.+?[.!]\s*/i,
    /^(?:plik|file|folder|directory|katalog)\s+[\w\/\\.]+\s+(?:zawiera|contains).+?[.!]\s*/i,
  ];

  let context = '';
  let remaining = prompt;

  // Extract context sentences
  for (const pattern of contextPatterns) {
    const match = remaining.match(pattern);
    if (match) {
      context += match[0] + ' ';
      remaining = remaining.replace(pattern, '').trim();
    }
  }

  // Common task indicators
  const taskIndicators = [
    /(?:proszę|please|zrób|do|wykonaj|execute|napraw|fix|dodaj|add|usuń|remove|stwórz|create|napisz|write|zmień|change|zaimplementuj|implement)/i
  ];

  // Find where task begins
  let taskStart = 0;
  for (const pattern of taskIndicators) {
    const match = remaining.match(pattern);
    if (match && match.index !== undefined) {
      if (taskStart === 0 || match.index < taskStart) {
        taskStart = match.index;
      }
    }
  }

  // If we found a task indicator, split there
  if (taskStart > 0) {
    context += remaining.substring(0, taskStart).trim();
    remaining = remaining.substring(taskStart).trim();
  }

  return {
    context: context.trim(),
    task: remaining.trim() || prompt, // Fallback to original if parsing fails
    originalFull
  };
}

/**
 * Full Phase PRE-A: Refine + Classify
 * Returns both refined objective and classification
 */
export interface PhasePreAResult {
  refinedObjective: string;
  classification: TaskClassification;
}

export async function executePhasePreA(
  objective: string,
  config: PhasePreAConfig = {}
): Promise<PhasePreAResult> {
  // BUG-002 FIX: Detect direct commands that should NOT be transformed
  // These are imperative commands where user wants exact execution
  const DIRECT_COMMAND_PATTERNS = [
    /^(wygeneruj|napisz|stwórz|zrób|wykonaj|utwórz|podaj|wypisz|pokaż)\s+/i,
    /^(generate|write|create|make|execute|output|show|list|print)\s+/i,
    /^(napraw|popraw|zmień|edytuj|zaktualizuj)\s+/i,
    /^(fix|repair|change|edit|update|modify)\s+/i
  ];

  const isDirectCommand = DIRECT_COMMAND_PATTERNS.some(p => p.test(objective.trim()));

  if (isDirectCommand) {
    console.log(chalk.green('[PRE-A] Detected direct command - preserving original objective'));
    // For direct commands, skip refinement but still classify
    const classification = await classifyTaskDifficulty(objective);
    return {
      refinedObjective: objective, // Keep EXACTLY as user wrote it
      classification
    };
  }

  // PARALLEL EXECUTION: Refine + Classify at the same time (~300-600ms saved)
  const [refinedObjective, classification] = await Promise.all([
    smartRefine(objective, config),
    classifyTaskDifficulty(objective)  // Use original - works on both
  ]);

  // === SOLUTION 3 & 5: Validate translation and separate context ===
  const validation = validateTranslation(objective, refinedObjective);
  if (!validation.valid) {
    console.log(chalk.yellow(`[PRE-A] Translation validation warning: ${validation.warning}`));
    console.log(chalk.yellow(`[PRE-A] Using original objective to preserve intent.`));
    return {
      refinedObjective: objective, // Fallback to original
      classification
    };
  }

  // Separate context from task for clearer processing
  const separated = separateContextFromTask(refinedObjective);
  if (separated.context) {
    console.log(chalk.gray(`[PRE-A] Context extracted: "${separated.context.substring(0, 50)}..."`));
  }

  return {
    refinedObjective: separated.task, // Use task-only portion
    classification
  };
}

export default {
  refineObjective,
  smartRefine,
  needsTranslation,
  isVagueObjective,
  classifyTaskDifficulty,
  executePhasePreA,
  validateTranslation,
  separateContextFromTask,
  EXECUTION_MODELS
};
