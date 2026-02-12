# ClaudeHydra - Instrukcje dla Claude

## Opis projektu

ClaudeHydra to wieloagentowy system AI oparty na Swarm architecture.
Zbudowany jako **Next.js 16 App Router** full-stack application (single process).

**Tech stack:**
- **Next.js 16.1.6** (App Router, Turbopack dev)
- **React 19.2.4** + **TypeScript 5.9.3**
- **Tailwind CSS 4.1.18** + **Framer Motion 12.34.0**
- **Zustand 5.0.11** (state management, SSR hydration guard)
- **TanStack Query 5.90.21** (server state)
- **@upstash/redis** (production storage) + **@vercel/blob** (file storage)
- **Vercel** (deployment platform)

## Struktura projektu

```
ClaudeHydra/
├── next-app/                     # Główna aplikacja Next.js 16
│   ├── app/                      # App Router
│   │   ├── layout.tsx            # Root layout (providers)
│   │   ├── page.tsx              # Welcome screen
│   │   ├── providers.tsx         # QueryClient, ThemeProvider
│   │   ├── chat/page.tsx         # Główny widok czatu
│   │   └── api/                  # Route Handlers (41 endpointów)
│   │       ├── agents/           # Agenci i klasyfikacja
│   │       ├── bridge/           # Bridge state + approve/reject
│   │       ├── env/              # Zmienne środowiskowe
│   │       ├── execute/          # Wykonanie + streaming
│   │       ├── gemini/           # Gemini API + streaming
│   │       ├── health/           # Health checks + metrics
│   │       ├── history/          # Historia rozmów + search
│   │       ├── llama/            # LLaMA models + chat + embeddings
│   │       ├── memory/           # Pamięć agentów + graf wiedzy
│   │       ├── settings/         # Ustawienia + reset
│   │       ├── swarm/            # Swarm spawn
│   │       └── system/           # System exec/files/stats
│   ├── components/               # Komponenty React (use client)
│   │   ├── chat/                 # Komponenty czatu
│   │   ├── effects/              # Efekty wizualne
│   │   ├── layout/               # Layout components
│   │   └── ui/                   # Shared UI components
│   ├── hooks/                    # Custom React hooks
│   ├── store/                    # Zustand store (SSR-safe)
│   │   ├── useAppStore.ts        # Główny store aplikacji
│   │   ├── useHydrated.ts        # SSR hydration guard
│   │   └── selectors.ts          # Zustand selectors
│   ├── lib/                      # Logika backendowa
│   │   ├── services/             # Serwisy (history, execution, classification)
│   │   ├── storage/              # StorageAdapter (Upstash/InMemory)
│   │   ├── stores/               # Server-side stores (history, settings)
│   │   ├── memory-storage.ts     # Centralized memory/bridge storage
│   │   ├── sse.ts                # SSE streaming helper
│   │   ├── api-config.ts         # API configuration
│   │   ├── api-errors.ts         # Error handling
│   │   └── validators.ts         # Zod validators
│   ├── services/                 # Client-side API service
│   ├── styles/                   # Tailwind globals
│   ├── types/                    # TypeScript types
│   ├── constants/                # Stałe
│   ├── contexts/                 # React contexts
│   ├── utils/                    # Utility functions
│   ├── next.config.ts            # Next.js configuration
│   ├── vercel.json               # Vercel deployment config
│   ├── tsconfig.json             # TypeScript config
│   └── package.json              # Dependencies
├── src/
│   ├── core/                     # Logika biznesowa agentów (framework-agnostic)
│   ├── providers/                # AI providers (Gemini, etc.)
│   └── config/                   # Konfiguracja modeli
├── shared/                       # Współdzielone typy TypeScript
└── bin/                          # CLI entry point
```

## Kluczowe wzorce architektoniczne

### StorageAdapter (lib/storage/)
- **Interface**: `adapter.ts` - get/set/delete/list/exists/getMany/deleteMany
- **InMemoryAdapter**: `memory.ts` - dev fallback
- **UpstashAdapter**: `upstash.ts` - production (Upstash Redis)
- **Selektor**: `index.ts` - auto-wybór na podstawie env vars

### Write-through cache (lib/stores/)
Stores (HistoryStore, SettingsStore) używają wzorca:
- Szybki odczyt z pamięci (synchroniczny)
- Asynchroniczny zapis w tle do StorageAdapter (`persistAsync()`)
- Lazy init: `await store.ensureReady()` w route handlerach

### SSE Streaming (lib/sse.ts)
Route handlery SSE używają `ReadableStream` + `TransformStream`:
```typescript
export async function POST(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
      controller.close();
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
}
```
Format eventów SSE: `{ type: 'chunk', content: '...' }` (NIE `chunk` field).

### Zustand SSR Hydration
- `skipHydration: true` w Zustand persist config
- `useHydrated()` hook zapobiega hydration mismatch
- Wszystkie interaktywne komponenty mają `'use client'`

### Next.js 16 async params
Dynamic route params są Promise w Next.js 16:
```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
}
```

## Polecenia deweloperskie

```bash
cd next-app
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint
```

## Zmienne środowiskowe

Patrz `next-app/.env.example`:
- `GEMINI_API_KEY` - klucz API Google Gemini
- `ANTHROPIC_API_KEY` - klucz API Anthropic Claude
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` - Upstash Redis (prod)
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob Storage (prod)
- `NEXT_PUBLIC_APP_NAME` - nazwa aplikacji (klient)

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

## Wyjątki - kiedy używać Bash

Bash jest OK tylko dla:
- Operacji git (`git commit`, `git push`, `git status`)
- Prostych poleceń bez alternatywy MCP
- Gdy użytkownik **wyraźnie** prosi o Bash

## Konwencje kodu

- **Route Handlers**: `app/api/{resource}/route.ts` z export `GET`, `POST`, `PATCH`, `DELETE`
- **SSE endpoints**: Używaj `ReadableStream`, format `data: {json}\n\n`
- **Stores**: Zawsze `await store.ensureReady()` przed operacjami w route handlerach
- **Komponenty**: `'use client'` na górze interaktywnych komponentów
- **Importy**: `@/*` mapuje do `next-app/*`, `@shared/*` mapuje do `shared/*`
- **Walidacja**: Zod schemas w `lib/validators.ts`
- **Błędy API**: `NextResponse.json({ error: msg }, { status: code })`
