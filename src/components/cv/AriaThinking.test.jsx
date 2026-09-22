// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import AriaThinking from './AriaThinking';

/**
 * A WAIT THAT REPORTS PROGRESS.
 *
 * 'chat' used to be one unchanging "Thinking…" for the whole turn, so three seconds and
 * thirteen looked identical — the only thing the indicator ever said was "still slow", and
 * a word that never changes reads, after a beat, as a spinner that has hung. Reported from
 * use: "we don't want it to be just thinking".
 *
 * The rules that matter, and are easy to lose in a later edit:
 *   it CLIMBS (each rung is a step the turn really takes),
 *   it HOLDS at the top (looping back to "Thinking…" would say the work restarted),
 *   and it starts on the exact word it always did.
 */

// framer-motion resolves the reduced-motion media query ONCE per module load and keeps it
// in module state, so re-stubbing window.matchMedia between tests changes nothing. The
// hook is mocked instead, which is the only way to exercise both branches in one file.
let reduced = false;
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useReducedMotion: () => reduced };
});

const stubMatchMedia = (value) => {
  reduced = value;
  vi.stubGlobal('matchMedia', (q) => ({
    matches: value,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
};

const shown = () => screen.getByText(/\S/).textContent;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  stubMatchMedia(false);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  cleanup();
});

const tick = (ms) => act(() => void vi.advanceTimersByTime(ms));

describe('AriaThinking — the chat ladder', () => {
  it('starts on the same word it always did', () => {
    render(<AriaThinking variant="chat" />);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.thinking'));
  });

  it('moves on instead of repeating itself', () => {
    render(<AriaThinking variant="chat" />);
    tick(1800);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.chat.1'));
    tick(1800);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.chat.2'));
  });

  // The rung anybody actually sits on during an unusually slow turn. It must not wrap back
  // to the beginning, which would read as the work having started over.
  it('holds at the last rung rather than looping', () => {
    render(<AriaThinking variant="chat" />);
    tick(60000);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.chat.4'));
  });

  it('stays on one word under reduced motion', () => {
    stubMatchMedia(true);
    render(<AriaThinking variant="chat" />);
    tick(20000);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.thinking'));
  });

  // A caller that names the step knows better than the ladder does — "Saving your
  // bullets…" must not be overwritten by a generic guess two seconds later.
  it('never overrides a caller-pinned label', () => {
    render(<AriaThinking variant="chat" label="Saving your bullets…" />);
    tick(20000);
    expect(shown()).toBe('Saving your bullets…');
  });

  // Untouched: the draft variant is decorative motion during a long generation, and it
  // deliberately DOES cycle.
  it('leaves the draft variant cycling', () => {
    render(<AriaThinking variant="draft" />);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.draft.0'));
    tick(1100 * 5);
    expect(shown()).toBe(i18n.t('cvBuilder.ariaThinking.draft.0'));
  });
});
