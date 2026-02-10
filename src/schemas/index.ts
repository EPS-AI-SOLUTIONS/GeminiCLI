/**
 * @fileoverview Central export for all schemas
 * @module schemas
 */

// =============================================================================
// FILE SCHEMAS
// =============================================================================

export {
  codeNodeFileSchema,
  // Factory
  createNodeFileSchema,
  documentNodeFileSchema,
  type FileUploadRequest,
  // Request schemas
  fileUploadRequestSchema,
  formatFileErrors,
  // Preset schemas
  imageNodeFileSchema,
  type NodeFile,
  type NodeFileSchemaOptions,
  // Base schemas
  nodeFileSchema,
  // Validation utilities
  validateNodeFile,
  // Zod re-export
  z,
} from './file.js';
