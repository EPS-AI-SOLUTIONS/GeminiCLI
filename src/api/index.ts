/**
 * GeminiHydra API Module
 * Re-exports server functionality and all modules
 */

export type {
  ApiConfig,
  HistoryConfig,
  MonitoringConfig,
  ServerConfig,
  SettingsConfig,
} from './config/index.js';

// Config
export { API_CONFIG } from './config/index.js';
export type { ValidMessageRole } from './constants/index.js';

// Constants
export {
  API_ERRORS,
  FIELD_NAMES,
  isValidExecutionMode,
  isValidLanguage,
  isValidMessageRole,
  isValidTheme,
  LOG_MESSAGES,
  NUMERIC_RANGES,
  SUCCESS_MESSAGES,
  VALID_EXECUTION_MODES,
  VALID_LANGUAGES,
  VALID_MESSAGE_ROLES,
  VALID_THEMES,
  VALIDATION_ERRORS,
} from './constants/index.js';
export type { ErrorResponse, RequestLog } from './middleware/index.js';
// Middleware
export {
  ApiError,
  ExecutionError,
  errorHandler,
  NotFoundError,
  notFoundHandler,
  ValidationError,
} from './middleware/index.js';
// Routes
export * from './routes/index.js';
// Server
export { createServer, startServer } from './server.js';
export type {
  Classification,
  ExecuteResult,
  ExecuteStreamEvent,
  FullClassification,
} from './services/index.js';
// Services
export {
  ClassificationService,
  classificationService,
  ExecutionService,
  executionService,
  HistoryService,
  historyService,
} from './services/index.js';
export type { AddMessageInput, ValidationResult } from './stores/index.js';

// Stores
export { HistoryStore, historyStore, SettingsStore, settingsStore } from './stores/index.js';
export * from './types/fastify.js';
// Types
export * from './types/index.js';
export type {
  ChunkEventData,
  ErrorEventData,
  ErrorResult,
  MessageFilter,
  MessageGroup,
  PlanEventData,
  ResultEventData,
  RouteHandler,
  SSEEvent,
  StatusEventData,
} from './utils/index.js';
// Utils - SSE
// Utils - Route Helpers
// Utils - Message Filters
// Utils - Event Builders
export {
  applyFilters,
  arrayToEventStream,
  chunksToEvents,
  countByRole,
  createChunkEvent,
  createErrorEvent,
  createErrorResult,
  createKeepAlive,
  createPlanEvent,
  createResultEvent,
  createStatusEvent,
  errorResponse,
  filterByAgent,
  filterByDateRange,
  filterByRole,
  filterBySearch,
  getErrorMessage,
  getErrorStatusCode,
  getFirstN,
  getLastN,
  getUniqueAgents,
  groupByAgent,
  groupByDate,
  isChunkEvent,
  isErrorEvent,
  isErrorResult,
  isPlanEvent,
  isResultEvent,
  mergeEventStreams,
  SSEWriter,
  serializeComment,
  serializeDone,
  serializeEvent,
  sortByTimestamp,
  successResponse,
  wrapExecutionRoute,
  wrapRoute,
} from './utils/index.js';
export * from './utils/validation.js';
export type { ClassifyRequest, ExecuteOptions } from './validators/index.js';
// Validators
export {
  isNonEmptyString,
  validateAgentId,
  validateClassifyRequest,
  validateDateRange,
  validateExecuteOptions,
  validateExecuteRequest,
  validateExecutionMode,
  validateHistoryLimit,
  validateLanguage,
  validateMaxTokens,
  validateModel,
  validatePrompt,
  validateSearchQuery,
  validateSettingsUpdate,
  validateTemperature,
  validateTheme,
} from './validators/index.js';
