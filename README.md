# GeminiHydra

![Version](https://img.shields.io/badge/version-0.3.0-blue)
![Stack](https://img.shields.io/badge/stack-PowerShell_7%2B_Tauri_2%2B_React_19-green)
![AI](https://img.shields.io/badge/AI-Ollama_%2B_Gemini-purple)

**GeminiHydra** to zaawansowany system autonomicznych agentów AI ("Rój"), który łączy potęgę skryptów PowerShell z nowoczesnym interfejsem graficznym.

---

## 🐺 Rój Agentów (The Swarm)

System składa się z 12 wyspecjalizowanych agentów, inspirowanych postaciami z Wiedźmina:

| Agent | Rola | Model (Ollama) | Specjalizacja |
|-------|------|----------------|---------------|
| **Dijkstra** | Strateg | Gemini Pro | Planowanie, Synteza, Samonaprawa (Phase C) |
| **Geralt** | Security | llama3.2:3b | Audyt bezpieczeństwa, Veto |
| **Yennefer** | Architect | qwen2.5-coder | Design Patterns, Architektura |
| **Triss** | QA | qwen2.5-coder | Testy, Scenariusze błędów |
| **Jaskier** | Dokumentacja | llama3.2:3b | Tłumaczenia, Raporty user-friendly |
| **Ciri** | Speed | llama3.2:1b | Szybkie operacje atomowe (IO) |
| **Zoltan** | Data | llama3.2:3b | JSON, CSV, walidacja danych |
| ... | ... | ... | (Pełna lista w `AgentSwarm.psm1`) |

---

## 🚀 Szybki Start

### Wymagania
- Windows 10/11
- PowerShell 7+
- Node.js 20+
- Rust (dla kompilacji GUI)
- Ollama (uruchomiona lokalnie)

### Instalacja

1.  **Sklonuj repozytorium:**
    ```powershell
    git clone https://github.com/your-repo/GeminiHydra.git
    cd GeminiHydra
    ```

2.  **Zainstaluj zależności GUI:**
    ```powershell
    cd GeminiGUI
    pnpm install
    ```

3.  **Uruchomienie (Tryb Hybrydowy):**
    ```powershell
    # W katalogu głównym
    .\gemini.ps1
    ```

---

## 🛠️ Architektura "Regis"

GeminiHydra działa w oparciu o unikalną architekturę hybrydową:

1.  **Warstwa Logiki (PowerShell):** `AgentSwarm.psm1` to silnik wykonawczy. Wykorzystuje `RunspacePool` do wielowątkowego wykonywania zadań przez agentów.
2.  **Warstwa UI (Tauri + React):** Nowoczesny frontend w React 19 komunikuje się z backendem Rust, który z kolei może wywoływać logikę PowerShell lub Node.js.
3.  **Self-Healing Loop:** Unikalna cecha Hydry. Jeśli agenci zawiodą, Dijkstra (Gemini) analizuje błędy i generuje plan naprawczy w pętli.

---

## 🤝 Kontrybucje

Projekt jest w fazie aktywnego rozwoju. Zapoznaj się z `CONTRIBUTING.md` i dołącz do Szkoły Wilka!

**Licencja:** MIT
**Autor:** GeminiCLI Team
