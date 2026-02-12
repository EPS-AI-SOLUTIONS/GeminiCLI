'use client';

/**
 * useSystemStats - Hook for polling CPU & RAM usage
 * @module hooks/useSystemStats
 *
 * Polls system statistics (CPU%, RAM%) at a configurable interval.
 * Falls back gracefully when backend is not available.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { SystemService } from '../services';
import type { SystemStats } from '../services';

export interface UseSystemStatsOptions {
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
}

export interface UseSystemStatsReturn {
  /** CPU usage percentage (0-100) */
  cpuUsage: number;
  /** RAM used in GB */
  memoryUsedGb: number;
  /** RAM total in GB */
  memoryTotalGb: number;
  /** RAM usage percentage (0-100) */
  memoryUsagePercent: number;
  /** Whether data has been loaded at least once */
  isLoaded: boolean;
}

const DEFAULT_INTERVAL = 5000;

export function useSystemStats(options?: UseSystemStatsOptions): UseSystemStatsReturn {
  const { intervalMs = DEFAULT_INTERVAL, enabled = true } = options ?? {};

  const [stats, setStats] = useState<UseSystemStatsReturn>({
    cpuUsage: 0,
    memoryUsedGb: 0,
    memoryTotalGb: 0,
    memoryUsagePercent: 0,
    isLoaded: false,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      const data: SystemStats = await SystemService.getSystemStats();
      setStats({
        cpuUsage: Math.round(data.cpu_usage * 10) / 10,
        memoryUsedGb: Math.round(data.memory_used_gb * 10) / 10,
        memoryTotalGb: Math.round(data.memory_total_gb * 10) / 10,
        memoryUsagePercent: Math.round(data.memory_usage_percent * 10) / 10,
        isLoaded: true,
      });
    } catch {
      // Backend not available - silently ignore
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    fetchStats();

    // Polling
    intervalRef.current = setInterval(fetchStats, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, fetchStats]);

  return stats;
}

export default useSystemStats;
