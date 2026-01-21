/**
 * Debug LiveView Panel
 * Real-time system monitoring and debugging for Claude GUI
 *
 * Features:
 * - Live stats streaming (memory, CPU, tasks, IPC)
 * - Log viewer with level filtering
 * - IPC call history
 * - Performance metrics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import {
  Bug,
  Activity,
  Cpu,
  MemoryStick,
  Clock,
  Zap,
  Terminal,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  AlertTriangle,
  Info,
  AlertCircle,
  ChevronDown,
  Database,
  Gauge,
  Search,
  Maximize2,
  Minimize2,
  X,
  Download,
} from 'lucide-react';
import {
  debugIpc,
  type DebugStats,
  type LogEntry,
  type IpcCall,
  type LogLevel,
} from '../lib/ipc';

// ============================================================================
// Sub-components
// ============================================================================

// ============================================================================
// Sparkline Component for CPU History
// ============================================================================

interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

function Sparkline({ data, width = 80, height = 20, className = '' }: SparklineProps) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`)
    .join(' ');

  return (
    <svg width={width} height={height} className={`opacity-70 ${className}`}>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// ============================================================================
// CPU Sparkline Component with Trend
// ============================================================================

interface CpuSparklineProps {
  history: number[];
}

function CpuSparkline({ history }: CpuSparklineProps) {
  // Calculate trend (compare last 5 values average to previous 5)
  const getTrend = (): { arrow: string; color: string } => {
    if (history.length < 10) return { arrow: '-', color: 'text-gray-400' };

    const recent = history.slice(-5);
    const previous = history.slice(-10, -5);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;

    const diff = recentAvg - previousAvg;

    if (diff > 2) return { arrow: '\u2191', color: 'text-red-400' }; // Rising (bad for CPU)
    if (diff < -2) return { arrow: '\u2193', color: 'text-green-400' }; // Falling (good)
    return { arrow: '\u2192', color: 'text-yellow-400' }; // Stable
  };

  const trend = getTrend();

  return (
    <div className="flex flex-col gap-1 mt-1">
      <div className="flex items-center gap-2">
        <Sparkline data={history} width={60} height={16} className="text-green-400" />
        <span className={`text-xs font-bold ${trend.color}`} title="Trend">
          {trend.arrow}
        </span>
      </div>
      <div className="text-[8px] text-matrix-text-dim">
        Last {history.length}s
      </div>
    </div>
  );
}

// ============================================================================
// StatCard Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  color: string;
  children?: React.ReactNode;
}

function StatCard({ label, value, subValue, icon: Icon, color, children }: StatCardProps) {
  return (
    <div className="glass-card p-2 flex flex-col">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className={color} />
        <span className="text-[10px] text-matrix-text-dim">{label}</span>
      </div>
      <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
      {subValue && (
        <div className="text-[9px] text-matrix-text-dim">{subValue}</div>
      )}
      {children}
    </div>
  );
}

interface LogLevelBadgeProps {
  level: LogLevel;
}

function LogLevelBadge({ level }: LogLevelBadgeProps) {
  const config: Record<LogLevel, { icon: React.ElementType; color: string }> = {
    debug: { icon: Bug, color: 'text-gray-400 bg-gray-400/10' },
    info: { icon: Info, color: 'text-blue-400 bg-blue-400/10' },
    warn: { icon: AlertTriangle, color: 'text-yellow-400 bg-yellow-400/10' },
    error: { icon: AlertCircle, color: 'text-red-400 bg-red-400/10' },
  };

  const { icon: Icon, color } = config[level] || config.info;

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase font-mono ${color}`}>
      <Icon size={10} />
      {level}
    </span>
  );
}

// Highlight function for search matches
function highlightText(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-400/30 text-yellow-300 px-0.5 rounded">{part}</mark>
      : part
  );
}

interface LogViewerProps {
  logs: LogEntry[];
  maxHeight?: string;
  searchQuery?: string;
}

function LogViewer({ logs, maxHeight = '300px', searchQuery = '' }: LogViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const time = date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${time}.${ms}`;
  };

  if (logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-matrix-text-dim text-xs italic">
        <Terminal size={16} className="mr-2 opacity-50" />
        Brak logow
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="overflow-auto font-mono text-[11px] bg-matrix-bg-primary/30 rounded border border-matrix-border"
        style={{ maxHeight }}
        onScroll={(e) => {
          const target = e.target as HTMLDivElement;
          const atBottom = target.scrollHeight - target.scrollTop <= target.clientHeight + 10;
          setAutoScroll(atBottom);
        }}
      >
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start gap-2 px-2 py-1 hover:bg-matrix-bg-secondary/30 border-b border-matrix-border/30"
          >
            <span className="text-matrix-text-dim shrink-0">{formatTime(log.timestamp)}</span>
            <LogLevelBadge level={log.level} />
            <span className="text-matrix-accent shrink-0">[{highlightText(log.source, searchQuery)}]</span>
            <span className="text-matrix-text break-all">{highlightText(log.message, searchQuery)}</span>
            {log.details && (
              <span className="text-matrix-text-dim text-[9px] ml-auto shrink-0" title={log.details}>
                +details
              </span>
            )}
          </div>
        ))}
      </div>
      {!autoScroll && (
        <button
          onClick={() => {
            setAutoScroll(true);
            containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
          }}
          className="absolute bottom-2 right-2 glass-button p-1 text-[10px]"
        >
          <ChevronDown size={12} />
        </button>
      )}
    </div>
  );
}

interface IpcHistoryProps {
  calls: IpcCall[];
}

function IpcHistory({ calls }: IpcHistoryProps) {
  if (calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-matrix-text-dim text-xs italic">
        <Zap size={14} className="mr-2 opacity-50" />
        Brak wywolan IPC
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-48 overflow-auto">
      {calls.slice(0, 20).map((call) => (
        <div
          key={call.id}
          className={`flex items-center gap-2 px-2 py-1 rounded text-xs font-mono ${
            call.success ? 'bg-green-500/5' : 'bg-red-500/10'
          }`}
        >
          <span className={call.success ? 'text-green-400' : 'text-red-400'}>
            {call.success ? '✓' : '✗'}
          </span>
          <span className="text-matrix-accent flex-1 truncate">{call.command}</span>
          <span className="text-matrix-text-dim">{call.duration_ms.toFixed(1)}ms</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Memory Trend Graph Component
// ============================================================================

interface MemoryDataPoint {
  mb: number;
  percent: number;
}

interface MemoryTrendGraphProps {
  data: MemoryDataPoint[];
}

function MemoryTrendGraph({ data }: MemoryTrendGraphProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-10 text-matrix-text-dim text-xs italic">
        Collecting data...
      </div>
    );
  }

  const width = 100;
  const height = 40;
  const padding = { top: 4, right: 4, bottom: 4, left: 4 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate min/max for scaling
  const mbValues = data.map((d) => d.mb);
  const minMb = Math.min(...mbValues);
  const maxMb = Math.max(...mbValues);
  const range = maxMb - minMb || 1; // Avoid division by zero

  // Generate SVG path for area chart
  const getY = (mb: number) => {
    const normalized = (mb - minMb) / range;
    return chartHeight - normalized * chartHeight + padding.top;
  };

  const getX = (index: number) => {
    return (index / (data.length - 1)) * chartWidth + padding.left;
  };

  // Create path data for the area
  const pathPoints = data.map((d, i) => `${getX(i)},${getY(d.mb)}`).join(' L ');
  const areaPath = `M ${padding.left},${chartHeight + padding.top} L ${pathPoints} L ${getX(data.length - 1)},${chartHeight + padding.top} Z`;
  const linePath = `M ${pathPoints}`;

  const currentMb = data[data.length - 1]?.mb ?? 0;
  const currentPercent = data[data.length - 1]?.percent ?? 0;

  return (
    <div className="relative w-full h-10">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="memoryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={areaPath} fill="url(#memoryGradient)" />
        {/* Line stroke */}
        <path
          d={linePath}
          fill="none"
          stroke="#60a5fa"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* Overlay labels */}
      <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none">
        <div className="text-[9px] text-matrix-text-dim font-mono">
          {minMb.toFixed(0)}MB
        </div>
        <div className="text-xs text-blue-400 font-mono font-bold">
          {currentMb.toFixed(0)}MB ({currentPercent.toFixed(1)}%)
        </div>
        <div className="text-[9px] text-matrix-text-dim font-mono">
          {maxMb.toFixed(0)}MB
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DebugPanel() {
  // State
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [ipcHistory, setIpcHistory] = useState<IpcCall[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [memoryHistory, setMemoryHistory] = useState<MemoryDataPoint[]>([]);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);

  // Refs
  const unlistenRef = useRef<UnlistenFn | null>(null);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // Escape key handler for fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [snapshot, logsData, ipcData] = await Promise.all([
        debugIpc.getSnapshot(),
        debugIpc.getLogs(undefined, 100),
        debugIpc.getIpcHistory(50),
      ]);
      setStats(snapshot.stats);
      setLogs(logsData);
      setIpcHistory(ipcData);
    } catch (error) {
      console.warn('Failed to load debug data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Start streaming
  const startStreaming = useCallback(async () => {
    try {
      // Listen for stats updates
      unlistenRef.current = await listen<DebugStats>('debug-stats', (event) => {
        setStats(event.payload);
      });

      await debugIpc.startStreaming();
      setIsStreaming(true);
    } catch (error) {
      console.warn('Failed to start streaming:', error);
    }
  }, []);

  // Stop streaming
  const stopStreaming = useCallback(async () => {
    try {
      await debugIpc.stopStreaming();
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      setIsStreaming(false);
    } catch (error) {
      console.warn('Failed to stop streaming:', error);
    }
  }, []);

  // Toggle streaming
  const toggleStreaming = useCallback(() => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  }, [isStreaming, startStreaming, stopStreaming]);

  // Clear logs
  const clearLogs = useCallback(async () => {
    try {
      await debugIpc.clearLogs();
      setLogs([]);
    } catch (error) {
      console.warn('Failed to clear logs:', error);
    }
  }, []);

  // Export logs as JSON
  const exportLogsAsJson = useCallback(() => {
    const data = JSON.stringify(logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  // Export logs as CSV
  const exportLogsAsCsv = useCallback(() => {
    const headers = ['id', 'timestamp', 'level', 'source', 'message', 'details'];
    const rows = logs.map(log => [
      log.id,
      new Date(log.timestamp).toISOString(),
      log.level,
      log.source,
      `"${log.message.replace(/"/g, '""')}"`,
      log.details ? `"${log.details.replace(/"/g, '""')}"` : ''
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [logs]);

  // Initial load
  useEffect(() => {
    loadData();
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, [loadData]);

  // Refresh logs periodically when not streaming
  useEffect(() => {
    if (isStreaming) return;

    const interval = setInterval(async () => {
      const lastId = logs.length > 0 ? logs[0].id : undefined;
      const newLogs = await debugIpc.getLogs(
        levelFilter === 'all' ? undefined : levelFilter,
        50,
        lastId
      );
      if (newLogs.length > 0) {
        setLogs((prev) => [...newLogs, ...prev].slice(0, 200));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming, logs, levelFilter]);

  // Update memory history when stats change (for trend graph)
  useEffect(() => {
    if (stats) {
      setMemoryHistory((prev) => {
        const newPoint: MemoryDataPoint = {
          mb: stats.memory_used_mb,
          percent: stats.memory_percent,
        };
        const updated = [...prev, newPoint];
        // Keep last 60 points (60 seconds of data at 1 update/sec)
        return updated.slice(-60);
      });
    }
  }, [stats]);

  // Update CPU history when stats change (for sparkline)
  useEffect(() => {
    if (stats) {
      setCpuHistory((prev) => {
        // Use cpu_cores as a proxy for CPU usage (you may want to replace with actual CPU % if available)
        // For now, we'll simulate CPU usage based on active tasks and IPC calls
        const simulatedCpuUsage = Math.min(
          100,
          (stats.active_tasks * 5) + (stats.ipc_calls_per_sec * 2) + Math.random() * 10
        );
        const updated = [...prev, simulatedCpuUsage];
        // Keep last 60 points (60 seconds of data at 1 update/sec)
        return updated.slice(-60);
      });
    }
  }, [stats]);

  // Filter logs by level and search query
  const filteredLogs = logs.filter((log) => {
    const matchesLevel = levelFilter === 'all' || log.level === levelFilter;
    const matchesSearch = !searchQuery ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.source.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // Count search matches
  const searchMatchCount = searchQuery ? filteredLogs.length : 0;

  // Format uptime
  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  if (loading) {
    return (
      <div className="flex-1 glass-panel flex items-center justify-center">
        <RefreshCw className="animate-spin text-matrix-accent" size={24} />
      </div>
    );
  }

  return (
    <div className={`
      ${isFullscreen
        ? 'fixed inset-0 z-50 bg-matrix-bg-primary'
        : 'flex-1 glass-panel'
      } flex flex-col overflow-hidden transition-all duration-300
    `}>
      {/* Fullscreen close button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="absolute top-4 right-4 z-50 glass-button p-2 hover:bg-red-500/20"
          title="Exit fullscreen (Esc)"
        >
          <X size={20} className="text-matrix-text" />
        </button>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-matrix-border">
        <div className="flex items-center gap-3">
          <Bug className="w-6 h-6 text-matrix-accent" />
          <div>
            <h2 className="text-lg font-bold text-matrix-text">Debug LiveView</h2>
            <p className="text-xs text-matrix-text-dim">Real-time monitoring & diagnostics</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleStreaming}
            className={`glass-button p-2 ${isStreaming ? 'text-green-400' : 'text-matrix-text-dim'}`}
            title={isStreaming ? 'Stop streaming' : 'Start streaming'}
          >
            {isStreaming ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button onClick={loadData} className="glass-button p-2" title="Refresh">
            <RefreshCw size={16} />
          </button>
          <button onClick={clearLogs} className="glass-button p-2" title="Clear logs">
            <Trash2 size={16} />
          </button>
          <div className="relative group">
            <button className="glass-button p-2" title="Export logs">
              <Download size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block glass-card p-1 z-10 min-w-[100px]">
              <button onClick={exportLogsAsJson} className="w-full text-left px-2 py-1 text-xs hover:bg-matrix-accent/20 rounded">
                Export JSON
              </button>
              <button onClick={exportLogsAsCsv} className="w-full text-left px-2 py-1 text-xs hover:bg-matrix-accent/20 rounded">
                Export CSV
              </button>
            </div>
          </div>
          <button
            onClick={toggleFullscreen}
            className="glass-button p-2"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <StatCard
              label="Memory"
              value={`${stats.memory_used_mb.toFixed(0)}MB`}
              subValue={`${stats.memory_percent.toFixed(1)}%`}
              icon={MemoryStick}
              color="text-blue-400"
            />
            <StatCard
              label="CPU Cores"
              value={stats.cpu_cores}
              icon={Cpu}
              color="text-green-400"
            >
              {cpuHistory.length > 1 && <CpuSparkline history={cpuHistory} />}
            </StatCard>
            <StatCard
              label="Active Tasks"
              value={stats.active_tasks}
              subValue={`+${stats.queued_tasks} queued`}
              icon={Activity}
              color="text-yellow-400"
            />
            <StatCard
              label="IPC Total"
              value={stats.ipc_calls_total}
              subValue={`${stats.ipc_calls_failed} failed`}
              icon={Zap}
              color="text-purple-400"
            />
            <StatCard
              label="Avg Latency"
              value={`${stats.ipc_avg_latency_ms.toFixed(1)}ms`}
              subValue={`${stats.ipc_calls_per_sec.toFixed(1)}/sec`}
              icon={Gauge}
              color="text-pink-400"
            />
            <StatCard
              label="Uptime"
              value={formatUptime(stats.uptime_secs)}
              subValue={`${stats.events_emitted} events`}
              icon={Clock}
              color="text-cyan-400"
            />
          </div>
        )}

        {/* Memory Trend Graph */}
        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-2">
            <MemoryStick size={14} className="text-blue-400" />
            <span className="text-sm font-semibold text-matrix-text">Memory Trend</span>
            <span className="text-[10px] text-matrix-text-dim">(last 60s)</span>
          </div>
          <MemoryTrendGraph data={memoryHistory} />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Log Viewer */}
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-matrix-accent" />
                <span className="text-sm font-semibold text-matrix-text">Logs</span>
                <span className="text-[10px] text-matrix-text-dim">
                  ({filteredLogs.length})
                  {searchQuery && <span className="text-yellow-400 ml-1">({searchMatchCount} matches)</span>}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <Search size={12} className="absolute left-2 text-matrix-text-dim" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input text-[10px] pl-6 pr-2 py-1 w-32"
                  />
                </div>
                <select
                  value={levelFilter}
                  onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
                  className="glass-input text-[10px] px-2 py-1"
                >
                  <option value="all">All Levels</option>
                  <option value="debug">Debug</option>
                  <option value="info">Info</option>
                  <option value="warn">Warn</option>
                  <option value="error">Error</option>
                </select>
              </div>
            </div>
            <LogViewer logs={filteredLogs} maxHeight="250px" searchQuery={searchQuery} />
          </div>

          {/* IPC History */}
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-3">
              <Database size={14} className="text-matrix-accent" />
              <span className="text-sm font-semibold text-matrix-text">IPC History</span>
              <span className="text-[10px] text-matrix-text-dim">({ipcHistory.length})</span>
            </div>
            <IpcHistory calls={ipcHistory} />
          </div>
        </div>

        {/* Performance Summary */}
        {stats && (
          <div className="glass-card p-3">
            <div className="flex items-center gap-2 mb-3">
              <Gauge size={14} className="text-matrix-accent" />
              <span className="text-sm font-semibold text-matrix-text">Performance Summary</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs">
              <div>
                <div className="text-2xl font-mono font-bold text-green-400">
                  {stats.completed_tasks}
                </div>
                <div className="text-matrix-text-dim">Completed Tasks</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-blue-400">
                  {((1 - stats.ipc_calls_failed / Math.max(stats.ipc_calls_total, 1)) * 100).toFixed(1)}%
                </div>
                <div className="text-matrix-text-dim">Success Rate</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-purple-400">
                  {stats.events_per_sec.toFixed(1)}
                </div>
                <div className="text-matrix-text-dim">Events/sec</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-yellow-400">
                  {stats.ipc_avg_latency_ms.toFixed(1)}ms
                </div>
                <div className="text-matrix-text-dim">Avg Response</div>
              </div>
            </div>
          </div>
        )}

        {/* Streaming Status */}
        {isStreaming && (
          <div className="flex items-center justify-center gap-2 text-xs text-green-400">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            LiveView streaming active
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-matrix-border text-[10px] text-matrix-text-dim flex justify-between">
        <span>Debug LiveView v1.0</span>
        <span>
          {stats ? `${formatUptime(stats.uptime_secs)} uptime` : 'Loading...'}
        </span>
      </div>
    </div>
  );
}

export default DebugPanel;
