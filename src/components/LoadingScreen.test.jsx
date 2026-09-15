// @vitest-environment jsdom
//
// The Aria mark on this screen was a flat 48px, sized for desktop and never revisited for
// a phone — every OTHER full-screen route loader in the app tops out at 40, so 48 was
// already the outlier here specifically. Reported as "too big" on mobile.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import LoadingScreen from './LoadingScreen';

// Minimal matchMedia stub, matching the (max-width: 639px) query LoadingScreen asks.
const stubViewport = (matchesMobile) => {
  vi.stubGlobal('matchMedia', (q) => ({
    matches: q.includes('max-width') ? matchesMobile : false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

// The mark is an inline style on a nested span (AriaOrbit scales itself via a computed
// transform, not a CSS class), so the width/height on the OUTER wrapper span is the one
// reliable place to read "what size did this render at".
const markSize = (container) => {
  const el = container.querySelector('.aria-loader-mark > span');
  return el?.style.width;
};

describe('LoadingScreen — the Aria mark scales down on a phone', () => {
  it('renders at 48px on a normal-width viewport', () => {
    stubViewport(false);
    const { container } = render(<LoadingScreen />);
    expect(markSize(container)).toBe('48px');
  });

  it('renders at 32px under the 640px breakpoint', () => {
    stubViewport(true);
    const { container } = render(<LoadingScreen />);
    expect(markSize(container)).toBe('32px');
  });

  it('matches the size every other full-screen route loader already uses on a phone', () => {
    // Not an arbitrary shrink — 32 is what CVBuilderLayout and Profile already pass their
    // own fullscreen AriaLoader, so a phone sees one consistent size across the app rather
    // than this screen alone looking different.
    stubViewport(true);
    const { container } = render(<LoadingScreen />);
    expect(markSize(container)).toBe('32px');
  });
});
