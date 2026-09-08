// "A newer build is live" — detection, and the rule for when it is safe to act on it.
//
// The stale-chunk guard (lib/lazyWithRetry) already stops a deployed-over tab from
// BREAKING. This is the other half: a tab that never navigates to a new route keeps
// running old code indefinitely, quietly, with no symptom to report. That is how a user
// sits on a bug you fixed last week.

// ─── HOW A BUILD IS IDENTIFIED ──────────────────────────────────────────────────
//
// By the entry chunk's filename, read straight out of index.html:
//
//     <script type="module" crossorigin src="/assets/index-Dxx3TwW5.js">
//
// No build-step version file, nothing to remember to bump — the deploy IS the version.
// It works because Vite content-hashes the entry and the hash propagates: a change to a
// single lazy route moves that route's chunk name, and the entry imports it by literal
// filename, so the entry's own hash moves with it.
//
// MEASURED, not assumed. Adding one statement to CVTips.jsx (a route that is nowhere near
// the entry) moved BOTH `CVTips-D2YlFVxU.js` → `CVTips-BpQFoncz.js` AND the entry
// `index-Dxx3TwW5.js` → `index-DnOtGW9L.js`; reverting restored both names exactly. A
// comment-only edit moves neither, which is correct — minification erases it, the output
// is byte-identical, and there is genuinely nothing to update.

const ENTRY_RE = /<script[^>]+type="module"[^>]+src="(\/assets\/[^"]+\.js)"/i;

/** The entry chunk THIS document booted from, or null in dev (where it is /src/main.jsx). */
export const currentEntry = () => {
  const src = document.querySelector('script[type="module"][src^="/assets/"]')?.getAttribute('src');
  return src || null;
};

/** The entry chunk the server is serving right now, or null if it cannot be read. */
export const fetchDeployedEntry = async () => {
  try {
    // `no-store` so this question is never answered from the cache it is asking about.
    const res = await fetch('/', { cache: 'no-store', credentials: 'same-origin' });
    if (!res.ok) return null;
    return ENTRY_RE.exec(await res.text())?.[1] || null;
  } catch {
    // Offline, or a captive portal. Not knowing is the same as no update.
    return null;
  }
};

/**
 * Is a different build live than the one running?
 *
 * Returns false rather than throwing on every uncertainty — an unreadable answer must
 * never turn into a reload.
 */
export const isUpdateAvailable = async () => {
  const mine = currentEntry();
  // Dev server: no hashed entry, nothing to compare, nothing to do.
  if (!mine) return false;
  const live = await fetchDeployedEntry();
  return Boolean(live) && live !== mine;
};

// ─── WHEN IT IS SAFE TO RELOAD ──────────────────────────────────────────────────
//
// Two sources, deliberately. Neither is sufficient alone.

// 1. EXPLICIT HOLDS, for work that a reload would destroy but that no form guards —
//    above all the live voice interview, where minutes are RESERVED server-side the
//    moment the session is minted. Reloading mid-call does not just lose the call; it
//    spends the user's paid minutes on nothing.
const holds = new Map();

/** Hold off any automatic reload while `reason` is active. Returns the release fn. */
export const holdAutoReload = (reason) => {
  holds.set(reason, (holds.get(reason) || 0) + 1);
  return () => {
    const n = (holds.get(reason) || 0) - 1;
    if (n > 0) holds.set(reason, n);
    else holds.delete(reason);
  };
};

/** Why an automatic reload is currently blocked. Empty means nothing objects. */
export const autoReloadBlockers = () => [...holds.keys()];

// 2. THE BEFOREUNLOAD PROBE, for unsaved work.
//
//    Rather than a second registry that every future form must remember to join — and
//    would eventually forget — this asks the question the app already answers. The CV
//    builder and the profile page both register `beforeunload` guards when they hold
//    unsaved typing. Dispatching a cancelable `beforeunload` runs those listeners; if any
//    of them cancels, the browser WOULD have warned before unloading, which is precisely
//    the condition under which we must not unload silently.
//
//    The event does not unload anything and cannot show the native dialog (browsers only
//    raise that for a real navigation), so this is a question, not an action. Any guard
//    added later is covered the day it is written, with no wiring.
const unsavedWorkExists = () => {
  try {
    const probe = new Event('beforeunload', { cancelable: true });
    // dispatchEvent returns false when a listener cancelled — via preventDefault() or the
    // legacy `returnValue` setter, both of which set the canceled flag. The two existing
    // guards use both, so either spelling is caught.
    return window.dispatchEvent(probe) === false;
  } catch {
    // If the probe itself fails we know nothing, so we assume the worst and stay put.
    return true;
  }
};

/**
 * Safe to reload without asking?
 *
 * Called at a route change — the moment the user has already decided to leave what is on
 * screen, so the bar for "nothing to lose" is at its lowest it will ever be.
 */
export const canAutoReload = () => holds.size === 0 && !unsavedWorkExists();
