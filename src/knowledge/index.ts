/**
 * Knowledge System Index
 *
 * Complete knowledge management with:
 * - KnowledgeBank: Storage, search, RAG
 * - KnowledgeAgent: Learning, context building
 * - ModelTrainer: Real AI model fine-tuning
 */

export {
  type AgentContext,
  type AgentResponse,
  KnowledgeAgent,
  knowledgeAgent,
  type LearnedKnowledge,
  type TrainingConfig as AgentTrainingConfig,
} from './KnowledgeAgent.js';
export {
  KnowledgeBank,
  type KnowledgeEntry,
  type KnowledgeSource,
  type KnowledgeType,
  knowledgeBank,
  type RAGContext,
  type SearchResult,
} from './KnowledgeBank.js';
export { knowledgeCommands } from './KnowledgeCommands.js';
export {
  AVAILABLE_BASE_MODELS,
  DEFAULT_TRAINING_CONFIG,
  ModelTrainer,
  modelTrainer,
  type ProgressCallback,
  type TrainingConfig,
  type TrainingProgress,
  type TrainingResult,
} from './ModelTrainer.js';
