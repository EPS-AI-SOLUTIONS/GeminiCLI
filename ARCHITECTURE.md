# Architektura GeminiHydra (Regis Specification)

**Wersja:** 0.3.0
**Typ:** Hybrid Agent Swarm Orchestrator

## Diagram Przepływu

```mermaid
graph TD
    User[Użytkownik] --> GUI[GeminiGUI (React 19)]
    GUI <-->|IPC| Rust[Tauri Backend (Rust)]
    
    subgraph "Core Logic (PowerShell)"
        Rust -->|Process| Launcher[gemini.ps1]
        Launcher --> Swarm[AgentSwarm.psm1]
        
        Swarm -->|Planning| Dijkstra[Dijkstra Agent (Gemini Pro)]
        Swarm -->|Execution| Pool[Runspace Pool (12 Threads)]
        
        Pool --> Geralt[Geralt (Security)]
        Pool --> Yennefer[Yennefer (Architect)]
        Pool --> Ciri[Ciri (IO/Speed)]
        Pool --> Others[Other Agents...]
    end
    
    subgraph "AI Infrastructure"
        Dijkstra <-->|API| Google[Google Gemini API]
        Geralt <-->|HTTP| Ollama[Local Ollama API]
        Yennefer <-->|HTTP| Ollama
    end
    
    Swarm -->|Self-Healing| Dijkstra
```

## Szczegóły Komponentów

### 1. AgentSwarm.psm1 (The Brain)
To serce systemu. Nie jest to zwykły skrypt, ale zaawansowany moduł zarządzający stanem roju.
- **Dijkstra Chain:** Specjalny łańcuch wywołań tylko do Google Gemini. Dijkstra jest jedynym agentem, który ma "prawo" do modelu cloudowego w celu zapewnienia najwyższej jakości planowania.
- **Graph Processor:** Algorytm rozwiązujący zależności między zadaniami w planie JSON. Uruchamia zadania równolegle, gdy tylko ich zależności zostaną spełnione.
- **Ollama Prime:** Domyślny tryb dla agentów wykonawczych (Worker Agents). Używa lokalnych modeli (Llama, Qwen) dla szybkości i prywatności.

### 2. GeminiGUI (The Face)
- **Tech Stack:** React 19, Vite 7, Tailwind 4.
- **Rola:** Wizualizacja stanu roju. Nie zawiera logiki biznesowej AI - jedynie prezentuje to, co dzieje się w warstwie niższej.
- **Komunikacja:** Tauri Commands (`invoke`) służą do uruchamiania procesów PowerShell i odczytu logów.

### 3. Pamięć (.serena)
System wykorzystuje strukturę katalogów `.serena` do przechowywania:
- **Vector DB (`.jsonl`):** Pamięć długoterminowa agentów.
- **Knowledge Graph:** Graf wiedzy projektu.
- **Cache:** Tymczasowe wyniki sesji.

## Protokół "Self-Healing"

Unikalną cechą v0.3.0 jest pętla samonaprawcza:
1.  **Execution:** Agenci wykonują zadania.
2.  **Evaluation:** Dijkstra pobiera wyniki i ocenia je pod kątem celu (Objective).
3.  **Decision:**
    - Jeśli sukces -> Koniec.
    - Jeśli porażka -> Generowanie nowego planu naprawczego (Fix Plan).
4.  **Loop:** Proces powtarza się do skutku lub wyczerpania limitu prób (Max Retries).
