# Intelligence Layer Documentation

The Intelligence Layer provides advanced reasoning, caching, and context management capabilities for GeminiHydra. All modules use `gemini-3-flash-preview` (GEMINI_MODELS.FLASH) for fast, cost-effective inference.

**Location**: `src/core/intelligence/`

---

## Table of Contents

1. [Chain-of-Thought (ChainOfThought.ts)](#1-chain-of-thought)
2. [Tree-of-Thoughts (TreeOfThoughts.ts)](#2-tree-of-thoughts)
3. [Query Decomposition (QueryDecomposition.ts)](#3-query-decomposition)
4. [Confidence Scoring (ConfidenceScoring.ts)](#4-confidence-scoring)
5. [Multi-Perspective (MultiPerspective.ts)](#5-multi-perspective)
6. [Self-Reflection (SelfReflection.ts)](#6-self-reflection)
7. [Semantic Cache (SemanticCache.ts)](#7-semantic-cache)
8. [Knowledge Graph (KnowledgeGraph.ts)](#8-knowledge-graph)
9. [Context Manager (ContextManager.ts)](#9-context-manager)
10. [Meta-Prompting (MetaPrompting.ts)](#10-meta-prompting)

---

## 1. Chain-of-Thought

**File**: `ChainOfThought.ts`

Advanced Chain-of-Thought reasoning with automatic complexity detection and self-consistency.

### Features

- **Automatic "Let's think step by step"**: Automatically prepends step-by-step reasoning trigger for complex tasks
- **Meta-cognitive prompting**: Agent evaluates the quality of its own reasoning steps
- **Self-consistency (3 paths)**: Generates 3 independent reasoning paths and selects the best via voting
- **Adaptive CoT depth**: Adjusts number of reasoning steps based on detected complexity

### Complexity Levels

| Level | Keywords | Steps |
|-------|----------|-------|
| `trivial` | Direct queries | 1 |
| `low` | check, list, show | 2 |
| `medium` | fix, add, analyze, create | 3 |
| `high` | implement, design, refactor, optimize | 5 |
| `extreme` | full system design, microservices architecture | 7 |

### Key Functions

```typescript
// Basic CoT (backward compatible)
chainOfThought(task: string, context?: string): Promise<ChainOfThoughtResult>

// Advanced with meta-cognition
advancedChainOfThought(task: string, context?: string, options?: CoTOptions): Promise<AdvancedCoTResult>

// Self-consistent with voting
selfConsistentCoT(task: string, context?: string, options?: CoTOptions): Promise<SelfConsistentCoTResult>

// Adaptive strategy selection
adaptiveCoT(task: string, context?: string, options?: CoTOptions): Promise<AdvancedCoTResult | SelfConsistentCoTResult>
```

### Result Interface

```typescript
interface AdvancedCoTResult {
  steps: string[];                    // Reasoning steps
  finalAnswer: string;                // Final answer
  reasoning: string;                  // Overall reasoning summary
  qualityScore: number;               // Meta-cognitive score (0-100)
  metaCognitiveAssessment: string;    // Quality assessment
  confidence: 'low' | 'medium' | 'high';
  iterations: number;
  detectedComplexity: ComplexityLevel;
}
```

---

## 2. Tree-of-Thoughts

**File**: `TreeOfThoughts.ts`

Tree-based exploration of reasoning paths with multiple search strategies.

### Search Strategies

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `beam` | Enhanced beam search with parallel exploration | Default, balanced |
| `bfs` | Breadth-first search - explores all nodes at each depth | Thorough exploration |
| `dfs` | Depth-first search with greedy ordering | Deep exploration |
| `mcts` | Monte Carlo Tree Search with UCB1 | Complex exploration |

### Features

- **Parallel branch exploration**: Multiple branches explored simultaneously
- **Thought deduplication**: Merges similar thoughts using Jaccard similarity
- **Dynamic pruning**: Adjusts prune threshold based on depth and best score
- **Backtracking support**: Returns to better checkpoints on stagnation
- **Tree visualization**: ASCII art representation of exploration tree

### Key Functions

```typescript
// Main exploration function
treeOfThoughts(task: string, options?: ToTOptions): Promise<TreeOfThoughtsResult>

// Quick exploration (depth 2, beam 2)
quickTreeOfThoughts(task: string): Promise<string>

// MCTS-based exploration
mctsTreeOfThoughts(task: string, iterations?: number): Promise<TreeOfThoughtsResult>

// BFS-based exploration
bfsTreeOfThoughts(task: string, maxDepth?: number): Promise<TreeOfThoughtsResult>

// Parallel with aggressive pruning
parallelTreeOfThoughts(task: string, parallelBranches?: number): Promise<TreeOfThoughtsResult>
```

### Configuration

```typescript
interface ToTOptions {
  maxDepth?: number;              // Default: 3
  beamWidth?: number;             // Default: 3
  minScore?: number;              // Default: 40
  strategy?: SearchStrategy;      // Default: 'beam'
  mctsIterations?: number;        // Default: 50
  explorationConstant?: number;   // UCB1 constant, default: 1.414
  parallelBranches?: number;      // Default: 3
  enableDeduplication?: boolean;  // Default: true
  enableBacktracking?: boolean;   // Default: true
  maxNodes?: number;              // Default: 100
}
```

### When to Use

- **Critical tasks only**: ToT is computationally expensive
- Architecture decisions
- Complex debugging
- Multi-step planning

---

## 3. Query Decomposition

**File**: `QueryDecomposition.ts`

Decomposes complex queries into sub-queries for parallel execution.

### Query Types

| Type | Examples | Detection Pattern |
|------|----------|-------------------|
| `factual` | "What is X?", "Define Y" | co to jest, what is, define |
| `analytical` | "Why does X?", "Analyze Y" | dlaczego, why, analyze |
| `creative` | "Write X", "Create Y" | napisz, stworz, create, generate |
| `procedural` | "How to X?", "Step by step" | jak zrobic, how to, implement |
| `comparative` | "X vs Y", "Difference between" | versus, roznica, difference |
| `exploratory` | "What are options?", "Research X" | jakie mozliwosci, explore |
| `hybrid` | Multiple types detected | Multiple patterns match |

### Features

- **Robust JSON parsing**: 7 fallback strategies for parsing LLM output
- **Hierarchical decomposition**: Multi-level query breakdown (depth 1-3)
- **Dependency graph**: Tracks which sub-queries depend on others
- **Smart merging**: Combines related sub-queries to reduce redundancy
- **Caching**: Stores decomposition patterns for reuse

### Key Functions

```typescript
// Main decomposition
decomposeQuery(query: string, options?: DecomposeOptions): Promise<DecomposedQuery>

// Detect query type
detectQueryType(query: string): QueryTypeInfo

// Check if decomposition needed
shouldDecompose(query: string): boolean

// Hierarchical breakdown
hierarchicalDecompose(query: string, maxDepth?: number): Promise<SubQuery[]>

// Visualize dependencies
visualizeDependencyGraph(decomposed: DecomposedQuery): string
```

### Result Interface

```typescript
interface DecomposedQuery {
  originalQuery: string;
  queryType: QueryTypeInfo;
  subQueries: SubQuery[];
  executionOrder: number[][];          // Parallel execution groups
  dependencies: Map<number, number[]>; // Sub-query dependencies
  hierarchy: HierarchyNode;
  mergedGroups: MergedGroup[];
  fromCache: boolean;
}

interface SubQuery {
  id: number;
  query: string;
  type: QueryType;
  priority: number;           // 1-10
  estimatedComplexity: number; // 1-5
  level: number;              // Hierarchy level
}
```

---

## 4. Confidence Scoring

**File**: `ConfidenceScoring.ts`

Multi-dimensional confidence scoring with calibration.

### 7 Scoring Dimensions

| Dimension | Description | Weight |
|-----------|-------------|--------|
| `factualAccuracy` | Correctness of facts | 25% |
| `completeness` | All aspects addressed | 15% |
| `relevance` | Matches the question | 20% |
| `coherence` | Logical consistency | 15% |
| `specificity` | Concreteness vs vagueness | 10% |
| `actionability` | User can act on it | 10% |
| `sourceCitation` | References to sources | 5% |

### Features

- **Uncertainty quantification**: 95% confidence interval with standard deviation
- **Calibration**: Learns from past predictions to adjust scores
- **Quick scoring**: Heuristic-based fast scoring without LLM call
- **Multi-model comparison**: Compare scores across different models

### Key Functions

```typescript
// Full confidence scoring
scoreConfidence(task: string, response: string): Promise<ConfidenceScore>

// Robust scoring with retries
robustScoreConfidence(task: string, response: string, options?: ScoreOptions): Promise<ConfidenceScore>

// Record actual outcome for calibration
recordCalibration(task: string, predictedScore: number, actualOutcome: number): void

// Quick heuristic scoring (no LLM)
quickScore(task: string, response: string): { overall: number; completeness: number; specificity: number }

// Human-readable explanation
explainScore(score: ConfidenceScore): string
```

### Result Interface

```typescript
interface ConfidenceScore {
  overall: number;              // Weighted average (0-100)
  factualAccuracy: number;
  completeness: number;
  relevance: number;
  coherence: number;
  specificity: number;
  actionability: number;
  sourceCitation: number;
  confidence: {
    lower: number;              // 95% CI lower bound
    upper: number;              // 95% CI upper bound
    stdDev: number;
  };
  needsClarification: boolean;
  clarificationQuestions: string[];
  calibrated: boolean;
  calibrationAdjustment: number;
}
```

---

## 5. Multi-Perspective

**File**: `MultiPerspective.ts`

Analyzes tasks from multiple viewpoints (simulated multi-agent).

### Default Perspectives

- **Optymista** (Optimist): Focuses on opportunities and benefits
- **Pesymista** (Pessimist): Identifies risks and potential issues
- **Pragmatyk** (Pragmatist): Balanced, practical assessment

### Features

- **Parallel analysis**: All perspectives analyzed concurrently
- **Consensus detection**: Measures agreement between viewpoints
- **Disagreement identification**: Highlights where perspectives diverge
- **Final recommendation**: Weighted by confidence scores

### Key Functions

```typescript
multiPerspectiveAnalysis(
  task: string,
  perspectives?: string[]  // Default: ['Optymista', 'Pesymista', 'Pragmatyk']
): Promise<MultiPerspectiveResult>
```

### Result Interface

```typescript
interface MultiPerspectiveResult {
  perspectives: Perspective[];
  consensus: string;              // Agreement level description
  disagreements: string[];        // Where perspectives differ
  finalRecommendation: string;    // Best recommendation
}

interface Perspective {
  viewpoint: string;
  analysis: string;
  recommendation: string;
  confidence: number;
}
```

### When to Use

- Complex or critical decisions
- Tasks with significant trade-offs
- Risk assessment
- Strategic planning

---

## 6. Self-Reflection

**File**: `SelfReflection.ts`

Reflexion framework with episodic memory and verbal reinforcement learning.

Based on "Reflexion: Language Agents with Verbal Reinforcement Learning" (Shinn et al., 2023) - achieving 91% on HumanEval.

### Components

1. **Episodic Memory**: Stores lessons learned from past attempts
2. **Verbal Reinforcement Learning**: Agent learns from its own failures
3. **Trajectory Replay**: Returns to better checkpoints on stagnation
4. **Self-Evaluation**: Agent evaluates its own outputs

### Key Functions

```typescript
// Full Reflexion loop with memory
reflexionLoop(
  task: string,
  initialResponse: string,
  options?: ReflexionOptions
): Promise<ReflexionResult>

// Simple self-reflection (faster)
selfReflect(
  task: string,
  initialResponse: string,
  maxIterations?: number
): Promise<ReflectionResult>

// Get memory statistics
getReflexionStats(): Promise<{ lessons: number; successRate: number; totalReflections: number }>
```

### Reflexion Options

```typescript
interface ReflexionOptions {
  maxIterations?: number;        // Default: 5
  earlyStopThreshold?: number;   // Stop if improvement < this, default: 5
  minScore?: number;             // Target score, default: 95
  enableTrajectoryReplay?: boolean;  // Default: true
  enableMemory?: boolean;        // Default: true
}
```

### Result Interface

```typescript
interface ReflexionResult {
  originalResponse: string;
  reflections: string[];
  improvedResponse: string;
  confidenceImprovement: number;
  trajectory: TrajectoryCheckpoint[];
  lessonsLearned: ReflexionLesson[];
  lessonsApplied: ReflexionLesson[];
  finalEvaluation: EvaluationResult;
  iterations: number;
  earlyStop: boolean;
}
```

---

## 7. Semantic Cache

**File**: `SemanticCache.ts`

Caches responses by semantic meaning rather than exact text match.

### Features

- **Embedding-based similarity**: Uses hash-based embeddings for fast comparison
- **Cosine similarity**: Finds semantically similar cached queries
- **TTL-based expiry**: Entries expire after 30 minutes
- **LRU eviction**: Removes oldest entries when at capacity
- **Hit/miss tracking**: Statistics for cache performance

### Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxSize` | 100 | Maximum cache entries |
| `similarityThreshold` | 0.85 | Minimum similarity for cache hit |
| `ttlMs` | 30 min | Time-to-live for entries |

### Key Functions

```typescript
// Get cached response
semanticCache.get(query: string): Promise<string | null>

// Store query-response pair
semanticCache.set(query: string, response: string): Promise<void>

// Get cache statistics
semanticCache.getStats(): { size: number; totalHits: number }

// Clear cache
semanticCache.clear(): void
```

### How It Works

1. Query is converted to a 128-dimension embedding using MD5 hashing
2. Cosine similarity is calculated against all cached entries
3. If similarity > 0.85, cached response is returned
4. Otherwise, result is computed and stored

---

## 8. Knowledge Graph

**File**: `KnowledgeGraph.ts`

Graph-based knowledge representation for context building.

### Node Types

- `action`: Task or command executed
- `result`: Outcome of an action
- `file`: File reference
- `code`: Code snippet
- `concept`: Abstract concept
- `entity`: Named entity

### Features

- **Entity relationships**: Tracks connections between knowledge nodes
- **Execution recording**: Logs task executions for learning
- **Context building**: Generates relevant context from graph
- **Similarity search**: Finds related nodes by content

### Key Functions

```typescript
// Add a node
knowledgeGraph.addNode(
  type: KnowledgeNodeType,
  content: string,
  metadata?: Record<string, any>
): string  // Returns node ID

// Add relationship
knowledgeGraph.addEdge(
  sourceId: string,
  targetId: string,
  relation: string,
  weight?: number
): void

// Find related knowledge
knowledgeGraph.findRelated(query: string, limit?: number): KnowledgeNode[]

// Build context from graph
knowledgeGraph.buildContext(query: string): string

// Record task execution
knowledgeGraph.recordExecution(objective: string, result: string, success: boolean): void

// Get statistics
knowledgeGraph.getStats(): { nodes: number; edges: number }
```

### Usage Example

```typescript
// Record a successful task
const objId = knowledgeGraph.addNode('action', 'Implement user authentication');
const resultId = knowledgeGraph.addNode('result', 'JWT-based auth with refresh tokens');
knowledgeGraph.addEdge(objId, resultId, 'succeeded_with');

// Later, build context for similar task
const context = knowledgeGraph.buildContext('Add authentication to API');
```

---

## 9. Context Manager

**File**: `ContextManager.ts`

Smart context window management with priority-based inclusion.

### Features

- **Token estimation**: Approximates token count (length / 4)
- **Priority-based eviction**: Removes least important content first
- **Recency weighting**: Recent content weighted higher
- **Auto-summarization**: Compresses old context to save tokens
- **Type tracking**: Distinguishes user/assistant/system/result

### Chunk Types

| Type | Description |
|------|-------------|
| `user` | User messages |
| `assistant` | Assistant responses |
| `system` | System prompts/context |
| `result` | Execution results |

### Key Functions

```typescript
// Add content to context
contextManager.add(
  content: string,
  type: 'user' | 'assistant' | 'system' | 'result',
  importance?: number  // 0-1, default: 0.5
): void

// Get optimized context
contextManager.getContext(maxTokens?: number): string

// Summarize old content
contextManager.summarizeOldContext(): Promise<void>

// Get statistics
contextManager.getStats(): { chunks: number; estimatedTokens: number }

// Clear context
contextManager.clear(): void
```

### Eviction Algorithm

Score = (importance * 0.7) + (recency * 0.3)

- `importance`: User-assigned priority (0-1)
- `recency`: Decays over 1 hour

Lowest-scored chunk (except most recent) is evicted when over token limit.

---

## 10. Meta-Prompting

**File**: `MetaPrompting.ts`

Prompt optimization and generation system.

### Features

- **Recursive optimization**: Self-improving prompts through iterations
- **Prompt evolution**: Genetic algorithm for prompt optimization
- **A/B testing**: Compare prompt variants with statistical confidence
- **Prompt compression**: Reduce tokens without quality loss
- **Domain optimization**: Inject domain-specific vocabulary
- **Template library**: Pre-built, tested prompt templates

### Template Categories

| Category | Description |
|----------|-------------|
| `code_generation` | Function/class generators |
| `code_review` | Security, performance reviews |
| `debugging` | Error analysis, troubleshooting |
| `documentation` | Doc generation |
| `architecture` | System design |
| `testing` | Test suite generation |
| `refactoring` | Code improvement |
| `analysis` | Data/code analysis |
| `creative` | Creative writing |
| `planning` | Project planning |

### Key Functions

```typescript
// Optimize a prompt
optimizePrompt(prompt: string, config?: MetaPromptingConfig): Promise<PromptOptimization>

// Recursive optimization
recursiveOptimize(prompt: string, maxIterations?: number): Promise<RecursiveOptimizationResult>

// Evolve prompt with genetic algorithm
evolvePrompt(prompt: string, fitnessFunction: (p: string) => Promise<number>): Promise<string>

// A/B test prompts
abTestPrompts(variantA: string, variantB: string, task: string): Promise<ABTestResult>

// Compress prompt
compressPrompt(prompt: string, targetReduction?: number): Promise<CompressionResult>

// Domain-specific optimization
optimizeForDomain(prompt: string, domain: string): Promise<DomainOptimizationResult>
```

### Template Library

```typescript
// Get template by ID
templateLibrary.getTemplate(id: string): PromptTemplate | undefined

// Search templates
templateLibrary.searchTemplates(query: string): PromptTemplate[]

// Apply template with variables
templateLibrary.applyTemplate(id: string, vars: Record<string, string>): string

// Add custom template
templateLibrary.addCustomTemplate(template: PromptTemplate): void
```

### Evolution Configuration

```typescript
interface EvolutionConfig {
  populationSize: number;     // Default: 8
  generations: number;        // Default: 5
  mutationRate: number;       // Default: 0.3
  selectionPressure: number;  // Default: 2.0
  crossoverRate: number;      // Default: 0.7
  elitismCount: number;       // Default: 2
}
```

---

## Usage Patterns

### Basic Intelligence Pipeline

```typescript
import { adaptiveCoT } from './intelligence/ChainOfThought.js';
import { scoreConfidence } from './intelligence/ConfidenceScoring.js';
import { semanticCache } from './intelligence/SemanticCache.js';

async function processTask(task: string) {
  // Check cache first
  const cached = await semanticCache.get(task);
  if (cached) return cached;

  // Process with adaptive CoT
  const result = await adaptiveCoT(task);

  // Score confidence
  const score = await scoreConfidence(task, result.finalAnswer);

  // Cache if high quality
  if (score.overall >= 70) {
    await semanticCache.set(task, result.finalAnswer);
  }

  return result.finalAnswer;
}
```

### Critical Task Processing

```typescript
import { treeOfThoughts } from './intelligence/TreeOfThoughts.js';
import { reflexionLoop } from './intelligence/SelfReflection.js';
import { multiPerspectiveAnalysis } from './intelligence/MultiPerspective.js';

async function processCriticalTask(task: string) {
  // Tree-of-Thoughts for exploration
  const totResult = await treeOfThoughts(task, { strategy: 'mcts', mctsIterations: 100 });

  // Multi-perspective validation
  const perspectives = await multiPerspectiveAnalysis(totResult.finalSolution);

  // Reflexion for quality improvement
  const refined = await reflexionLoop(task, totResult.finalSolution, {
    maxIterations: 5,
    minScore: 95
  });

  return refined.improvedResponse;
}
```

---

## Performance Considerations

| Module | API Calls | Latency | When to Use |
|--------|-----------|---------|-------------|
| ChainOfThought (basic) | 1 | ~2s | Standard tasks |
| ChainOfThought (self-consistent) | 3-5 | ~6s | Important tasks |
| TreeOfThoughts | 10-50+ | ~30s+ | Critical tasks only |
| QueryDecomposition | 1 | ~2s | Complex queries |
| ConfidenceScoring | 1 | ~2s | Quality validation |
| MultiPerspective | 3 | ~4s | Decisions |
| SelfReflection | 2-10 | ~10s+ | Quality critical |
| SemanticCache | 0 | ~1ms | Always (read) |
| KnowledgeGraph | 0 | ~1ms | Context building |
| ContextManager | 0-1 | ~1ms-2s | Context management |
| MetaPrompting | 1-10 | ~5s+ | Prompt optimization |

---

## Configuration

All modules use the model from `GEMINI_MODELS.FLASH`:

```typescript
// src/config/models.config.ts
export const GEMINI_MODELS = {
  FLASH: 'gemini-3-flash-preview',  // Intelligence layer model
  // ...
};
```

To change the model for intelligence operations, update `GEMINI_MODELS.FLASH` in the configuration.
