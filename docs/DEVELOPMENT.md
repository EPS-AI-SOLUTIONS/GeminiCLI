# Development Guide

## Prerequisites
- Node.js 18+
- npm or pnpm
- Ollama (for local models)
- Gemini API key

## Installation
```bash
git clone https://github.com/your-repo/GeminiHydra.git
cd GeminiHydra
npm install
```

## Environment Setup
```bash
cp .env.example .env
# Edit .env and add GEMINI_API_KEY
```

## Building
```bash
npm run build
```

## Running
```bash
# Direct execution
npm start

# Interactive mode
npm run dev

# With YOLO
npm run yolo
```

## Project Structure
```
src/
├── bin/           # CLI entry point (gemini.ts)
├── cli/           # CLI utilities
├── config/        # Model configuration
├── core/          # Core modules
│   ├── intelligence/  # Intelligence Layer
│   ├── execution/     # Execution engine
│   └── models/        # Model utilities
├── memory/        # Memory systems
├── mcp/           # MCP integration
├── native/        # Native filesystem
└── types/         # TypeScript types
```

## Testing
```bash
npm test
npm run test:coverage
```

## Linting
```bash
npm run lint
npm run lint:fix
```
