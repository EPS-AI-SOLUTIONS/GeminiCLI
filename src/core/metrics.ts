/**
 * Metrics Collection System (#41, #42, #44)
 *
 * Provides centralized metrics tracking for:
 * - Agent performance (response time, token usage, quality scores)
 * - Provider health (success rates, latency, error counts)
 * - Session analytics (total requests, model distribution, costs)
 * - #42: Per-request tracking with detailed timings
 * - #44: Session analytics persistence to disk
 *
 * @module core/metrics
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentMetric {
  agentName: string;
  model: string;
  taskType: string;
  temperature: number;
  responseTimeMs: number;
  tokensEstimated: number;
  qualityScore: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

export interface ProviderMetric {
  provider: 'gemini' | 'ollama' | 'llamacpp';
  model: string;
  action: 'start' | 'end' | 'error';
  latencyMs?: number;
  tokensUsed?: number;
  error?: string;
  timestamp: number;
}

/** #42: Per-request tracking with full detail */
export interface RequestMetric {
  id: string;
  agent: string;
  provider: string;
  model: string;
  startedAt: number;
  completedAt?: number;
  latencyMs?: number;
  tokensIn: number;
  tokensOut: number;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
  taskType: string;
  temperature: number;
}

export interface SessionStats {
  sessionId: string;
  startedAt: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokensEstimated: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  modelDistribution: Record<string, number>;
  agentDistribution: Record<string, number>;
  errorTypes: Record<string, number>;
}

/** #44: Persisted session analytics */
export interface PersistedSessionData {
  sessionId: string;
  savedAt: string;
  stats: SessionStats;
  requestHistory: RequestMetric[];
  agentMetrics: AgentMetric[];
}

// ============================================================================
// METRICS COLLECTOR
// ============================================================================

class MetricsCollector {
  private agentMetrics: AgentMetric[] = [];
  private providerMetrics: ProviderMetric[] = [];
  private sessionStartTime: number;
  private readonly maxMetrics = 1000;

  /** #42: Active request tracking */
  private activeRequests: Map<string, RequestMetric> = new Map();
  private completedRequests: RequestMetric[] = [];
  private requestCounter = 0;

  /** #44: Auto-save state */
  private autoSaveInterval: ReturnType<typeof setInterval> | null = null;
  private readonly dataDir: string;

  constructor() {
    this.sessionStartTime = Date.now();
    // Resolve data directory relative to project root
    try {
      const currentDir = dirname(fileURLToPath(import.meta.url));
      this.dataDir = resolve(currentDir, '..', '..', '.geminihydra', 'metrics');
    } catch {
      this.dataDir = resolve(process.cwd(), '.geminihydra', 'metrics');
    }
  }

  // === Agent Metrics ===

  recordAgentMetric(metric: Omit<AgentMetric, 'timestamp'>): void {
    this.agentMetrics.push({ ...metric, timestamp: Date.now() });
    this.trimIfNeeded(this.agentMetrics);
  }

  getAgentMetrics(agentName?: string): AgentMetric[] {
    if (agentName) {
      return this.agentMetrics.filter((m) => m.agentName === agentName);
    }
    return [...this.agentMetrics];
  }

  // === Provider Metrics ===

  recordProviderMetric(metric: Omit<ProviderMetric, 'timestamp'>): void {
    this.providerMetrics.push({ ...metric, timestamp: Date.now() });
    this.trimIfNeeded(this.providerMetrics);
  }

  getProviderMetrics(provider?: string): ProviderMetric[] {
    if (provider) {
      return this.providerMetrics.filter((m) => m.provider === provider);
    }
    return [...this.providerMetrics];
  }

  // === #42: Per-Request Tracking ===

  /** Start tracking a new request */
  startRequest(
    agent: string,
    provider: string,
    model: string,
    taskType: string,
    temperature: number,
  ): string {
    const id = `req-${++this.requestCounter}-${Date.now()}`;
    const request: RequestMetric = {
      id,
      agent,
      provider,
      model,
      startedAt: Date.now(),
      tokensIn: 0,
      tokensOut: 0,
      status: 'pending',
      taskType,
      temperature,
    };
    this.activeRequests.set(id, request);
    return id;
  }

  /** Complete a tracked request */
  completeRequest(
    id: string,
    result: { tokensIn?: number; tokensOut?: number; success: boolean; error?: string },
  ): void {
    const request = this.activeRequests.get(id);
    if (!request) return;

    request.completedAt = Date.now();
    request.latencyMs = request.completedAt - request.startedAt;
    request.tokensIn = result.tokensIn ?? 0;
    request.tokensOut = result.tokensOut ?? 0;
    request.status = result.success ? 'success' : 'error';
    request.errorMessage = result.error;

    this.activeRequests.delete(id);
    this.completedRequests.push(request);

    // Trim completed requests
    if (this.completedRequests.length > this.maxMetrics) {
      this.completedRequests.splice(0, this.completedRequests.length - this.maxMetrics);
    }
  }

  /** Get active in-flight requests */
  getActiveRequests(): RequestMetric[] {
    return [...this.activeRequests.values()];
  }

  /** Get completed request history */
  getCompletedRequests(limit = 50): RequestMetric[] {
    return this.completedRequests.slice(-limit);
  }

  // === Session Stats ===

  getSessionStats(sessionId: string = 'current'): SessionStats {
    const successful = this.agentMetrics.filter((m) => m.success);
    const failed = this.agentMetrics.filter((m) => !m.success);

    const modelDist: Record<string, number> = {};
    const agentDist: Record<string, number> = {};
    const errorTypes: Record<string, number> = {};

    for (const m of this.agentMetrics) {
      modelDist[m.model] = (modelDist[m.model] || 0) + 1;
      agentDist[m.agentName] = (agentDist[m.agentName] || 0) + 1;
      if (m.error) {
        const errKey = m.error.substring(0, 50);
        errorTypes[errKey] = (errorTypes[errKey] || 0) + 1;
      }
    }

    const totalLatency = this.agentMetrics.reduce((sum, m) => sum + m.responseTimeMs, 0);
    const totalTokens = this.agentMetrics.reduce((sum, m) => sum + m.tokensEstimated, 0);

    return {
      sessionId,
      startedAt: this.sessionStartTime,
      totalRequests: this.agentMetrics.length,
      successfulRequests: successful.length,
      failedRequests: failed.length,
      totalTokensEstimated: totalTokens,
      totalLatencyMs: totalLatency,
      averageLatencyMs:
        this.agentMetrics.length > 0 ? Math.round(totalLatency / this.agentMetrics.length) : 0,
      modelDistribution: modelDist,
      agentDistribution: agentDist,
      errorTypes,
    };
  }

  // === JSON Export (#41) ===

  toJSON(): object {
    return {
      session: this.getSessionStats(),
      agentMetrics: this.agentMetrics.slice(-50), // Last 50
      providerMetrics: this.providerMetrics.slice(-50),
      completedRequests: this.completedRequests.slice(-50),
      activeRequests: this.getActiveRequests(),
    };
  }

  // === #44: Session Analytics Persistence ===

  /** Save current session analytics to disk */
  async saveSessionAnalytics(sessionId: string = 'current'): Promise<string> {
    const data: PersistedSessionData = {
      sessionId,
      savedAt: new Date().toISOString(),
      stats: this.getSessionStats(sessionId),
      requestHistory: this.completedRequests.slice(-200),
      agentMetrics: this.agentMetrics.slice(-200),
    };

    try {
      await mkdir(this.dataDir, { recursive: true });
      const filename = `session-${sessionId}-${Date.now()}.json`;
      const filepath = resolve(this.dataDir, filename);
      await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
      return filepath;
    } catch {
      // Fail silently — metrics persistence is best-effort
      return '';
    }
  }

  /** Load session analytics from disk */
  async loadSessionAnalytics(filepath: string): Promise<PersistedSessionData | null> {
    try {
      const raw = await readFile(filepath, 'utf-8');
      return JSON.parse(raw) as PersistedSessionData;
    } catch {
      return null;
    }
  }

  /** Enable auto-save of session analytics (default: every 5 minutes) */
  enableAutoSave(intervalMs = 5 * 60 * 1000): void {
    if (this.autoSaveInterval) return;
    this.autoSaveInterval = setInterval(() => {
      this.saveSessionAnalytics().catch(() => {});
    }, intervalMs);
    // Don't prevent Node from exiting
    if (this.autoSaveInterval.unref) {
      this.autoSaveInterval.unref();
    }
  }

  /** Disable auto-save */
  disableAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // === Helpers ===

  reset(): void {
    this.agentMetrics = [];
    this.providerMetrics = [];
    this.activeRequests.clear();
    this.completedRequests = [];
    this.requestCounter = 0;
    this.sessionStartTime = Date.now();
  }

  private trimIfNeeded<T>(arr: T[]): void {
    if (arr.length > this.maxMetrics) {
      arr.splice(0, arr.length - this.maxMetrics);
    }
  }
}

/** Global metrics collector singleton */
export const metrics = new MetricsCollector();
