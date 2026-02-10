/**
 * Test automatycznego zapisu przez agentów GeminiHydra
 * Ten test sprawdza czy mechanizm ===ZAPIS=== działa poprawnie
 */

import chalk from 'chalk';
import { mcpManager } from '../src/mcp/index.js';

// Symulacja odpowiedzi agenta z blokiem ZAPIS
const mockAgentResponse = `
Przeanalizowałem kod i znalazłem błędy. Oto poprawki:

1. Brak obsługi błędów w funkcji processData
2. Niepoprawny typ zwracany

===ZAPIS===
PLIK: C:\\Users\\BIURODOM\\Desktop\\GeminiHydra\\tests\\test-output.txt
KOD:
\`\`\`
// Ten plik został automatycznie wygenerowany przez test
// Data: ${new Date().toISOString()}

export function processData(input: string): string {
  if (!input) {
    throw new Error('Input cannot be empty');
  }
  return input.toUpperCase();
}

export function validateInput(data: unknown): boolean {
  return typeof data === 'string' && data.length > 0;
}

console.log('Test auto-write działa poprawnie!');
\`\`\`
===KONIEC_ZAPISU===

Zmiany zostały przygotowane do zapisu.
`;

// Pattern do wykrywania bloków ZAPIS (taki sam jak w GraphProcessor)
const savePattern =
  /===ZAPIS===\s*\n\s*PLIK:\s*(.+?)\s*\n\s*KOD:\s*\n```[\w]*\n([\s\S]*?)\n```\s*\n===KONIEC_ZAPISU===/gi;

async function testAutoWrite() {
  console.log(chalk.cyan('\n========================================'));
  console.log(chalk.cyan('  TEST: Automatyczny zapis przez agentów'));
  console.log(chalk.cyan('========================================\n'));

  // Test 1: Wykrywanie wzorca ZAPIS
  console.log(chalk.yellow('Test 1: Wykrywanie wzorca ===ZAPIS==='));
  const matches = [...mockAgentResponse.matchAll(savePattern)];

  if (matches.length === 0) {
    console.log(chalk.red('  ❌ BŁĄD: Nie wykryto bloków ZAPIS'));
    return false;
  }

  console.log(chalk.green(`  ✓ Wykryto ${matches.length} blok(ów) ZAPIS`));

  for (const match of matches) {
    const filePath = match[1].trim();
    const codeContent = match[2];

    console.log(chalk.gray(`  Ścieżka: ${filePath}`));
    console.log(chalk.gray(`  Rozmiar kodu: ${codeContent.length} znaków`));
  }

  // Test 2: Inicjalizacja MCP
  console.log(chalk.yellow('\nTest 2: Inicjalizacja MCP Manager'));
  try {
    await mcpManager.init();
    console.log(chalk.green('  ✓ MCP Manager zainicjalizowany'));

    const servers = mcpManager.getAllServers();
    console.log(chalk.gray(`  Połączone serwery: ${servers.length}`));

    const tools = mcpManager.getAllTools();
    console.log(chalk.gray(`  Dostępne narzędzia: ${tools.length}`));

    // Sprawdź czy filesystem__write_file jest dostępny
    const hasWriteFile = tools.some((t) => t.name === 'write_file');
    if (hasWriteFile) {
      console.log(chalk.green('  ✓ Narzędzie write_file dostępne'));
    } else {
      console.log(chalk.yellow('  ⚠ Narzędzie write_file niedostępne - sprawdź konfigurację MCP'));
    }
  } catch (error: any) {
    console.log(chalk.red(`  ❌ Błąd inicjalizacji MCP: ${error.message}`));
  }

  // Test 3: Zapis pliku przez MCP
  console.log(chalk.yellow('\nTest 3: Zapis pliku przez MCP'));

  for (const match of matches) {
    const filePath = match[1].trim();
    const codeContent = match[2];

    try {
      console.log(chalk.gray(`  Zapisuję do: ${filePath}`));

      const result = await mcpManager.callTool('filesystem__write_file', {
        path: filePath,
        content: codeContent,
      });

      if (result.isError) {
        console.log(chalk.red(`  ❌ Błąd zapisu: ${JSON.stringify(result.content)}`));
      } else {
        console.log(chalk.green(`  ✓ Plik zapisany pomyślnie: ${filePath}`));
      }
    } catch (error: any) {
      console.log(chalk.red(`  ❌ Wyjątek przy zapisie: ${error.message}`));
    }
  }

  // Test 4: Weryfikacja zapisu (odczyt pliku)
  console.log(chalk.yellow('\nTest 4: Weryfikacja zapisu'));

  for (const match of matches) {
    const filePath = match[1].trim();

    try {
      const readResult = await mcpManager.callTool('filesystem__read_file', {
        path: filePath,
      });

      if (readResult.isError) {
        console.log(chalk.red(`  ❌ Nie można odczytać pliku: ${filePath}`));
      } else {
        const content = readResult.content?.[0]?.text || '';
        console.log(chalk.green(`  ✓ Plik odczytany (${content.length} znaków)`));
        console.log(chalk.gray(`  Podgląd: ${content.substring(0, 100)}...`));
      }
    } catch (error: any) {
      console.log(chalk.red(`  ❌ Wyjątek przy odczycie: ${error.message}`));
    }
  }

  console.log(chalk.cyan('\n========================================'));
  console.log(chalk.cyan('  TEST ZAKOŃCZONY'));
  console.log(chalk.cyan('========================================\n'));

  return true;
}

// Uruchom test
testAutoWrite()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
  });
