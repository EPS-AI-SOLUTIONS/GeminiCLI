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
  MCPServerConfig,
  MCPTool,
  MCPPrompt,
  MCPResource,
  MCPServerStatus,
  MCPServerInfo,
  MCPToolResult,
  MCPBatchOperation,
  MCPBatchResult,
  MCPValidationResult,
  MCPToolDiscoveryOptions,
  ConnectedServer
} from './MCPTypes.js';

// ============================================================
// Aliases
// ============================================================

export {
  resolveAlias,
  isAlias,
  addAlias,
  removeAlias,
  getAllAliases,
  getAliasesByPrefix,
  findAliasForTool,
  clampNumber,
  sanitizeNumericParams,
  NUMERIC_LIMITS,
  MCP_ALIASES,
  PREDEFINED_ALIASES
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
  type ParsedServerName
} from './MCPToolRegistry.js';

// ============================================================
// Circuit Breaker (extracted from MCPManager)
// ============================================================

export {
  MCPCircuitBreakerManager,
  mcpCircuitBreakerManager,
  type MCPCircuitBreakerConfig,
  type ReconnectionHandler
} from './MCPCircuitBreaker.js';

// ============================================================
// Batch Operations (extracted from MCPManager)
// ============================================================

export {
  MCPBatchExecutor,
  mcpBatchExecutor,
  type BatchExecutionOptions,
  type BatchStats,
  type ToolExecutor
} from './MCPBatchOperations.js';

// ============================================================
// Auto-Discovery (extracted from MCPManager)
// ============================================================

export {
  MCPAutoDiscovery,
  mcpAutoDiscovery,
  type ToolChangeEvent,
  type DiscoveryStatus,
  type ToolProvider
} from './MCPAutoDiscovery.js';

// ============================================================
// Agent Bridge
// ============================================================

export { MCPAgentBridge, mcpBridge } from './MCPAgentBridge.js';

// ============================================================
// Serena Integration (Code Intelligence)
// ============================================================

export {
  SerenaIntegration,
  serenaIntegration
} from './SerenaIntegration.js';

export type {
  SerenaProject,
  SerenaSymbol,
  SerenaSearchResult
} from './SerenaIntegration.js';

// ============================================================
// Serena Service (High-level wrapper)
// ============================================================

export {
  SerenaService,
  createSerenaService,
  getSerenaService
} from './SerenaService.js';

export type {
  SerenaConfig,
  SymbolInfo,
  FileInfo
} from './SerenaService.js';

// ============================================================
// Native Tools Server (Virtual MCP server for native tools)
// ============================================================

export {
  NativeToolsServer,
  getNativeToolsServer,
  nativeToolsServer,
  NATIVE_SERVER_NAME,
  NATIVE_TOOL_ALIASES
} from './NativeToolsServer.js';
