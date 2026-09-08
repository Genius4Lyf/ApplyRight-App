import { lazy } from 'react';

// THE STALE-CHUNK GUARD.
//
// Every route in App.jsx is a `lazy()` import, which Vite emits as its own content-hashed
// chunk — `AriaStudio-DSNxG22_.js`. A Netlify deploy swaps the whole file set atomically,
// so those names are gone the instant a build goes live.
//
// A tab that was already open is still running the OLD index.html, which knows only the
// OLD chunk names. The moment that user navigates to a route the tab has not loaded yet,
// it asks for a file that no longer exists — and the SPA catch-all in netlify.toml
// (`/* → /index.html 200`) answers with HTML:
//
//     GET /assets/AriaStudio-OLDHASH.js
//     → 200 OK, Content-Type: text/html      (measured against production)
//
// So the browser tries to `import()` a module and receives a document. The import rejects
// on the MIME type, <Suspense> has no error path, and the route simply never renders. The
// user sees a dead page until they reload — which is exactly the "I have to refresh after
// every deploy" report.
//
// This is NOT hypothetical and it is NOT old: before the bundle was split, one big file
// meant a stale tab ran old-but-working code. Splitting it is what made a stale tab break
// on its next navigation.
//
// The fix is a reload, because a reload is genuinely the only cure — the tab's whole idea
// of what files exist is out of date. What this adds is that it happens automatically, in
// the moment the failure occurs, instead of the user meeting a broken page and working it
// out for themselves.

const RELOAD_KEY = 'applyright:chunk-reload';

// A never-settling promise. Returned while the reload is in flight so React holds the
// Suspense fallback rather than flashing an error boundary for the frame or two before
// the document goes away.
const NEVER = new Promise(() => {});

const read = () => {
  try {
    return sessionStorage.getItem(RELOAD_KEY);
  } catch {
    // Private mode / blocked storage. Treated as "no reload attempted yet"; the worst
    // case is one extra reload, and the `reloading` latch below still stops a loop
    // inside this document.
    return null;
  }
};

const write = (value) => {
  try {
    if (value === null) sessionStorage.removeItem(RELOAD_KEY);
    else sessionStorage.setItem(RELOAD_KEY, value);
  } catch {
    /* see above */
  }
};

// Within a single document, several routes can fail to load at once (a page that renders
// two lazy children). One reload, not three.
let reloading = false;

/**
 * `lazy()`, but a failed chunk fetch reloads the page once instead of dying.
 *
 * @param {() => Promise<{ default: React.ComponentType }>} factory
 * @param {string} name — for the sessionStorage key and the console line, so a genuine
 *                        failure says WHICH chunk gave up rather than "something".
 */
export const lazyWithRetry = (factory, name) =>
  lazy(() =>
    factory().then(
      (mod) => {
        // A successful load means this document's chunk names are current. Clear the
        // latch so a future deploy, in this same tab, gets its own retry.
        if (read()) write(null);
        return mod;
      },
      (error) => {
        if (read() === name || reloading) {
          // Already reloaded for this chunk and it STILL will not load. That is a real
          // failure — a broken deploy, or the user offline — not a stale tab. Reloading
          // again would loop forever, so let it surface: ErrorBoundary shows the message
          // and offers a manual reload.
          console.error(`Chunk "${name}" failed after a reload; not retrying again`, error);
          write(null);
          throw error;
        }

        console.warn(`Chunk "${name}" is missing — reloading for a newer build`, error);
        reloading = true;
        write(name);
        // `replace`, not `reload`: reload can re-post and re-runs the exact same URL from
        // the bfcache in some browsers. Replacing with the current URL forces a fresh
        // document and leaves no extra history entry to trap the back button.
        window.location.replace(window.location.href);
        return NEVER;
      }
    )
  );

export default lazyWithRetry;
