/**
 * CLI utilities for memory operations
 * Helper functions for command-line interface
 */

async function main() {
  const command = process.argv[2];
  if (!command) {
    console.log('Podaj polecenie CLI');
    process.exit(1);
  }

  switch (command) {
    case 'add_observations': {
      const observations = process.argv.slice(3).join(' ');
      if (observations.length > 0) {
        await addObservations(observations);
      }
      break;
    }
    case 'memory/create_entities': {
      const entities = process.argv.slice(3).join(' ');
      if (entities.length > 0) {
        await createEntities(entities);
      }
      break;
    }
    default:
      console.log(`Nieznane polecenie CLI: ${command}`);
  }
}

function addObservations(observations: string): void {
  console.log('Add observations:', observations);
  // Implementacja dodawania obserwacji
}

async function createEntities(entities: string): Promise<void> {
  console.log('Create entities:', entities);
  await fetch('/api/create_entities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entities }),
  });
}

// Run main if executed directly
main().catch(console.error);
