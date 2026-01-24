# Kontrybucja do GeminiHydra

Witaj w Szkole Wilka! Cieszymy się, że chcesz pomóc w rozwoju GeminiHydra.

## Standardy Deweloperskie

### 1. PowerShell (AgentSwarm)
- **Styl:** PascalCase dla funkcji (`Invoke-AgentSwarm`), camelCase dla zmiennych lokalnych.
- **Bezpieczeństwo:** Zawsze używaj `Try/Catch` przy operacjach zewnętrznych (HTTP, IO).
- **Logowanie:** Używaj `Write-SwarmLog` zamiast `Write-Host` dla logiki biznesowej. `Write-Host` tylko dla informacji dla użytkownika w konsoli.

### 2. React (GUI)
- **Komponenty:** Funkcyjne + TypeScript.
- **Stan:** Zustand (`useAppStore`). Unikaj `Context API` dla stanu globalnego.
- **UI:** TailwindCSS. Używaj klas narzędziowych, nie twórz plików `.css` chyba że to absolutnie konieczne.

### 3. Rust (Backend)
- **Bezpieczeństwo:** Nigdy nie wykonuj komend systemowych bezpośrednio z user input. Używaj allowlisty w `lib.rs`.
- **Async:** Wszystkie komendy Tauri muszą być `async`.

## Dodawanie Nowego Agenta

1.  Otwórz `AgentSwarm.psm1`.
2.  Dodaj wpis do `$script:AgentModels` (przypisz model Ollama).
3.  Dodaj wpis do `$script:AgentPersonas` (zdefiniuj Prompt Systemowy).
4.  Zaktualizuj `README.md` i `GEMINI.md`.

## Testowanie

Projekt posiada infrastrukturę testową E2E (Playwright).

```powershell
cd GeminiGUI
npx playwright test
```

Przed wysłaniem PR upewnij się, że testy przechodzą.

## Zgłaszanie Błędów

Używaj GitHub Issues. Jeśli błąd dotyczy logiki roju, dołącz plik `agent_swarm.log`.

Powodzenia na Szlaku!
