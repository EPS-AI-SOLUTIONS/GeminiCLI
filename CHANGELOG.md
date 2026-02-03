# Changelog

## [14.0.0] - 2025-XX-XX - "School of the Wolf"

### Breaking Changes
- Removed all legacy Gemini models (1.5, 2.0, 2.5)
- Now uses ONLY:
  - `gemini-3-pro-preview` (complex tasks)
  - `gemini-3-flash-preview` (fast tasks, default)

### Added
- 5-Phase execution pipeline (PRE-A, A, B, C, D)
- 12 specialized agents with Witcher-themed names
- Intelligence Layer with 10 modules
- MCP (Model Context Protocol) integration
- Anti-hallucination systems (Solutions 1-29)
- Serena code intelligence agent
- Native filesystem operations (replaced MCP filesystem)
- Adaptive temperature system for agents
- Cost tracking and token accounting

### Changed
- Unified all Intelligence Layer modules to use GEMINI_MODELS.FLASH
- Phase B uses Ollama for parallel execution
- Dijkstra uses dedicated Gemini-only chain

### Removed
- gemini-1.5-pro
- gemini-1.5-flash
- gemini-2.0-flash
- gemini-2.0-flash-lite
- gemini-2.5-pro-preview
- gemini-2.5-flash-preview
- gemini-pro-vision
