/**
 * Agents Routes
 * Exposes Witcher Swarm agent information
 */

import type { FastifyPluginAsync } from 'fastify';
import { classificationService } from '../services/index.js';
import type { ClassifyRequest } from '../types/fastify.js';
import type { AgentsResponse, ClassifyResponse } from '../types/index.js';
import { validateClassifyRequest } from '../validators/index.js';

export const agentsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/agents
   * List all Witcher Swarm agents
   */
  fastify.get<{ Reply: AgentsResponse }>('/agents', async () => {
    const agents = classificationService.getAgents();
    return { agents };
  });

  /**
   * POST /api/agents/classify
   * Classify a prompt to determine best agent
   */
  fastify.post<ClassifyRequest & { Reply: ClassifyResponse }>(
    '/agents/classify',
    async (request) => {
      const { prompt } = validateClassifyRequest(request.body);
      const result = classificationService.getFullClassification(prompt);
      return result;
    },
  );
};
