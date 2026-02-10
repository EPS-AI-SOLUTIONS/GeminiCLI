/**
 * Output Format Validation Module
 * Solution #47: Output Format Validator
 *
 * Re-exports all validation types, classes, and utilities.
 */

export {
  autoCorrectCode,
  extractCodeBlocks,
  looksLikeCode,
  validateCode,
} from './CodeValidator.js';
export { CommonFormats, createSpec } from './CommonFormats.js';
// Utilities
export { detectFormat, getCorrections } from './FormatDetection.js';
// Sub-validators
export { autoCorrectJson, extractJson, validateJson, validateJsonSchema } from './JsonValidator.js';
export { autoCorrectList, extractListItems, validateList } from './ListValidator.js';
export {
  autoCorrectMarkdown,
  extractMarkdownHeaders,
  validateMarkdown,
} from './MarkdownValidator.js';
// Main class
export { OutputFormatValidator } from './OutputFormatValidator.js';
// Types
export type { FormatError, FormatSpec, FormatType, FormatValidation, JsonSchema } from './types.js';

// Singleton & convenience functions
import { OutputFormatValidator } from './OutputFormatValidator.js';
import type { FormatSpec, FormatValidation } from './types.js';

export const outputFormatValidator = new OutputFormatValidator();

export function validateOutputFormat(output: string, format: FormatSpec): FormatValidation {
  return outputFormatValidator.validateFormat(output, format);
}

export function autoCorrectOutput(output: string, format: FormatSpec): string {
  return outputFormatValidator.autoCorrect(output, format);
}

export default OutputFormatValidator;
