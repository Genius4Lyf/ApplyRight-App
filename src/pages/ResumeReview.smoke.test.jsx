// @vitest-environment jsdom
//
// PAGE INITIALISATION SMOKE TEST.
//
// This exists because the same class of bug has now shipped twice.
//
// The first was AriaStudioContext: `loadSession` named `flushChats` in a useCallback
// dependency array while `flushChats` was declared ~90 lines lower. The second was here:
// a `railProps` object referencing `isUnlocked`, a const arrow function declared 250
// lines further down. Both threw "Cannot access X before initialization" and blanked the
// page on first render.
//
// Both times the build passed, ESLint passed and the whole suite passed — because every
// test around them was either node-only logic or a test of an EXTRACTED component, and
// nothing ever mounted the thing that broke. `no-use-before-define` is enabled in this
// repo but scoped to the Aria Studio files (see eslint.config.js), so it did not cover
// this page.
//
// So this test asserts almost nothing, deliberately. Simply MOUNTING the page is the
// highest-value assertion available: any temporal-dead-zone violation, bad hook order, or
// throw during initialisation fails here immediately and by name.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Everything the page reaches for on mount ───────────────────────────────────
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    patch: vi.fn().mockResolvedValue({ data: {} }),
  },
}));
vi.mock('../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn().mockResolvedValue({ _id: 'd1', title: 'Draft', personalInfo: {} }),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    generatePdf: vi.fn(),
  },
}));
vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn(), success: vi.fn(), info: vi.fn() }),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => false, getPlatform: () => 'web' },
}));
vi.mock('../hooks/useInterstitial', () => ({ default: () => ({ maybeShow: vi.fn() }) }));
// The sidebar is its own overlay with its own tests; here it is noise.
vi.mock('../hooks/useWorkspaceSidebar', () => ({
  useWorkspaceSidebar: () => ({
    open: false,
    openSidebar: vi.fn(),
    closeSidebar: vi.fn(),
    sidebar: null,
  }),
}));

import ResumeReview from './ResumeReview';

const mount = () =>
  render(
    <MemoryRouter initialEntries={['/resume/d1']}>
      <ResumeReview />
    </MemoryRouter>
  );

describe('ResumeReview — it initialises', () => {
  let errorSpy;

  beforeEach(() => {
    localStorage.setItem('token', 't');
    // A React render error is reported through console.error before the throw
    // propagates, so watching it catches problems an assertion would miss.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // jsdom has neither, and the page observes its preview and measures the viewport.
    global.ResizeObserver ||= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    window.matchMedia ||= () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    });
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    errorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('mounts without throwing', () => {
    // THE ASSERTION. A temporal-dead-zone violation anywhere in the component body throws
    // here, with the offending name in the message.
    expect(() => mount()).not.toThrow();
  });

  it('renders something rather than a blank page', () => {
    const { container } = mount();
    expect(container.firstChild).not.toBeNull();
  });

  it('reports no React error while initialising', () => {
    mount();
    const shouted = errorSpy.mock.calls.map((c) => String(c[0])).join('\n');
    // Narrowed to initialisation failures on purpose: this page logs expected network
    // errors from its own mocked services, and failing on those would make the test
    // useless noise within a week.
    expect(shouted).not.toMatch(/before initialization|is not a function|Cannot read propert/i);
  });
});

describe('ResumeReview — the two things that moved', () => {
  it('has no CV name field in the page any more', () => {
    // It moved to the heading. If the label comes back, the panel has regrown a control
    // that is not a design control.
    mount();
    expect(screen.queryByText('CV name')).toBeNull();
  });

  it('offers no accent swatches', () => {
    mount();
    expect(screen.queryByText('Accent')).toBeNull();
  });
});
