import { describe, it, expect } from 'vitest';
import { hasPaidAccess, isTemplateUnlocked } from './templateAccess';

// Two shipped bugs are pinned here. Both came from the same cause: this rule was written
// twice, in TemplateSelector and in ResumeReview, and the copies drifted.

const PRO = { id: 'applyright-navy', isPro: true };
const FREE = { id: 'ats-clean', isPro: false };
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();

describe('hasPaidAccess — agrees with the backend, deliberately', () => {
  it('honours a live subscription', () => {
    expect(hasPaidAccess({ subscription: { expiresAt: inDays(5) } })).toBe(true);
  });

  it('an expired subscription is NOT paid, even with a stale paid tier', () => {
    // THE BUG. `tier` is not cleared when a subscription lapses. The design page read it
    // after the expiry check failed, so an expired subscriber kept every premium template
    // — on the one page that downloads them.
    const lapsed = { subscription: { expiresAt: daysAgo(1) }, tier: 'plus' };
    expect(hasPaidAccess(lapsed)).toBe(false);
  });

  it('an expiry present is definitive — plan does not rescue it', () => {
    // Mirrors the backend exactly: `if (exp) return exp > now`, with no fallthrough.
    expect(hasPaidAccess({ subscription: { expiresAt: daysAgo(1) }, plan: 'paid' })).toBe(false);
  });

  it('falls back to the admin-granted plan flag when there is no subscription', () => {
    expect(hasPaidAccess({ plan: 'paid' })).toBe(true);
    expect(hasPaidAccess({ plan: 'free' })).toBe(false);
  });

  it('ignores tier on its own — the backend does not consult it', () => {
    expect(hasPaidAccess({ tier: 'pro' })).toBe(false);
  });

  it('answers for an empty or missing user', () => {
    expect(hasPaidAccess({})).toBe(false);
    expect(hasPaidAccess()).toBe(false);
  });
});

describe('isTemplateUnlocked', () => {
  it('free templates are always available', () => {
    expect(isTemplateUnlocked(FREE, {}, false)).toBe(true);
  });

  it('the launch promo unlocks every premium template for everyone', () => {
    // THE REPORTED BUG. Admin set every template free; the picker lifted its padlocks and
    // the design page did not — and the same check guards both download buttons there, so
    // a template that looked free still demanded 30 credits at the download.
    expect(isTemplateUnlocked(PRO, {}, true)).toBe(true);
  });

  it('without the promo, a free user stays locked out of a premium template', () => {
    expect(isTemplateUnlocked(PRO, {}, false)).toBe(false);
  });

  it('a paid user is unlocked without the promo', () => {
    expect(isTemplateUnlocked(PRO, { subscription: { expiresAt: inDays(3) } }, false)).toBe(true);
  });

  it('an individually unlocked template stays unlocked after the promo ends', () => {
    // Someone who paid 30 credits before the promo must not lose what they bought.
    expect(isTemplateUnlocked(PRO, { unlockedTemplates: ['applyright-navy'] }, false)).toBe(true);
  });

  it('an unlock for a DIFFERENT template does not unlock this one', () => {
    expect(isTemplateUnlocked(PRO, { unlockedTemplates: ['the-ascent'] }, false)).toBe(false);
  });

  it('treats an unknown id as unlocked', () => {
    // A legacy id renders as ATS Clean, which is free — so a padlock would guard nothing
    // and block a download of a free document.
    expect(isTemplateUnlocked(undefined, {}, false)).toBe(true);
  });

  it('survives a profile that has not loaded yet', () => {
    expect(isTemplateUnlocked(PRO, undefined, true)).toBe(true);
    expect(isTemplateUnlocked(PRO, undefined, false)).toBe(false);
  });
});
