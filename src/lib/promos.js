import { useSyncExternalStore } from 'react';

// The launch promo on premium templates, mirrored from the server.
//
// Same source as CREDIT_COSTS / SIGNUP_CREDITS / LAUNCH — one GET /auth/config on mount —
// but NOT the same read mechanism. Those are plain mutable objects, and mutating one
// triggers no re-render: a component that read it before the fetch landed keeps the stale
// value until something else happens to re-render it. That already cost a real bug (the
// countdown that never appeared on /pre-launch), and it would cost another here, where
// the whole point is a padlock lifting.
//
// So this one is a store with subscribers, read through useSyncExternalStore. Anything
// that asks whether the promo is on re-renders the moment the answer arrives.

let freeUntil = null;
const listeners = new Set();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/**
 * Merge the server's template block. Called once on app load with `templates` from
 * GET /auth/config. Anything unusable leaves the promo off — the safe direction, since
 * "off" only means the padlocks stay as they were.
 */
export function hydratePromos(serverTemplates) {
  const next = serverTemplates?.freeUntil ?? null;
  if (next === freeUntil) return;
  freeUntil = next;
  emit();
}

/**
 * Whether every premium template is free right now.
 *
 * The server sends the DATE, not a verdict, and this compares it to the local clock —
 * so a session left open across the promo's end stops being free without needing a
 * refetch. The server re-checks anyway on the unlock endpoint, so a skewed client clock
 * can only ever mislead the UI, never actually give a template away.
 */
export function templatesAreFree(now = Date.now()) {
  if (!freeUntil) return false;
  const at = new Date(freeUntil).getTime();
  return Number.isFinite(at) && at > now;
}

/** The promo's end, or null. For copy that wants to say when it stops. */
export function promoEndsAt() {
  return freeUntil;
}

const snapshot = () => freeUntil;

/**
 * Hook form. Returns { active, endsAt } and re-renders when hydration lands or the value
 * changes. Prefer this in components over calling templatesAreFree() directly.
 */
export function useTemplatePromo() {
  const value = useSyncExternalStore(subscribe, snapshot, snapshot);
  return { active: templatesAreFree(), endsAt: value };
}

// Test seam. Production only ever sets this through hydratePromos.
export function __resetPromos() {
  freeUntil = null;
  emit();
}
