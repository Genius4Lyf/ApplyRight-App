// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { AriaStudioProvider, useAriaStudio } from './AriaStudioContext';

// The provider talks to the API on mount (it re-binds a remembered draft) and shows
// toasts on failure. Both are stubbed so this stays a pure initialisation test.
vi.mock('../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn().mockResolvedValue({ _id: 'd1', title: 'Draft', coachChats: {} }),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioBuildStart: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import CVService from '../services/cv.service';

/**
 * PROVIDER INITIALISATION SMOKE TEST.
 *
 * This exists because of a real shipped bug: `loadSession` named `flushChats` in its
 * useCallback DEPENDENCY ARRAY while `flushChats` was declared ~90 lines lower. Dep
 * arrays evaluate during render, so the `const` was in its temporal dead zone and threw
 * "Cannot access 'flushChats' before initialization" — blanking the whole page.
 *
 * The build passed. ESLint passed. All 179 tests passed. Nothing caught it, because
 * every existing test was node-only pure logic that never MOUNTED anything.
 *
 * Simply rendering the provider is therefore the highest-value assertion available: any
 * TDZ violation, bad hook order, or throw during init fails here immediately.
 */

const Probe = () => {
  const ctx = useAriaStudio();
  // Touch the session API surface — if any of these were undefined the provider is
  // wired wrong even though it rendered.
  return (
    <div data-testid="probe">
      {typeof ctx.loadSession}:{typeof ctx.newSession}:{typeof ctx.flushChats}
    </div>
  );
};

describe('AriaStudioProvider — initialisation', () => {
  let errorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // A React render error is reported through console.error before the throw
    // propagates, so failing on it catches problems an assertion might miss.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    errorSpy.mockRestore();
  });

  it('renders its children without throwing', () => {
    render(
      <AriaStudioProvider>
        <div data-testid="child">hello</div>
      </AriaStudioProvider>
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  it('mounts with NO console errors — catches TDZ and hook-order faults', () => {
    render(
      <AriaStudioProvider>
        <div>hello</div>
      </AriaStudioProvider>
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('exposes the full session API to consumers', () => {
    render(
      <AriaStudioProvider>
        <Probe />
      </AriaStudioProvider>
    );
    // All three defined — the exact trio the TDZ crash took down.
    expect(screen.getByTestId('probe').textContent).toBe('function:function:function');
  });

  it('does not fetch when there is no remembered session', () => {
    render(
      <AriaStudioProvider>
        <div>hello</div>
      </AriaStudioProvider>
    );
    expect(CVService.getDraftById).not.toHaveBeenCalled();
  });

  it('re-binds a remembered session on mount without throwing', async () => {
    localStorage.setItem('ariaStudio:draftId', 'd1');

    render(
      <AriaStudioProvider>
        <div data-testid="child">hello</div>
      </AriaStudioProvider>
    );

    await waitFor(() => expect(CVService.getDraftById).toHaveBeenCalledWith('d1'));
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('survives a failed re-bind (stale or deleted draft) and still renders', async () => {
    localStorage.setItem('ariaStudio:draftId', 'gone');
    CVService.getDraftById.mockRejectedValueOnce(new Error('404'));

    render(
      <AriaStudioProvider>
        <div data-testid="child">hello</div>
      </AriaStudioProvider>
    );

    await waitFor(() => expect(CVService.getDraftById).toHaveBeenCalled());
    expect(screen.getByTestId('child')).toBeTruthy();
    // The stale id is cleared so the next load starts fresh rather than retrying it.
    await waitFor(() => expect(localStorage.getItem('ariaStudio:draftId')).toBeNull());
  });

  it('creates exactly ONE draft when startBuild is called twice in the same tick', async () => {
    // The double-create bug. The old guard was `if (working) return; setWorking(true)` —
    // React state, applied asynchronously, so two calls in one tick both read it as
    // false and both created a draft. The fix is a synchronous ref-based promise guard,
    // the same one ensureDraft uses.
    let deferredResolve;
    CVService.studioBuildStart.mockReturnValue(
      new Promise((resolve) => {
        deferredResolve = resolve;
      })
    );

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      // Captured in an EFFECT, not during render — assigning to an outer binding while
      // rendering is a side effect React disallows (and react-hooks/globals catches).
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    // Fire both BEFORE the first resolves — the real double-click race.
    const a = held.current.startBuild({});
    const b = held.current.startBuild({});
    deferredResolve({ draft: { _id: 'b1', title: 'Untitled CV', coachChats: {} }, draftId: 'b1' });
    const [ra, rb] = await Promise.all([a, b]);

    expect(CVService.studioBuildStart).toHaveBeenCalledTimes(1);
    // Both callers get the SAME create rather than one silently losing.
    expect(ra?.draftId).toBe('b1');
    expect(rb?.draftId).toBe('b1');
  });

  it('allows a NEW build after the first one settles', async () => {
    // The guard must self-clear, or a second session could never be built.
    CVService.studioBuildStart.mockResolvedValue({
      draft: { _id: 'b1', coachChats: {} },
      draftId: 'b1',
    });

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      // Captured in an EFFECT, not during render — assigning to an outer binding while
      // rendering is a side effect React disallows (and react-hooks/globals catches).
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    await held.current.startBuild({});
    await held.current.startBuild({});

    expect(CVService.studioBuildStart).toHaveBeenCalledTimes(2);
  });

  it('renameCv sends a partial { _id, title } $set — never touching coachChats', async () => {
    // Rename must not clobber the transcript: the $set carries ONLY the title.
    localStorage.setItem('ariaStudio:draftId', 'd1'); // getDraftById → { _id:'d1', title:'Draft', coachChats:{} }

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    // Wait for the bind to land, so renameCv's closure sees the real draftId + title.
    await waitFor(() => expect(held.current?.draftId).toBe('d1'));
    CVService.saveDraft.mockClear();

    await held.current.renameCv('  My Real CV  '); // trims

    expect(CVService.saveDraft).toHaveBeenCalledTimes(1);
    const payload = CVService.saveDraft.mock.calls[0][0];
    expect(payload).toEqual({ _id: 'd1', title: 'My Real CV' });
    expect(payload).not.toHaveProperty('coachChats');
  });

  it('renameCv is a no-op on an empty or unchanged title', async () => {
    localStorage.setItem('ariaStudio:draftId', 'd1'); // bound title is 'Draft'

    const held = { current: null };
    const Grab = () => {
      const api = useAriaStudio();
      useEffect(() => {
        held.current = api;
      });
      return null;
    };
    render(
      <AriaStudioProvider>
        <Grab />
      </AriaStudioProvider>
    );

    await waitFor(() => expect(held.current?.draftId).toBe('d1'));
    CVService.saveDraft.mockClear();

    await held.current.renameCv('   '); // empty after trim
    await held.current.renameCv('Draft'); // unchanged

    expect(CVService.saveDraft).not.toHaveBeenCalled();
  });

  it('throws a clear error when the hook is used outside the provider', () => {
    const Orphan = () => {
      useAriaStudio();
      return null;
    };
    expect(() => render(<Orphan />)).toThrow(/must be used within an AriaStudioProvider/);
  });
});
