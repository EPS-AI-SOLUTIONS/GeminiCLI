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
  isGeminiApiKey,
  isLocalhostUrl,
  isValidApiKey,
  isValidMessageRole,
  isValidModelName,
  isValidProvider,
  isValidSessionId,
  isValidTheme,
  isValidUrl,
} from './validators';

// ============================================================================
// SANITIZATION & SAFETY FUNCTIONS
// ============================================================================

export {
  containsDangerousPatterns,
  DANGEROUS_PATTERNS,
  escapeForShell,
  hasBlockedExtension,
  isBlockedPath,
  sanitizeContent,
  sanitizeTitle,
} from './validators';
