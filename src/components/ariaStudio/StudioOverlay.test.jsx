// @vitest-environment jsdom
//
// THE HISTORY ENTRY, AND THE ONE GUARD THAT KEEPS IT HONEST.
//
// This overlay pushes a history entry when it opens so the Android back button dismisses
// the sheet instead of leaving the page underneath — the single most common way someone
// closes a drawer on a phone. Closing for any OTHER reason has to consume that entry
// again, or the back button becomes a no-op that silently eats one press.
//
// The guard on that consumption (`history.state?.studioOverlay`) is what stops it firing
// when something else has already navigated. It matters more than it looks: with the
// overlay open, a handler that closes the drawer, AWAITS something, and only then
// navigates gets its navigation undone —
//
//   close      → cleanup runs during the await, state IS still studioOverlay
//              → history.back() is queued
//   navigate   → pushes the new route
//   back lands → pops it, and the user is back where they started
//
// Which is exactly what "Build with CV Builder" in Aria Studio's rail did: the menu
// closed, and nothing happened. The fix was ordering (navigate before the close, so the
// guard sees the router's own state), and these tests pin the guard the fix relies on.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

import StudioOverlay from './StudioOverlay';

const back = vi.fn();

beforeEach(() => {
  back.mockClear();
  vi.spyOn(window.history, 'back').mockImplementation(back);
  vi.spyOn(window.history, 'pushState').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// jsdom's history.state is read-only, so the state the cleanup reads is stubbed directly.
const historyStateIs = (state) => vi.spyOn(window.history, 'state', 'get').mockReturnValue(state);

const mount = (open) =>
  render(
    <StudioOverlay open={open} onClose={() => {}} side="left" label="Sessions">
      <p>rail</p>
    </StudioOverlay>
  );

describe('StudioOverlay — the pushed history entry', () => {
  it('consumes its own entry when it closes on its own terms', () => {
    // The normal case: the sheet is dismissed and the page has not moved, so the entry it
    // pushed has to come back off. Otherwise the next back press is swallowed by a
    // history entry for a drawer that is no longer on screen.
    historyStateIs({ studioOverlay: true });

    const { rerender } = mount(true);
    rerender(
      <StudioOverlay open={false} onClose={() => {}} side="left" label="Sessions">
        <p>rail</p>
      </StudioOverlay>
    );

    expect(back).toHaveBeenCalledTimes(1);
  });

  it('does NOT send the user back when something else has already navigated', () => {
    // THE REGRESSION. Once React Router has pushed a route, the top of the stack is its
    // entry, not ours — `studioOverlay` is gone from the state. Popping here would undo
    // a navigation the user explicitly asked for, and it would look like the button did
    // nothing at all.
    historyStateIs({ studioOverlay: true });
    const { rerender } = mount(true);

    // ...a navigation happens while the overlay is still mounted.
    historyStateIs({ usr: undefined, key: 'abc123', idx: 4 });

    rerender(
      <StudioOverlay open={false} onClose={() => {}} side="left" label="Sessions">
        <p>rail</p>
      </StudioOverlay>
    );

    expect(back).not.toHaveBeenCalled();
  });

  it('does not touch history when it unmounts having never opened', () => {
    historyStateIs(null);

    const { unmount } = mount(false);
    unmount();

    expect(back).not.toHaveBeenCalled();
  });
});
