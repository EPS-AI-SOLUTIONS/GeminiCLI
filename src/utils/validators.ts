/**
 * GeminiHydra - Shared Validation Utilities
 * @module utils/validators
 *
 * Centralized validation functions for security and data integrity.
 * Used by both backend (src/) and frontend (GeminiGUI/src/) code.
 */

// ============================================================================
// URL VALIDATION
// ============================================================================

/**
 * Validates if a string is a valid HTTP/HTTPS URL
 * Used for: API endpoints, image URLs, resource locations
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Alias for isValidUrl - maintains compatibility with existing code
 * @deprecated Use isValidUrl instead
 */
export const isUrl = isValidUrl;

/**
 * Validates localhost URLs specifically
 */
export function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}
