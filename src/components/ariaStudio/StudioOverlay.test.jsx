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
import { render, cleanup, fireEvent } from '@testing-library/react';

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

const panel = () => document.querySelector('[role="dialog"] > div:last-child');
const classesOf = (el) => el.className.split(' ').filter(Boolean);

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

describe('StudioOverlay — the working panel is a side sheet, not a bottom one', () => {
  // It was a bottom sheet stopping 4.5rem short of the top. A bottom sheet reads as a
  // peek — pull it up, glance, let it fall — and the live preview is not a peek: it is
  // where a CV gets edited, for minutes at a time. These pin the two properties that
  // change makes a promise of, so a later tidy of the className cannot quietly take them
  // back.
  it('reaches both edges of a phone, full height', () => {
    historyStateIs(null);
    render(
      <StudioOverlay open onClose={() => {}} side="right" label="Preview">
        <p>preview</p>
      </StudioOverlay>
    );

    const cls = classesOf(panel());
    // Full width up to a cap. The cap is not a phone concern — no phone is 720px wide —
    // it stops a 900px tablet from having the chat wiped out entirely.
    expect(cls).toContain('w-full');
    expect(cls).toContain('max-w-[720px]');
    expect(cls).toContain('inset-y-0');
    expect(cls).toContain('right-0');
    // The old geometry, gone: no 4.5rem dead band above it, and no rounded top, which on
    // an edge-to-edge surface only shows the page through two small notches.
    expect(panel().className).not.toContain('4.5rem');
    expect(panel().className).not.toContain('rounded-t');
  });

  it('still leaves the rail a partial drawer', () => {
    // Deliberately NOT full width. Picking a session is a glance at a list, and seeing
    // the page you are leaving is part of knowing where you are.
    historyStateIs(null);
    mount(true);
    expect(classesOf(panel())).toContain('max-w-[320px]');
    expect(classesOf(panel())).not.toContain('w-full');
  });

  it('keeps the way out that full width removes', () => {
    // Edge to edge means there is no scrim left to tap, so Escape and the pushed history
    // entry stop being conveniences and become the exits. Escape is asserted here; the
    // history entry has its own tests above.
    historyStateIs(null);
    const onClose = vi.fn();
    render(
      <StudioOverlay open onClose={onClose} side="right" label="Preview">
        <p>preview</p>
      </StudioOverlay>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
