// @vitest-environment jsdom
//
// Call settings on the client: the shared values, the controls, and the chip beside the call
// button. What matters most is that a change touches ONLY the field that was changed — a
// partial update that reset the other three to defaults would quietly undo someone's choices.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

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
    expect(screen.getByText(t(`${base}.depth.thorough.hint`))).toBeTruthy();
    expect(screen.getByText(t(`${base}.style.friendly.hint`))).toBeTruthy();
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

  it('opens the controls, and Escape closes them', () => {
    render(<AriaCallSettingsButton value={DEFAULT_CALL_SETTINGS} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText(summary('thorough', 'friendly')));
    expect(screen.getByRole('dialog')).toBeTruthy();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('passes changes up from inside the popover', () => {
    const onChange = vi.fn();
    render(<AriaCallSettingsButton value={DEFAULT_CALL_SETTINGS} onChange={onChange} />);
    fireEvent.click(screen.getByText(summary('thorough', 'friendly')));
    fireEvent.click(screen.getByText(t(`${base}.depth.quick.label`)));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_CALL_SETTINGS, depth: 'quick' });
  });
});
