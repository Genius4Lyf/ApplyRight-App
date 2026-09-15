// @vitest-environment jsdom
//
// The big centred "Aria is working" marks were sized on a desktop and never revisited for
// a phone: 44-56px, on a 360px-wide screen, in the middle of an otherwise empty panel.
// Reported twice — the first pass only caught CV Studio's LoadingScreen and missed the one
// people actually meet, the Studio's opening overlay.
//
// AriaOrbit computes its scale as an INLINE transform, so no media query can reach it.
// That is why this has to be decided in JS, and why it is worth pinning.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import useOrbitSize, { ORBIT_MOBILE_MAX } from './useOrbitSize';

const viewport = (isNarrow) =>
  vi.stubGlobal('matchMedia', (q) => ({
    matches: q.includes('max-width') ? isNarrow : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));

afterEach(() => vi.unstubAllGlobals());

describe('on a phone', () => {
  it('caps the Studio opening overlay, the biggest of them', () => {
    viewport(true);
    expect(renderHook(() => useOrbitSize(56)).result.current).toBe(32);
  });

  it('caps every other centred loading mark to the same figure', () => {
    viewport(true);
    // 52 (job capture), 48 (picking up a session), 44 (panels, rails, sidebar).
    for (const size of [52, 48, 44]) {
      expect(renderHook(() => useOrbitSize(size)).result.current).toBe(ORBIT_MOBILE_MAX);
    }
  });

  it('leaves a mark that is ALREADY smaller alone rather than growing it', () => {
    // It is a cap, not a set. An inline 16px orbit must never be inflated to 32.
    viewport(true);
    expect(renderHook(() => useOrbitSize(20)).result.current).toBe(20);
    expect(renderHook(() => useOrbitSize(16)).result.current).toBe(16);
  });
});

describe('on anything wider', () => {
  it('changes nothing at all', () => {
    viewport(false);
    for (const size of [56, 52, 48, 44, 20]) {
      expect(renderHook(() => useOrbitSize(size)).result.current).toBe(size);
    }
  });
});

describe('when the browser cannot answer', () => {
  it('assumes the wide layout rather than shrinking everything', () => {
    // jsdom has no matchMedia and useMedia's own guard reports "not matching". A test
    // suite that never stubbed a viewport must not start seeing phone sizes.
    vi.unstubAllGlobals();
    delete window.matchMedia;
    expect(renderHook(() => useOrbitSize(56)).result.current).toBe(56);
  });
});
