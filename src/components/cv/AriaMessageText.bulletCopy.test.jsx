// @vitest-environment jsdom
//
// COPYING ONE BULLET.
//
// When Aria interviews someone about a role or a project, her replies are lists of
// example answers meant to be reused. Copying the whole message gave you all of them at
// once; lifting one meant dragging a selection across a single line, which on a phone is
// a fight with the text-selection handles.
//
// The control is deliberately NOT everywhere: these tests hold the gate as tightly as the
// feature, because a copy button on every bullet in every reply would turn a conversation
// into a control panel.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, act, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));

import AriaMessageText from './AriaMessageText';

const BULLETS = [
  'I cut report turnaround from 5 days to 2.',
  'I trained ___ new analysts on the new process.',
  'I found the **duplicate entries** costing us a day a week.',
].join('\n- ');
const REPLY = `Here are a few ways to put it:\n\n- ${BULLETS}`;

const writeText = vi.fn().mockResolvedValue(undefined);
const copyButtons = () => screen.queryAllByRole('button', { name: /common\.copy/i });

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(cleanup);

describe('when a role or project is being interviewed', () => {
  const mount = () => render(<AriaMessageText text={REPLY} typed bulletCopy />);

  it('gives every bullet its own control', () => {
    mount();
    expect(copyButtons()).toHaveLength(3);
  });

  it('puts the control at the FRONT of its bullet', () => {
    // So all three start at the same x-position and the eye can run down them.
    const { container } = mount();
    const first = container.querySelector('li');
    expect(first.firstElementChild?.tagName).toBe('BUTTON');
  });

  it('copies that bullet and no other', () => {
    mount();
    fireEvent.click(copyButtons()[1]);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toContain('trained');
    expect(writeText.mock.calls[0][0]).not.toContain('turnaround');
  });

  it('keeps the ___ answer blank intact', () => {
    // The starters are written with a literal blank for the user to fill in. A markdown
    // pass that ate it would hand over a sentence with a word silently missing.
    mount();
    fireEvent.click(copyButtons()[1]);
    expect(writeText.mock.calls[0][0]).toContain('___');
  });

  it('copies the words, not the markup', () => {
    mount();
    fireEvent.click(copyButtons()[2]);
    const copied = writeText.mock.calls[0][0];
    expect(copied).toContain('duplicate entries');
    expect(copied).not.toContain('**');
  });

  it('leaves the bullet text itself untouched on screen', () => {
    // The control is added beside the words, never in place of them.
    const { container } = mount();
    expect(container.textContent).toContain('cut report turnaround from 5 days to 2.');
  });
});

describe('when it should stay out of the way', () => {
  it('offers nothing by default — the flag is opt-in', () => {
    // Every other Aria surface (general chat, the coach panel, ATS answers) renders lists
    // that are prose, not answers to reuse.
    render(<AriaMessageText text={REPLY} typed />);
    expect(copyButtons()).toHaveLength(0);
  });

  it('waits until the reply has finished typing', () => {
    // Mid-reveal a bullet is a FRAGMENT. A control beside it would hand over half a
    // sentence, and the buttons would pop in one by one as the list grew.
    vi.useFakeTimers();
    render(<AriaMessageText text={REPLY} bulletCopy />);
    act(() => vi.advanceTimersByTime(100));
    expect(copyButtons()).toHaveLength(0);
    act(() => vi.advanceTimersByTime(5000));
    vi.useRealTimers();
    expect(copyButtons()).toHaveLength(3);
  });

  it('adds nothing to a reply that has no list in it', () => {
    render(<AriaMessageText text="Tell me what you actually did there." typed bulletCopy />);
    expect(copyButtons()).toHaveLength(0);
  });

  it('skips a bullet with no words of its own', () => {
    // An empty item would give a control that copies nothing.
    const { container } = render(<AriaMessageText text={'- \n- Real one.'} typed bulletCopy />);
    expect(container.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(copyButtons().length).toBeLessThanOrEqual(1);
  });
});
