import { describe, it, expect, beforeEach, vi } from 'vitest';

// A minimal localStorage + navigator so we can drive detection deterministically.
const makeStorage = () => {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    _map: map,
  };
};

const setNavigator = (languages) => {
  vi.stubGlobal('navigator', { languages, language: languages[0] });
};

let lang;
const loadFresh = async () => {
  vi.resetModules();
  lang = await import('./lang');
};

beforeEach(async () => {
  vi.stubGlobal('localStorage', makeStorage());
  setNavigator(['en-US']);
  await loadFresh();
});

describe('normalizeLang — regional tags collapse to the base language', () => {
  it('maps every French regional tag to fr', () => {
    for (const tag of ['fr', 'fr-FR', 'fr-CA', 'fr-CI', 'fr-BE', 'FR-ci']) {
      expect(lang.normalizeLang(tag)).toBe('fr');
    }
  });

  it('maps English regional tags to en', () => {
    for (const tag of ['en', 'en-US', 'en-GB', 'en-NG']) {
      expect(lang.normalizeLang(tag)).toBe('en');
    }
  });

  it('returns null for unsupported languages so callers can fall back', () => {
    for (const tag of ['de', 'de-DE', 'es', 'yo-NG', '', null, undefined, 42]) {
      expect(lang.normalizeLang(tag)).toBeNull();
    }
  });
});

describe('detection precedence', () => {
  it('rule 3: detects French from the browser when nothing is stored', async () => {
    setNavigator(['fr-CI']);
    await loadFresh();
    expect(lang.initLang()).toBe('fr');
    expect(localStorage.getItem('lang')).toBe('fr');
  });

  it('rule 4: falls back to en for an unsupported browser locale', async () => {
    setNavigator(['de-DE']);
    await loadFresh();
    expect(lang.initLang()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
  });

  it('picks the first SUPPORTED entry out of navigator.languages', async () => {
    setNavigator(['de-DE', 'fr-FR', 'en-US']);
    await loadFresh();
    expect(lang.detectBrowserLang()).toBe('fr');
  });

  it('rule 2 BEATS rule 3: an explicit EN choice survives a French browser', async () => {
    setNavigator(['fr-FR']);
    await loadFresh();
    localStorage.setItem('lang', 'en'); // the user picked EN previously
    expect(lang.initLang()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
  });

  it('rule 1 BEATS rule 2: the signed-in user overrides the device choice', async () => {
    setNavigator(['fr-FR']);
    await loadFresh();
    localStorage.setItem('lang', 'en');
    lang.syncLangFromUser({ interfaceLang: 'fr' });
    expect(localStorage.getItem('lang')).toBe('fr');
  });

  it('a user with no stored interfaceLang never clobbers the local choice', async () => {
    localStorage.setItem('lang', 'fr');
    lang.syncLangFromUser({ email: 'a@b.c' });
    lang.syncLangFromUser(null);
    lang.syncLangFromUser({ interfaceLang: 'de' });
    expect(localStorage.getItem('lang')).toBe('fr');
  });

  it('normalizes a junk stored value rather than sending it as a header', async () => {
    localStorage.setItem('lang', 'de-DE');
    expect(lang.initLang()).toBe('en');
    expect(localStorage.getItem('lang')).toBe('en');
  });
});

describe('a chosen language survives a reload (regression)', () => {
  // The bug: picking FR flipped the UI but left the stored user blob on 'en'.
  // On the next mount syncLangFromStoredUser (precedence rule 1 = server truth)
  // read that stale 'en' and reverted the choice. The fix stamps the blob
  // optimistically in the switcher, via setStoredUserLang, before any request.
  it('the optimistic blob write out-ranks the stale server-truth value', async () => {
    const i18n = (await import('../i18n')).default;
    // A signed-in user whose stored blob still says 'en'.
    localStorage.setItem('user', JSON.stringify({ token: 't', interfaceLang: 'en' }));
    lang.applyLang('en');
    await i18n.changeLanguage('en');

    // What the switcher's choose() now does synchronously: stamp the blob first,
    // then flip lang + i18n.
    lang.setStoredUserLang('fr');
    lang.applyLang('fr');

    // The choice is on the blob, so it survives a reload / offline / failed PUT.
    expect(JSON.parse(localStorage.getItem('user')).interfaceLang).toBe('fr');

    // Next mount: syncLangFromStoredUser must NOT revert to 'en'.
    lang.syncLangFromStoredUser();
    expect(lang.getLang()).toBe('fr');
    await i18n.changeLanguage(lang.getLang()); // settle i18n's async change
    expect(i18n.language).toBe('fr');
  });

  it('WITHOUT the blob write the choice reverts — this is the bug it fixes', () => {
    localStorage.setItem('user', JSON.stringify({ token: 't', interfaceLang: 'en' }));
    // The old behaviour: flip the UI only, never touch the blob.
    lang.applyLang('fr');
    // The stale blob out-ranks it on the next sync.
    lang.syncLangFromStoredUser();
    expect(lang.getLang()).toBe('en');
  });

  it('setStoredUserLang never CREATES a blob when signed out', () => {
    localStorage.removeItem('user');
    lang.setStoredUserLang('fr');
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('setStoredUserLang ignores unsupported input and a corrupt blob', () => {
    localStorage.setItem('user', JSON.stringify({ token: 't', interfaceLang: 'en' }));
    lang.setStoredUserLang('de');
    expect(JSON.parse(localStorage.getItem('user')).interfaceLang).toBe('en');
    localStorage.setItem('user', '{not json');
    expect(() => lang.setStoredUserLang('fr')).not.toThrow();
    expect(localStorage.getItem('user')).toBe('{not json');
  });
});

describe('single source of truth', () => {
  it('uses exactly one localStorage key for language', async () => {
    setNavigator(['fr-FR']);
    await loadFresh();
    lang.initLang();
    lang.applyLang('en');
    lang.applyLang('fr');
    const keys = [...localStorage._map.keys()].filter((k) => /lang|i18n|locale/i.test(k));
    expect(keys).toEqual(['lang']);
  });

  it('applyLang ignores unsupported input and keeps the current language', () => {
    lang.applyLang('fr');
    expect(lang.applyLang('de')).toBe('fr');
    expect(lang.getLang()).toBe('fr');
  });

  it('getLang always returns a supported code', () => {
    localStorage.setItem('lang', 'zz');
    expect(lang.getLang()).toBe('en');
    localStorage.removeItem('lang');
    expect(lang.getLang()).toBe('en');
  });
});
