/**
 * @fileoverview File validation schemas for Node.js environment
 * Uses Buffer-based validation (no browser File API)
 * @module schemas/file
 */

import { z } from 'zod';

// =============================================================================
// NODE.JS FILE SCHEMAS
// =============================================================================

/**
 * Node.js file representation (from multipart form uploads)
 */
export const nodeFileSchema = z.object({
  /** File content as Buffer */
  buffer: z.instanceof(Buffer),
  /** Original filename */
  filename: z.string().min(1, 'Filename is required'),
  /** MIME type */
  mimetype: z.string().min(1, 'MIME type is required'),
  /** File size in bytes (optional, can be derived from buffer) */
  size: z.number().nonnegative().optional(),
  /** Encoding (e.g., '7bit') */
  encoding: z.string().optional(),
});

export type NodeFile = z.infer<typeof nodeFileSchema>;

/**
 * Configuration options for Node.js file schema factory
 */
export interface NodeFileSchemaOptions {
  /** Maximum file size in bytes */
  maxSizeBytes?: number;
  /** Allowed MIME types */
  allowedMimeTypes?: string[];
  /** Allowed file extensions */
  allowedExtensions?: string[];
  /** Whether file is required */
  required?: boolean;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(decimals))} ${sizes[i]}`;
}

/**
 * Create configurable file schema for API endpoints
 */
export function createNodeFileSchema(options: NodeFileSchemaOptions = {}) {
  const {
    maxSizeBytes = 100 * 1024 * 1024, // 100MB default
    allowedMimeTypes,
    allowedExtensions,
    required = true,
  } = options;

  let schema = nodeFileSchema;

  // Size validation (use buffer length if size not provided)
  schema = schema.refine(
    (file) => {
      const fileSize = file.size ?? file.buffer.length;
      return fileSize <= maxSizeBytes;
    },
    {
      message: `File size exceeds limit (${formatBytes(maxSizeBytes)})`,
    },
  );

  // MIME type validation
  if (allowedMimeTypes?.length) {
    schema = schema.refine((file) => allowedMimeTypes.includes(file.mimetype), {
      message: `MIME type not allowed. Allowed: ${allowedMimeTypes.join(', ')}`,
    });
  }

  // Extension validation
  if (allowedExtensions?.length) {
    schema = schema.refine(
      (file) => {
        const ext = `.${file.filename.split('.').pop()?.toLowerCase()}`;
        return allowedExtensions.includes(ext);
      },
      {
        message: `Extension not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      },
    );
  }

  return required ? schema : schema.optional();
}

// =============================================================================
// PRESET SCHEMAS
// =============================================================================

/**
 * Image file schema for API uploads
 */
export const imageNodeFileSchema = createNodeFileSchema({
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.tif'],
});

/**
 * Document file schema for API uploads
 */
export const documentNodeFileSchema = createNodeFileSchema({
  maxSizeBytes: 20 * 1024 * 1024, // 20MB
  allowedMimeTypes: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
  allowedExtensions: ['.pdf', '.doc', '.docx', '.txt', '.md'],
});

/**
 * Code file schema
 */
export const codeNodeFileSchema = createNodeFileSchema({
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: [
    'text/plain',
    'text/javascript',
    'text/typescript',
    'application/javascript',
    'application/json',
  ],
  allowedExtensions: [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.json',
    '.py',
    '.rs',
    '.go',
    '.java',
    '.c',
    '.cpp',
    '.h',
  ],
});

// =============================================================================
// MULTIPART FORM SCHEMAS
// =============================================================================

/**
 * Schema for multipart form with file upload
 */
export const fileUploadRequestSchema = z.object({
  file: nodeFileSchema,
  metadata: z
    .object({
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export type FileUploadRequest = z.infer<typeof fileUploadRequestSchema>;

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate file input and return result
 */
export function validateNodeFile<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(input);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatFileErrors(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.join('.');
    return path ? `${path}: ${issue.message}` : issue.message;
  });
}

// =============================================================================
// RE-EXPORT ZOD
// =============================================================================

export { z };
