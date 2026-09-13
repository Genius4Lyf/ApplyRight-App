// @vitest-environment jsdom
//
// WHAT A RELOAD DOES WITH THE LAST SESSION.
//
// The Studio used to re-bind the remembered draft on every mount, which dropped you back
// into the middle of a conversation you may have reloaded to get OUT of. Now a reload
// offers it instead: the Studio comes up at home and asks.
//
// TWO DISTINCTIONS CARRY THE WHOLE FEATURE, and most of these tests are about one of them.
//
//  1. RELOAD vs any other arrival. Launching the app, following a link or restoring a tab
//     means you came back to work — being made to confirm your own CV first would be
//     friction for nothing. Only a reload is the deliberate "get me out of this".
//  2. PAGE LOAD vs IN-APP NAVIGATION. The provider is mounted BY THE ROUTE, so it unmounts
//     and remounts every time you visit your profile and come back. Asking on each of
//     those would be worse than the silent resume it replaces. That lives in a
//     module-level latch — exactly what a page load resets and a remount does not.
//
// So a reload is simulated the only honest way: `vi.resetModules()` plus a fresh dynamic
// import re-evaluates the module the way a new document would, and the navigation type is
// stubbed because jsdom reports none.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, act } from '@testing-library/react';

vi.mock('../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioBuildStart: vi.fn(),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

import CVService from '../services/cv.service';

// jsdom reports no navigation entry at all, which the provider reads as "not a reload" —
// so every other test in this repo keeps the silent resume it already had, and a test that
// wants the OFFER has to say it is a reload. That asymmetry is the feature: asking is
// opt-in on a signal the browser gives, and resuming is the default.
const navType = { current: 'navigate' };
performance.getEntriesByType = (kind) => (kind === 'navigation' ? [{ type: navType.current }] : []);

const DRAFT = { _id: 'd1', title: 'Product Analyst CV', coachChats: {} };

// Mount a provider from a given module instance and hand back a live handle on its value.
const mountFresh = (mod) => {
  const held = { current: null };
  const Probe = () => {
    held.current = mod.useAriaStudio();
    return null;
  };
  render(
    <mod.AriaStudioProvider>
      <Probe />
    </mod.AriaStudioProvider>
  );
  return { mod, held };
};

// One page load. A fresh module evaluation is what resets the latch, so every call to
// this is a new document as far as the provider is concerned.
const pageLoad = async ({ reload = true } = {}) => {
  navType.current = reload ? 'reload' : 'navigate';
  vi.resetModules();
  return mountFresh(await import('./AriaStudioContext'));
};

// A second visit to /aria-studio WITHIN that page load: the route unmounts the provider
// and mounts a new one, but the module — and its latch — stay put.
const revisit = (mod) => {
  cleanup();
  return mountFresh(mod).held;
};

const remember = (id = 'd1', title = 'Product Analyst CV', owner = 'u1') => {
  localStorage.setItem('ariaStudio:draftId', id);
  localStorage.setItem('ariaStudio:draftTitle', title);
  localStorage.setItem('ariaStudio:draftOwnerId', owner);
  localStorage.setItem('user', JSON.stringify({ _id: owner }));
};

beforeEach(() => {
  localStorage.clear();
  CVService.getDraftById.mockReset().mockResolvedValue(DRAFT);
});
afterEach(cleanup);

describe('a page load offers the last session instead of opening it', () => {
  it('does NOT fetch or bind the remembered draft', async () => {
    remember();
    const { held } = await pageLoad();
    await waitFor(() => expect(held.current.resumable).toBeTruthy());
    // The decisive assertion: nothing was opened.
    expect(CVService.getDraftById).not.toHaveBeenCalled();
    expect(held.current.draftId).toBeNull();
  });

  it('offers it by name, so the question can say WHICH CV', async () => {
    remember('d1', 'Product Analyst CV');
    const { held } = await pageLoad();
    await waitFor(() => expect(held.current.resumable).toBeTruthy());
    expect(held.current.resumable).toMatchObject({ id: 'd1', title: 'Product Analyst CV' });
  });

  it('keeps the remembered id INTACT while it is only being offered', async () => {
    // The offer path must never touch cvData: setCvData(null) clears the key, which would
    // throw away the very thing being offered.
    remember();
    await pageLoad();
    await waitFor(() => expect(localStorage.getItem('ariaStudio:draftId')).toBe('d1'));
  });

  it('never reports loading for a fetch it is not going to make', async () => {
    // A spinner here would be a loading state for nothing, in front of the Studio home.
    remember();
    const { held } = await pageLoad();
    expect(held.current.loading).toBe(false);
  });

  it('offers nothing when there was no session to remember', async () => {
    const { held } = await pageLoad();
    await waitFor(() => expect(held.current.loading).toBe(false));
    expect(held.current.resumable).toBeNull();
    expect(CVService.getDraftById).not.toHaveBeenCalled();
  });

  it('offers nothing to a DIFFERENT signed-in user, and forgets the session', async () => {
    // These keys outlive a sign-out. Offering the previous account's CV would be worse
    // than the silent bind this replaces, not better.
    remember('d1', 'Their CV', 'someone-else');
    localStorage.setItem('user', JSON.stringify({ _id: 'me' }));
    const { held } = await pageLoad();
    await waitFor(() => expect(localStorage.getItem('ariaStudio:draftId')).toBeNull());
    expect(held.current.resumable).toBeNull();
    expect(CVService.getDraftById).not.toHaveBeenCalled();
  });
});

describe('answering the question', () => {
  it('continuing opens the draft', async () => {
    remember();
    const { held } = await pageLoad();
    await waitFor(() => expect(held.current.resumable).toBeTruthy());
    await act(async () => {
      await held.current.resumeSession();
    });
    expect(CVService.getDraftById).toHaveBeenCalledWith('d1');
    await waitFor(() => expect(held.current.draftId).toBe('d1'));
    expect(held.current.resumable).toBeNull();
  });

  it('starting fresh forgets the BINDING and nothing else', async () => {
    // Declining is not a delete. No request is made, and the draft is untouched on the
    // server — this only stops the Studio pointing at it.
    remember();
    const { held } = await pageLoad();
    await waitFor(() => expect(held.current.resumable).toBeTruthy());
    act(() => held.current.dismissResumable());
    await waitFor(() => expect(held.current.resumable).toBeNull());
    expect(localStorage.getItem('ariaStudio:draftId')).toBeNull();
    expect(CVService.saveDraft).not.toHaveBeenCalled();
    expect(held.current.draftId).toBeNull();
  });

  it('does not ask again after being declined', async () => {
    remember();
    const { mod, held } = await pageLoad();
    await waitFor(() => expect(held.current.resumable).toBeTruthy());
    act(() => held.current.dismissResumable());
    const again = revisit(mod);
    await waitFor(() => expect(again.current.loading).toBe(false));
    expect(again.current.resumable).toBeNull();
  });
});

describe('only a RELOAD asks', () => {
  it('opening the app fresh still resumes silently', async () => {
    // Someone who launches the app, follows a link, or restores a tab came back TO WORK.
    // Making them confirm their own CV before they can see it would be friction for
    // nothing — the question is only worth asking when they chose to reload.
    remember();
    const { held } = await pageLoad({ reload: false });
    await waitFor(() => expect(CVService.getDraftById).toHaveBeenCalledWith('d1'));
    expect(held.current.resumable).toBeNull();
    await waitFor(() => expect(held.current.draftId).toBe('d1'));
  });

  it('treats an unknown navigation type as not-a-reload', async () => {
    // Older WebViews report nothing. Falling back to the long-standing silent resume is
    // the safe direction: it can never leave someone unable to reach their work.
    remember();
    navType.current = '';
    vi.resetModules();
    const { held } = mountFresh(await import('./AriaStudioContext'));
    await waitFor(() => expect(CVService.getDraftById).toHaveBeenCalledWith('d1'));
    expect(held.current.resumable).toBeNull();
  });
});

describe('an in-app navigation is not a page load', () => {
  it('re-binds silently when you come back to the Studio', async () => {
    // Leaving for /profile unmounts the provider. Being asked "continue where you left
    // off?" on the way back would be far more annoying than what this replaces.
    remember();
    const { mod, held } = await pageLoad();
    await waitFor(() => expect(held.current.resumable).toBeTruthy());
    await act(async () => {
      await held.current.resumeSession();
    });
    await waitFor(() => expect(held.current.draftId).toBe('d1'));

    CVService.getDraftById.mockClear();
    const again = revisit(mod);
    await waitFor(() => expect(again.current.draftId).toBe('d1'));
    // Bound again without asking.
    expect(CVService.getDraftById).toHaveBeenCalledWith('d1');
    expect(again.current.resumable).toBeNull();
  });

  it('asks once more after an actual reload', async () => {
    remember();
    const first = await pageLoad();
    await waitFor(() => expect(first.held.current.resumable).toBeTruthy());
    await act(async () => {
      await first.held.current.resumeSession();
    });
    await waitFor(() => expect(first.held.current.draftId).toBe('d1'));

    cleanup();
    CVService.getDraftById.mockClear();
    const second = await pageLoad(); // a new document
    await waitFor(() => expect(second.held.current.resumable).toBeTruthy());
    expect(CVService.getDraftById).not.toHaveBeenCalled();
  });
});
