// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '../../i18n';
import CopyMessageButton from './CopyMessageButton';

const writeText = vi.fn(() => Promise.resolve());

beforeEach(() => {
  writeText.mockClear();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

// This suite is not configured for auto-cleanup, so each render would otherwise stack up
// in the same document and getByRole('button') would find every button ever mounted.
// Restoring real timers here rather than at the end of the test that installs them: if
// that test fails early, fake timers leak into the next one and it hangs on waitFor.
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CopyMessageButton', () => {
  it('puts plain text on the clipboard, not the markdown', async () => {
    render(<CopyMessageButton text={'You should **quantify** it:\n\n- Ran ___ wells'} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    expect(writeText.mock.calls[0][0]).toBe('You should quantify it:\n\n- Ran ___ wells');
  });

  it('confirms the copy, then returns to its resting label', async () => {
    vi.useFakeTimers();
    render(<CopyMessageButton text="hello" />);
    fireEvent.click(screen.getByRole('button'));
    // The click awaits the clipboard promise, so let the microtask queue drain first.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole('button').textContent).toMatch(/copied/i);
    // The reset lands inside a setTimeout, so React needs act() to flush that render.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(screen.getByRole('button').textContent).toMatch(/^copy$/i);
  });

  it('renders nothing when there is no text to copy', () => {
    const { container } = render(<CopyMessageButton text="   " />);
    expect(container.firstChild).toBe(null);
  });

  it('falls back to execCommand where clipboard access is unavailable', async () => {
    // Android WebView / non-secure context. A silent no-op here would look like a dead
    // button, which is worse than not offering one.
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    document.execCommand = vi.fn(() => true);
    render(<CopyMessageButton text="fallback path" />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
  });
});
