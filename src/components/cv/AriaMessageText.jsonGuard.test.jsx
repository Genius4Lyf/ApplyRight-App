// @vitest-environment jsdom
//
// THE LAST LINE OF DEFENCE AGAINST A RAW JSON OBJECT IN THE CHAT.
//
// A user was handed the model's entire serialized response as Aria's message:
// `{"reply":"That's an excellent example! ...","intent":"ready","description":"1. Carried
// out routine ...` — cut off mid-word, with the markdown inside the string values
// rendering as real bold and bullets, which made it look even more like a message.
//
// The cause is fixed on the server (a budget that could hold a wrap-up turn, and a
// controller that can tell a truncated object from prose). This guard exists so that no
// future caller on any surface can put one back: it lives in the single component every
// Aria message renders through.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

import AriaMessageText from './AriaMessageText';

const show = (text) => render(<AriaMessageText text={text} typed />);
const FALLBACK = 'ariaStudio.chat.replyUnreadable';

afterEach(cleanup);

describe('it refuses to render a serialized object', () => {
  it('replaces the exact payload the user was shown', () => {
    const dump =
      '{"reply":"That\'s an excellent example! Here\'s how we can put that on your CV.","intent":"ready","description":"1. Carried out routine maintenance on a diesel eng';
    show(dump);
    expect(screen.getByText(FALLBACK)).toBeTruthy();
    expect(screen.queryByText(/excellent example/)).toBeNull();
    expect(screen.queryByText(/intent/)).toBeNull();
  });

  it('catches a complete object as well as a truncated one', () => {
    show('{"reply":"hello","intent":"building"}');
    expect(screen.getByText(FALLBACK)).toBeTruthy();
  });

  it('is not fooled by leading whitespace', () => {
    show('\n  {"reply":"hello"');
    expect(screen.getByText(FALLBACK)).toBeTruthy();
  });
});

describe('it does not swallow real messages', () => {
  it('renders ordinary prose untouched', () => {
    // The other half of the original bug: a model that answers in plain text instead of
    // JSON produces a perfectly good reply, and it must still reach the user.
    show("That's an excellent example! What changed because of it?");
    expect(screen.getByText(/What changed because of it\?/)).toBeTruthy();
  });

  it('renders a message that merely mentions JSON', () => {
    show('Your CV is not stored as {"json"} — it is a document.');
    expect(screen.queryByText(FALLBACK)).toBeNull();
  });

  it('renders a message that opens with a brace', () => {
    show('{ a curly brace is not a data structure }');
    expect(screen.queryByText(FALLBACK)).toBeNull();
  });

  it('renders Aria bullets, which is how the answer starters arrive', () => {
    const { container } = show('Some ways in:\n\n- "I handled ___"\n- "I ran the ___"');
    expect(container.querySelectorAll('li')).toHaveLength(2);
    expect(screen.queryByText(FALLBACK)).toBeNull();
  });

  it('renders an empty message as nothing rather than as a failure', () => {
    const { container } = show('');
    expect(screen.queryByText(FALLBACK)).toBeNull();
    expect(container.textContent.trim()).toBe('');
  });
});

describe('wrapping', () => {
  it('breaks long unbroken words instead of pushing the page sideways', () => {
    // This class sat on three of the four hosts and was missing on the fourth, so one
    // pasted URL ran off the right edge of a phone on exactly one surface.
    const { container } = show('short');
    expect(container.querySelector('.aria-md').className).toContain('break-words');
  });
});
