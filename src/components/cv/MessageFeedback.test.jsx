// @vitest-environment jsdom
//
// 👍/👎 ON ARIA'S REPLIES.
//
// Two properties matter more than the button working, and both are easy to lose in a
// later tidy-up:
//
//   NO ID, NO CONTROL. The thumbs can only be posted against the AICallLog id the server
//   minted for that specific reply. Rendering them without one would give the user a
//   control that quietly rates nothing — worse than no control, because they would
//   believe they had told us something.
//
//   A FAILED REQUEST IS NOT THE USER'S PROBLEM. Pressing this is a favour. There is
//   nothing they can do about a network error, and an error state over an opinion is a
//   rebuke for helping.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent } from '@testing-library/react';

const post = vi.fn();
vi.mock('../../services/api', () => ({ default: { post: (...a) => post(...a) } }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k) => k }),
}));

import MessageFeedback from './MessageFeedback';

const up = () => screen.getByRole('button', { name: 'common.helpful' });
const down = () => screen.getByRole('button', { name: 'common.notHelpful' });

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: { status: 'ok' } });
});

afterEach(cleanup);

describe('MessageFeedback', () => {
  it('posts the rating against the id the server gave for THIS reply', () => {
    render(<MessageFeedback feedbackId="abc123" />);
    fireEvent.click(up());
    expect(post).toHaveBeenCalledWith('/ai-feedback', { logId: 'abc123', feedback: 'up' });
  });

  it('renders nothing at all without an id', () => {
    // The alternative — showing the thumbs and posting nowhere — is a lie.
    const { container } = render(<MessageFeedback feedbackId={undefined} />);
    expect(container.firstChild).toBeNull();
    expect(post).not.toHaveBeenCalled();
  });

  it('shows the press as taken immediately, and acknowledges it', () => {
    render(<MessageFeedback feedbackId="abc123" />);
    fireEvent.click(down());
    expect(down().getAttribute('aria-pressed')).toBe('true');
    expect(up().getAttribute('aria-pressed')).toBe('false');
    expect(screen.getByText('common.feedbackThanks')).toBeTruthy();
  });

  it('lets someone change their mind, but not press the same thumb twice', () => {
    render(<MessageFeedback feedbackId="abc123" />);
    fireEvent.click(up());
    fireEvent.click(up());
    expect(post).toHaveBeenCalledTimes(1);

    fireEvent.click(down());
    expect(post).toHaveBeenCalledTimes(2);
    expect(post).toHaveBeenLastCalledWith('/ai-feedback', { logId: 'abc123', feedback: 'down' });
  });

  it('says nothing when the request fails', async () => {
    post.mockRejectedValue(new Error('offline'));
    render(<MessageFeedback feedbackId="abc123" />);
    fireEvent.click(up());
    await Promise.resolve();

    expect(up().getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('common.feedbackThanks')).toBeTruthy();
  });
});
