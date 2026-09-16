// @vitest-environment jsdom
//
// WHERE THE DELETE FLASH LANDS, pinned because it has already gone wrong once.
//
// It began as `toast.custom(..., { position: 'top-center' })`. Sonner types that option and
// accepts it without error, but the app mounts one <Toaster position="top-right"> and the
// flash kept appearing in that corner anyway. It now owns a fixed, centred node of its own.
//
// The second trap is subtler and is why the positioning is INLINE rather than Tailwind:
// utility classes written inside a JS string depend on a scanner finding them there, and a
// purged `left-1/2 -translate-x-1/2` pins the node to the top-LEFT — visually identical to
// the sonner bug, with nothing failing anywhere. So this asserts the computed style, not a
// class list.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { trashFlash } from './trashFlash';

// The component renders through a real React root; jsdom has no layout, so the assertions
// below are about the style contract, which is what actually decides placement.
const hosts = () => [...document.body.children].filter((el) => el.style.position === 'fixed');

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('trashFlash — placement', () => {
  it('mounts a fixed node centred on the page, not in a corner', () => {
    trashFlash();

    const host = hosts()[0];
    expect(host).toBeTruthy();
    expect(host.style.left).toBe('50%');
    // 50% alone would put the node's LEFT EDGE at the centre. The pull-back is what
    // actually centres it, and losing it is the failure this test exists for.
    expect(host.style.transform).toBe('translateX(-50%)');
    expect(host.style.right).toBe('');
    expect(host.style.top).toBe('16px');
  });

  it('never intercepts clicks meant for the list underneath', () => {
    // Deleting two rows in a row must not mean waiting out an animation.
    trashFlash();
    expect(hosts()[0].style.pointerEvents).toBe('none');
  });

  it('cleans itself up, leaving nothing behind', () => {
    trashFlash();
    expect(hosts()).toHaveLength(1);

    // Hold, fade, teardown.
    vi.advanceTimersByTime(5000);
    expect(hosts()).toHaveLength(0);
    expect(document.body.children).toHaveLength(0);
  });

  it('stacks rather than collides when two deletes land together', () => {
    trashFlash();
    trashFlash();
    // Each owns its own node — one tearing down must never remove the other's.
    expect(hosts()).toHaveLength(2);

    vi.advanceTimersByTime(5000);
    expect(hosts()).toHaveLength(0);
  });
});
