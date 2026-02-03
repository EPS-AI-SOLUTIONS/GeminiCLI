/**
 * @deprecated Import directly from './MultiModalSupport.js' instead.
 *
 * MultiModal - Re-export from MultiModalSupport
 *
 * This file re-exports the comprehensive MultiModalSupport implementation
 * and provides backward compatibility wrappers for the legacy MultiModalHandler API.
 */

export {
  // Types - Core
  type ContentType,
  type ImageInput,
  type AudioInput,
  type VideoInput,
  type DocumentInput,
  type MultiModalContent,
  type MixedContentPrompt,
  type AnalysisResult,

  // Types - Debug/Screenshot
  type ScreenshotAnalysis,
  type ErrorDetection,
  type UIElement,
  type FixSuggestion,
  type CodeSnippet,

  // Types - MCP 2026
  type MCPMultiModalResource,
  type MCPResourceContent,
  type MCPMultiModalToolInput,

  // Utility functions
  detectContentType,
  getMimeType,
  isBase64,
  isUrl,

  // Convenience functions
  analyzeImage,
  analyzeScreenshot,
  buildMixedPrompt,

  // Main class
  MultiModalProcessor,

  // Singleton
  multiModalProcessor
} from './MultiModalSupport.js';

// Default export
export { default } from './MultiModalSupport.js';

// ============================================================================
// LEGACY TYPES (for backward compatibility)
// ============================================================================

/**
 * Legacy content type alias
 */
export type MultiModalContentType = 'text' | 'image' | 'audio' | 'video';

/**
 * Legacy multi-modal request structure
 */
export interface MultiModalRequest {
  contents: Array<{
    type: MultiModalContentType;
    data: string;
    mimeType: string;
    description?: string;
  }>;
  prompt: string;
}

/**
 * Legacy result structure
 */
export interface MultiModalResult {
  text: string;
  metadata: {
    contentTypes: MultiModalContentType[];
    totalSize: number;
    processingTime: number;
  };
}

// ============================================================================
// LEGACY MULTIMODALHANDLER CLASS (for backward compatibility)
// ============================================================================

import * as fs from 'fs';
import * as path from 'path';
import { MultiModalProcessor, type MultiModalContent as AdvancedContent } from './MultiModalSupport.js';
import { GEMINI_MODELS } from '../config/models.config.js';

/** Supported image MIME types */
const SUPPORTED_IMAGE_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

/** Supported audio MIME types */
const SUPPORTED_AUDIO_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
};

/** Supported video MIME types */
const SUPPORTED_VIDEO_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
};

/** Maximum file sizes (in bytes) */
const MAX_FILE_SIZES = {
  image: 20 * 1024 * 1024,
  audio: 25 * 1024 * 1024,
  video: 50 * 1024 * 1024,
};

/** Models that support multi-modal input */
const MULTIMODAL_MODELS = [
  GEMINI_MODELS.PRO,
  GEMINI_MODELS.FLASH,
];

/**
 * Legacy MultiModalHandler class
 * Wraps the new MultiModalProcessor API for backward compatibility
 */
export class MultiModalHandler {
  private processor: MultiModalProcessor;
  private currentModel: string;

  constructor() {
    this.processor = new MultiModalProcessor();
    this.currentModel = GEMINI_MODELS.FLASH;
  }

  // --------------------------------------------------------------------------
  // CONTENT PREPARATION METHODS
  // --------------------------------------------------------------------------

  /**
   * Prepare image content from file path
   */
  async prepareImageContent(imagePath: string): Promise<{
    type: 'image';
    data: string;
    mimeType: string;
    description?: string;
  }> {
    const resolvedPath = path.resolve(imagePath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Image file not found: ${resolvedPath}`);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = SUPPORTED_IMAGE_TYPES[ext];

    if (!mimeType) {
      throw new Error(`Unsupported image format: ${ext}. Supported: ${Object.keys(SUPPORTED_IMAGE_TYPES).join(', ')}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.size > MAX_FILE_SIZES.image) {
      throw new Error(`Image file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_FILE_SIZES.image / 1024 / 1024}MB`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const base64Data = fileBuffer.toString('base64');

    return {
      type: 'image',
      data: base64Data,
      mimeType,
      description: `Image: ${path.basename(resolvedPath)} (${(stats.size / 1024).toFixed(1)}KB)`,
    };
  }

  /**
   * Prepare audio content from file path
   */
  async prepareAudioContent(audioPath: string): Promise<{
    type: 'audio';
    data: string;
    mimeType: string;
    description?: string;
  }> {
    const resolvedPath = path.resolve(audioPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Audio file not found: ${resolvedPath}`);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = SUPPORTED_AUDIO_TYPES[ext];

    if (!mimeType) {
      throw new Error(`Unsupported audio format: ${ext}. Supported: ${Object.keys(SUPPORTED_AUDIO_TYPES).join(', ')}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.size > MAX_FILE_SIZES.audio) {
      throw new Error(`Audio file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_FILE_SIZES.audio / 1024 / 1024}MB`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const base64Data = fileBuffer.toString('base64');

    return {
      type: 'audio',
      data: base64Data,
      mimeType,
      description: `Audio: ${path.basename(resolvedPath)} (${(stats.size / 1024).toFixed(1)}KB)`,
    };
  }

  /**
   * Prepare video content from file path
   */
  async prepareVideoContent(videoPath: string): Promise<{
    type: 'video';
    data: string;
    mimeType: string;
    description?: string;
  }> {
    const resolvedPath = path.resolve(videoPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Video file not found: ${resolvedPath}`);
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeType = SUPPORTED_VIDEO_TYPES[ext];

    if (!mimeType) {
      throw new Error(`Unsupported video format: ${ext}. Supported: ${Object.keys(SUPPORTED_VIDEO_TYPES).join(', ')}`);
    }

    const stats = fs.statSync(resolvedPath);
    if (stats.size > MAX_FILE_SIZES.video) {
      throw new Error(`Video file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB. Max: ${MAX_FILE_SIZES.video / 1024 / 1024}MB`);
    }

    const fileBuffer = fs.readFileSync(resolvedPath);
    const base64Data = fileBuffer.toString('base64');

    return {
      type: 'video',
      data: base64Data,
      mimeType,
      description: `Video: ${path.basename(resolvedPath)} (${(stats.size / 1024 / 1024).toFixed(2)}MB)`,
    };
  }

  /**
   * Prepare text content
   */
  prepareTextContent(text: string): {
    type: 'text';
    data: string;
    mimeType: string;
    description?: string;
  } {
    return {
      type: 'text',
      data: text,
      mimeType: 'text/plain',
      description: `Text: ${text.length} characters`,
    };
  }

  // --------------------------------------------------------------------------
  // REQUEST BUILDING
  // --------------------------------------------------------------------------

  /**
   * Build multi-modal prompt for Gemini API
   */
  buildMultiModalPrompt(request: MultiModalRequest): any[] {
    const parts: any[] = [];

    for (const content of request.contents) {
      if (content.type === 'text') {
        parts.push({ text: content.data });
      } else {
        parts.push({
          inlineData: {
            mimeType: content.mimeType,
            data: content.data,
          },
        });
      }
    }

    if (request.prompt) {
      parts.push({ text: request.prompt });
    }

    return parts;
  }

  // --------------------------------------------------------------------------
  // MODEL SUPPORT CHECK
  // --------------------------------------------------------------------------

  /**
   * Check if current model supports multi-modal input
   */
  isMultiModalSupported(modelName?: string): boolean {
    const model = modelName || this.currentModel;
    return MULTIMODAL_MODELS.some(m => model.includes(m) || m.includes(model));
  }

  /**
   * Get list of supported multi-modal models
   */
  getSupportedModels(): string[] {
    return [...MULTIMODAL_MODELS];
  }

  /**
   * Set the model to use for processing
   */
  setModel(modelName: string): void {
    this.currentModel = modelName;
    this.processor.setModel(modelName);
  }

  // --------------------------------------------------------------------------
  // HIGH-LEVEL METHODS (delegate to processor)
  // --------------------------------------------------------------------------

  /**
   * Describe an image using Gemini vision capabilities
   */
  async describeImage(imagePath: string, customPrompt?: string): Promise<string> {
    const result = await this.processor.analyzeImage(
      { source: 'file', data: imagePath },
      customPrompt || 'Describe this image in detail. Include information about the main subjects, colors, composition, and any text visible in the image.'
    );
    return result.text;
  }

  /**
   * Transcribe audio using Gemini
   */
  async transcribeAudio(audioPath: string): Promise<string> {
    const result = await this.processor.transcribeAudio({
      source: 'file',
      data: audioPath
    });
    return result.text;
  }

  /**
   * Analyze video content
   */
  async analyzeVideo(videoPath: string, customPrompt?: string): Promise<string> {
    const result = await this.processor.analyzeVideo(
      { source: 'file', data: videoPath },
      customPrompt || 'Analyze this video. Describe what happens, identify any people or objects, and summarize the main content.'
    );
    return result.text;
  }

  /**
   * Process a multi-modal request with mixed content
   */
  async processMultiModal(request: MultiModalRequest): Promise<MultiModalResult> {
    const startTime = Date.now();

    const parts: AdvancedContent[] = request.contents.map(c => ({
      type: c.type as any,
      data: c.data,
      mimeType: c.mimeType,
      description: c.description,
    }));

    const result = await this.processor.processMultiModal({
      parts,
      prompt: request.prompt,
    });

    const totalSize = request.contents.reduce((sum, content) => {
      return sum + (content.type === 'text' ? content.data.length : Buffer.from(content.data, 'base64').length);
    }, 0);

    return {
      text: result.text,
      metadata: {
        contentTypes: [...new Set(request.contents.map(c => c.type))] as MultiModalContentType[],
        totalSize,
        processingTime: Date.now() - startTime,
      },
    };
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

  /**
   * Auto-detect content type from file path
   */
  detectContentType(filePath: string): MultiModalContentType | null {
    const ext = path.extname(filePath).toLowerCase();

    if (SUPPORTED_IMAGE_TYPES[ext]) return 'image';
    if (SUPPORTED_AUDIO_TYPES[ext]) return 'audio';
    if (SUPPORTED_VIDEO_TYPES[ext]) return 'video';
    if (ext === '.txt' || ext === '.md') return 'text';

    return null;
  }

  /**
   * Prepare content from any supported file type
   */
  async prepareContent(filePath: string): Promise<{
    type: MultiModalContentType;
    data: string;
    mimeType: string;
    description?: string;
  }> {
    const contentType = this.detectContentType(filePath);

    if (!contentType) {
      throw new Error(`Unsupported file type: ${path.extname(filePath)}`);
    }

    switch (contentType) {
      case 'image':
        return this.prepareImageContent(filePath);
      case 'audio':
        return this.prepareAudioContent(filePath);
      case 'video':
        return this.prepareVideoContent(filePath);
      case 'text':
        const text = fs.readFileSync(filePath, 'utf-8');
        return this.prepareTextContent(text);
      default:
        throw new Error(`Unknown content type: ${contentType}`);
    }
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): Record<MultiModalContentType, string[]> {
    return {
      text: ['.txt', '.md'],
      image: Object.keys(SUPPORTED_IMAGE_TYPES),
      audio: Object.keys(SUPPORTED_AUDIO_TYPES),
      video: Object.keys(SUPPORTED_VIDEO_TYPES),
    };
  }

  /**
   * Check if handler is properly initialized
   */
  isInitialized(): boolean {
    return this.processor.isInitialized();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance of MultiModalHandler (legacy) */
export const multiModal = new MultiModalHandler();
