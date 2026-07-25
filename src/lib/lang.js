import i18n from '../i18n';

/**
 * App language — the ONE source of truth.
 *
 * `localStorage.lang` is read by two consumers and they must never disagree:
 *   • api.js  → sends it as the X-App-Language header, which decides the
 *               language every AI response comes back in (P0).
 *   • i18next → renders the UI in it (the detector is pointed at this same key;
 *               see i18n/index.js).
 *
 * So every write goes through applyLang(), which updates both.
 *
 * PRECEDENCE (highest first):
 *   1. the signed-in user's User.interfaceLang — server truth, applied on
 *      hydration by syncLangFromUser
 *   2. localStorage `lang` — an explicit choice previously made on this device
 *   3. navigator.language, first two chars, when supported
 *   4. 'en'
 *
 * Detection (3) only ever runs when there is no stored `lang` and no
 * interfaceLang, so it can NEVER override an explicit choice: someone who picks
 * EN on a French-language phone stays on EN on every later visit.
 */
export const SUPPORTED_LANGS = ['en', 'fr'];

const isSupported = (v) => SUPPORTED_LANGS.includes(v);

/** Normalize any locale tag to a supported code: fr-CI / fr-FR / fr-CA → 'fr'. */
export const normalizeLang = (tag) => {
  const two = String(tag || '')
    .toLowerCase()
    .slice(0, 2);
  return isSupported(two) ? two : null;
};

/** The current app language. Always one of SUPPORTED_LANGS. */
export const getLang = () => normalizeLang(localStorage.getItem('lang')) || 'en';

/** Browser/OS locale, if we support it. Rule 3 above. */
export const detectBrowserLang = () => {
  if (typeof navigator === 'undefined') return null;
  const candidates = [...(navigator.languages || []), navigator.language].filter(Boolean);
  for (const c of candidates) {
    const l = normalizeLang(c);
    if (l) return l;
  }
  return null;
};

/**
 * Set the app language everywhere: storage (→ the API header) and i18next
 * (→ the UI). The single write path — nothing else should touch `lang`.
 */
export const applyLang = (lang) => {
  const next = normalizeLang(lang);
  if (!next) return getLang();
  if (localStorage.getItem('lang') !== next) localStorage.setItem('lang', next);
  if (i18n.language !== next) i18n.changeLanguage(next);
  return next;
};

/**
 * Run once at startup, AFTER i18n has initialised.
 *
 * i18next's detector may cache a raw tag it could not use (e.g. 'de-DE' on an
 * unsupported locale) into `lang`. Since api.js reads that key verbatim for the
 * X-App-Language header, we normalize it here so storage only ever holds 'en' or
 * 'fr' — keeping the header and the UI provably identical.
 */
export const initLang = () => {
  const stored = localStorage.getItem('lang');
  const resolved = normalizeLang(stored) || detectBrowserLang() || 'en';
  applyLang(resolved);
  return resolved;
};

/**
 * Seed the language from a hydrated user object — precedence rule 1. The server
 * value wins over whatever this device had, which is what makes the choice
 * follow the user across devices. No-op when the user has no saved language.
 */
export const syncLangFromUser = (user) => {
  const lang = normalizeLang(user?.interfaceLang);
  if (!lang) return;
  applyLang(lang);
};

/**
 * Optimistically write the chosen language onto the stored user blob's
 * interfaceLang, BEFORE any network call — so an explicit choice survives an
 * immediate reload, an offline device, or a failed request. Without this, the
 * stale blob value would out-rank the choice (it's precedence rule 1) the next
 * time syncLangFromStoredUser runs.
 *
 * Deliberately NOT folded into applyLang: initLang() calls applyLang() at
 * startup with a browser/stored value that must never overwrite the (fresher)
 * server-truth interfaceLang in the blob before syncLangFromStoredUser reads it.
 * This is only ever called from a deliberate user action (the switcher).
 *
 * Defensive: normalizes input, never CREATES a blob (no-op when signed out),
 * and leaves a corrupt blob untouched.
 */
export const setStoredUserLang = (lang) => {
  const next = normalizeLang(lang);
  if (!next) return;
  try {
    const stored = JSON.parse(localStorage.getItem('user') || 'null');
    if (!stored || stored.interfaceLang === next) return;
    localStorage.setItem('user', JSON.stringify({ ...stored, interfaceLang: next }));
  } catch {
    /* corrupt user blob — leave it alone */
  }
};

/** Read the stored user blob and seed from it. Safe against malformed JSON. */
export const syncLangFromStoredUser = () => {
  try {
    syncLangFromUser(JSON.parse(localStorage.getItem('user') || 'null'));
  } catch {
    /* corrupt user blob — leave the local choice alone */
  }
};
