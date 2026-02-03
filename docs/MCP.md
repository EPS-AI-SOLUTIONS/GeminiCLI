# MCP (Model Context Protocol) Integration

GeminiHydra integrates with the Model Context Protocol (MCP) to provide extended capabilities through external tool servers. This document describes the available MCP servers and their tools.

---

## Available MCP Servers

### Serena (Code Intelligence)

Serena provides advanced code analysis and manipulation capabilities through Language Server Protocol integration.

| Tool | Description |
|------|-------------|
| `serena__find_symbol` | Find symbol definitions by name |
| `serena__get_symbols_overview` | Get an overview of symbols in a file or project |
| `serena__find_referencing_symbols` | Find all references to a symbol |
| `serena__replace_symbol_body` | Replace the body of a function, class, or method |
| `serena__insert_after_symbol` | Insert code after a symbol definition |
| `serena__insert_before_symbol` | Insert code before a symbol definition |
| `serena__rename_symbol` | Rename a symbol across the codebase |
| `serena__read_file` | Read file contents with symbol context |
| `serena__list_dir` | List directory contents |
| `serena__search_for_pattern` | Search for regex patterns in files |

---

### Playwright (Browser Automation)

Playwright enables browser automation for testing and web interaction.

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_snapshot` | Take a snapshot of the current page state |
| `browser_click` | Click on an element |
| `browser_fill_form` | Fill form fields with values |

---

### Desktop Commander (System Operations)

Desktop Commander provides system-level process management.

| Tool | Description |
|------|-------------|
| `start_process` | Start a new process |
| `read_process_output` | Read output from a running process |
| `list_processes` | List all running processes |

---

### Memory (Knowledge Graph)

Memory server maintains a persistent knowledge graph for context management.

| Tool | Description |
|------|-------------|
| `create_entities` | Create new entities in the knowledge graph |
| `add_observations` | Add observations/facts about entities |
| `search_nodes` | Search for nodes in the knowledge graph |

---

## Native Filesystem (Replaces MCP Filesystem)

For performance and reliability, GeminiHydra uses native filesystem operations instead of the MCP filesystem server.

| API | Description |
|-----|-------------|
| `fs.readFile()` | Read file contents |
| `fs.writeFile()` | Write content to a file |
| `fs.readdir()` | Read directory contents |
| `glob()` | Find files matching a pattern |

---

## EXEC Protocol

The EXEC protocol allows execution of whitelisted commands directly.

### Format

```
EXEC: <command>
```

### Allowed Commands

| Command | Purpose |
|---------|---------|
| `git` | Version control operations |
| `npm` | Node.js package management |
| `tsc` | TypeScript compilation |
| `eslint` | JavaScript/TypeScript linting |
| `prettier` | Code formatting |

### Forbidden Commands

The following commands are forbidden as they should use native APIs instead:

| Command | Alternative |
|---------|-------------|
| `cat` | Use `fs.readFile()` |
| `type` | Use `fs.readFile()` |
| `dir` | Use `fs.readdir()` or `glob()` |

---

## Configuration

MCP servers are configured in `.mcp.json` at the project root. Example configuration:

```json
{
  "mcpServers": {
    "serena": {
      "command": "python",
      "args": ["-m", "serena"],
      "env": {
        "SERENA_PROJECT": "."
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-playwright"]
    },
    "desktop-commander": {
      "command": "npx",
      "args": ["@anthropic/mcp-server-desktop-commander"]
    }
  }
}
```

---

## Best Practices

1. **Use Serena for code operations** - Prefer symbol-aware operations over raw text manipulation
2. **Use native filesystem** - Native operations are faster and more reliable than MCP filesystem
3. **Use EXEC for toolchain commands** - Git, npm, and build tools work best through EXEC
4. **Leverage Memory for context** - Store important project information in the knowledge graph
