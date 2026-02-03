# AI Models Configuration

This document describes the AI models used in GeminiHydra and their configuration.

---

## Gemini Models (Cloud)

Cloud-based models from Google's Gemini family, used for high-quality inference and complex tasks.

### gemini-3-pro-preview

| Property | Value |
|----------|-------|
| **Quality** | High quality, slower |
| **Use Cases** | Dijkstra planning, complex/critical tasks |
| **Pricing** | $1.25/1M input tokens, $5.00/1M output tokens |
| **Context Window** | 1M tokens |
| **Capabilities** | Vision, Tools, Streaming |

**When to use:** Reserved for tasks requiring maximum quality and reasoning depth. The Dijkstra planner always uses this model for optimal path computation.

---

### gemini-3-flash-preview

| Property | Value |
|----------|-------|
| **Quality** | Fast, good quality |
| **Status** | **DEFAULT MODEL** |
| **Use Cases** | Classification, refinement, synthesis, Intelligence Layer |
| **Pricing** | $0.075/1M input tokens, $0.30/1M output tokens |
| **Context Window** | 1M tokens |
| **Capabilities** | Vision, Tools, Streaming |

**When to use:** Primary workhorse model for most tasks. Excellent balance of speed and quality at significantly lower cost than Pro.

---

## Ollama/Llama Models (Local - FREE)

Local models running via Ollama. Zero API cost, runs entirely on your hardware.

### llama3.2:3b

| Property | Value |
|----------|-------|
| **Agents** | geralt, vesemir, jaskier, eskel, zoltan |
| **Context Window** | 128K tokens |
| **Quantization** | Q4_K_M |
| **Cost** | FREE (local) |

**When to use:** General-purpose local model for agent tasks. Good balance of capability and resource usage.

---

### llama3.2:1b

| Property | Value |
|----------|-------|
| **Agent** | ciri (fastest) |
| **Context Window** | 128K tokens |
| **Quantization** | Q4_K_M |
| **Cost** | FREE (local) |

**When to use:** Fastest local model for lightweight tasks. Assigned to the Ciri agent for maximum speed.

---

### qwen2.5-coder:1.5b

| Property | Value |
|----------|-------|
| **Agents** | yennefer, triss, lambert, philippa |
| **Context Window** | 32K tokens |
| **Specialization** | Code tasks |
| **Cost** | FREE (local) |

**When to use:** Specialized for code-related tasks. Assigned to agents handling programming and code analysis.

---

## Model Selection Logic

### PRE-A Classification Phase

The PRE-A phase analyzes incoming tasks and determines which model tier to use:

- **Flash (default):** Most tasks use `gemini-3-flash-preview` for optimal cost/performance
- **Pro (escalation):** Complex or critical tasks escalate to `gemini-3-pro-preview`

### Phase B Execution

- Uses **Ollama models** for parallel agent execution
- Enables cost-free local processing for distributed workloads
- Agent assignments based on task specialization

### Dijkstra Planning

- **ALWAYS uses Gemini** (never Ollama)
- Requires cloud model quality for optimal path computation
- Typically uses `gemini-3-pro-preview` for planning accuracy

---

## Cost Comparison

| Model | Input Cost | Output Cost | Notes |
|-------|------------|-------------|-------|
| gemini-3-pro-preview | $1.25/1M | $5.00/1M | Highest quality |
| gemini-3-flash-preview | $0.075/1M | $0.30/1M | Best value |
| Ollama models | FREE | FREE | Local execution |

---

## Configuration

Models are configured in the application settings. See `config/` directory for configuration files.

### Environment Variables

```bash
GEMINI_API_KEY=your_api_key_here
OLLAMA_HOST=http://localhost:11434
```

### Ollama Setup

Ensure Ollama is running and models are pulled:

```bash
ollama pull llama3.2:3b
ollama pull llama3.2:1b
ollama pull qwen2.5-coder:1.5b
```
