import i18next from 'i18next';
import { checkHealth, generate } from '../src/ollama-client.js';

const resources = {
  en: {
    translation: {
      launcherFallback: 'PowerShell not found. Falling back to "npm start".',
      launcherHint: 'Install PowerShell 7+ or run "npm start" directly.',
      doctorTitle: 'HYDRA Doctor',
      doctorCheck: 'Checking',
      doctorOk: 'OK',
      doctorWarn: 'WARN',
      doctorFail: 'FAIL',
      doctorPwshMissing: 'PowerShell not found',
      doctorPwshFound: 'PowerShell detected',
      doctorOllamaMissing: 'Ollama not found',
      doctorOllamaFound: 'Ollama detected',
      doctorOllamaOffline: 'Ollama API unavailable',
      doctorOllamaOnline: 'Ollama API online',
      doctorModelsEmpty: 'No local models found',
      doctorModelsFound: 'Local models available'
    }
  },
  pl: {
    translation: {
      launcherFallback: 'Nie wykryto PowerShell. Przełączam na "npm start".',
      launcherHint: 'Zainstaluj PowerShell 7+ lub uruchom "npm start" bezpośrednio.',
      doctorTitle: 'HYDRA Doktor',
      doctorCheck: 'Sprawdzam',
      doctorOk: 'OK',
      doctorWarn: 'OSTRZ',
      doctorFail: 'BŁĄD',
      doctorPwshMissing: 'Brak PowerShell',
      doctorPwshFound: 'PowerShell wykryty',
      doctorOllamaMissing: 'Brak Ollama',
      doctorOllamaFound: 'Ollama wykryta',
      doctorOllamaOffline: 'API Ollama niedostępne',
      doctorOllamaOnline: 'API Ollama działa',
      doctorModelsEmpty: 'Brak lokalnych modeli',
      doctorModelsFound: 'Lokalne modele dostępne'
    }
  }
};

const detectLanguage = () => {
  const envLang = process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || 'en';
  return envLang.toLowerCase().startsWith('pl') ? 'pl' : 'en';
};

const translateWithAi = async (text, targetLanguage) => {
  if (process.env.AI_TRANSLATION !== 'true') return null;
  const health = await checkHealth({ timeoutMs: 1500, retries: 0 });
  if (!health.available) return null;
  const model = process.env.AI_TRANSLATION_MODEL || 'llama3.2:1b';
  const prompt = `Translate the following text to ${targetLanguage}. Return only the translation.\n\n${text}`;
  const result = await generate(model, prompt, { maxTokens: 120, temperature: 0.2 });
  return result.response?.trim() || null;
};

export const createTranslator = async () => {
  const language = detectLanguage();
  await i18next.init({
    lng: language,
    fallbackLng: 'en',
    resources
  });

  const t = async (key, options = {}) => {
    if (i18next.exists(key)) {
      return i18next.t(key, options);
    }
    const fallback = options.defaultValue ?? key;
    const aiTranslation = await translateWithAi(fallback, language);
    return aiTranslation || fallback;
  };

  return { t, language };
};
