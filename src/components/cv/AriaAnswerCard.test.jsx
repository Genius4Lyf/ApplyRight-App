// @vitest-environment jsdom
//
// The designed answer shapes. Two things matter here: that the card draws what Aria said,
// and that it draws NOTHING rather than something broken — the prose above it is always a
// complete answer on its own, so rendering null is a real, acceptable outcome.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import '../../i18n';
import AriaAnswerCard from './AriaAnswerCard';

const OPTIONS = [
  { label: 'Student / recent grad', detail: 'Coursework and projects count as real evidence.' },
  { label: 'Experienced', detail: 'I push for scope, ownership and truthful numbers.' },
  { label: 'Changing careers', detail: 'I foreground what transfers into the new field.' },
];

describe('AriaAnswerCard — options', () => {
  it('draws one row per choice, in the order they appear on the card above', () => {
    const { container } = render(<AriaAnswerCard layout="options" blocks={OPTIONS} />);

    const rows = container.querySelectorAll('li');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Student / recent grad');
    expect(rows[0].textContent).toContain('Coursework and projects count as real evidence.');
    expect(rows[2].textContent).toContain('Changing careers');
  });

  it('labels itself so the card is not mistaken for the buttons themselves', () => {
    const { container } = render(<AriaAnswerCard layout="options" blocks={OPTIONS} />);

    expect(container.textContent).toContain('What each one means');
  });
});

describe('AriaAnswerCard — compare', () => {
  it('lays two alternatives out side by side, and stacks them on a phone', () => {
    const { container } = render(
      <AriaAnswerCard
        layout="compare"
        blocks={[
          { label: 'Professional summary', detail: 'Best with a clear target role.' },
          { label: 'Personal profile', detail: 'Best when your history is broad.' },
        ]}
      />
    );

    const grid = container.querySelector('.grid');
    // Columns only from `sm` up — a real table in a 92%-wide bubble would scroll sideways
    // on the device most of these users are on.
    expect(grid.className).toContain('sm:grid-cols-2');
    expect(grid.className).not.toContain('grid-cols-2 ');
    expect(container.textContent).toContain('Side by side');
  });

  it('widens to three columns for three alternatives', () => {
    const { container } = render(
      <AriaAnswerCard
        layout="compare"
        blocks={[
          { label: 'A', detail: 'one' },
          { label: 'B', detail: 'two' },
          { label: 'C', detail: 'three' },
        ]}
      />
    );

    expect(container.querySelector('.grid').className).toContain('sm:grid-cols-3');
  });

  it('never renders a table element', () => {
    const { container } = render(
      <AriaAnswerCard
        layout="compare"
        blocks={[
          { label: 'A', detail: 'one' },
          { label: 'B', detail: 'two' },
        ]}
      />
    );

    expect(container.querySelector('table')).toBeNull();
  });
});

describe('AriaAnswerCard — renders nothing rather than something broken', () => {
  it('draws nothing for prose, an unknown layout, or no blocks at all', () => {
    // This is the normal case: the overwhelming majority of replies are prose, and the
    // component sits in every Aria row regardless.
    for (const props of [
      { layout: 'prose', blocks: [] },
      { layout: 'table', blocks: OPTIONS },
      { layout: 'options', blocks: undefined },
      { layout: undefined, blocks: undefined },
      { layout: 'options', blocks: [OPTIONS[0]] },
    ]) {
      const { container } = render(<AriaAnswerCard {...props} />);
      expect(container.firstChild).toBeNull();
    }
  });
});
