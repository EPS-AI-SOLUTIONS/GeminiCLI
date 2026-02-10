/**
 * History Validation
 * Validators for history endpoint requests
 */

import { API_CONFIG } from '../config/index.js';
import { VALIDATION_ERRORS } from '../constants/index.js';
import { ValidationError } from '../middleware/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// History Validators
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate history query limit parameter
 */
export function validateHistoryLimit(limit: unknown): number {
  if (limit === undefined || limit === null) {
    return API_CONFIG.history.defaultLimit;
  }

  const parsed = Number(limit);
  if (Number.isNaN(parsed)) {
    throw new ValidationError(VALIDATION_ERRORS.INVALID_TYPE('limit', 'number'));
  }

  const { maxSize } = API_CONFIG.history;
  return Math.min(Math.max(1, parsed), maxSize);
}

/**
 * Validate search query string
 */
export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') {
    return '';
  }
  return query.trim();
}

/**
 * Validate date range for history filtering
 */
export function validateDateRange(
  start: unknown,
  end: unknown,
): { startDate?: Date; endDate?: Date } {
  const result: { startDate?: Date; endDate?: Date } = {};

  if (start !== undefined) {
    const startDate = new Date(String(start));
    if (!Number.isNaN(startDate.getTime())) {
      result.startDate = startDate;
    }
  }

  if (end !== undefined) {
    const endDate = new Date(String(end));
    if (!Number.isNaN(endDate.getTime())) {
      result.endDate = endDate;
    }
  }

  // Validate range order
  if (result.startDate && result.endDate && result.startDate > result.endDate) {
    throw new ValidationError('Start date must be before end date');
  }

  return result;
}
