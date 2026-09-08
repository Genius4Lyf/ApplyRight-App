// @vitest-environment jsdom
//
// Two questions, and getting either wrong is expensive in a different direction.
//
// "Is a newer build live?" answered wrongly as YES means reloading users for nothing.
// "Is it safe to reload?" answered wrongly as YES means reloading a half-written CV out
// from under someone, or dropping a live interview whose minutes have already been
// reserved and charged. So every uncertainty in this module has to resolve to "no".
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  currentEntry,
  isUpdateAvailable,
  holdAutoReload,
  autoReloadBlockers,
  canAutoReload,
} from './appUpdate';

const html = (entry) =>
  `<!doctype html><html><head>` +
  `<script type="module" crossorigin src="${entry}"></script>` +
  `</head><body></body></html>`;

const serve = (body, ok = true) =>
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok, text: () => Promise.resolve(body) }));

// The tag Vite emits into index.html, which is what identifies a build.
const bootedFrom = (entry) => {
  document.head.innerHTML = '';
  if (!entry) return;
  const tag = document.createElement('script');
  tag.type = 'module';
  tag.setAttribute('src', entry);
  document.head.appendChild(tag);
};

beforeEach(() => {
  document.head.innerHTML = '';
  vi.unstubAllGlobals();
});
afterEach(() => vi.unstubAllGlobals());

describe('appUpdate — is a newer build live?', () => {
  it('reads the entry chunk this document booted from', () => {
    bootedFrom('/assets/index-Dxx3TwW5.js');
    expect(currentEntry()).toBe('/assets/index-Dxx3TwW5.js');
  });

  it('says yes only when the served entry differs', async () => {
    bootedFrom('/assets/index-OLD.js');

    serve(html('/assets/index-OLD.js'));
    expect(await isUpdateAvailable()).toBe(false);

    serve(html('/assets/index-NEW.js'));
    expect(await isUpdateAvailable()).toBe(true);
  });

  it('says NO on every kind of not-knowing', async () => {
    bootedFrom('/assets/index-OLD.js');

    // Offline, captive portal, CORS — anything that throws.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    expect(await isUpdateAvailable()).toBe(false);

    // A non-200 (an error page, a redirect to a login wall).
    serve(html('/assets/index-NEW.js'), false);
    expect(await isUpdateAvailable()).toBe(false);

    // HTML that carries no module entry at all — a maintenance page, say. Comparing
    // against nothing must not read as "everything changed".
    serve('<!doctype html><html><body>Down for maintenance</body></html>');
    expect(await isUpdateAvailable()).toBe(false);
  });

  it('does nothing at all on the dev server', async () => {
    // In dev the entry is /src/main.jsx, not a hashed asset, so there is no build to be
    // behind. It must not fetch, let alone decide something changed.
    bootedFrom(null);
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    expect(await isUpdateAvailable()).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('asks the network, never the cache', async () => {
    // The one request that must never be answered by the cache is the one asking whether
    // the cache is stale.
    bootedFrom('/assets/index-OLD.js');
    serve(html('/assets/index-OLD.js'));

    await isUpdateAvailable();

    expect(fetch).toHaveBeenCalledWith('/', expect.objectContaining({ cache: 'no-store' }));
  });
});

describe('appUpdate — is it safe to reload?', () => {
  it('is safe when nothing objects', () => {
    expect(canAutoReload()).toBe(true);
    expect(autoReloadBlockers()).toEqual([]);
  });

  it('is blocked by an explicit hold until it is released', () => {
    const release = holdAutoReload('live interview');
    expect(autoReloadBlockers()).toEqual(['live interview']);
    expect(canAutoReload()).toBe(false);

    release();
    expect(canAutoReload()).toBe(true);
  });

  it('counts holds, so two components sharing a reason cannot half-release it', () => {
    const a = holdAutoReload('live interview');
    const b = holdAutoReload('live interview');

    a();
    expect(canAutoReload()).toBe(false); // b still holds it

    b();
    expect(canAutoReload()).toBe(true);
  });

  it('is blocked by unsaved work, via the guard the page ALREADY registers', () => {
    // The point of the beforeunload probe: no second registry to join, so a form added
    // next year is covered the day someone writes its unload guard. Both spellings are
    // in the codebase today — CVBuilderLayout and Profile each use both — so both count.
    const viaPreventDefault = (e) => e.preventDefault();
    window.addEventListener('beforeunload', viaPreventDefault);
    expect(canAutoReload()).toBe(false);
    window.removeEventListener('beforeunload', viaPreventDefault);
    expect(canAutoReload()).toBe(true);

    const viaReturnValue = (e) => {
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', viaReturnValue);
    expect(canAutoReload()).toBe(false);
    window.removeEventListener('beforeunload', viaReturnValue);
    expect(canAutoReload()).toBe(true);
  });

  it('is not blocked by a listener that merely watches', () => {
    // Analytics and flush-on-exit listeners are common and do not cancel. Treating them
    // as objections would mean the app could never update itself.
    const passive = vi.fn();
    window.addEventListener('beforeunload', passive);

    expect(canAutoReload()).toBe(true);
    expect(passive).toHaveBeenCalled();

    window.removeEventListener('beforeunload', passive);
  });
});
