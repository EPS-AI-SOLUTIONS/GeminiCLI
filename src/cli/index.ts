/**
 * GeminiHydra CLI Module Index
 * All CLI features exposed from here
 */

// Internal imports for initializeCommands function
import { registerCodebaseCommands as _registerCodebaseCommands } from './CodebaseCommands.js';
import { registerDiagnosticCommands as _registerDiagnosticCommands } from './CommandDiagnostics.js';
import { registerDocumentCommands as _registerDocumentCommands } from './DocumentCommands.js';
import { registerHelpCommand as _registerHelpCommand } from './help/index.js';
import { registerMCPCommands as _registerMCPCommands } from './MCPCommands.js';
import { registerSerenaAgentCommands as _registerSerenaAgentCommands } from './SerenaAgentCommands.js';
import { registerSerenaCommands as _registerSerenaCommands } from './SerenaCommands.js';
import { registerSessionCommands as _registerSessionCommands } from './SessionCommands.js';

// AsyncUtils - Direct import for advanced usage
export * as AsyncUtils from './AsyncUtils.js';
export type {
  AutocompleteOptions,
  EditableTask,
  NotificationOptions,
  OutputFormat,
  ProgressBarOptions,
  TaskTemplate,
} from './CLIEnhancements.js';
// Features #31-39: CLI Enhancements
export {
  createCompleter,
  HistorySearch,
  highlightCode,
  historySearch,
  OutputFormatter,
  OutputPaginator,
  outputFormatter,
  ProgressBar,
  paginator,
  sendNotification,
  TaskEditor,
  TemplateManager,
  templateManager,
} from './CLIEnhancements.js';
export type { LegacyCommandContext as CodebaseCommandContext } from './CodebaseCommands.js';
// Codebase Commands
export {
  analyzeCommand,
  autoEnrichPrompt,
  codebaseCommands,
  contextCommand,
  initCodebaseForCwd,
  memoryCommand,
  registerCodebaseCommands,
} from './CodebaseCommands.js';
export type {
  CategoryInfo,
  CommandStats,
  DuplicateInfo,
  ExtendedCommandInfo,
  RegistryStatus,
  ValidationIssue,
} from './CommandDiagnostics.js';
// Command Diagnostics
export {
  CommandDiagnostics,
  commandDiagnostics,
  registerDiagnosticCommands,
} from './CommandDiagnostics.js';
export type { ParsedArgs, TableColumn } from './CommandHelpers.js';
// Command Helpers - Shared utilities
export {
  box,
  confirmAction,
  escapeRegex,
  formatBytes,
  formatDuration,
  formatNumber,
  formatPercent,
  formatRelativeTime,
  formatSimpleTable,
  formatTable,
  getBooleanFlag,
  getNumberFlag,
  getStringFlag,
  highlightMatch,
  horizontalLine,
  indent,
  parseArgs,
  promptInput,
  promptSelect,
  Spinner,
  showProgress,
  statusIndicator,
  truncate,
} from './CommandHelpers.js';
export type {
  AnyCommandHandler,
  AsyncCommandHandler,
  // Async types
  CancellationToken,
  Command,
  CommandArg,
  CommandContext,
  CommandHandler,
  CommandResult,
  ExecuteOptions,
  ExtendedCommandContext,
  ExtendedCommandHandler,
  ProgressCallback,
  ProgressInfo,
  SyncCommandHandler,
} from './CommandRegistry.js';
// Command Registry - Unified command management
export {
  CancellationError,
  // Re-exported from AsyncUtils
  CancellationTokenSource,
  CommandRegistry,
  commandRegistry,
  delay,
  error,
  executeWithCancellation,
  executeWithTimeout,
  executeWithTimeoutAndCancellation,
  globalOperationTracker,
  isAsyncFunction,
  OperationTracker,
  ProgressReporter,
  retry,
  success,
  TimeoutError,
  withCancellation,
  withCancellationAndProgress,
  withProgress,
  wrapHandler,
} from './CommandRegistry.js';
export { CostTracker, costTracker } from './CostTracker.js';
export type {
  CwdChangeEvent,
  CwdChangeListener,
  CwdHistoryEntry,
  CwdManagerOptions,
  CwdValidationResult,
} from './CwdManager.js';
// CWD Manager - Current Working Directory management
export {
  CwdManager,
  cwdManager,
} from './CwdManager.js';
// Document Commands (Word, Excel, PDF)
export {
  documentCommands,
  registerDocumentCommands,
} from './DocumentCommands.js';
export type { CommitOptions, GitStatus, PROptions } from './GitIntegration.js';
// Feature #27: Git Integration
export { GitIntegration, git, gitCommands } from './GitIntegration.js';
export type {
  CategoryConfig,
  CommandExample,
  CommandHelpMeta,
  ExportFormat,
} from './help/index.js';
// Help System - Advanced help for commands
export {
  // Helper functions for adding metadata
  addCommandExamples,
  addCommandNotes,
  categoryConfig,
  deprecateCommand,
  exportToJSON,
  exportToMarkdown,
  formatArg,
  formatSignature,
  generateCategoryHelp,
  generateCommandHelp,
  generateFullReference,
  generateOverview,
  getCategoryDisplay,
  helpMetaRegistry,
  registerHelpCommand,
  runInteractiveHelp,
  searchHelp,
  setCommandSeeAlso,
} from './help/index.js';
// Core CLI modes
export { COMPLETIONS, completer, InteractiveMode } from './InteractiveMode.js';
// MCP Integration Commands
export {
  mcpCommands,
  registerMCPCommands,
} from './MCPCommands.js';
// Native Tools Commands
export {
  fsCommands,
  memoryCommands,
  nativeCommands,
  registerNativeCommands,
  searchCommands,
  shellCommands,
} from './nativecommands/index.js';
export { PipelineMode, pipe } from './PipelineMode.js';
export { ProjectContext } from './ProjectContext.js';
export type { PromptCommandResult } from './PromptCommands.js';

// Prompt Memory Commands
export { PromptCommands, promptCommands } from './PromptCommands.js';
// Serena Agent Commands (Real Serena MCP Server)
export {
  handleSerenaAgentCommand,
  registerSerenaAgentCommands,
  serenaAgentCommands,
} from './SerenaAgentCommands.js';
// Serena Commands (Code Intelligence - NativeCodeIntelligence)
export {
  registerSerenaCommands,
  serenaCommands,
} from './SerenaCommands.js';
export type { LegacyCommandContext as SessionCommandContext } from './SessionCommands.js';
// Session Commands
export {
  buildFullContext,
  getPromptContext,
  historyCommand,
  initSessionSystem,
  recordMessage,
  registerSessionCommands,
  resumeCommand,
  saveAndClose,
  sessionCommands,
  sessionsCommand,
} from './SessionCommands.js';
export type {
  Subcommand,
  SubcommandContext,
  SubcommandInfo,
  SubcommandOptions,
} from './SubcommandExtension.js';
// Subcommand Extension - Full subcommand support
export {
  createFsCommand,
  createFsListSubcommand,
  createFsReadSubcommand,
  createFsWriteSubcommand,
  registerFsCommandWithSubcommands,
  SubcommandRegistry,
} from './SubcommandExtension.js';
export { WatchMode } from './WatchMode.js';

// Internal import for initialization
import { registerNativeCommands as _registerNativeCommands } from './nativecommands/index.js';

/**
 * Initialize all CLI commands with the registry
 */
export function initializeCommands(): void {
  // Register help system first (provides /help command)
  _registerHelpCommand();

  // Register all other commands
  _registerCodebaseCommands();
  _registerSessionCommands();
  _registerSerenaCommands();
  _registerSerenaAgentCommands(); // @serena - Real Serena MCP
  _registerMCPCommands();
  _registerNativeCommands();
  _registerDocumentCommands();
  _registerDiagnosticCommands();
}
