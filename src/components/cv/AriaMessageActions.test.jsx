// @vitest-environment jsdom
//
// THE ORDER OF THIS ROW IS THE FIX, not a preference.
//
// The orbit used to come FIRST. It is `visibility: hidden` on every row but the newest
// (see .aria-mark in index.css), which still reserves its full width — so under every
// message there was an invisible 16px element holding "Copy" ~26px to the right of the
// text it belonged to, with nothing on screen to explain the indent.
//
// Putting the controls first is what lands them under the words. Anyone re-ordering this
// row for tidiness would silently bring the indent back, and it would look like a spacing
// preference rather than the bug it is.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (k) => k }) }));
vi.mock('../../services/api', () => ({ default: { post: vi.fn() } }));
vi.mock('./AriaOrbit', () => ({
  default: ({ className }) => <span data-testid="orbit" className={className} />,
}));

import AriaMessageActions from './AriaMessageActions';

afterEach(cleanup);

describe('AriaMessageActions', () => {
  it('puts the controls before the orbit, so they start where the text does', () => {
    const { container } = render(<AriaMessageActions text="hello" feedbackId="abc" />);
    const children = [...container.firstChild.children];

    // The orbit is last. Everything before it is a control.
    expect(children[children.length - 1].getAttribute('data-testid')).toBe('orbit');
    expect(children.length).toBeGreaterThan(1);
  });

  it('cancels the first control’s own inset so the glyph lands on the text', () => {
    // Aria's message text sits at px-1 (4px). CopyMessageButton carries px-1.5 (6px) of
    // its own, so without -ml-0.5 the row starts 2px off — and the whole point of this
    // change was that it lines up.
    const { container } = render(<AriaMessageActions text="hello" />);
    expect(container.firstChild.className).toContain('-ml-0.5');
  });

  it('keeps the orbit marked so only the newest row shows one', () => {
    // .aria-mark is what index.css keys the single-orbit rule off. Dropping the class
    // would put an orbit under every message in the transcript.
    const { getByTestId } = render(<AriaMessageActions text="hello" />);
    expect(getByTestId('orbit').className).toContain('aria-mark');
  });

  it('shows the copy control with or without a feedback id', () => {
    // Surfaces whose turns come from other endpoints carry no id yet. Copy must not
    // depend on that.
    const { container } = render(<AriaMessageActions text="hello" />);
    expect(container.textContent).toContain('common.copy');
  });
});
