/**
 * GeminiHydra - Synthesis Service
 * Handles result synthesis and summarization
 */

import { MIN_SINGLE_RESULT_LENGTH, RESULT_PREVIEW_LENGTH } from '../config/constants.js';
import type { ExecutionResult } from '../types/index.js';
import { AppError } from './BaseAgentService.js';

export class SynthesisService {
  /**
   * Check if synthesis is needed or single result can be returned
   */
  needsSynthesis(results: ExecutionResult[]): boolean {
    if (!Array.isArray(results)) {
      throw new AppError({
        code: 'SYNTHESIS_INVALID_ARGS',
        message: 'SynthesisService.needsSynthesis: results must be an array',
        context: { method: 'needsSynthesis', field: 'results', type: typeof results },
      });
    }

    const successResults = results.filter((r) => r.success);

    // Single successful result with sufficient content - no synthesis needed
    const firstContent = successResults[0]?.content ?? '';
    if (successResults.length === 1 && firstContent.length > MIN_SINGLE_RESULT_LENGTH) {
      return false;
    }

    return true;
  }

  /**
   * Get single result if no synthesis needed
   */
  getSingleResult(results: ExecutionResult[]): string | null {
    if (!Array.isArray(results)) {
      throw new AppError({
        code: 'SYNTHESIS_INVALID_ARGS',
        message: 'SynthesisService.getSingleResult: results must be an array',
        context: { method: 'getSingleResult', field: 'results', type: typeof results },
      });
    }

    const successResults = results.filter((r) => r.success);

    const firstContent = successResults[0]?.content;
    if (
      successResults.length === 1 &&
      firstContent &&
      firstContent.length > MIN_SINGLE_RESULT_LENGTH
    ) {
      return firstContent;
    }

    return null;
  }

  /**
   * Build synthesis prompt
   */
  buildPrompt(objective: string, results: ExecutionResult[]): string {
    if (typeof objective !== 'string' || objective.trim() === '') {
      throw new AppError({
        code: 'SYNTHESIS_INVALID_ARGS',
        message:
          'SynthesisService.buildPrompt: objective is required and must be a non-empty string',
        context: { method: 'buildPrompt', field: 'objective' },
      });
    }
    if (!Array.isArray(results)) {
      throw new AppError({
        code: 'SYNTHESIS_INVALID_ARGS',
        message: 'SynthesisService.buildPrompt: results must be an array',
        context: { method: 'buildPrompt', field: 'results', type: typeof results },
      });
    }

    const resultsSummary = results
      .map(
        (r) =>
          `[#${r.id}] ${r.success ? '✓' : '✗'}: ${(r.content ?? '').substring(0, RESULT_PREVIEW_LENGTH)}`,
      )
      .join('\n\n');

    return `
CEL: ${objective}

WYNIKI AGENTÓW:
${resultsSummary}

Napisz KRÓTKIE podsumowanie po polsku:
1. Czy cel został zrealizowany?
2. Kluczowe wyniki
3. Ewentualne problemy
`;
  }
}

export const synthesisService = new SynthesisService();
