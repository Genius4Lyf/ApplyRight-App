// @vitest-environment jsdom
//
// Aria writes markdown now; this is the renderer that has to survive being HALF TYPED.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AriaMessageText from './AriaMessageText';
import { healTail } from '../../lib/markdownTail';

// `typed` is how restored history renders — no reveal, straight to the finished markup.
const renderDone = (text) => render(<AriaMessageText text={text} typed />);

describe('AriaMessageText — finished replies', () => {
  it('renders **bold** as bold, not as asterisks', () => {
    const { container } = renderDone('You are a **student**, so coursework counts.');

    expect(container.querySelector('strong').textContent).toBe('student');
    expect(container.textContent).not.toContain('**');
  });

  it('breaks a blank line into separate paragraphs', () => {
    const { container } = renderDone('First thought.\n\nSecond thought.');

    const paras = container.querySelectorAll('p');
    expect(paras).toHaveLength(2);
    expect(paras[0].textContent).toBe('First thought.');
    expect(paras[1].textContent).toBe('Second thought.');
  });

  it('renders a dash list as a real list', () => {
    const { container } = renderDone('Pick one:\n\n- Student\n- Experienced\n- Changing careers');

    const items = container.querySelectorAll('li');
    expect(items).toHaveLength(3);
    expect(items[2].textContent).toBe('Changing careers');
  });

  it('flattens a heading to a paragraph so the global serif cannot hijack the bubble', () => {
    const { container } = renderDone('## Where you are\n\nSome advice.');

    expect(container.querySelector('h2')).toBeNull();
    expect(container.textContent).toContain('Where you are');
  });

  it('does not execute HTML the model wrote', () => {
    const { container } = renderDone('Careful: <script>alert(1)</script> and <b>raw</b>.');

    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('b')).toBeNull();
  });

  it('keeps everything in one block-level child, so the flex row and orbit are unaffected', () => {
    const { container } = renderDone('One.\n\nTwo.\n\n- three');

    // The row is `flex flex-col gap-1.5` with the orbit mark last; sibling blocks here
    // would each become a flex item and the mark would stop being the final child.
    expect(container.firstChild.className).toContain('aria-md');
    expect(container.childNodes).toHaveLength(1);
  });
});

describe('AriaMessageText — while it types', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('never shows raw markdown syntax mid-reveal', () => {
    const text = 'That is **entirely** normal, and here is a `snippet` too.';
    const { container } = render(<AriaMessageText text={text} />);

    // Step through the whole reveal a tick at a time, checking every intermediate frame.
    for (let i = 0; i < Math.ceil(text.length / 3) + 2; i += 1) {
      act(() => {
        vi.advanceTimersByTime(16);
      });
      expect(container.textContent).not.toContain('**');
      expect(container.textContent).not.toContain('`');
    }

    expect(container.querySelector('strong').textContent).toBe('entirely');
  });

  it('fires onDone once, so a restored session never re-types', () => {
    const onDone = vi.fn();
    render(<AriaMessageText text="Short." onDone={onDone} />);

    act(() => {
      vi.advanceTimersByTime(16 * 40);
    });

    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows the whole reply immediately under reduced motion', () => {
    const onDone = vi.fn();
    render(<AriaMessageText text="**All** of it." reduce onDone={onDone} />);

    expect(screen.getByText('All')).toBeTruthy();
    expect(onDone).toHaveBeenCalled();
  });
});

describe('healTail', () => {
  it('drops a half-typed bold marker rather than showing it', () => {
    expect(healTail('That is **enti')).toBe('That is ');
    expect(healTail('That is **')).toBe('That is ');
    // A completed pair must survive — cutting here would make finished text vanish and
    // reappear, which looks worse than the bug being fixed.
    expect(healTail('That is **entirely** fine')).toBe('That is **entirely** fine');
  });

  it('handles single-asterisk emphasis and code spans', () => {
    expect(healTail('a *wo')).toBe('a ');
    expect(healTail('a *word* b')).toBe('a *word* b');
    expect(healTail('run `npm ru')).toBe('run ');
    expect(healTail('run `npm run dev` now')).toBe('run `npm run dev` now');
  });

  it('drops a bullet marker with no text after it yet', () => {
    expect(healTail('Options:\n\n- ')).toBe('Options:\n\n');
    expect(healTail('Options:\n\n- Student\n- ')).toBe('Options:\n\n- Student\n');
    expect(healTail('Options:\n\n1. ')).toBe('Options:\n\n');
  });

  it('drops a link that has no closing paren yet', () => {
    expect(healTail('see [the guide](https://exa')).toBe('see ');
    expect(healTail('see [the guide](https://example.com)')).toBe(
      'see [the guide](https://example.com)'
    );
  });

  it('leaves ordinary prose alone', () => {
    expect(healTail('Just a normal sentence, mid-typ')).toBe('Just a normal sentence, mid-typ');
    expect(healTail('')).toBe('');
  });
});
