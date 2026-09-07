import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';

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

/**
 * ── WHY FRENCH IS NOT BUNDLED ────────────────────────────────────────────────
 *
 * en.json is 271 KB and fr.json is 306 KB, and both used to be static imports —
 * so every English user downloaded the entire French dictionary before the app
 * could paint. That was a real slice of a 977 KB first load on phones.
 *
 * English STAYS bundled, deliberately: it is `fallbackLng`, so a French user
 * needs it too for any key French has not translated yet. There is nothing to
 * save by making it lazy, and plenty to break.
 *
 * French is read through a minimal i18next backend rather than loaded once at
 * boot. The interface is i18next's own (`read(lng, ns, cb)`), which means
 * `changeLanguage('fr')` awaits the chunk by itself — the language switcher and
 * every existing test keep working untouched. A one-off boot-time fetch would
 * have needed both, and would have missed switches made later in a session.
 *
 * `partialBundledLanguages` is what lets bundled `resources` and a backend
 * coexist; without it i18next ignores one of them.
 */
const lazyLocaleBackend = {
  type: 'backend',
  init() {},
  read(language, namespace, callback) {
    // Already in the bundle — answer synchronously so nothing waits on a fetch
    // that will never happen.
    if (language === 'en') {
      callback(null, en);
      return;
    }
    if (language === 'fr') {
      import('./locales/fr.json')
        .then((mod) => callback(null, mod.default))
        // Report the failure to i18next rather than swallowing it: it then falls
        // back to English, which is a readable app. Swallowing would leave the UI
        // rendering raw key paths.
        .catch((err) => callback(err, null));
      return;
    }
    // An unsupported language cannot happen through applyLang, but i18next may
    // probe one. An empty bundle falls back to English.
    callback(null, {});
  },
};

i18n
  .use(lazyLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
    },
    // Bundled resources AND a backend — see lazyLocaleBackend above.
    partialBundledLanguages: true,
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
