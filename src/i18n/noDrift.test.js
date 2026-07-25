// The invariant this file exists to protect: the language the UI renders in and
// the language sent as X-App-Language (which decides what language the AI
// answers in) must NEVER disagree. They are wired to the same localStorage key,
// and this runs the REAL axios request interceptor to prove it.
import { describe, it, expect, beforeEach, vi } from 'vitest';

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

// Capacitor pulls in native shims that don't load under the node environment.
vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => false } }));

let api;
let lang;
let i18n;

beforeEach(async () => {
  vi.stubGlobal('localStorage', makeStorage());
  vi.stubGlobal('navigator', { languages: ['en-US'], language: 'en-US' });
  vi.resetModules();
  api = (await import('../services/api')).default;
  lang = await import('../lib/lang');
  i18n = (await import('./index')).default;
});

// Run a request through the interceptor chain without touching the network.
const headersFor = async () => {
  const handlers = api.interceptors.request.handlers.filter(Boolean);
  let config = { headers: {} };
  for (const h of handlers) config = await h.fulfilled(config);
  return config.headers;
};

describe('UI language and X-App-Language never drift', () => {
  it.each(['en', 'fr'])('after applyLang(%s) both agree', async (code) => {
    lang.applyLang(code);
    const headers = await headersFor();
    expect(headers['X-App-Language']).toBe(code);
    expect(i18n.resolvedLanguage).toBe(code);
    expect(localStorage.getItem('lang')).toBe(code);
  });

  it('stays in lockstep across repeated toggles', async () => {
    for (const code of ['fr', 'en', 'fr', 'fr', 'en']) {
      lang.applyLang(code);
      const headers = await headersFor();
      expect(headers['X-App-Language']).toBe(i18n.resolvedLanguage);
      expect(headers['X-App-Language']).toBe(code);
    }
  });

  it('a server-side interfaceLang moves BOTH the header and the UI', async () => {
    lang.applyLang('en');
    lang.syncLangFromUser({ interfaceLang: 'fr' });
    const headers = await headersFor();
    expect(headers['X-App-Language']).toBe('fr');
    expect(i18n.resolvedLanguage).toBe('fr');
  });

  it('sends a supported code even when storage was never initialised', async () => {
    localStorage.removeItem('lang');
    const headers = await headersFor();
    expect(['en', 'fr']).toContain(headers['X-App-Language']);
  });

  it('never sends an unsupported tag after initLang normalizes storage', async () => {
    localStorage.setItem('lang', 'de-DE');
    lang.initLang();
    const headers = await headersFor();
    expect(headers['X-App-Language']).toBe('en');
    expect(i18n.resolvedLanguage).toBe('en');
  });
});
