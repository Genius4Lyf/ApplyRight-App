// @vitest-environment jsdom
//
// Call settings on the client: the shared values, the controls, and the chip beside the call
// button. What matters most is that a change touches ONLY the field that was changed — a
// partial update that reset the other three to defaults would quietly undo someone's choices.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import i18n from '../../i18n';
import {
  DEFAULT_CALL_SETTINGS,
  normalizeCallSettings,
  readStoredCallSettings,
} from '../../lib/ariaCallSettings';
import AriaCallSettingsControls from './AriaCallSettingsControls';
import AriaCallSettingsButton from './AriaCallSettingsButton';

const t = (key, opts) => i18n.t(key, opts);
const base = 'ariaStudio.ariaLive.settings';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('call settings — the shared values', () => {
  it('only lets listed values through', () => {
    expect(normalizeCallSettings({ depth: 'quick', style: 'shouty', voice: 'alloy' })).toEqual({
      ...DEFAULT_CALL_SETTINGS,
      depth: 'quick',
    });
  });

  it('reads the saved choice from the stored user', () => {
    localStorage.setItem(
      'user',
      JSON.stringify({
        settings: { ariaCall: { depth: 'quick', style: 'direct', voice: 'cedar', pace: 'slower' } },
      })
    );
    expect(readStoredCallSettings()).toEqual({
      depth: 'quick',
      style: 'direct',
      voice: 'cedar',
      pace: 'slower',
    });
  });

  it('falls back to the defaults when nothing is stored, or it is unreadable', () => {
    expect(readStoredCallSettings()).toEqual(DEFAULT_CALL_SETTINGS);
    localStorage.setItem('user', '{not json');
    expect(readStoredCallSettings()).toEqual(DEFAULT_CALL_SETTINGS);
  });
});

describe('AriaCallSettingsControls', () => {
  let onChange;
  beforeEach(() => {
    onChange = vi.fn();
    render(<AriaCallSettingsControls value={DEFAULT_CALL_SETTINGS} onChange={onChange} />);
  });

  it('changes only the field that was picked', () => {
    fireEvent.click(screen.getByText(t(`${base}.style.coach.label`)));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CALL_SETTINGS, style: 'coach' });
  });

  it('marks the current choice', () => {
    expect(screen.getByText(t(`${base}.depth.thorough.label`)).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByText(t(`${base}.depth.quick.label`)).getAttribute('aria-pressed')).toBe(
      'false'
    );
  });

  it('explains what the current choice does', () => {
    expect(screen.getByText(t(`${base}.depth.thorough.hint`)).className).toContain('opacity-100');
    expect(screen.getByText(t(`${base}.style.friendly.hint`)).className).toContain('opacity-100');
  });

  it('keeps its height when the choice changes, by laying every hint in one cell', () => {
    // The panel is sized by its contents and is centred, so a hint that wraps to a different
    // number of lines than the one it replaced moved the whole card — on a phone, out from
    // under the finger that had just tapped. Every hint is rendered into one grid cell, so the
    // cell is always as tall as the longest; only the current one shows.
    const off = screen.getByText(t(`${base}.depth.quick.hint`));
    expect(off.className).toContain('opacity-0');
    expect(off.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides the others with OPACITY, never `visibility`', () => {
    // These controls also render inside the tips modal, whose mobile tabs hide the WHOLE
    // settings panel with `invisible`. `visibility` is inherited but re-enablable, so a hint
    // marked `visible` punched back out through that hidden ancestor and drew itself across
    // the tips text. Opacity composites down and cannot be undone from inside — which is what
    // a component that does not own its surroundings has to use.
    for (const key of ['depth.thorough', 'depth.quick', 'style.coach']) {
      expect(screen.getByText(t(`${base}.${key}.hint`)).className).not.toContain('visible');
    }
  });

  it('offers slower speech', () => {
    fireEvent.click(screen.getByText(t(`${base}.pace.slower`)));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CALL_SETTINGS, pace: 'slower' });
  });
});

describe('AriaCallSettingsButton', () => {
  const summary = (depth, style) =>
    `${t(`${base}.depth.${depth}.label`)} · ${t(`${base}.style.${style}.label`)}`;

  it('shows how the call will go without being opened', () => {
    render(
      <AriaCallSettingsButton value={{ depth: 'quick', style: 'direct' }} onChange={vi.fn()} />
    );
    expect(screen.getByText(summary('quick', 'direct'))).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the controls, and Escape closes them', async () => {
    render(<AriaCallSettingsButton value={DEFAULT_CALL_SETTINGS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText(summary('thorough', 'friendly')));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    // AWAITED, not immediate: the panel animates out, so it is still in the document for the
    // frames it takes to leave. The assertion is that it goes, not that it vanishes.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('passes changes up from inside the popover', () => {
    const onChange = vi.fn();
    render(<AriaCallSettingsButton value={DEFAULT_CALL_SETTINGS} onChange={onChange} />);
    fireEvent.click(screen.getByText(summary('thorough', 'friendly')));
    fireEvent.click(screen.getByText(t(`${base}.depth.quick.label`)));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CALL_SETTINGS, depth: 'quick' });
  });
});
