// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStudioLayout, studioMainAttrs } from './useStudioLayout';

// Desktop-wide viewport: NOT mobile (max-width query misses) and the panel CAN be inline
// (min-width query hits). matchMedia isn't implemented in jsdom, so stub it as the store
// the hook subscribes to.
const wideMatchMedia = (q) => ({
  matches: q.includes('min-width'),
  media: q,
  addEventListener: () => {},
  removeEventListener: () => {},
  addListener: () => {},
  removeListener: () => {},
});

describe('studioMainAttrs — the CSS width-negotiation contract', () => {
  it('preview + rail closed → preview major', () => {
    expect(studioMainAttrs({ panelView: 'preview', panelInline: true, railInline: false })).toEqual(
      { 'data-panel': 'preview', 'data-rail': 'closed' }
    );
  });

  it('preview + rail open → equal split', () => {
    expect(studioMainAttrs({ panelView: 'preview', panelInline: true, railInline: true })).toEqual({
      'data-panel': 'preview',
      'data-rail': 'open',
    });
  });

  it('insights → narrow (its own fixed width), rail state passed through', () => {
    expect(studioMainAttrs({ panelView: 'insights', panelInline: true, railInline: true })).toEqual(
      { 'data-panel': 'insights', 'data-rail': 'open' }
    );
  });

  it('a non-inline panel reads as none (chat owns the room)', () => {
    expect(studioMainAttrs({ panelView: 'preview', panelInline: false, railInline: true })).toEqual(
      { 'data-panel': 'none', 'data-rail': 'open' }
    );
  });
});

describe('useStudioLayout — adaptive width states', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('matchMedia', wideMatchMedia);
  });

  it('defaults to the narrow insights panel, rail open (≈ today)', () => {
    const { result } = renderHook(() => useStudioLayout());
    expect(result.current.panelView).toBe('insights');
    expect(result.current.panelInline).toBe(true);
    expect(result.current.railInline).toBe(true);
  });

  it('opening the wide preview auto-collapses the sessions rail', () => {
    const { result } = renderHook(() => useStudioLayout());
    act(() => result.current.setPanelView('preview'));
    expect(result.current.panelView).toBe('preview');
    expect(result.current.railOpen).toBe(false); // auto-collapsed
    expect(result.current.railInline).toBe(false);
  });

  it('re-opening the rail while previewing keeps preview → equal split', () => {
    const { result } = renderHook(() => useStudioLayout());
    act(() => result.current.setPanelView('preview'));
    act(() => result.current.setRailOpen(true)); // the pressure valve
    expect(result.current.panelView).toBe('preview');
    expect(result.current.railInline).toBe(true);
    // → the equal-split data-attrs.
    expect(
      studioMainAttrs({
        panelView: result.current.panelView,
        panelInline: result.current.panelInline,
        railInline: result.current.railInline,
      })
    ).toEqual({ 'data-panel': 'preview', 'data-rail': 'open' });
  });

  it('closing the panel gives the room back to the chat', () => {
    const { result } = renderHook(() => useStudioLayout());
    act(() => result.current.setPanelView(null));
    expect(result.current.panelInline).toBe(false);
    expect(
      studioMainAttrs({
        panelView: result.current.panelView,
        panelInline: result.current.panelInline,
        railInline: result.current.railInline,
      })['data-panel']
    ).toBe('none');
  });

  it('switching to insights does NOT touch the rail', () => {
    const { result } = renderHook(() => useStudioLayout());
    act(() => result.current.setRailOpen(true));
    act(() => result.current.setPanelView('insights'));
    expect(result.current.railOpen).toBe(true); // only preview collapses it
  });

  it('closePreview returns to the DEFAULT view — insights + the rail restored', () => {
    const { result } = renderHook(() => useStudioLayout());
    // Rail open, then open preview (auto-collapses it).
    act(() => result.current.setRailOpen(true));
    act(() => result.current.setPanelView('preview'));
    expect(result.current.railOpen).toBe(false);

    // Closing the preview lands back on insights with the rail restored to its prior state.
    act(() => result.current.closePreview());
    expect(result.current.panelView).toBe('insights');
    expect(result.current.railOpen).toBe(true); // restored, not left collapsed
  });

  it('closePreview restores a rail that was ALREADY collapsed before preview', () => {
    const { result } = renderHook(() => useStudioLayout());
    act(() => result.current.setRailOpen(false)); // user had it collapsed
    act(() => result.current.setPanelView('preview'));
    act(() => result.current.closePreview());
    expect(result.current.panelView).toBe('insights');
    expect(result.current.railOpen).toBe(false); // put back where it was, not force-opened
  });
});
