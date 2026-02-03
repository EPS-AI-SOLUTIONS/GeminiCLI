# GeminiHydra Agent System

## Overview

GeminiHydra operates with **13 specialized AI agents**, each with distinct roles, model configurations, and temperature profiles. The system leverages a hybrid approach combining cloud-based Gemini models for complex reasoning with local Ollama models for fast, specialized tasks.

---

## Model Infrastructure

### Cloud Models (Gemini)
| Model | Use Case |
|-------|----------|
| `gemini-3-pro-preview` | Complex reasoning, strategic planning |
| `gemini-3-flash-preview` | Fast cloud inference |

### Local Models (Ollama)
| Model | Parameters | Use Case |
|-------|------------|----------|
| `llama3.2:3b` | 3B | Balanced reasoning + speed |
| `llama3.2:1b` | 1B | Ultra-fast atomic tasks |
| `qwen2.5-coder:1.5b` | 1.5B | Code-specialized tasks |

---

## Agent Roster

### 1. Dijkstra - The Strategist

| Property | Value |
|----------|-------|
| **Role** | Master Planner |
| **Provider** | gemini-cloud |
| **Model** | `gemini-3-pro-preview` |
| **Temperature** | 0.3 (low - deterministic planning) |

**Specializations:**
- Creates comprehensive JSON execution plans
- Decomposes complex tasks into atomic steps
- Assigns tasks to appropriate agents based on capabilities
- Manages inter-agent dependencies and execution order
- Optimizes workflow paths (namesake: Dijkstra's algorithm)

**Output Format:** Structured JSON plans with task graphs

```json
{
  "plan_id": "uuid",
  "steps": [
    {"agent": "geralt", "task": "...", "dependencies": []},
    {"agent": "triss", "task": "...", "dependencies": ["step_1"]}
  ]
}
```

---

### 2. Geralt - The Security Guardian

| Property | Value |
|----------|-------|
| **Role** | Security + Main Executor |
| **Provider** | ollama |
| **Model** | `llama3.2:3b` |
| **Temperature** | 0.1 (very low - safety critical) |

**Specializations:**
- **VETO AUTHORITY**: Can block unsafe code changes
- Primary code executor for approved changes
- Security vulnerability scanning
- Input validation and sanitization checks
- Access control verification
- Credential and secret detection

**VETO Conditions:**
- Unsafe file system operations
- Potential injection vulnerabilities
- Credential exposure risks
- Destructive operations without confirmation

---

### 3. Yennefer - The Architect

| Property | Value |
|----------|-------|
| **Role** | System Architect |
| **Provider** | ollama |
| **Model** | `qwen2.5-coder:1.5b` |
| **Temperature** | 0.4 (balanced creativity + structure) |

**Specializations:**
- Design pattern implementation (SOLID, DRY, KISS)
- Code refactoring and restructuring
- Architecture decision records (ADRs)
- Module dependency analysis
- Interface design and contracts
- Technical debt assessment

**Patterns Expertise:**
- Factory, Singleton, Observer, Strategy
- Repository, Unit of Work, CQRS
- Microservices decomposition

---

### 4. Triss - The QA Specialist

| Property | Value |
|----------|-------|
| **Role** | Quality Assurance |
| **Provider** | ollama |
| **Model** | `qwen2.5-coder:1.5b` |
| **Temperature** | 0.2 (low - consistent testing) |

**Specializations:**
- Test case generation (unit, integration, e2e)
- Test coverage analysis
- Regression testing strategies
- Edge case identification
- Assertion and validation logic
- Mock and stub generation

**Testing Frameworks:**
- Jest, Vitest, Mocha (JavaScript/TypeScript)
- pytest, unittest (Python)
- Generic test pattern generation

---

### 5. Lambert - The Debugger

| Property | Value |
|----------|-------|
| **Role** | Error Analysis |
| **Provider** | ollama |
| **Model** | `qwen2.5-coder:1.5b` |
| **Temperature** | 0.2 (low - precise diagnosis) |

**Specializations:**
- Stack trace analysis
- Error root cause identification
- Memory leak detection
- Performance bottleneck analysis
- Race condition identification
- Exception handling improvements

**Debug Methodology:**
1. Reproduce the issue
2. Isolate the component
3. Analyze state and data flow
4. Identify root cause
5. Propose fix with validation

---

### 6. Vesemir - The Mentor

| Property | Value |
|----------|-------|
| **Role** | Code Review + Mentoring |
| **Provider** | ollama |
| **Model** | `llama3.2:3b` |
| **Temperature** | 0.5 (moderate - educational tone) |

**Specializations:**
- Comprehensive code reviews
- Best practice recommendations
- Educational explanations
- Junior developer guidance
- Code style enforcement
- Knowledge transfer documentation

**Review Criteria:**
- Readability and maintainability
- Performance implications
- Security considerations
- Test coverage adequacy
- Documentation completeness

---

### 7. Jaskier - The Bard

| Property | Value |
|----------|-------|
| **Role** | Documentation + Communication |
| **Provider** | ollama |
| **Model** | `llama3.2:3b` |
| **Temperature** | 0.7 (higher - creative writing) |

**Specializations:**
- Technical documentation writing
- README and guide generation
- Change summaries and changelogs
- API documentation
- User-friendly explanations
- Commit message crafting

**Documentation Types:**
- API references
- Getting started guides
- Architecture overviews
- Migration guides
- Release notes

---

### 8. Ciri - The Scout

| Property | Value |
|----------|-------|
| **Role** | Fast Reconnaissance |
| **Provider** | ollama |
| **Model** | `llama3.2:1b` |
| **Temperature** | 0.1 (very low - precise tasks) |

**Specializations:**
- Ultra-fast atomic task execution
- File system reconnaissance
- Quick code searches
- Simple transformations
- Status checks and validations
- Parallel task distribution

**Use Cases:**
- "Find all TODO comments"
- "List files matching pattern"
- "Quick syntax validation"
- "Simple string replacements"

**Note:** Optimized for speed over complexity. Delegates complex tasks to other agents.

---

### 9. Eskel - The DevOps Engineer

| Property | Value |
|----------|-------|
| **Role** | Build + Deploy + CI/CD |
| **Provider** | ollama |
| **Model** | `llama3.2:3b` |
| **Temperature** | 0.2 (low - reliable operations) |

**Specializations:**
- Build system configuration
- CI/CD pipeline creation
- Docker containerization
- Deployment automation
- Environment management
- Infrastructure as Code

**Tooling Expertise:**
- GitHub Actions, GitLab CI
- Docker, Docker Compose
- npm/yarn/pnpm scripts
- Shell scripting
- Environment variables management

---

### 10. Zoltan - The Data Specialist

| Property | Value |
|----------|-------|
| **Role** | Data Processing |
| **Provider** | ollama |
| **Model** | `llama3.2:3b` |
| **Temperature** | 0.1 (very low - data integrity) |

**Specializations:**
- JSON parsing and transformation
- CSV data manipulation
- YAML configuration management
- Data validation schemas
- Format conversion
- Data migration scripts

**Supported Formats:**
- JSON / JSONL / JSON5
- CSV / TSV
- YAML / YML
- TOML
- XML (basic)

---

### 11. Regis - The Researcher

| Property | Value |
|----------|-------|
| **Role** | Deep Analysis + Synthesis |
| **Provider** | gemini-cloud |
| **Model** | `gemini-3-pro-preview` |
| **Temperature** | 0.5 (balanced - thorough analysis) |

**Specializations:**
- Codebase deep analysis
- Technology research and comparison
- Complex problem decomposition
- Solution synthesis from multiple sources
- Impact analysis
- Technical feasibility assessment

**Research Outputs:**
- Comparative analyses
- Technical recommendations
- Risk assessments
- Implementation roadmaps

---

### 12. Philippa - The API Specialist

| Property | Value |
|----------|-------|
| **Role** | API Integrations |
| **Provider** | ollama |
| **Model** | `qwen2.5-coder:1.5b` |
| **Temperature** | 0.3 (low - precise API work) |

**Specializations:**
- REST API design and implementation
- GraphQL schema creation
- API client generation
- Authentication flows (OAuth, JWT, API keys)
- Rate limiting and retry logic
- API documentation (OpenAPI/Swagger)

**Integration Patterns:**
- Request/Response handling
- Error handling and recovery
- Pagination strategies
- Webhook implementations

---

### 13. Serena - The Code Intelligence

| Property | Value |
|----------|-------|
| **Role** | LSP Code Intelligence |
| **Provider** | gemini-cloud |
| **Model** | `gemini-3-pro-preview` |
| **Temperature** | 0.2 (low - precise code analysis) |
| **Integration** | MCP (Model Context Protocol) |

**Specializations:**
- Language Server Protocol operations
- Symbol resolution and navigation
- Code refactoring via LSP
- Cross-file reference tracking
- Type inference and checking
- Intelligent code completion context

**LSP Capabilities:**
- `textDocument/definition` - Go to definition
- `textDocument/references` - Find all references
- `textDocument/rename` - Symbol renaming
- `textDocument/hover` - Type information
- `workspace/symbol` - Workspace-wide symbol search

**MCP Tools:**
- `find_symbol` - Locate symbols across codebase
- `find_referencing_symbols` - Track symbol usage
- `get_symbols_overview` - File symbol summary
- `replace_symbol_body` - Safe code modifications
- `rename_symbol` - Project-wide renaming

---

## Temperature Profile Guide

| Temperature | Behavior | Used By |
|-------------|----------|---------|
| 0.1 | Highly deterministic, minimal variation | Geralt, Ciri, Zoltan |
| 0.2 | Precise, consistent outputs | Triss, Lambert, Eskel, Serena |
| 0.3 | Structured with slight flexibility | Dijkstra, Philippa |
| 0.4 | Balanced creativity and structure | Yennefer |
| 0.5 | Moderate creativity | Vesemir, Regis |
| 0.7 | Higher creativity for writing | Jaskier |

---

## Agent Selection Matrix

| Task Type | Primary Agent | Backup Agent |
|-----------|---------------|--------------|
| Planning | Dijkstra | Regis |
| Security Review | Geralt | Vesemir |
| Code Execution | Geralt | Ciri |
| Architecture | Yennefer | Regis |
| Testing | Triss | Lambert |
| Debugging | Lambert | Triss |
| Code Review | Vesemir | Yennefer |
| Documentation | Jaskier | Vesemir |
| Quick Tasks | Ciri | Zoltan |
| DevOps | Eskel | Geralt |
| Data Processing | Zoltan | Philippa |
| Research | Regis | Dijkstra |
| API Work | Philippa | Yennefer |
| Code Intelligence | Serena | Yennefer |

---

## Resource Allocation

### Cloud Agents (Rate Limited)
- **Dijkstra** - Strategic planning (low frequency, high impact)
- **Regis** - Deep research (as needed)
- **Serena** - Code intelligence (on-demand)

### Local Agents (Unlimited)
- **High-frequency**: Ciri, Zoltan, Triss
- **Medium-frequency**: Geralt, Lambert, Eskel, Philippa
- **Variable**: Yennefer, Vesemir, Jaskier

---

## Inter-Agent Communication

Agents communicate through structured messages:

```typescript
interface AgentMessage {
  from: AgentName;
  to: AgentName;
  type: 'request' | 'response' | 'veto' | 'delegate';
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
}
```

### VETO Protocol (Geralt only)
```typescript
interface VetoMessage {
  type: 'veto';
  reason: string;
  severity: 'warning' | 'block';
  remediation?: string;
}
```

---

## Configuration Example

```yaml
agents:
  dijkstra:
    provider: gemini-cloud
    model: gemini-3-pro-preview
    temperature: 0.3
    role: strategist

  geralt:
    provider: ollama
    model: llama3.2:3b
    temperature: 0.1
    role: security
    capabilities:
      - veto
      - execute

  ciri:
    provider: ollama
    model: llama3.2:1b
    temperature: 0.1
    role: scout
    max_task_complexity: low
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-02 | Initial 13-agent configuration |

---

*GeminiHydra - Multi-Agent AI System*
