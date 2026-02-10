/**
 * Utils Module
 * Re-exports all utilities
 */

// Event Builders
export {
  arrayToEventStream,
  type ChunkEventData,
  chunksToEvents,
  createChunkEvent,
  createErrorEvent,
  createPlanEvent,
  createResultEvent,
  createStatusEvent,
  type ErrorEventData,
  isChunkEvent,
  isErrorEvent,
  isPlanEvent,
  isResultEvent,
  mergeEventStreams,
  type PlanEventData,
  type ResultEventData,
  type SSEEvent,
  type StatusEventData,
  serializeComment,
  serializeDone,
  serializeEvent,
} from './eventBuilders.js';
// Message Filters
export {
  applyFilters,
  countByRole,
  filterByAgent,
  filterByDateRange,
  filterByRole,
  filterBySearch,
  getFirstN,
  getLastN,
  getUniqueAgents,
  groupByAgent,
  groupByDate,
  type MessageFilter,
  type MessageGroup,
  sortByTimestamp,
} from './messageFilters.js';

// Route Helpers
export {
  createErrorResult,
  type ErrorResult,
  errorResponse,
  getErrorMessage,
  getErrorStatusCode,
  isErrorResult,
  type RouteHandler,
  successResponse,
  wrapExecutionRoute,
  wrapRoute,
} from './routeWrapper.js';
// SSE Streaming
export { createKeepAlive, SSEWriter } from './sse.js';
// Validation Helpers
export {
  optionalBoolean,
  optionalEnum,
  optionalNumber,
  optionalString,
  requireArray,
  requireBoolean,
  requireEnum,
  requireNumber,
  requireObject,
  requireString,
} from './validation.js';
