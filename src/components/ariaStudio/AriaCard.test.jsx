// @vitest-environment jsdom
//
// A card standing down for the conversation.
//
// Free chat is live throughout a build, so a user can ask Aria a question while a card is
// up — and the card used to sit there at full size, forcing the chat to happen around a
// panel that had nothing to do with it. Once they start talking, a card that is only ASKING
// shrinks to a line they can tap to get back.
//
// The line this holds: ONLY prompts and forms take part. A card HOLDING something —
// generated skills awaiting a decision, a summary draft, rewrite rows, the scan results —
// must never shrink, because that is how paid-for work gets forgotten. StudioChat expresses
// that by giving a card a label only when it is a prompt or a form; no label, no shrinking.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import AriaCard, { CardCollapseProvider } from './AriaCard';

afterEach(cleanup);

const BODY = 'Add a project';

const setup = (value) =>
  render(
    <CardCollapseProvider value={value}>
      <AriaCard cardKey="k">
        <button type="button">{BODY}</button>
      </AriaCard>
    </CardCollapseProvider>
  );

describe('AriaCard — standing down', () => {
  it('shows the card in full while the user is still tapping', () => {
    setup({ collapsed: false, label: 'Projects — tap to pick this up', expand: vi.fn() });
    expect(screen.getByText(BODY)).toBeTruthy();
  });

  it('shrinks to a tappable line once they start talking', () => {
    setup({ collapsed: true, label: 'Projects — tap to pick this up', expand: vi.fn() });

    expect(screen.queryByText(BODY)).toBeNull();
    expect(screen.getByText('Projects — tap to pick this up')).toBeTruthy();
  });

  it('brings the step back when the line is tapped', () => {
    const expand = vi.fn();
    setup({ collapsed: true, label: 'Projects — tap to pick this up', expand });

    fireEvent.click(screen.getByText('Projects — tap to pick this up'));
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('NEVER shrinks a card that holds something — no label, no shrinking', () => {
    // Generated skills, a summary draft, rewrite rows, the scan results. StudioChat gives
    // these no label, and that is the whole guard.
    setup({ collapsed: true, label: null, expand: vi.fn() });
    expect(screen.getByText(BODY)).toBeTruthy();
  });

  it('behaves exactly as before outside the provider', () => {
    // Every other surface that renders an AriaCard — nothing opts in by accident.
    render(
      <AriaCard cardKey="k">
        <button type="button">{BODY}</button>
      </AriaCard>
    );
    expect(screen.getByText(BODY)).toBeTruthy();
  });

  it('offers the line as a real control, not just styled text', () => {
    setup({ collapsed: true, label: 'Projects — tap to pick this up', expand: vi.fn() });
    expect(screen.getByRole('button', { name: /Projects/ })).toBeTruthy();
  });
});
