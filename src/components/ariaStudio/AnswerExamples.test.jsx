// @vitest-environment jsdom
//
// WAYS TO ANSWER.
//
// The panel that replaced a lone "Show me an example" pill. Most of what matters here is
// a distinction rather than a feature: a STARTER is a scaffold to finish in your own
// words, and the EXAMPLE is a whole sample answer that is emphatically not the user's
// claim. If those ever merge visually, the product starts inviting people to paste a
// sentence about work they never did — so several of these tests exist to hold them apart.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars?.answer ? `e.g. "${vars.answer}"` : k),
  }),
}));

import AnswerExamples from './AnswerExamples';

const STARTERS = ['I ran the ___ tool and it ', 'One safety thing I did was ', 'We handled ___'];
const EXAMPLE = 'I rigged up the logging tool and caught a pressure anomaly early.';

const writeText = vi.fn().mockResolvedValue(undefined);
const toggle = () => screen.getByRole('button', { expanded: false });

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(cleanup);

describe('it stays out of the way until asked', () => {
  it('renders collapsed — help that opens itself is in the way', () => {
    render(<AnswerExamples starters={STARTERS} example={EXAMPLE} />);
    expect(screen.queryByText(STARTERS[0])).toBeNull();
    expect(toggle()).toBeTruthy();
  });

  it('renders NOTHING at all when the turn produced neither', () => {
    // intent:'answer' and intent:'ready' return empty for both. An empty bordered box
    // under every reply would be furniture.
    const { container } = render(<AnswerExamples starters={[]} example="" />);
    expect(container.firstChild).toBeNull();
  });

  it('ignores blank entries rather than rendering empty rows', () => {
    const { container } = render(<AnswerExamples starters={['', '   ']} example="  " />);
    expect(container.firstChild).toBeNull();
  });
});

describe('what it shows once opened', () => {
  const open = (props = {}) => {
    render(<AnswerExamples starters={STARTERS} example={EXAMPLE} {...props} />);
    fireEvent.click(toggle());
  };

  it('shows every starter', () => {
    // Trimmed: the server writes several of these with a trailing space (the user carries
    // the sentence on), which would paste as a stray gap at the end of a line.
    open();
    STARTERS.forEach((s) => expect(screen.getByText(s.trim())).toBeTruthy());
  });

  it('marks the full sample as a sample, in its own section', () => {
    // The one thing that must never read as the user's own words.
    open();
    expect(screen.getByText(`e.g. "${EXAMPLE}"`)).toBeTruthy();
    expect(screen.getByText('ariaStudio.answerExamples.fullAnswer')).toBeTruthy();
    expect(screen.getByText('ariaStudio.answerExamples.sampleNote')).toBeTruthy();
  });

  it('gives each line its own copy control', () => {
    open();
    // Three starters plus the sample.
    expect(screen.getAllByRole('button', { name: /common\.copy/i })).toHaveLength(4);
  });

  it('copies one starter, blank and all', () => {
    // The "___" is the whole point of a starter: it is where the user's own detail goes.
    // A markdown pass that ate it would hand over a sentence with a word missing.
    open();
    fireEvent.click(screen.getAllByRole('button', { name: /common\.copy/i })[2]);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toBe('We handled ___');
  });

  it('shows only the sample when the server sent no starters', () => {
    render(<AnswerExamples starters={[]} example={EXAMPLE} />);
    fireEvent.click(toggle());
    expect(screen.getByText(`e.g. "${EXAMPLE}"`)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /common\.copy/i })).toHaveLength(1);
  });

  it('shows only the starters when there is no sample', () => {
    render(<AnswerExamples starters={STARTERS} example="" />);
    fireEvent.click(toggle());
    expect(screen.queryByText('ariaStudio.answerExamples.fullAnswer')).toBeNull();
    expect(screen.getAllByRole('button', { name: /common\.copy/i })).toHaveLength(3);
  });
});

describe('the heading', () => {
  it("prefers the server's own lead-in, written for the question just asked", () => {
    // "Ways to show the impact:" beats a generic title, because it names what these
    // particular starters are for.
    render(<AnswerExamples starters={STARTERS} example="" label="A number you might have:" />);
    expect(screen.getByText('A number you might have:')).toBeTruthy();
  });

  it('falls back to a generic title when the turn sent none', () => {
    render(<AnswerExamples starters={STARTERS} example="" label="   " />);
    expect(screen.getByText('ariaStudio.answerExamples.title')).toBeTruthy();
  });
});
