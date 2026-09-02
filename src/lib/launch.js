// Pre-launch campaign state, mirrored from the server.
//
// Same live-singleton pattern as CREDIT_COSTS / SIGNUP_CREDITS in lib/credits.js, and for
// the same reason: this is admin-editable (Admin → Launch), it arrives on the
// GET /auth/config response App.jsx already fetches once on mount, and hardcoding any of
// it in the client would go stale the moment the launch date moves.
//
// A live singleton rather than React state because the only consumer that needs it
// synchronously is Register.jsx's post-signup navigate — and a stale read there costs at
// worst one redirect, never access. MaintenanceGuard reads the authoritative copy from
// /system/status instead, so the actual gate never depends on this.
export const LAUNCH = {
  enabled: false,
  date: null,
  bonusCredits: 50,
};

/**
 * Merge the server's launch block into the live singleton. Called once on app load with
 * `launch` from GET /auth/config. Missing/invalid input leaves the defaults intact, so a
 * failed config fetch simply means the app behaves as if the campaign were off.
 */
export function hydrateLaunch(serverLaunch) {
  if (!serverLaunch || typeof serverLaunch !== 'object') return;
  LAUNCH.enabled = serverLaunch.enabled === true;
  LAUNCH.date = serverLaunch.date || null;
  if (typeof serverLaunch.bonusCredits === 'number' && !Number.isNaN(serverLaunch.bonusCredits)) {
    LAUNCH.bonusCredits = serverLaunch.bonusCredits;
  }
}

/**
 * Milliseconds until launch, or null when there is no usable date.
 *
 * Always recomputed from the absolute instant rather than decremented from a stored
 * counter — a decrementing timer drifts by minutes across background-tab throttling and
 * device sleep, which on a countdown page is the whole product.
 */
export function msUntil(dateish, now = Date.now()) {
  if (!dateish) return null;
  const target = new Date(dateish).getTime();
  if (Number.isNaN(target)) return null;
  return target - now;
}

/**
 * Split a positive millisecond span into calendar-ish parts for display.
 * Clamps at zero: a countdown must never render negative numbers.
 */
export function countdownParts(ms) {
  const safe = Math.max(0, ms || 0);
  const totalSeconds = Math.floor(safe / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
