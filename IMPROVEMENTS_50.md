# GeminiHydra - 50 Ulepszeń (Lista Referencyjna)

## 🔴 Critical Bugs (#1-5)
1. **Serena agent missing temperature profile** - DEFAULT_AGENT_PROFILES nie zawiera `serena`
2. **GraphProcessor uncaught promise rejection** - brak try/catch w parallel execution
3. **SwarmOrchestrator memory leak** - transcript nie jest czyszczony po sesji
4. **Agent constructor silently falls back** - brak logowania kiedy persona nie istnieje
5. **Temperature updatePreferredTemperature clamp bug** - clamp 0.1-0.7 za ciasny dla kreatywnych agentów

## 🟠 Performance (#6-10)
6. **Lazy model initialization** - genAI.getGenerativeModel() na każdy request zamiast cache
7. **Agent instance caching** - nowy Agent() na każde wywołanie zamiast pool
8. **Prompt template caching** - PromptSystem buduje prompty od zera za każdym razem
9. **Ollama connection keep-alive** - brak connection pooling dla Ollama
10. **Import optimization** - ciężkie moduły (chalk, ora) ładowane eagerly

## 🟡 Architecture (#11-15)
11. **Barrel file cleanup** - src/core/index.ts eksportuje za dużo, wolny import
12. **Circular dependency** - Agent→models→Agent potential circular
13. **Config centralization** - config rozrzucony po wielu plikach
14. **Provider abstraction** - Agent.ts ma hardcoded Ollama/Gemini logic zamiast provider interface
15. **Event system** - brak EventEmitter dla agent lifecycle events

## 🔵 Type Safety (#16-20)
16. **Strict null checks** - wiele `any` typów w catch blocks
17. **AgentRole union type validation** - runtime validation że role istnieje
18. **TaskComplexity enum** - string literal zamiast proper enum
19. **Temperature types consolidation** - types w agent/types.ts i provider.ts duplikowane
20. **Generic provider result** - ProviderResult powinien być generic

## 🟣 Error Handling (#21-25)
21. **Structured error codes** - użycie errors.ts we wszystkich modułach
22. **Error recovery strategies** - CircuitBreaker integracja z Agent
23. **Graceful Ollama failure** - lepszy messaging gdy Ollama nie działa
24. **API rate limit handling** - brak backoff dla Gemini 429 errors
25. **Error aggregation** - zbieranie błędów z parallel execution

## ⚪ Code Quality (#26-30)
26. **Dead code removal** - nieużywane importy i exporty
27. **DRY violations** - isOllamaModel check zduplikowany 3x w Agent.ts
28. **Magic numbers** - 8192, 4096, 180000 powinny być constants
29. **Console.log cleanup** - zamiana console.log na logger
30. **Consistent naming** - mix camelCase i snake_case w typach

## 🧪 Testing (#31-35)
31. **Unit test for Agent class** - brak testów
32. **Temperature controller tests** - brak testów
33. **Error hierarchy tests** - brak testów
34. **Mock providers** - brak mock Gemini/Ollama providers
35. **Integration test for SwarmOrchestrator** - brak testów

## 🖥️ GUI Improvements (#36-40)
36. **Markdown renderer** - ChatView nie renderuje markdown
37. **Agent activity indicators** - real-time agent status w GUI
38. **Connection status panel** - Ollama/Gemini health w GUI
39. **Token usage display** - śledzenie i wyświetlanie zużycia tokenów
40. **Keyboard shortcuts** - nawigacja klawiaturowa

## 📊 Observability (#41-45)
41. **Structured JSON logging** - LiveLogger powinien mieć JSON output mode
42. **Metrics collection** - ProviderStats per-request tracking
43. **Health endpoint** - /health API dla monitoringu
44. **Session analytics** - zapisywanie statystyk sesji
45. **Temperature learning export** - automatyczny zapis stanu uczenia

## 🔒 Security & Deployment (#46-50)
46. **Env validation** - zod schema dla environment variables
47. **API key rotation** - wsparcie dla multiple API keys
48. **Input sanitization** - rozszerzenie PromptInjectionDetector
49. **Docker support** - Dockerfile + docker-compose
50. **Graceful shutdown** - proper cleanup na SIGTERM/SIGINT
