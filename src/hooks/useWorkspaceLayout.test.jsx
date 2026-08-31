// @vitest-environment jsdom
//
// The hook answers exactly one question — is there room for the panel to be part of the
// page? — and answers it from the viewport alone. There is no preference to store and
// nothing to remember, which is the property worth pinning: a stored key here would be a
// choice nobody made, written down the first time someone narrowed a window.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';

import { useWorkspaceLayout, WORKSPACE_PANEL_MIN } from './useWorkspaceLayout';

// matchMedia is not implemented in jsdom. Stub it as the store it actually is, so a
// "resize" is a change event rather than a rerender with a different prop.
const listeners = new Set();
let wide = true;

const stubMatchMedia = () =>
  vi.stubGlobal('matchMedia', (media) => ({
    media,
    matches: wide,
    addEventListener: (_, cb) => listeners.add(cb),
    removeEventListener: (_, cb) => listeners.delete(cb),
  }));

const resizeTo = (isWide) =>
  act(() => {
    wide = isWide;
    listeners.forEach((cb) => cb());
  });

const Host = ({ enabled = true }) => {
  const { railInline } = useWorkspaceLayout({ enabled });
  return <span data-testid="state">{`railInline:${railInline}`}</span>;
};

const state = () => screen.getByTestId('state').textContent;

beforeEach(() => {
  listeners.clear();
  wide = true;
  localStorage.clear();
  stubMatchMedia();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useWorkspaceLayout — is there room for a column?', () => {
  it('gives an opted-in surface its panel wherever there is room', () => {
    render(<Host />);
    expect(state()).toContain('railInline:true');
  });

  it('follows the viewport, in both directions', () => {
    // Narrow and the panel gives way to a drawer; widen and it comes straight back. There
    // is no memory in between to get in the way of either.
    render(<Host />);
    resizeTo(false);
    expect(state()).toContain('railInline:false');

    resizeTo(true);
    expect(state()).toContain('railInline:true');
  });

  it('stores nothing, ever', () => {
    // The panel cannot be collapsed, so there is no preference — and a key written here
    // would silently change behaviour the day someone reintroduced one.
    render(<Host />);
    resizeTo(false);
    resizeTo(true);
    expect(localStorage.length).toBe(0);
  });

  it('leaves a surface that did not opt in without an inline home', () => {
    // The drawer-only surfaces share this code path and must come out the far side
    // unchanged, at any width.
    render(<Host enabled={false} />);
    expect(state()).toContain('railInline:false');
  });

  it('asks about the panel threshold, not a phone breakpoint', () => {
    const seen = [];
    vi.stubGlobal('matchMedia', (media) => {
      seen.push(media);
      return { media, matches: true, addEventListener: () => {}, removeEventListener: () => {} };
    });
    render(<Host />);
    expect(seen[0]).toBe(`(min-width: ${WORKSPACE_PANEL_MIN}px)`);
  });
});
