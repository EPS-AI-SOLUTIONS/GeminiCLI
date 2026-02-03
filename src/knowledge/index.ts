/**
 * Knowledge System Index
 *
 * Complete knowledge management with:
 * - KnowledgeBank: Storage, search, RAG
 * - KnowledgeAgent: Learning, context building
 * - ModelTrainer: Real AI model fine-tuning
 */

export {
  KnowledgeBank,
  knowledgeBank,
  type KnowledgeType,
  type KnowledgeSource,
  type KnowledgeEntry,
  type SearchResult,
  type RAGContext
} from './KnowledgeBank.js';

export {
  KnowledgeAgent,
  knowledgeAgent,
  type LearnedKnowledge,
  type AgentContext,
  type AgentResponse,
  type TrainingConfig as AgentTrainingConfig
} from './KnowledgeAgent.js';

export {
  ModelTrainer,
  modelTrainer,
  AVAILABLE_BASE_MODELS,
  DEFAULT_TRAINING_CONFIG,
  type TrainingConfig,
  type TrainingProgress,
  type TrainingResult,
  type ProgressCallback
} from './ModelTrainer.js';

export { knowledgeCommands } from './KnowledgeCommands.js';
