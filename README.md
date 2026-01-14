# HYDRA - Multi-Headed AI Orchestration System

> *"Twelve wolves hunt as one. HYDRA executes in parallel."*

## Overview

HYDRA is an AI orchestration system that combines cloud AI (Google Gemini) for strategic planning with local AI (Ollama) for parallel task execution through 12 specialized Witcher agents.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start the system
.\_launcher.ps1
```

## Architecture

```
User Prompt → Gemini Pro (Plan) → Ollama Agents (Parallel) → Gemini Pro (Synthesize) → Answer
```

### The 12 Witcher Agents

| Agent | Specialization | Model |
|-------|---------------|-------|
| Geralt | Security/Ops | llama3.2:3b |
| Yennefer | Architecture/Code | qwen2.5-coder |
| Triss | QA/Testing | qwen2.5-coder |
| Jaskier | Documentation | llama3.2:3b |
| Ciri | Quick Tasks | llama3.2:1b |
| Regis | Research | phi3:mini |
| +6 more | Various | Various |

## Core Modules

- **AgentSwarm.psm1** - 6-step protocol with 12 agents and parallel execution
- **AIModelHandler.psm1** - Multi-provider AI interface
- **TaskClassifier.psm1** - Task routing and classification

## Configuration

Copy `.env.example` to `.env` and configure:
- `OLLAMA_HOST` - Ollama server address
- `DEFAULT_MODEL`, `FAST_MODEL`, `CODER_MODEL` - Model selection
- See `GEMINI.md` for full configuration options

## Documentation

- [GEMINI.md](./GEMINI.md) - System instructions and rules
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [CHANGELOG.md](./CHANGELOG.md) - Version history

## Version

**v3.0.0** - Unified AgentSwarm with parallel execution and 12 agents
