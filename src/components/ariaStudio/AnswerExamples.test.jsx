// @vitest-environment jsdom
//
// A FULL ANSWER SOUNDS LIKE.
//
// The panel that replaced a lone "Show me an example" pill. It holds TWO sample answers
// and nothing else — the server's short answer STARTERS are deliberately not here, because
// Aria already writes those as bullets inside her reply where each can be copied on its
// own, and a second copy underneath would be the same text twice in two styles.
//
// The samples are whole sentences and are NOT the user's claim. Several of these tests
// exist to hold that line: a sample answer sitting under a question is one careless paste
// away from a claim about work nobody did.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k, vars) => (vars?.answer ? `e.g. "${vars.answer}"` : k),
  }),
}));

import AnswerExamples from './AnswerExamples';

const EXAMPLES = [
  'I rigged up the logging tool and caught a pressure anomaly early.',
  'I rewrote the shift handover checklist after two crews missed the same step.',
];

const writeText = vi.fn().mockResolvedValue(undefined);
const toggle = () => screen.getByRole('button', { expanded: false });
const copies = () => screen.queryAllByRole('button', { name: /common\.copy/i });

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});
afterEach(cleanup);

describe('it stays out of the way until asked', () => {
  it('renders collapsed — help that opens itself is in the way', () => {
    render(<AnswerExamples examples={EXAMPLES} />);
    expect(screen.queryByText(`e.g. "${EXAMPLES[0]}"`)).toBeNull();
    expect(toggle()).toBeTruthy();
  });

  it('renders NOTHING when the turn produced no samples', () => {
    // intent:'answer' and intent:'ready' return none. An empty bordered box under every
    // reply would be furniture.
    const { container } = render(<AnswerExamples examples={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('ignores blank entries rather than rendering empty rows', () => {
    const { container } = render(<AnswerExamples examples={['', '   ']} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('what it shows once opened', () => {
  const open = (examples = EXAMPLES) => {
    render(<AnswerExamples examples={examples} />);
    fireEvent.click(toggle());
  };

  it('shows BOTH samples — one reads as a coincidence, two read as a range', () => {
    open();
    EXAMPLES.forEach((s) => expect(screen.getByText(`e.g. "${s}"`)).toBeTruthy());
  });

  it('marks them as samples, every time', () => {
    // The one thing that must never read as the user's own words.
    open();
    expect(screen.getByText('ariaStudio.answerExamples.sampleNote')).toBeTruthy();
  });

  it('gives each sample its own copy control', () => {
    open();
    expect(copies()).toHaveLength(2);
  });

  it('copies one sample, not both', () => {
    open();
    fireEvent.click(copies()[1]);
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toBe(EXAMPLES[1]);
  });

  it('works with a single sample, for a turn that only produced one', () => {
    // The grad scrubber can drop one of the two, and an older server sends one anyway.
    open([EXAMPLES[0]]);
    expect(copies()).toHaveLength(1);
    expect(screen.getByText(`e.g. "${EXAMPLES[0]}"`)).toBeTruthy();
  });
});

describe('what it does NOT carry', () => {
  it('offers no starters panel — those live in Aria’s own reply', () => {
    // If a `starters` prop ever comes back, it means the same openings are on screen
    // twice: once as bullets in her message and once here.
    render(<AnswerExamples examples={EXAMPLES} starters={['I ran the ___ tool']} />);
    fireEvent.click(toggle());
    expect(screen.queryByText('I ran the ___ tool')).toBeNull();
    expect(copies()).toHaveLength(2);
  });

  it('is headed by what it actually is, not by a server lead-in', () => {
    render(<AnswerExamples examples={EXAMPLES} label="Ways to elaborate on your work:" />);
    expect(screen.getByText('ariaStudio.answerExamples.fullAnswer')).toBeTruthy();
    expect(screen.queryByText('Ways to elaborate on your work:')).toBeNull();
  });
});
