/**
 * Debug System Index
 * Screenshot-based debug loop + Monitoring features
 */

export { DebugLoop, debugWithScreenshot } from './DebugLoop.js';

// Features #41, #42, #43, #44, #45: Monitoring System
export {
  Logger,
  logger,
  MetricsDashboard,
  metrics,
  TaskReplay,
  taskReplay,
  DryRunMode,
  dryRun,
  AgentTrace,
  agentTrace
} from './MonitoringSystem.js';

export type {
  LogLevel,
  LogEntry,
  MetricPoint,
  Metric,
  ReplayEntry,
  ReplaySession,
  DryRunResult,
  TraceSpan
} from './MonitoringSystem.js';
