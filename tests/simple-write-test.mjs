/**
 * Prosty test zapisu - bez zależności od MCP
 * Testuje sam wzorzec ===ZAPIS===
 */

// Symulacja odpowiedzi agenta
const mockAgentResponse = `
Przeanalizowałem kod. Oto poprawki:

===ZAPIS===
PLIK: C:\\Users\\BIURODOM\\Desktop\\GeminiHydra\\tests\\test-output.txt
KOD:
\`\`\`
// Automatycznie wygenerowany plik testowy
// Data: ${new Date().toISOString()}

console.log('Test działa!');
\`\`\`
===KONIEC_ZAPISU===

Gotowe.
`;

// Pattern z GraphProcessor
const savePattern =
  /===ZAPIS===\s*\n\s*PLIK:\s*(.+?)\s*\n\s*KOD:\s*\n```[\w]*\n([\s\S]*?)\n```\s*\n===KONIEC_ZAPISU===/gi;

console.log('=== TEST WZORCA ZAPIS ===\n');

const matches = [...mockAgentResponse.matchAll(savePattern)];

if (matches.length === 0) {
  console.log('BŁĄD: Nie wykryto bloków ZAPIS');
  process.exit(1);
}

console.log(`Wykryto ${matches.length} blok(ów) ZAPIS:`);

for (const match of matches) {
  const filePath = match[1].trim();
  const codeContent = match[2];

  console.log(`\nŚcieżka: ${filePath}`);
  console.log(`Rozmiar: ${codeContent.length} znaków`);
  console.log('Zawartość:');
  console.log('---');
  console.log(codeContent);
  console.log('---');
}

// Zapisz plik używając fs
import fs from 'node:fs';

for (const match of matches) {
  const filePath = match[1].trim();
  const codeContent = match[2];

  try {
    fs.writeFileSync(filePath, codeContent, 'utf-8');
    console.log(`\n✓ Zapisano: ${filePath}`);

    // Weryfikacja
    const readBack = fs.readFileSync(filePath, 'utf-8');
    console.log(`✓ Weryfikacja: plik ma ${readBack.length} znaków`);
  } catch (err) {
    console.log(`✗ Błąd zapisu: ${err.message}`);
  }
}

console.log('\n=== TEST ZAKOŃCZONY ===');
