/**
 * MCP Module Index
 * Model Context Protocol integration for GeminiHydra
 *
 * Note: Most MCP servers have been replaced with native implementations.
 * See src/native/ for NativeFileSystem, NativeMemory, NativeShell, NativeSearch.
 *
 * Remaining MCP servers:
 * - Serena (code intelligence via LSP)
 * - Ollama (local AI models)
 */

// ============================================================
// Types (re-export all from MCPTypes)
// ============================================================

export type {
  ConnectedServer,
  MCPBatchOperation,
  MCPBatchResult,
  MCPPrompt,
  MCPResource,
  MCPServerConfig,
  MCPServerInfo,
  MCPServerStatus,
  MCPTool,
  MCPToolDiscoveryOptions,
  MCPToolResult,
  MCPValidationResult,
} from './MCPTypes.js';

// ============================================================
// Aliases
// ============================================================

export {
  addAlias,
  clampNumber,
  findAliasForTool,
  getAliasesByPrefix,
  getAllAliases,
  isAlias,
  MCP_ALIASES,
  NUMERIC_LIMITS,
  PREDEFINED_ALIASES,
  removeAlias,
  resolveAlias,
  sanitizeNumericParams,
} from './MCPAliases.js';

// ============================================================
// Manager (with integrated enhancements)
// ============================================================

export { MCPManager, mcpManager } from './MCPManager.js';

// ============================================================
// Tool Registry (extracted from MCPManager)
// ============================================================

export {
  MCPToolRegistry,
  mcpToolRegistry,
  type ParsedServerName,
} from './MCPToolRegistry.js';

// ============================================================
// Circuit Breaker (extracted from MCPManager)
// ============================================================

export {
  type MCPCircuitBreakerConfig,
  MCPCircuitBreakerManager,
  mcpCircuitBreakerManager,
  type ReconnectionHandler,
} from './MCPCircuitBreaker.js';

// ============================================================
// Batch Operations (extracted from MCPManager)
// ============================================================

export {
  type BatchExecutionOptions,
  type BatchStats,
  MCPBatchExecutor,
  mcpBatchExecutor,
  type ToolExecutor,
} from './MCPBatchOperations.js';

// ============================================================
// Auto-Discovery (extracted from MCPManager)
// ============================================================

export {
  type DiscoveryStatus,
  MCPAutoDiscovery,
  mcpAutoDiscovery,
  type ToolChangeEvent,
  type ToolProvider,
} from './MCPAutoDiscovery.js';

// ============================================================
// Agent Bridge
// ============================================================

export { MCPAgentBridge, mcpBridge } from './MCPAgentBridge.js';

// ============================================================
// Serena Integration (Code Intelligence)
// ============================================================

export type {
  SerenaProject,
  SerenaSearchResult,
  SerenaSymbol,
} from './SerenaIntegration.js';
export {
  SerenaIntegration,
  serenaIntegration,
} from './SerenaIntegration.js';

// ============================================================
// Serena Service (High-level wrapper)
// ============================================================

export type {
  FileInfo,
  SerenaConfig,
  SymbolInfo,
} from './SerenaService.js';
export {
  createSerenaService,
  getSerenaService,
  SerenaService,
} from './SerenaService.js';

// ============================================================
// Native Tools Server (Virtual MCP server for native tools)
// ============================================================

export {
  getNativeToolsServer,
  NATIVE_SERVER_NAME,
  NATIVE_TOOL_ALIASES,
  NativeToolsServer,
  nativeToolsServer,
} from './NativeToolsServer.js';
