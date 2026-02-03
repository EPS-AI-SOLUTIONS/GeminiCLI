# GeminiHydra - Instrukcje dla Claude

## Preferowane narzędzia

**ZAWSZE używaj narzędzi MCP zamiast Bash**, gdy dostępna jest odpowiednia alternatywa:

### Operacje na plikach
| Zamiast Bash | Użyj MCP |
|--------------|----------|
| `ls`, `dir` | `mcp__serena__list_dir` lub `mcp__desktop-commander__list_directory` |
| `cat`, `type` | `mcp__serena__read_file` lub `mcp__desktop-commander__read_file` |
| `find`, `where` | `mcp__serena__find_file` lub `mcp__filesystem__search_files` |
| `grep`, `findstr` | `mcp__serena__search_for_pattern` |
| `echo > file` | `mcp__serena__create_text_file` lub `mcp__desktop-commander__write_file` |

### Wykonywanie poleceń shell
| Zamiast Bash | Użyj MCP |
|--------------|----------|
| `Bash(command)` | `mcp__serena__execute_shell_command` lub `mcp__desktop-commander__start_process` |
| `npm run build` | `mcp__serena__execute_shell_command` z `command: "npm run build"` |
| `npx tsc` | `mcp__serena__execute_shell_command` z `command: "npx tsc"` |

### Operacje na kodzie
| Zadanie | MCP |
|---------|-----|
| Znajdź symbol | `mcp__serena__find_symbol` |
| Przegląd symboli | `mcp__serena__get_symbols_overview` |
| Znajdź referencje | `mcp__serena__find_referencing_symbols` |
| Zamień kod | `mcp__serena__replace_content` |

### Pamięć/Graf wiedzy
| Zadanie | MCP |
|---------|-----|
| Dodaj encję | `mcp__memory__create_entities` |
| Szukaj w grafie | `mcp__memory__search_nodes` |
| Czytaj graf | `mcp__memory__read_graph` |
| Dodaj obserwację | `mcp__memory__add_observations` |

## Dlaczego MCP zamiast Bash?

1. **Lepsza obsługa błędów** - MCP zwraca strukturalne odpowiedzi
2. **Bezpieczeństwo** - MCP ma wbudowaną walidację
3. **Niezawodność** - MCP działa konsekwentnie na Windows/Linux/Mac
4. **Debugowanie** - Output MCP jest łatwiejszy do analizy

## Wyjątki - kiedy używać Bash

Bash jest OK tylko dla:
- Operacji git (`git commit`, `git push`, `git status`)
- Prostych poleceń bez alternatywy MCP
- Gdy użytkownik **wyraźnie** prosi o Bash

## Projekt

GeminiHydra to wieloagentowy system AI oparty na Gemini + Swarm architecture.
- Główny plik CLI: `bin/gemini.ts`
- Katalog MCP: `src/mcp/`
- Katalog core: `src/core/`
