import { checkHealth, listModels, OLLAMA_HOST } from '../src/ollama-client.js';

const formatDuration = (value) => {
  if (value == null) return 'n/a';
  return `${Math.round(value)}ms`;
};

const main = async () => {
  const health = await checkHealth({ timeoutMs: 1500, retries: 0 });
  const models = health.available ? await listModels() : [];
  const status = health.available ? 'ONLINE' : 'OFFLINE';
  const modelCount = models.length;
  const latency = formatDuration(health.latencyMs);
  const line = `Ollama ${status} | Host ${OLLAMA_HOST} | Models ${modelCount} | Latency ${latency}`;
  process.stdout.write(line);
};

main();
