/**
 * Health Check Routes (#43: Enhanced with provider health + metrics)
 */

import type { FastifyPluginAsync } from 'fastify';
import { API_CONFIG } from '../config/index.js';
import type { HealthResponse } from '../types/index.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/health
   * Basic health check endpoint (fast, no async lookups)
   */
  fastify.get<{ Reply: HealthResponse }>('/health', async () => {
    return {
      status: 'ok',
      version: API_CONFIG.version,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  /**
   * GET /api/health/detailed
   * #43: Detailed health check with providers, metrics, and memory usage
   */
  fastify.get('/health/detailed', async () => {
    try {
      const { healthCheck } = await import('../../health.js');
      return await healthCheck();
    } catch {
      // Fallback if health module import fails
      const mem = process.memoryUsage();
      return {
        status: 'ok',
        version: API_CONFIG.version,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsageMB: Math.round(mem.rss / 1024 / 1024),
      };
    }
  });

  /**
   * GET /api/health/metrics
   * #42/#44: Current session metrics snapshot
   */
  fastify.get('/health/metrics', async () => {
    try {
      const { metrics } = await import('../../core/metrics.js');
      return metrics.toJSON();
    } catch {
      return { error: 'Metrics module not available' };
    }
  });
};
