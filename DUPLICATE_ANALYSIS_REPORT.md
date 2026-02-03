# 🔍 RAPORT DUPLIKATÓW - GeminiHydra

**Data analizy:** 2026-01-31
**Przeanalizowane pliki:** ~300 plików TypeScript

---

## 🚨 KRYTYCZNE DUPLIKATY (wymagają natychmiastowej naprawy)

### 1. SELEKTORY ZUSTAND - PODWÓJNA DEFINICJA

| Selektor | `store/selectors.ts` | `store/useAppStore.ts` |
|----------|---------------------|------------------------|
| `selectTheme` | ✅ linia 25 | ✅ linia 284 |
| `selectSettings` | ✅ linia 57 | ✅ linia 285 |
| `selectSessions` | ✅ linia 126 | ✅ linia 286 |
| `selectCurrentSessionId` | ✅ linia 39 | ✅ linia 287 |
| `selectChatHistory` | ✅ linia 170 | ✅ linia 288 |
| `selectCurrentMessages` | ✅ linia 177 | ✅ linia 293 |
| `selectIsApiKeySet` | ✅ linia 65 | ✅ linia 303 |
| `selectSessionById` | ✅ linia 138 | ✅ linia 312 |
| `selectMessageCount` | ✅ linia 201 | ✅ linia 321 |
| `selectHasMessages` | ✅ linia 221 | ✅ linia 331 |
| `selectUseSwarm` | ✅ linia 103 | ✅ linia 342 |
| `selectOllamaEndpoint` | ✅ linia 75 | ✅ linia 351 |

**🔧 ROZWIĄZANIE:** Usunąć duplikaty z `useAppStore.ts`, zostawić tylko w `selectors.ts`

---

## ⚠️ DUPLIKATY W ARCHITEKTURZE (wzorzec barrel + monolith)

### 2. ExecutionEngine.ts vs execution/

Monolityczny `ExecutionEngine.ts` duplikuje funkcje z modularnego katalogu `execution/`:

| Funkcja/Klasa | `ExecutionEngine.ts` | `execution/*.ts` |
|---------------|---------------------|------------------|
| `classifyError` | linia 93 | `AdaptiveRetry.ts:84` |
| `partialManager` | linia 297 | `PartialCompletion.ts:150` |
| `detectParallelGroups` | linia 321 | `ParallelExecution.ts:43` |
| `checkpointManager` | linia 650 | `CheckpointSystem.ts:218` |
| `detectTaskPriority` | linia 687 | `TaskPrioritization.ts:52` |
| `calculatePriorityScore` | linia 708 | `TaskPrioritization.ts:73` |
| `sortByPriority` | linia 735 | `TaskPrioritization.ts:100` |
| `resourceScheduler` | linia 908 | `ResourceScheduler.ts:247` |
| `degradationManager` | linia 1057 | `GracefulDegradation.ts:244` |
| `taskTemplateManager` | linia 1278 | `TaskTemplating.ts:389` |
| `executionProfiler` | linia 1529 | `ExecutionProfiler.ts:397` |

**🔧 ROZWIĄZANIE:** Usunąć `ExecutionEngine.ts`, używać tylko modularnych plików z `execution/`

---

### 3. DeveloperTools.ts vs developer/

| Funkcja/Klasa | `DeveloperTools.ts` | `developer/*.ts` |
|---------------|---------------------|------------------|
| `generateMockEndpoints` | linia 333 | `ApiMocking.ts:58` |
| `generateMockServer` | linia 378 | `ApiMocking.ts:213` |
| `EnvManager` | linia 422 | `EnvironmentManager.ts:45` |
| `envManager` | linia 555 | `EnvironmentManager.ts:466` |
| `MultiProjectManager` | linia 578 | `MultiProjectManager.ts:51` |
| `projectManager` | linia 718 | `MultiProjectManager.ts:537` |

**🔧 ROZWIĄZANIE:** Usunąć `DeveloperTools.ts`, używać tylko `developer/`

---

### 4. IntelligenceLayer.ts vs intelligence/

| Instancja | `IntelligenceLayer.ts` | `intelligence/*.ts` |
|-----------|------------------------|---------------------|
| `semanticCache` | linia 160 | `SemanticCache.ts:138` |
| `knowledgeGraph` | linia 309 | `KnowledgeGraph.ts:189` |
| `contextManager` | linia 863 | `ContextManager.ts:178` |

**🔧 ROZWIĄZANIE:** Usunąć singletony z `IntelligenceLayer.ts`

---

### 5. ModelIntelligence.ts vs models/

| Funkcja/Klasa | `ModelIntelligence.ts` | `models/*.ts` |
|---------------|------------------------|---------------|
| `selectModelForTask` | linia 56 | `ModelSelection.ts:47` |
| `modelPerformance` | linia 170 | `PerformanceTracking.ts:93` |
| `promptCache` | linia 249 | `PromptCaching.ts:81` |
| `scoreResponseQuality` | linia 262 | `QualityScoring.ts:15` |
| `contextManager` | linia 439 | `ModelContextManager.ts:77` |
| `MODEL_PROMPT_CONFIGS` | linia 452 | `PromptOptimization.ts:13` |
| `optimizePromptForModel` | linia 479 | `PromptOptimization.ts:40` |
| `modelHealth` | linia 577 | `ModelHealthCheck.ts:95` |

**🔧 ROZWIĄZANIE:** Usunąć `ModelIntelligence.ts`, używać tylko `models/`

---

## 🔶 DUPLIKATY MIĘDZY PROJEKTAMI (GeminiGUI vs src)

### 6. Walidatory

| Funkcja | `GeminiGUI/src/utils/validators.ts` | `src/utils/validators.ts` |
|---------|-------------------------------------|---------------------------|
| `isValidUrl` | linia 17 | linia 17 |
| `isLocalhostUrl` | linia 29 | linia 35 |

### 7. Niebezpieczne wzorce

| Funkcja | `GeminiGUI/src/utils/validators.ts` | `src/core/SecuritySystem.ts` |
|---------|-------------------------------------|------------------------------|
| `containsDangerousPatterns` | linia 175 | linia 107 |
| `DANGEROUS_PATTERNS` | linia 109 | linia 41 |

**🔧 ROZWIĄZANIE:** Wydzielić wspólną bibliotekę `@geminihydra/shared`

---

## ✅ PRAWIDŁOWA KOMPOZYCJA (bez duplikatów)

### Hooki Modeli - OK ✅
```
useModelFetcher (bazowy)
  ├── useGeminiModels (specjalizowany)
  └── useOllamaModels (specjalizowany)
```

### Hooki Klawiatury - OK ✅
```
useKeyboardListener (bazowy)
  ├── useHotkey (pojedynczy skrót)
  └── useKeyboardShortcuts (wiele skrótów)
```

---

## 📊 PODSUMOWANIE

| Kategoria | Liczba duplikatów | Priorytet |
|-----------|-------------------|-----------|
| Selektory Zustand | 12 | 🔴 KRYTYCZNY |
| ExecutionEngine vs execution/ | 11 | 🔴 KRYTYCZNY |
| DeveloperTools vs developer/ | 6 | 🟡 WYSOKI |
| IntelligenceLayer vs intelligence/ | 3 | 🟡 WYSOKI |
| ModelIntelligence vs models/ | 8 | 🟡 WYSOKI |
| Walidatory między projektami | 4 | 🟢 ŚREDNI |
| **RAZEM** | **44** | - |

---

## 🛠️ REKOMENDOWANE DZIAŁANIA

### Faza 1 (Natychmiast)
1. Usunąć duplikaty selektorów z `useAppStore.ts`
2. Upewnić się, że import idzie z `store/selectors.ts`

### Faza 2 (Ten tydzień)
1. Usunąć `ExecutionEngine.ts` → używać `execution/index.ts`
2. Usunąć `DeveloperTools.ts` → używać `developer/index.ts`
3. Usunąć `ModelIntelligence.ts` → używać `models/index.ts`
4. Usunąć `IntelligenceLayer.ts` → używać `intelligence/index.ts`

### Faza 3 (Przyszłość)
1. Stworzyć monorepo z `@geminihydra/shared` dla wspólnego kodu
2. Przenieść walidatory i security patterns do shared

---

*Wygenerowano automatycznie przez Claude + Serena*
