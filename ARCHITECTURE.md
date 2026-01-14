# HYDRA Architecture v3.0

## System Overview

HYDRA is a multi-headed AI orchestration system combining:
- **Cloud AI** (Google Gemini) for planning and synthesis
- **Local AI** (Ollama) for parallel task execution
- **MCP Tools** for system interaction

## Core Modules

### PowerShell Layer (`ai-handler/`)

```
ai-handler/
├── AIModelHandler.psm1      # Multi-provider AI interface
├── Invoke-AI.ps1            # Main entry point
├── ai-handler-pipeline.json # Pipeline configuration
├── ai-state.json            # Runtime state
└── modules/
    ├── AgentSwarm.psm1      # v3.0 Unified (Swarm + Queue + Parallel)
    └── TaskClassifier.psm1  # Task classification for routing
```

### AgentSwarm.psm1 v3.0 Structure (1305 lines)

```
AgentSwarm.psm1
├── #region IMPORTS & PATHS (20-28)
├── #region CONFIGURATION (31-68)
│   ├── $script:SwarmConfig      # Swarm settings
│   ├── $script:QueueConfig      # Queue limits
│   └── $script:AgentModels      # 12 agent model mapping
├── #region STATE MANAGEMENT (72-86)
│   ├── ConcurrentQueue          # Thread-safe queue
│   ├── ConcurrentDictionary     # Active jobs
│   └── QueueStats               # Execution metrics
├── #region UTILITY FUNCTIONS (89-200)
│   ├── Invoke-ResilientCall     # Multi-provider failover
│   ├── Get-AgentMemory          # Read agent memory
│   ├── Save-AgentMemory         # Write + rebase memory
│   └── Get-AgentModel           # Model lookup
├── #region PROMPT OPTIMIZATION (204-333)
│   ├── Optimize-PromptAuto      # Rule + AI improvement
│   └── Get-PromptComplexity     # Complexity analysis
├── #region QUEUE MANAGEMENT (337-548)
│   ├── Add-ToSmartQueue         # Single item
│   ├── Add-BatchToSmartQueue    # Batch items
│   ├── Get-QueueStatus          # Status query
│   ├── Clear-SmartQueue         # Full reset
│   └── Get-QueueResults         # Completed items
├── #region PARALLEL EXECUTION ENGINE (552-1025)
│   ├── Start-QueueProcessor     # Main RunspacePool loop
│   ├── Invoke-ParallelClassification  # Parallel classify
│   └── Invoke-ParallelSwarmExecution  # Parallel agents
├── #region AGENT SWARM PROTOCOL (1029-1270)
│   └── Invoke-AgentSwarm        # 6-step protocol
└── #region EXPORTS (1274-1304)
    └── 16 exported functions
```

### Node.js Layer (`src/`)

```
src/
├── server.js          # MCP server and tool routing
├── tools.js           # MCP tool definitions
├── config.js          # ENV configuration
├── env.js             # Environment validation
├── logger.js          # JSON logging (production)
├── cache.js           # AES-256-GCM encrypted cache
└── tool-validator.js  # JSON Schema validation
```

## Data Flow

### 6-Step Swarm Protocol

```
User Prompt
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: SPECULATE (Gemini Flash + Google Search)            │
│ - Research context from web                                  │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: PLAN (Gemini Pro - Deep Thinking)                   │
│ - Generate JSON task plan for 12 agents                     │
│ - Auto-select agents based on task requirements             │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: EXECUTE (Ollama - Parallel via RunspacePool)        │
│                                                              │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐               │
│  │ Geralt │ │Yennefer│ │ Triss  │ │Jaskier │  ... x12      │
│  │llama3.2│ │ qwen   │ │ qwen   │ │llama3.2│               │
│  └────────┘ └────────┘ └────────┘ └────────┘               │
│       │          │          │          │                    │
│       └──────────┴──────────┴──────────┘                    │
│                      │                                       │
│              RunspacePool (max 5 concurrent)                │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: SYNTHESIZE (Gemini Pro)                             │
│ - Merge all agent results into coherent answer              │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: LOG (Gemini Flash)                                  │
│ - Create concise session summary                            │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────┐
│ STEP 6: ARCHIVE (Markdown)                                  │
│ - Save full transcript to .serena/memories/sessions/        │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Final Answer + "THE END" Banner
```

## Concurrency Model

### RunspacePool Configuration

```powershell
$script:QueueConfig = @{
    MaxConcurrentLocal = 2      # Ollama limit
    MaxConcurrentCloud = 4      # Cloud API limit
    MaxConcurrentTotal = 5      # Overall max
    DefaultTimeout = 120000     # 2 minutes
    RetryAttempts = 2
}
```

### Parallel Execution Flow

```
Tasks Queue: [Task1, Task2, Task3, Task4]
                    │
                    ▼
            RunspacePool (size: 5)
            ┌───┬───┬───┬───┬───┐
            │ 1 │ 2 │ 3 │ 4 │ 5 │
            └───┴───┴───┴───┴───┘
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
┌───────┐      ┌───────┐      ┌───────┐
│Task 1 │      │Task 2 │      │Task 3 │
│Running│      │Running│      │Running│
└───────┘      └───────┘      └───────┘
    │               │               │
    ▼               ▼               ▼
┌───────┐      ┌───────┐      ┌───────┐
│Result1│      │Result2│      │Result3│
└───────┘      └───────┘      └───────┘
    └───────────────┴───────────────┘
                    │
                    ▼
        ConcurrentDictionary[id, result]
```

## Memory System

```
.serena/memories/
├── Geralt.md           # Agent memory files
├── Yennefer.md
├── Triss.md
├── Jaskier.md
├── Vesemir.md
├── Ciri.md
├── Eskel.md
├── Lambert.md
├── Zoltan.md
├── Regis.md
├── Dijkstra.md
├── Philippa.md
├── task_log_YYYY-MM-DD.md    # Daily summary
├── project_identity.md
├── session_state.md
└── sessions/
    └── Session-YYYYMMDD-HHmmss.md  # Full transcripts
```

### Memory Rebase (10% chance)

```
On Save-AgentMemory:
  if (Random(0,10) == 0):
    history = Read(agent.md)
    summary = Ollama.Summarize(history)
    Write(agent.md, "REBASED: " + summary)
```

## Provider Failover Chain

```
Primary Request
    │
    ▼
┌─────────┐   fail   ┌───────────┐   fail   ┌─────────┐   fail   ┌────────┐
│ Google  │ ───────▶ │ Anthropic │ ───────▶ │ OpenAI  │ ───────▶ │ Ollama │
│ Gemini  │          │  Claude   │          │  GPT-4  │          │ Local  │
└─────────┘          └───────────┘          └─────────┘          └────────┘
```

## File Changes in v3.0

| File | Action | Notes |
|------|--------|-------|
| `AgentSwarm.psm1` | **EXPANDED** | 287 → 1305 lines, unified module |
| `SmartQueue.psm1` | **DELETED** | Merged into AgentSwarm |
| `TaskClassifier.psm1` | Unchanged | External dependency |
