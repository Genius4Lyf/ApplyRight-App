// @vitest-environment jsdom
//
// The brief before a call. It exists because first calls go thin — short, careful answers
// that leave out exactly the small details that make a CV stand out — and Aria can only
// write what she hears. What is worth pinning is the contract with the caller: which choice
// came back, and that "don't show again" is the user's own tick, never a default.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import i18n from '../../i18n';
import AriaCallTipsModal from './AriaCallTipsModal';

afterEach(cleanup);

const t = (key) => i18n.t(key);

const mount = (props = {}) => {
  const onStart = vi.fn();
  const onCancel = vi.fn();
  render(<AriaCallTipsModal open onStart={onStart} onCancel={onCancel} {...props} />);
  return { onStart, onCancel };
};

describe('AriaCallTipsModal', () => {
  it('shows all four tips', () => {
    mount();
    for (const key of ['likeAFriend', 'smallThings', 'whatChanged', 'ariaWrapsUp']) {
      expect(screen.getByText(t(`ariaStudio.ariaLive.tips.${key}.title`))).toBeTruthy();
    }
  });

  it('tells people the call will not burn minutes on silence', () => {
    // The worry that stops people pressing the button at all.
    mount();
    expect(screen.getByText(t('ariaStudio.ariaLive.tips.ariaWrapsUp.body'))).toBeTruthy();
  });

  it('starts WITHOUT opting out unless the user ticks the box', () => {
    const { onStart } = mount();
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.tips.start')));
    expect(onStart).toHaveBeenCalledWith({ dontShowAgain: false });
  });

  it('passes the opt-out through when the user ticks it', () => {
    const { onStart } = mount();
    fireEvent.click(screen.getByLabelText(t('ariaStudio.ariaLive.tips.dontShowAgain')));
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.tips.start')));
    expect(onStart).toHaveBeenCalledWith({ dontShowAgain: true });
  });

  it('can be backed out of, by button or Escape, without starting anything', () => {
    const { onStart, onCancel } = mount();
    fireEvent.click(screen.getByText(t('ariaStudio.ariaLive.tips.notNow')));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('renders nothing when closed', () => {
    render(<AriaCallTipsModal open={false} onStart={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('AriaCallTipsModal — two places instead of one long scroll', () => {
  // From md up both panels sit side by side (pure CSS, not testable in jsdom). Below md they
  // are tabs, and what IS testable is that switching tabs hands visibility from one panel to
  // the other while both stay in the page.
  const withSettings = () =>
    render(
      <AriaCallTipsModal
        open
        onStart={vi.fn()}
        onCancel={vi.fn()}
        settings={{ depth: 'thorough', style: 'friendly', voice: 'marin', pace: 'normal' }}
        onSettingsChange={vi.fn()}
      />
    );
  const panel = (name) => document.querySelector(`[data-panel="${name}"]`);
  // Exact class tokens: a regex for "visible" would also match "md:visible" and "invisible".
  const has = (name, token) => panel(name).className.split(/\s+/).includes(token);

  it('opens on the tips, with the settings one tap away', () => {
    withSettings();
    expect(
      screen
        .getByRole('tab', { name: t('ariaStudio.ariaLive.tips.tabTips') })
        .getAttribute('aria-selected')
    ).toBe('true');
    expect(has('tips', 'visible')).toBe(true);
    expect(has('settings', 'invisible')).toBe(true);
  });

  it('switches to the settings, and back', () => {
    withSettings();
    fireEvent.click(screen.getByRole('tab', { name: t('ariaStudio.ariaLive.tips.tabSettings') }));
    expect(has('settings', 'visible')).toBe(true);
    expect(has('tips', 'invisible')).toBe(true);

    fireEvent.click(screen.getByRole('tab', { name: t('ariaStudio.ariaLive.tips.tabTips') }));
    expect(has('tips', 'visible')).toBe(true);
  });

  it('shows both panels from md up, whichever tab is active', () => {
    withSettings();
    expect(has('tips', 'md:visible')).toBe(true);
    expect(has('settings', 'md:visible')).toBe(true);
  });

  it('stacks both panels in one cell on phones, so switching tabs never resizes the dialog', () => {
    withSettings();
    for (const name of ['tips', 'settings']) {
      expect(has(name, 'col-start-1')).toBe(true);
      expect(has(name, 'row-start-1')).toBe(true);
    }
  });

  it('keeps Start reachable from either tab', () => {
    withSettings();
    fireEvent.click(screen.getByRole('tab', { name: t('ariaStudio.ariaLive.tips.tabSettings') }));
    expect(screen.getByText(t('ariaStudio.ariaLive.tips.start'))).toBeTruthy();
  });

  it('has no tabs when there are no settings to show', () => {
    mount();
    expect(screen.queryByRole('tablist')).toBeNull();
  });
});
