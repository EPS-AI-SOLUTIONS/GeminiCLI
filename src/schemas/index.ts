/**
 * @fileoverview Central export for all schemas
 * @module schemas
 */

// =============================================================================
// FILE SCHEMAS
// =============================================================================

export {
  // Base schemas
  nodeFileSchema,
  type NodeFile,
  // Factory
  createNodeFileSchema,
  type NodeFileSchemaOptions,
  // Preset schemas
  imageNodeFileSchema,
  documentNodeFileSchema,
  codeNodeFileSchema,
  // Request schemas
  fileUploadRequestSchema,
  type FileUploadRequest,
  // Validation utilities
  validateNodeFile,
  formatFileErrors,
  // Zod re-export
  z,
} from './file.js';
