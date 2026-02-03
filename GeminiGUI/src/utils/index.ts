/**
 * GeminiGUI - Utilities Barrel Export
 * @module utils
 *
 * Centralized utilities and helper functions for validation,
 * sanitization, and data transformation.
 *
 * Usage:
 *   import { isValidUrl, sanitizeContent } from '@/utils';
 */

// ============================================================================
// STYLING UTILITIES
// ============================================================================

export { cn } from './cn';

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export {
  isValidUrl,
  isLocalhostUrl,
  isValidApiKey,
  isGeminiApiKey,
  isValidSessionId,
  isValidModelName,
  isValidMessageRole,
  isValidProvider,
  isValidTheme,
} from './validators';

// ============================================================================
// SANITIZATION & SAFETY FUNCTIONS
// ============================================================================

export {
  sanitizeContent,
  sanitizeTitle,
  escapeForShell,
  containsDangerousPatterns,
  DANGEROUS_PATTERNS,
  isBlockedPath,
  hasBlockedExtension,
} from './validators';
