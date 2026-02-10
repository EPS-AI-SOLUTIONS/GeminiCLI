/**
 * NativeCommands - Module index
 *
 * Re-exports all command groups and the registration function.
 *
 * Original NativeCommands.ts (1921 lines) has been split into:
 * - helpers.ts         - Shared imports, utilities, diagnostics
 * - nativeCommands.ts  - Core native tools (init/status/shutdown)
 * - fsCommands.ts      - File system commands
 * - shellCommands.ts   - Shell/process commands
 * - searchCommands.ts  - Search commands (grep-like)
 * - memoryCommands.ts  - Memory/knowledge graph commands
 * - registration.ts    - registerNativeCommands() function
 *
 * @module cli/nativecommands/index
 */

export { fsCommands } from './fsCommands.js';
// Helpers (re-export for advanced usage)
export {
  detectFileEncoding,
  dynamicAllowedPaths,
  dynamicBlockedPaths,
  getFileAttributes,
  getShellDiagnostics,
  getTools,
  parseFlags,
  setFileAttributes,
} from './helpers.js';
export { memoryCommands } from './memoryCommands.js';
// Command groups
export { nativeCommands } from './nativeCommands.js';
// Registration
export { registerNativeCommands } from './registration.js';
export { searchCommands } from './searchCommands.js';
export { shellCommands } from './shellCommands.js';
