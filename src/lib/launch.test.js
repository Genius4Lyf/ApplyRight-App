import { describe, it, expect } from 'vitest';
import { LAUNCH, hydrateLaunch, msUntil, countdownParts } from './launch';

// The countdown is the whole point of the pre-launch page, and the two ways it goes
// wrong in public are showing negative numbers after the moment passes and rendering
// NaN when no date is set. Both are pinned here.

describe('msUntil', () => {
  it('measures from the absolute instant, not a decremented counter', () => {
    const now = Date.parse('2026-09-02T12:00:00.000Z');
    expect(msUntil('2026-09-02T12:00:10.000Z', now)).toBe(10_000);
  });

  it('returns null when there is no date, so the page can drop the timer entirely', () => {
    expect(msUntil(null)).toBe(null);
    expect(msUntil(undefined)).toBe(null);
    expect(msUntil('')).toBe(null);
  });

  it('returns null for an unparseable date rather than NaN', () => {
    expect(msUntil('not a date')).toBe(null);
  });

  it('goes negative once the moment has passed', () => {
    const now = Date.parse('2026-09-08T00:00:00.000Z');
    expect(msUntil('2026-09-07T00:00:00.000Z', now)).toBeLessThan(0);
  });
});

describe('countdownParts', () => {
  it('splits a span into days/hours/minutes/seconds', () => {
    const ms = ((2 * 24 + 3) * 60 * 60 + 4 * 60 + 5) * 1000;
    expect(countdownParts(ms)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 });
  });

  it('CLAMPS at zero — a countdown must never render a negative number', () => {
    expect(countdownParts(-500_000)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });

  it('treats null/undefined as zero rather than NaN', () => {
    expect(countdownParts(null)).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    expect(countdownParts(undefined).days).toBe(0);
  });
});

describe('hydrateLaunch', () => {
  it('ignores junk so a failed config fetch just means "campaign off"', () => {
    hydrateLaunch(null);
    hydrateLaunch('nope');
    expect(LAUNCH.enabled).toBe(false);
    expect(LAUNCH.bonusCredits).toBe(50);
  });

  it('takes the server as the source of truth', () => {
    hydrateLaunch({ enabled: true, date: '2026-09-07T00:00:00.000Z', bonusCredits: 75 });
    expect(LAUNCH.enabled).toBe(true);
    expect(LAUNCH.date).toBe('2026-09-07T00:00:00.000Z');
    expect(LAUNCH.bonusCredits).toBe(75);
  });

  it('keeps the previous bonus when the server sends a non-number', () => {
    hydrateLaunch({ enabled: true, bonusCredits: 75 });
    hydrateLaunch({ enabled: true, bonusCredits: 'lots' });
    expect(LAUNCH.bonusCredits).toBe(75);
  });
});
