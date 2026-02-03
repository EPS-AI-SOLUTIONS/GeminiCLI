/**
 * MultiModalSupport.ts - Advanced Multi-Modal Support for GeminiHydra
 *
 * Comprehensive multi-modal infrastructure for MCP 2026 compatibility:
 * - Image handling (base64, URL, file path)
 * - Audio handling (preparation for Gemini Audio API)
 * - Video handling with frame extraction
 * - Mixed content prompt building
 * - MCP resource handlers
 * - Debug loop integration (screenshot analysis)
 *
 * @module MultiModalSupport
 * @version 2.0.0
 */

import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenerativeAI, Part, GenerativeModel } from '@google/generative-ai';
import 'dotenv/config';
import { isValidUrl } from '../utils/validators.js';

const execAsync = promisify(exec);

// ============================================================================
// INTERFACES - Core Multi-Modal Types
// ============================================================================

/**
 * Supported content types
 */
export type ContentType = 'text' | 'image' | 'audio' | 'video' | 'document';

/**
 * Image input sources
 */
export interface ImageInput {
  /** Image source type */
  source: 'base64' | 'url' | 'file';
  /** Image data (base64 string, URL, or file path) */
  data: string;
  /** MIME type (auto-detected if not provided) */
  mimeType?: string;
  /** Optional alt text description */
  altText?: string;
  /** Image dimensions (if known) */
  dimensions?: {
    width: number;
    height: number;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Audio input (preparation for Gemini Audio API)
 */
export interface AudioInput {
  /** Audio source type */
  source: 'base64' | 'url' | 'file';
  /** Audio data */
  data: string;
  /** MIME type */
  mimeType?: string;
  /** Duration in seconds (if known) */
  duration?: number;
  /** Sample rate in Hz (if known) */
  sampleRate?: number;
  /** Number of channels (if known) */
  channels?: number;
  /** Language hint for transcription */
  language?: string;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Video input with frame extraction support
 */
export interface VideoInput {
  /** Video source type */
  source: 'base64' | 'url' | 'file';
  /** Video data */
  data: string;
  /** MIME type */
  mimeType?: string;
  /** Duration in seconds (if known) */
  duration?: number;
  /** Frame rate (if known) */
  frameRate?: number;
  /** Resolution */
  resolution?: {
    width: number;
    height: number;
  };
  /** Extract frames at these timestamps (in seconds) */
  extractFramesAt?: number[];
  /** Extract frames every N seconds */
  extractFramesEvery?: number;
  /** Maximum frames to extract */
  maxFrames?: number;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Document input (PDF, DOCX, etc.)
 */
export interface DocumentInput {
  /** Document source type */
  source: 'base64' | 'url' | 'file';
  /** Document data */
  data: string;
  /** MIME type */
  mimeType?: string;
  /** Document title */
  title?: string;
  /** Page range to process (1-indexed) */
  pageRange?: {
    start: number;
    end: number;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Multi-modal content container
 */
export interface MultiModalContent {
  /** Content type */
  type: ContentType;
  /** Content data */
  data: string;
  /** MIME type */
  mimeType: string;
  /** Optional description/alt text */
  description?: string;
  /** Role in the conversation (user/model) */
  role?: 'user' | 'model';
  /** Processing options */
  options?: {
    /** For images: resize before sending */
    resize?: { maxWidth: number; maxHeight: number };
    /** For audio: convert to supported format */
    convert?: boolean;
    /** For video: extract keyframes only */
    keyframesOnly?: boolean;
  };
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Mixed content prompt structure
 */
export interface MixedContentPrompt {
  /** System instruction (if supported) */
  systemInstruction?: string;
  /** Content parts in order */
  parts: MultiModalContent[];
  /** Final text prompt */
  prompt: string;
  /** Generation config */
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
}

/**
 * Analysis result structure
 */
export interface AnalysisResult {
  /** Analysis text response */
  text: string;
  /** Structured data if extracted */
  structured?: Record<string, any>;
  /** Confidence score (0-1) */
  confidence?: number;
  /** Processing metadata */
  metadata: {
    model: string;
    contentTypes: ContentType[];
    totalInputTokens?: number;
    totalOutputTokens?: number;
    processingTimeMs: number;
  };
}

/**
 * Screenshot analysis result for debug loop
 */
export interface ScreenshotAnalysis {
  /** General description */
  description: string;
  /** Detected errors/issues */
  errors: ErrorDetection[];
  /** UI elements detected */
  uiElements: UIElement[];
  /** Suggested fixes */
  suggestions: FixSuggestion[];
  /** Code snippets detected (if any) */
  codeSnippets: CodeSnippet[];
  /** Overall health score (0-100) */
  healthScore: number;
  /** Raw response */
  rawResponse: string;
}

export interface ErrorDetection {
  type: 'error' | 'warning' | 'info';
  message: string;
  location?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  possibleCause?: string;
}

export interface UIElement {
  type: string;
  label?: string;
  state: 'normal' | 'error' | 'disabled' | 'loading' | 'active';
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface FixSuggestion {
  priority: number;
  description: string;
  targetFile?: string;
  codeChange?: string;
  confidence: number;
}

export interface CodeSnippet {
  language?: string;
  code: string;
  lineNumbers?: { start: number; end: number };
  hasError: boolean;
  errorDescription?: string;
}

// ============================================================================
// MCP 2026 MULTIMODAL INTERFACES (Preparation)
// ============================================================================

/**
 * MCP Resource with multimodal support
 */
export interface MCPMultiModalResource {
  /** Resource URI */
  uri: string;
  /** Resource name */
  name: string;
  /** Resource description */
  description?: string;
  /** Primary MIME type */
  mimeType: string;
  /** Content type category */
  contentType: ContentType;
  /** Size in bytes */
  size?: number;
  /** Last modified timestamp */
  lastModified?: Date;
  /** Resource annotations */
  annotations?: {
    /** Audience level */
    audience?: string[];
    /** Priority (0-1) */
    priority?: number;
    /** Custom tags */
    tags?: string[];
  };
}

/**
 * MCP Resource content with binary support
 */
export interface MCPResourceContent {
  /** Resource URI */
  uri: string;
  /** MIME type */
  mimeType: string;
  /** Text content (for text-based resources) */
  text?: string;
  /** Binary content as base64 (for binary resources) */
  blob?: string;
  /** Embedded resources (for compound documents) */
  embedded?: MCPResourceContent[];
}

/**
 * MCP Tool input with multimodal support
 */
export interface MCPMultiModalToolInput {
  /** Text content */
  text?: string;
  /** Image inputs */
  images?: ImageInput[];
  /** Audio inputs */
  audio?: AudioInput[];
  /** Video inputs */
  video?: VideoInput[];
  /** Document inputs */
  documents?: DocumentInput[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Supported image MIME types with extensions */
const IMAGE_MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.tiff': 'image/tiff',
  '.tif': 'image/tiff',
};

/** Supported audio MIME types with extensions */
const AUDIO_MIME_TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.wma': 'audio/x-ms-wma',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
};

/** Supported video MIME types with extensions */
const VIDEO_MIME_TYPES: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.flv': 'video/x-flv',
  '.wmv': 'video/x-ms-wmv',
  '.m4v': 'video/mp4',
};

/** Supported document MIME types with extensions */
const DOCUMENT_MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.xls': 'application/vnd.ms-excel',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.csv': 'text/csv',
};

/** Maximum file sizes by type (in bytes) */
const MAX_FILE_SIZES = {
  image: 20 * 1024 * 1024,    // 20MB
  audio: 25 * 1024 * 1024,    // 25MB
  video: 100 * 1024 * 1024,   // 100MB
  document: 50 * 1024 * 1024, // 50MB
};

/** Models supporting multimodal input */
const MULTIMODAL_MODELS = [
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect content type from file extension or MIME type
 */
export function detectContentType(input: string): ContentType | null {
  // Check if it's a MIME type
  if (input.includes('/')) {
    if (input.startsWith('image/')) return 'image';
    if (input.startsWith('audio/')) return 'audio';
    if (input.startsWith('video/')) return 'video';
    if (input.startsWith('application/pdf') ||
        input.includes('document') ||
        input.includes('spreadsheet') ||
        input.includes('presentation')) return 'document';
    if (input.startsWith('text/')) return 'text';
    return null;
  }

  // Assume it's a file path or extension
  const ext = input.startsWith('.') ? input.toLowerCase() : path.extname(input).toLowerCase();

  if (IMAGE_MIME_TYPES[ext]) return 'image';
  if (AUDIO_MIME_TYPES[ext]) return 'audio';
  if (VIDEO_MIME_TYPES[ext]) return 'video';
  if (DOCUMENT_MIME_TYPES[ext]) return 'document';
  if (['.txt', '.md', '.json', '.xml', '.yaml', '.yml'].includes(ext)) return 'text';

  return null;
}

/**
 * Get MIME type from file extension
 */
export function getMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return IMAGE_MIME_TYPES[ext] ||
         AUDIO_MIME_TYPES[ext] ||
         VIDEO_MIME_TYPES[ext] ||
         DOCUMENT_MIME_TYPES[ext] ||
         null;
}

/**
 * Detect if input is base64 encoded
 */
export function isBase64(str: string): boolean {
  if (str.length < 100) return false;
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  // Check first 1000 chars to avoid processing huge strings
  return base64Regex.test(str.substring(0, 1000).replace(/\s/g, ''));
}

/**
 * Detect if input is a URL
 * @deprecated Use isValidUrl from '../utils/validators' instead
 */
export { isValidUrl as isUrl } from '../utils/validators.js';

/**
 * Download file from URL to buffer
 */
async function downloadToBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadToBuffer(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
}

// ============================================================================
// MULTIMODAL PROCESSOR CLASS
// ============================================================================

/**
 * MultiModalProcessor - Main class for handling multi-modal content
 */
export class MultiModalProcessor {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;
  private initialized: boolean = false;

  constructor(modelName?: string) {
    const apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName || process.env.GEMINI_MODEL || 'gemini-3-flash-preview';
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });
    this.initialized = !!apiKey;
  }

  // --------------------------------------------------------------------------
  // INITIALIZATION & CONFIGURATION
  // --------------------------------------------------------------------------

  /**
   * Check if processor is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Set the model to use
   */
  setModel(modelName: string): void {
    this.modelName = modelName;
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Get current model name
   */
  getModelName(): string {
    return this.modelName;
  }

  /**
   * Check if current model supports multimodal
   */
  isMultiModalSupported(): boolean {
    return MULTIMODAL_MODELS.some(m =>
      this.modelName.includes(m) || m.includes(this.modelName)
    );
  }

  /**
   * Get list of supported models
   */
  static getSupportedModels(): string[] {
    return [...MULTIMODAL_MODELS];
  }

  // --------------------------------------------------------------------------
  // IMAGE PROCESSING
  // --------------------------------------------------------------------------

  /**
   * Process image from any source
   */
  async processImage(input: ImageInput): Promise<MultiModalContent> {
    let base64Data: string;
    let mimeType = input.mimeType;

    switch (input.source) {
      case 'base64':
        base64Data = input.data;
        if (!mimeType) {
          // Try to detect from data URI
          const match = input.data.match(/^data:([^;]+);base64,/);
          if (match) {
            mimeType = match[1];
            base64Data = input.data.replace(/^data:[^;]+;base64,/, '');
          }
        }
        break;

      case 'url':
        const buffer = await downloadToBuffer(input.data);
        base64Data = buffer.toString('base64');
        if (!mimeType) {
          // Try to detect from URL extension
          const urlPath = new URL(input.data).pathname;
          mimeType = getMimeType(urlPath) || 'image/jpeg';
        }
        break;

      case 'file':
        const resolvedPath = path.resolve(input.data);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Image file not found: ${resolvedPath}`);
        }
        const stats = fs.statSync(resolvedPath);
        if (stats.size > MAX_FILE_SIZES.image) {
          throw new Error(`Image file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        }
        base64Data = fs.readFileSync(resolvedPath).toString('base64');
        if (!mimeType) {
          mimeType = getMimeType(resolvedPath) || 'image/jpeg';
        }
        break;

      default:
        throw new Error(`Unknown image source: ${input.source}`);
    }

    return {
      type: 'image',
      data: base64Data,
      mimeType: mimeType || 'image/jpeg',
      description: input.altText,
      metadata: {
        ...input.metadata,
        dimensions: input.dimensions,
        source: input.source,
      },
    };
  }

  /**
   * Analyze image with Gemini Vision
   */
  async analyzeImage(input: ImageInput, prompt?: string): Promise<AnalysisResult> {
    if (!this.initialized) {
      throw new Error('MultiModalProcessor not initialized: GEMINI_API_KEY not set');
    }

    const startTime = Date.now();
    const content = await this.processImage(input);

    const parts: Part[] = [
      {
        inlineData: {
          mimeType: content.mimeType,
          data: content.data,
        },
      },
      {
        text: prompt || 'Describe this image in detail. Include information about the main subjects, colors, composition, and any text visible.',
      },
    ];

    const result = await this.model.generateContent(parts);
    const response = result.response;

    return {
      text: response.text(),
      metadata: {
        model: this.modelName,
        contentTypes: ['image'],
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  // --------------------------------------------------------------------------
  // AUDIO PROCESSING (Preparation for Gemini Audio API)
  // --------------------------------------------------------------------------

  /**
   * Process audio from any source
   */
  async processAudio(input: AudioInput): Promise<MultiModalContent> {
    let base64Data: string;
    let mimeType = input.mimeType;

    switch (input.source) {
      case 'base64':
        base64Data = input.data;
        break;

      case 'url':
        const buffer = await downloadToBuffer(input.data);
        base64Data = buffer.toString('base64');
        if (!mimeType) {
          const urlPath = new URL(input.data).pathname;
          mimeType = getMimeType(urlPath) || 'audio/mpeg';
        }
        break;

      case 'file':
        const resolvedPath = path.resolve(input.data);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Audio file not found: ${resolvedPath}`);
        }
        const stats = fs.statSync(resolvedPath);
        if (stats.size > MAX_FILE_SIZES.audio) {
          throw new Error(`Audio file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        }
        base64Data = fs.readFileSync(resolvedPath).toString('base64');
        if (!mimeType) {
          mimeType = getMimeType(resolvedPath) || 'audio/mpeg';
        }
        break;

      default:
        throw new Error(`Unknown audio source: ${input.source}`);
    }

    return {
      type: 'audio',
      data: base64Data,
      mimeType: mimeType || 'audio/mpeg',
      metadata: {
        ...input.metadata,
        duration: input.duration,
        sampleRate: input.sampleRate,
        channels: input.channels,
        language: input.language,
        source: input.source,
      },
    };
  }

  /**
   * Transcribe audio (placeholder - uses Gemini when available)
   */
  async transcribeAudio(input: AudioInput): Promise<AnalysisResult> {
    if (!this.initialized) {
      throw new Error('MultiModalProcessor not initialized: GEMINI_API_KEY not set');
    }

    const startTime = Date.now();
    const content = await this.processAudio(input);

    // Gemini supports audio in some models
    const parts: Part[] = [
      {
        inlineData: {
          mimeType: content.mimeType,
          data: content.data,
        },
      },
      {
        text: `Transcribe this audio content. ${input.language ? `The audio is in ${input.language}.` : ''} Provide an accurate text transcription.`,
      },
    ];

    try {
      const result = await this.model.generateContent(parts);
      return {
        text: result.response.text(),
        metadata: {
          model: this.modelName,
          contentTypes: ['audio'],
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      // Fallback message if model doesn't support audio
      return {
        text: `[Audio transcription not available for model ${this.modelName}. Audio content received: ${content.mimeType}, size: ${content.data.length} bytes]`,
        metadata: {
          model: this.modelName,
          contentTypes: ['audio'],
          processingTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // --------------------------------------------------------------------------
  // VIDEO PROCESSING
  // --------------------------------------------------------------------------

  /**
   * Process video from any source
   */
  async processVideo(input: VideoInput): Promise<MultiModalContent> {
    let base64Data: string;
    let mimeType = input.mimeType;

    switch (input.source) {
      case 'base64':
        base64Data = input.data;
        break;

      case 'url':
        const buffer = await downloadToBuffer(input.data);
        base64Data = buffer.toString('base64');
        if (!mimeType) {
          const urlPath = new URL(input.data).pathname;
          mimeType = getMimeType(urlPath) || 'video/mp4';
        }
        break;

      case 'file':
        const resolvedPath = path.resolve(input.data);
        if (!fs.existsSync(resolvedPath)) {
          throw new Error(`Video file not found: ${resolvedPath}`);
        }
        const stats = fs.statSync(resolvedPath);
        if (stats.size > MAX_FILE_SIZES.video) {
          throw new Error(`Video file too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB`);
        }
        base64Data = fs.readFileSync(resolvedPath).toString('base64');
        if (!mimeType) {
          mimeType = getMimeType(resolvedPath) || 'video/mp4';
        }
        break;

      default:
        throw new Error(`Unknown video source: ${input.source}`);
    }

    return {
      type: 'video',
      data: base64Data,
      mimeType: mimeType || 'video/mp4',
      metadata: {
        ...input.metadata,
        duration: input.duration,
        frameRate: input.frameRate,
        resolution: input.resolution,
        source: input.source,
      },
    };
  }

  /**
   * Extract frames from video file using ffmpeg
   */
  async extractVideoFrames(
    videoPath: string,
    options?: {
      timestamps?: number[];
      interval?: number;
      maxFrames?: number;
      outputDir?: string;
    }
  ): Promise<string[]> {
    const resolvedPath = path.resolve(videoPath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Video file not found: ${resolvedPath}`);
    }

    const outputDir = options?.outputDir || path.join(path.dirname(resolvedPath), '.frames');
    await fsPromises.mkdir(outputDir, { recursive: true });

    const framePaths: string[] = [];
    const maxFrames = options?.maxFrames || 10;

    try {
      if (options?.timestamps && options.timestamps.length > 0) {
        // Extract frames at specific timestamps
        for (let i = 0; i < Math.min(options.timestamps.length, maxFrames); i++) {
          const timestamp = options.timestamps[i];
          const outputPath = path.join(outputDir, `frame_${i.toString().padStart(4, '0')}.png`);
          await execAsync(`ffmpeg -ss ${timestamp} -i "${resolvedPath}" -frames:v 1 -y "${outputPath}" 2>/dev/null`);
          if (fs.existsSync(outputPath)) {
            framePaths.push(outputPath);
          }
        }
      } else if (options?.interval) {
        // Extract frames at regular intervals
        await execAsync(
          `ffmpeg -i "${resolvedPath}" -vf "fps=1/${options.interval}" -frames:v ${maxFrames} "${outputDir}/frame_%04d.png" 2>/dev/null`
        );
        // Collect generated frame paths
        const files = await fsPromises.readdir(outputDir);
        for (const file of files.sort()) {
          if (file.startsWith('frame_') && file.endsWith('.png')) {
            framePaths.push(path.join(outputDir, file));
            if (framePaths.length >= maxFrames) break;
          }
        }
      } else {
        // Extract keyframes
        await execAsync(
          `ffmpeg -i "${resolvedPath}" -vf "select='eq(pict_type,I)'" -vsync vfr -frames:v ${maxFrames} "${outputDir}/frame_%04d.png" 2>/dev/null`
        );
        const files = await fsPromises.readdir(outputDir);
        for (const file of files.sort()) {
          if (file.startsWith('frame_') && file.endsWith('.png')) {
            framePaths.push(path.join(outputDir, file));
            if (framePaths.length >= maxFrames) break;
          }
        }
      }
    } catch (error: any) {
      console.warn(`Frame extraction failed (ffmpeg may not be installed): ${error.message}`);
    }

    return framePaths;
  }

  /**
   * Analyze video with Gemini
   */
  async analyzeVideo(input: VideoInput, prompt?: string): Promise<AnalysisResult> {
    if (!this.initialized) {
      throw new Error('MultiModalProcessor not initialized: GEMINI_API_KEY not set');
    }

    const startTime = Date.now();
    const content = await this.processVideo(input);

    const parts: Part[] = [
      {
        inlineData: {
          mimeType: content.mimeType,
          data: content.data,
        },
      },
      {
        text: prompt || 'Analyze this video. Describe what happens, identify people or objects, and summarize the main content.',
      },
    ];

    try {
      const result = await this.model.generateContent(parts);
      return {
        text: result.response.text(),
        metadata: {
          model: this.modelName,
          contentTypes: ['video'],
          processingTimeMs: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      // Fallback: analyze extracted frames
      if (input.source === 'file') {
        const frames = await this.extractVideoFrames(input.data, {
          maxFrames: 5,
          interval: input.duration ? Math.floor(input.duration / 5) : 10,
        });

        if (frames.length > 0) {
          const frameAnalyses: string[] = [];
          for (const framePath of frames) {
            const analysis = await this.analyzeImage(
              { source: 'file', data: framePath },
              'Briefly describe what you see in this video frame.'
            );
            frameAnalyses.push(analysis.text);
          }

          return {
            text: `Video analysis from ${frames.length} extracted frames:\n\n${frameAnalyses.map((a, i) => `Frame ${i + 1}: ${a}`).join('\n\n')}`,
            metadata: {
              model: this.modelName,
              contentTypes: ['video', 'image'],
              processingTimeMs: Date.now() - startTime,
            },
          };
        }
      }

      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // MIXED CONTENT / PROMPT BUILDING
  // --------------------------------------------------------------------------

  /**
   * Build multi-modal prompt from mixed content
   */
  buildMultiModalPrompt(mixedContent: MixedContentPrompt): Part[] {
    const parts: Part[] = [];

    // Add content parts in order
    for (const content of mixedContent.parts) {
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

    // Add final prompt
    if (mixedContent.prompt) {
      parts.push({ text: mixedContent.prompt });
    }

    return parts;
  }

  /**
   * Process mixed content request
   */
  async processMultiModal(mixedContent: MixedContentPrompt): Promise<AnalysisResult> {
    if (!this.initialized) {
      throw new Error('MultiModalProcessor not initialized: GEMINI_API_KEY not set');
    }

    const startTime = Date.now();
    const parts = this.buildMultiModalPrompt(mixedContent);

    const result = await this.model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: mixedContent.generationConfig,
      ...(mixedContent.systemInstruction && {
        systemInstruction: mixedContent.systemInstruction,
      }),
    });

    const contentTypes = [...new Set(mixedContent.parts.map(p => p.type))];

    return {
      text: result.response.text(),
      metadata: {
        model: this.modelName,
        contentTypes,
        processingTimeMs: Date.now() - startTime,
      },
    };
  }

  // --------------------------------------------------------------------------
  // DEBUG LOOP INTEGRATION - SCREENSHOT ANALYSIS
  // --------------------------------------------------------------------------

  /**
   * Analyze screenshot for debugging purposes
   */
  async analyzeScreenshotForDebug(imagePath: string): Promise<ScreenshotAnalysis> {
    if (!this.initialized) {
      throw new Error('MultiModalProcessor not initialized: GEMINI_API_KEY not set');
    }

    const prompt = `Analyze this screenshot for debugging purposes. You are helping a developer identify and fix issues.

Provide a detailed analysis in the following JSON format:
{
  "description": "Brief overview of what the screenshot shows",
  "errors": [
    {
      "type": "error|warning|info",
      "message": "Error message or description",
      "location": "Where in the UI/code this appears",
      "severity": "critical|high|medium|low",
      "possibleCause": "What might have caused this"
    }
  ],
  "uiElements": [
    {
      "type": "button|input|modal|toast|console|terminal|etc",
      "label": "Element label or content",
      "state": "normal|error|disabled|loading|active"
    }
  ],
  "suggestions": [
    {
      "priority": 1,
      "description": "What to fix and how",
      "targetFile": "Filename if identifiable",
      "codeChange": "Suggested code change if applicable",
      "confidence": 0.9
    }
  ],
  "codeSnippets": [
    {
      "language": "typescript|javascript|etc",
      "code": "Code visible in screenshot",
      "lineNumbers": {"start": 1, "end": 10},
      "hasError": true,
      "errorDescription": "Description of the error in this code"
    }
  ],
  "healthScore": 85
}

Focus on:
1. Error messages, stack traces, or console errors
2. UI issues (broken layouts, missing elements, loading states)
3. Code problems visible in editors or terminals
4. Network errors, API failures
5. Security warnings

Be thorough but concise. Return ONLY valid JSON.`;

    const result = await this.analyzeImage(
      { source: 'file', data: imagePath },
      prompt
    );

    // Parse JSON response
    let analysis: ScreenshotAnalysis;
    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = result.text;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);
      analysis = {
        description: parsed.description || 'No description available',
        errors: parsed.errors || [],
        uiElements: parsed.uiElements || [],
        suggestions: parsed.suggestions || [],
        codeSnippets: parsed.codeSnippets || [],
        healthScore: parsed.healthScore ?? 50,
        rawResponse: result.text,
      };
    } catch {
      // Fallback if JSON parsing fails
      analysis = {
        description: result.text,
        errors: [],
        uiElements: [],
        suggestions: [],
        codeSnippets: [],
        healthScore: 50,
        rawResponse: result.text,
      };

      // Try to extract errors from text
      const errorMatches = result.text.match(/error[:\s]+([^\n]+)/gi);
      if (errorMatches) {
        analysis.errors = errorMatches.map(e => ({
          type: 'error' as const,
          message: e,
          severity: 'medium' as const,
        }));
      }
    }

    return analysis;
  }

  /**
   * Compare two screenshots to detect changes/fixes
   */
  async compareScreenshots(
    beforePath: string,
    afterPath: string
  ): Promise<{
    changesDetected: boolean;
    description: string;
    improvements: string[];
    remainingIssues: string[];
    overallAssessment: 'fixed' | 'improved' | 'unchanged' | 'regressed';
  }> {
    if (!this.initialized) {
      throw new Error('MultiModalProcessor not initialized: GEMINI_API_KEY not set');
    }

    // Process both images
    const [beforeContent, afterContent] = await Promise.all([
      this.processImage({ source: 'file', data: beforePath }),
      this.processImage({ source: 'file', data: afterPath }),
    ]);

    const parts: Part[] = [
      { text: 'BEFORE:' },
      {
        inlineData: {
          mimeType: beforeContent.mimeType,
          data: beforeContent.data,
        },
      },
      { text: 'AFTER:' },
      {
        inlineData: {
          mimeType: afterContent.mimeType,
          data: afterContent.data,
        },
      },
      {
        text: `Compare these two screenshots (BEFORE and AFTER).

Analyze what changed and whether issues were fixed.

Return JSON:
{
  "changesDetected": true/false,
  "description": "Summary of changes",
  "improvements": ["List of fixed issues or improvements"],
  "remainingIssues": ["List of issues still present"],
  "overallAssessment": "fixed|improved|unchanged|regressed"
}

ONLY return valid JSON.`,
      },
    ];

    const result = await this.model.generateContent(parts);
    const responseText = result.response.text();

    try {
      let jsonText = responseText;
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }
      return JSON.parse(jsonText);
    } catch {
      return {
        changesDetected: true,
        description: responseText,
        improvements: [],
        remainingIssues: [],
        overallAssessment: 'unchanged',
      };
    }
  }

  // --------------------------------------------------------------------------
  // MCP RESOURCE HANDLERS
  // --------------------------------------------------------------------------

  /**
   * Create MCP resource from file
   */
  async createMCPResource(filePath: string): Promise<MCPMultiModalResource> {
    const resolvedPath = path.resolve(filePath);
    const stats = await fsPromises.stat(resolvedPath);
    const mimeType = getMimeType(resolvedPath);
    const contentType = detectContentType(resolvedPath);

    return {
      uri: `file://${resolvedPath}`,
      name: path.basename(resolvedPath),
      mimeType: mimeType || 'application/octet-stream',
      contentType: contentType || 'document',
      size: stats.size,
      lastModified: stats.mtime,
    };
  }

  /**
   * Read MCP resource content
   */
  async readMCPResource(resource: MCPMultiModalResource): Promise<MCPResourceContent> {
    const filePath = resource.uri.replace('file://', '');
    const buffer = await fsPromises.readFile(filePath);
    const contentType = resource.contentType;

    if (contentType === 'text' || resource.mimeType.startsWith('text/')) {
      return {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: buffer.toString('utf-8'),
      };
    }

    return {
      uri: resource.uri,
      mimeType: resource.mimeType,
      blob: buffer.toString('base64'),
    };
  }

  /**
   * Process MCP multimodal tool input
   */
  async processMCPToolInput(input: MCPMultiModalToolInput): Promise<Part[]> {
    const parts: Part[] = [];

    // Process text
    if (input.text) {
      parts.push({ text: input.text });
    }

    // Process images
    if (input.images) {
      for (const img of input.images) {
        const content = await this.processImage(img);
        parts.push({
          inlineData: {
            mimeType: content.mimeType,
            data: content.data,
          },
        });
      }
    }

    // Process audio
    if (input.audio) {
      for (const aud of input.audio) {
        const content = await this.processAudio(aud);
        parts.push({
          inlineData: {
            mimeType: content.mimeType,
            data: content.data,
          },
        });
      }
    }

    // Process video
    if (input.video) {
      for (const vid of input.video) {
        const content = await this.processVideo(vid);
        parts.push({
          inlineData: {
            mimeType: content.mimeType,
            data: content.data,
          },
        });
      }
    }

    return parts;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick image analysis
 */
export async function analyzeImage(
  imageInput: ImageInput | string,
  prompt?: string
): Promise<AnalysisResult> {
  const processor = new MultiModalProcessor();
  const input: ImageInput = typeof imageInput === 'string'
    ? { source: isValidUrl(imageInput) ? 'url' : 'file', data: imageInput }
    : imageInput;
  return processor.analyzeImage(input, prompt);
}

/**
 * Quick screenshot analysis for debugging
 */
export async function analyzeScreenshot(
  screenshotPath: string
): Promise<ScreenshotAnalysis> {
  const processor = new MultiModalProcessor();
  return processor.analyzeScreenshotForDebug(screenshotPath);
}

/**
 * Build mixed content prompt
 */
export function buildMixedPrompt(
  parts: Array<{ type: ContentType; data: string; mimeType?: string }>,
  prompt: string
): MixedContentPrompt {
  return {
    parts: parts.map(p => ({
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
