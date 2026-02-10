/**
 * MultiModal Module - Re-exports and convenience functions
 *
 * @module multimodal
 */

// Re-export isUrl (deprecated alias)
export { isValidUrl as isUrl } from '../../utils/validators.js';

// Constants
export {
  AUDIO_MIME_TYPES,
  DOCUMENT_MIME_TYPES,
  IMAGE_MIME_TYPES,
  MAX_FILE_SIZES,
  MULTIMODAL_MODELS,
  VIDEO_MIME_TYPES,
} from './constants.js';
// Main class
export { MultiModalProcessor } from './MultiModalProcessor.js';
// Types
export type {
  AnalysisResult,
  AudioInput,
  CodeSnippet,
  ContentType,
  DocumentInput,
  ErrorDetection,
  FixSuggestion,
  ImageInput,
  MCPMultiModalResource,
  MCPMultiModalToolInput,
  MCPResourceContent,
  MixedContentPrompt,
  MultiModalContent,
  ScreenshotAnalysis,
  UIElement,
  VideoInput,
} from './types.js';
// Utils
export {
  detectContentType,
  downloadToBuffer,
  getMimeType,
  isBase64,
} from './utils.js';

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

import { isValidUrl } from '../../utils/validators.js';
import { MultiModalProcessor } from './MultiModalProcessor.js';
import type {
  AnalysisResult,
  ContentType,
  ImageInput,
  MixedContentPrompt,
  ScreenshotAnalysis,
} from './types.js';

/**
 * Quick image analysis
 */
export async function analyzeImage(
  imageInput: ImageInput | string,
  prompt?: string,
): Promise<AnalysisResult> {
  const processor = new MultiModalProcessor();
  const input: ImageInput =
    typeof imageInput === 'string'
      ? { source: isValidUrl(imageInput) ? 'url' : 'file', data: imageInput }
      : imageInput;
  return processor.analyzeImage(input, prompt);
}

/**
 * Quick screenshot analysis for debugging
 */
export async function analyzeScreenshot(screenshotPath: string): Promise<ScreenshotAnalysis> {
  const processor = new MultiModalProcessor();
  return processor.analyzeScreenshotForDebug(screenshotPath);
}

/**
 * Build mixed content prompt
 */
export function buildMixedPrompt(
  parts: Array<{ type: ContentType; data: string; mimeType?: string }>,
  prompt: string,
): MixedContentPrompt {
  return {
    parts: parts.map((p) => ({
      type: p.type,
      data: p.data,
      mimeType: p.mimeType || (p.type === 'text' ? 'text/plain' : 'application/octet-stream'),
    })),
    prompt,
  };
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Default MultiModalProcessor instance */
export const multiModalProcessor = new MultiModalProcessor();

export default multiModalProcessor;
