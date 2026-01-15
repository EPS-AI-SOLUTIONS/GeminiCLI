import { checkHealth, listModels, OLLAMA_HOST } from '../src/ollama-client.js';
import { resolveNodeEngines } from '../src/version.js';
import { createTranslator } from './i18n.mjs';
import { commandExists } from './cli-utils.mjs';

const formatStatus = (label, status, detail = '') => {
  const suffix = detail ? ` - ${detail}` : '';
  return `${label}: ${status}${suffix}`;
};

const checkOllamaApi = async (retries, delayMs) => {
  for (let attempt = 1; attempt <= retries + 1; attempt += 1) {
    const health = await checkHealth({ timeoutMs: 2000, retries: 0 });
    if (health.available) {
      return { ...health, attempts: attempt };
    }
    process.stdout.write(`  → retry ${attempt}/${retries + 1}\n`);
    if (attempt <= retries) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return { available: false, attempts: retries + 1, host: OLLAMA_HOST };
};

const main = async () => {
  const { t } = await createTranslator();
  const engines = resolveNodeEngines();
  const nodeVersion = process.versions.node;
  console.log(await t('doctorTitle'));

  console.log(formatStatus('Node', await t('doctorCheck'), `${nodeVersion} (engines: ${engines ?? 'n/a'})`));

  const pwshAvailable = commandExists('pwsh') || commandExists('powershell');
  console.log(formatStatus('PowerShell', pwshAvailable ? await t('doctorOk') : await t('doctorWarn'), await t(pwshAvailable ? 'doctorPwshFound' : 'doctorPwshMissing')));

  const ollamaBinAvailable = commandExists('ollama');
  console.log(formatStatus('Ollama CLI', ollamaBinAvailable ? await t('doctorOk') : await t('doctorWarn'), await t(ollamaBinAvailable ? 'doctorOllamaFound' : 'doctorOllamaMissing')));

  console.log(formatStatus('Ollama API', await t('doctorCheck'), OLLAMA_HOST));
  const health = await checkOllamaApi(2, 1000);
  if (health.available) {
    console.log(formatStatus('Ollama API', await t('doctorOk'), `${await t('doctorOllamaOnline')} (${health.latencyMs ?? 'n/a'}ms)`));
    const models = await listModels();
    const modelsStatus = models.length > 0 ? await t('doctorModelsFound') : await t('doctorModelsEmpty');
    console.log(formatStatus('Ollama Models', models.length > 0 ? await t('doctorOk') : await t('doctorWarn'), `${modelsStatus} (${models.length})`));
  } else {
    console.log(formatStatus('Ollama API', await t('doctorWarn'), await t('doctorOllamaOffline')));
  }
};

main();
