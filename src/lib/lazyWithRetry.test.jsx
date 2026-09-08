// @vitest-environment jsdom
//
// THE BUG THIS EXISTS FOR, measured against production:
//
//     GET /assets/AriaStudio-OLDHASH.js
//     → 200 OK, Content-Type: text/html
//
// A deploy replaces every content-hashed chunk. A tab that was already open still holds
// the OLD index.html and asks for the OLD names; the SPA catch-all in netlify.toml
// answers with index.html instead of a 404, so the browser tries to `import()` a module
// and receives a document. The import rejects, <Suspense> has no error path, and the route
// never renders — the "I have to refresh after every deploy" report.
//
// One reload cures it. What must never happen is TWO: a chunk that is genuinely broken
// (a bad deploy, a user offline) would otherwise reload forever, which is worse than the
// blank page it replaced.
import React, { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

// Imported per test, not once. The module keeps a deliberate one-reload-per-document
// latch, and in a real page load that latch is correct precisely BECAUSE the document is
// about to be replaced. In a test file the document never goes away, so without a fresh
// module each test the second test to trigger a reload would silently not.
let lazyWithRetry;

const replace = vi.fn();

// jsdom's window.location is not writable, and calling replace() for real would tear the
// test environment down. Swap the whole object for one we can watch.
const stubLocation = () =>
  vi.stubGlobal('location', { href: 'https://applyright.com.ng/aria-studio', replace });

// What a browser throws when index.html comes back for a .js request.
const mimeError = () =>
  new TypeError(
    'Failed to fetch dynamically imported module: expected a JavaScript module script but ' +
      'the server responded with a MIME type of "text/html".'
  );

const Ok = () => <p>route content</p>;

// A minimal stand-in for the app's ErrorBoundary — enough to prove the rejection escapes
// rather than being swallowed into another reload.
class Boundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <p>caught</p> : this.props.children;
  }
}

const mountLazy = (factory, name) => {
  const Route = lazyWithRetry(factory, name);
  return render(
    <Suspense fallback={<p>loading</p>}>
      <Route />
    </Suspense>
  );
};

beforeEach(async () => {
  vi.resetModules();
  ({ lazyWithRetry } = await import('./lazyWithRetry'));
  replace.mockClear();
  sessionStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  stubLocation();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  sessionStorage.clear();
});

describe('lazyWithRetry', () => {
  it('renders the route normally when the chunk is there', async () => {
    mountLazy(() => Promise.resolve({ default: Ok }), 'AriaStudio');

    expect(await screen.findByText('route content')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('reloads once when the chunk is gone, and holds the fallback while it does', async () => {
    mountLazy(() => Promise.reject(mimeError()), 'AriaStudio');

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
    // The CURRENT url — the route the user just asked for, served by a fresh document.
    expect(replace).toHaveBeenCalledWith('https://applyright.com.ng/aria-studio');
    // Not an error screen for the frame before the document goes away.
    expect(screen.getByText('loading')).toBeTruthy();
  });

  it('does NOT reload a second time — it surfaces the failure instead', async () => {
    // The reload already happened; this document IS the new build, and the chunk still
    // will not load. That is a real failure — a bad deploy, or the user offline — not a
    // stale tab. Reloading again is a loop no user can escape, so the error has to reach
    // an error boundary, which is what shows a message and a manual retry.
    sessionStorage.setItem('applyright:chunk-reload', 'AriaStudio');

    const Route = lazyWithRetry(() => Promise.reject(mimeError()), 'AriaStudio');
    render(
      <Boundary>
        <Suspense fallback={<p>loading</p>}>
          <Route />
        </Suspense>
      </Boundary>
    );

    expect(await screen.findByText('caught')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    // Latch cleared, so a LATER deploy in this same tab still gets its one retry rather
    // than inheriting this failure forever.
    expect(sessionStorage.getItem('applyright:chunk-reload')).toBeNull();
  });

  it('clears the latch after a successful load, so the NEXT deploy gets its own retry', async () => {
    sessionStorage.setItem('applyright:chunk-reload', 'SomeOtherRoute');

    mountLazy(() => Promise.resolve({ default: Ok }), 'AriaStudio');
    await screen.findByText('route content');

    expect(sessionStorage.getItem('applyright:chunk-reload')).toBeNull();
  });

  it('survives sessionStorage being unavailable', async () => {
    // Private mode, or a browser set to block site data. The reload still has to happen —
    // a stale tab is broken either way, and the in-document latch stops a loop within
    // this page load.
    const boom = () => {
      throw new Error('blocked');
    };
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom);

    mountLazy(() => Promise.reject(mimeError()), 'AriaStudio');

    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });
});
