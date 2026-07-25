import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';

/**
 * i18n setup.
 *
 * ── SINGLE SOURCE OF TRUTH FOR LANGUAGE ──────────────────────────────────────
 * `localStorage.lang` is THE language key for this app. api.js has read it since
 * P0 to send the X-App-Language header (which decides what language the AI
 * answers in), and the UI now reads the same key.
 *
 * i18next's detector would default to its own `i18nextLng` key, which would give
 * us two sources that silently disagree — the UI in one language and the AI
 * replying in another. `lookupLocalStorage: 'lang'` points it at the existing
 * key instead. Do NOT add a second key.
 *
 * ── PRECEDENCE ───────────────────────────────────────────────────────────────
 * Highest wins:
 *   1. the signed-in user's User.interfaceLang  (server truth, applied by
 *      lib/lang.js on hydration — it writes `lang` and calls changeLanguage)
 *   2. localStorage `lang`                      (an explicit prior choice here)
 *   3. navigator.language, first two chars, if supported
 *   4. 'en'
 *
 * The detector order below covers 2→3→4. Because localStorage comes first, an
 * explicit choice is NEVER overridden by browser locale: someone who picks EN on
 * a French phone stays on EN for every later visit.
 *
 * `load: 'languageOnly'` + `supportedLngs` collapse regional tags, so fr-FR,
 * fr-CA and fr-CI all resolve to 'fr' — matching the backend middleware, which
 * does the same with .slice(0, 2).
 */
export const SUPPORTED_LNGS = ['en', 'fr'];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    // Missing keys fall back to English rather than rendering blank or the raw
    // key path. This is what lets later rounds translate surface by surface: an
    // untranslated page just stays English.
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LNGS,
    load: 'languageOnly',
    // A key present in fr.json but empty ("") also falls back to English.
    returnEmptyString: false,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'lang',
      caches: ['localStorage'],
    },
    interpolation: {
      // React already escapes interpolated values.
      escapeValue: false,
    },
    // Vite dev noise only; harmless in production.
    debug: false,
  });

export default i18n;
