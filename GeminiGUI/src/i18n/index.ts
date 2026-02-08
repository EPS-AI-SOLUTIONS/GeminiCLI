/**
 * i18n Configuration for GeminiGUI
 * @module i18n
 *
 * Internationalization setup using i18next and react-i18next.
 * Supports Polish (pl) and English (en) languages.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import pl from './locales/pl.json';
import en from './locales/en.json';

// Get stored language preference or default to Polish
const getStoredLanguage = (): string => {
  try {
    const stored = localStorage.getItem('gemini-language');
    if (stored && ['pl', 'en'].includes(stored)) {
      return stored;
    }
  } catch {
    // localStorage not available
  }
  return 'pl'; // Default to Polish
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      pl: { translation: pl },
      en: { translation: en },
    },
    lng: getStoredLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    react: {
      useSuspense: false, // Disable suspense for better error handling
    },
  });

// Helper to change language and persist preference
export const changeLanguage = (lang: 'pl' | 'en'): void => {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem('gemini-language', lang);
  } catch {
    // localStorage not available
  }
};

// Export available languages for UI
export const AVAILABLE_LANGUAGES = [
  { code: 'pl', name: 'Polski' },
  { code: 'en', name: 'English' },
] as const;

export type LanguageCode = 'pl' | 'en';

export default i18n;
