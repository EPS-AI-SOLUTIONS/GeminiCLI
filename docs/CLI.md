# CLI Commands and Usage

This document provides a comprehensive reference for the GeminiHydra command-line interface.

## Basic Usage

```bash
gemini [objective]           # Execute objective
gemini -i                    # Interactive mode
gemini -y                    # YOLO mode (auto-approve)
```

### Examples

```bash
# Execute a single objective
gemini "refactor the authentication module"

# Start interactive session
gemini -i

# Run with auto-approval enabled
gemini -y "update all dependencies"
```

## Subcommands

### `gemini pipe <tasks...>` - Pipeline Execution

Execute multiple tasks in a pipeline, passing output from one task to the next.

```bash
gemini pipe "analyze code" "generate tests" "run tests"
```

### `gemini watch <directory>` - File Monitoring

Watch a directory for changes and trigger actions automatically.

```bash
gemini watch ./src
```

### `gemini agent <name> <task>` - Direct Agent Execution

Execute a task using a specific agent directly.

```bash
gemini agent coder "implement login feature"
gemini agent reviewer "check security vulnerabilities"
```

### `gemini mcp:call <tool>` - Quick MCP Invocation

Invoke an MCP tool directly from the command line.

```bash
gemini mcp:call read_file --path ./config.json
```

### `gemini init` - Project Context Initialization

Initialize project context and configuration for GeminiHydra.

```bash
gemini init
```

### `gemini status` / `cost` - Token Usage Reporting

Display current session token usage and cost information.

```bash
gemini status
gemini cost
```

### `gemini doctor` - System Diagnostics

Run system diagnostics to check configuration and dependencies.

```bash
gemini doctor
```

## Interactive Mode Commands

When running in interactive mode (`gemini -i`), the following commands are available:

| Command | Description |
|---------|-------------|
| `/help` | Command reference |
| `/history` | Show last 10 commands |
| `/clear` | Clear screen |
| `/status` | Token/cost report |
| `/cost` | Token/cost report |
| `/queue` | Show task queue |
| `/cancel <id>` | Remove task from queue |
| `@agent` | Switch active agent |
| `mcp:tool` | Call MCP tool |
| `@serena` | Serena agent commands |

### Interactive Mode Examples

```bash
# Get help
/help

# View command history
/history

# Check current token usage
/status

# View pending tasks
/queue

# Cancel a specific task
/cancel task-123

# Switch to a different agent
@coder

# Call an MCP tool
mcp:read_file ./src/index.ts

# Use Serena for code analysis
@serena analyze ./src
```

## YOLO Configuration

YOLO mode enables automatic approval of all operations. Configure it in your settings:

```typescript
{
  autoApprove: true,
  fileSystemAccess: true,
  shellAccess: true,
  networkAccess: true,
  maxConcurrency: 12,
  timeout: 300000,
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoApprove` | boolean | `false` | Automatically approve all operations |
| `fileSystemAccess` | boolean | `false` | Allow file system read/write operations |
| `shellAccess` | boolean | `false` | Allow shell command execution |
| `networkAccess` | boolean | `false` | Allow network requests |
| `maxConcurrency` | number | `4` | Maximum concurrent operations |
| `timeout` | number | `300000` | Operation timeout in milliseconds (5 minutes) |

### Warning

YOLO mode grants significant permissions to the AI agent. Use with caution and only in trusted environments or sandboxed projects.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Default model to use |
| `GEMINI_CONFIG_PATH` | Custom config file path |

## See Also

- [Configuration Guide](./CONFIGURATION.md)
- [Agent Documentation](./AGENTS.md)
- [MCP Tools Reference](./MCP.md)
