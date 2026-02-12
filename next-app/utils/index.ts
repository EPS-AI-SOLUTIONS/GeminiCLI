/**
 * ClaudeHydra - Utilities Barrel Export
 * @module utils
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
  escapeForPowerShell,
  escapeForShell,
  hasBlockedExtension,
  isBlockedPath,
  sanitizeContent,
  sanitizeTitle,
} from './validators';
