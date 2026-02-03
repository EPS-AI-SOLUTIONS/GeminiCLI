# Memory Systems

GeminiHydra implements a multi-layered memory architecture that provides both session-scoped and persistent storage capabilities for AI agents.

## Memory Layers

### Session Memory (SessionCache)
- Current conversation state
- Objective tracking
- Chronicle of events
- Cleared per session

The SessionCache maintains ephemeral state for the current interaction, including the active objective, execution plan, and a chronicle of significant events. This data is automatically cleared when a session ends.

### Long-Term Memory (VectorStore)
- Learned patterns
- Persistent across sessions
- Semantic search

The VectorStore provides persistent storage with vector embeddings for semantic similarity search. It enables agents to recall relevant past experiences and learned patterns based on contextual queries rather than exact matches.

### Agent Memory (AgentVectorMemory)
- Per-agent performance history
- Temperature learning
- Lessons learned

Each agent maintains its own memory space for tracking performance metrics, optimal temperature settings discovered through experimentation, and lessons learned from past executions.

### Codebase Memory
- Project structure
- Code patterns
- File relationships

Specialized memory for understanding and navigating codebases, including file dependency graphs, common patterns, and architectural knowledge.

## Memory Operations

### VectorStore
```typescript
await memory.load()
await memory.search(query)
await memory.add(content, metadata)
await memory.flush()
```

| Method | Description |
|--------|-------------|
| `load()` | Initialize and load existing memory from disk |
| `search(query)` | Find semantically similar entries |
| `add(content, metadata)` | Store new memory with optional metadata |
| `flush()` | Persist all changes to disk |

### Session Cache
```typescript
await sessionCache.setObjective(objective)
await sessionCache.appendChronicle(event)
await sessionCache.setPlan(planJson)
await sessionCache.clear()
```

| Method | Description |
|--------|-------------|
| `setObjective(objective)` | Set the current session's primary goal |
| `appendChronicle(event)` | Add an event to the session's event log |
| `setPlan(planJson)` | Store the execution plan as JSON |
| `clear()` | Reset all session state |

### Agent Memory
```typescript
await agentMemory.add(agent, type, content, tags)
await agentMemory.getContextual(agent, query)
```

| Method | Description |
|--------|-------------|
| `add(agent, type, content, tags)` | Store agent-specific memory entry |
| `getContextual(agent, query)` | Retrieve relevant memories for an agent |

## Lessons Learned

The lessons learned system captures knowledge during repair cycles (Phase C) for use in future planning.

### Storage Format
```typescript
interface LessonLearned {
  objective: string;    // What was being attempted
  problem: string;      // What went wrong
  solution: string;     // How it was resolved
  timestamp: number;    // When the lesson was recorded
  tags: string[];       // Categorization tags
}
```

### Lifecycle
1. **Capture**: During Phase C repair cycles, when a problem is identified and resolved
2. **Storage**: Persisted to the agent's vector memory with semantic embeddings
3. **Retrieval**: Queried during planning phases to inform future decisions
4. **Application**: Used to avoid repeating past mistakes and apply proven solutions

### Example
```typescript
// Saving a lesson during repair
await agentMemory.add('planner', 'lesson', {
  objective: 'Implement user authentication',
  problem: 'JWT token expiration not handled',
  solution: 'Added refresh token rotation with silent renewal'
}, ['auth', 'jwt', 'tokens']);

// Retrieving relevant lessons during planning
const lessons = await agentMemory.getContextual('planner', 'authentication flow');
```

## Memory Persistence

| Layer | Persistence | Location |
|-------|-------------|----------|
| Session Cache | Session-scoped | In-memory |
| VectorStore | Persistent | `.gemini/memory/` |
| Agent Memory | Persistent | `.gemini/agents/{name}/` |
| Codebase Memory | Persistent | `.gemini/codebase/` |

## Best Practices

1. **Selective Storage**: Only store meaningful, reusable knowledge
2. **Tagging**: Use consistent tags for efficient retrieval
3. **Cleanup**: Periodically prune outdated or irrelevant memories
4. **Context Limits**: Be mindful of memory size when retrieving for LLM context
