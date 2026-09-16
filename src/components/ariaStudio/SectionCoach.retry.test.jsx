// @vitest-environment jsdom
//
// A turn of the ROLE INTERVIEW that didn't get through.
//
// The general chat learned this first (see StudioChat.retry.test.jsx): mark the user's own
// message "not sent" and put a Retry under it. The interview — the surface where people
// type the most, and where a lost answer costs the most, because it is the answer the
// bullets get written from — was still doing the old thing. A generic failure raised a red
// toast that was gone by the time you looked up; a credit or cap failure pushed an Aria
// bubble that persisted into the transcript and went back to the model as something she
// had said. Either way the answer sat there looking sent, and the only way on was to type
// it again.
//
// SectionCoach doesn't own the stream, so it doesn't own the mark: it reports the failure
// up through onFailed and hands its send to StudioChat through onRegisterSend, which is
// what lets Retry re-run THIS interview turn instead of a general question.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider } from '../../context/AriaStudioContext';
import SectionCoach from './SectionCoach';

vi.mock('../../services/cv.service', () => ({
  default: {
    coachChat: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    getDraftById: vi.fn(),
    coachGenerateBullets: vi.fn(),
    studioRecompute: vi.fn(),
  },
}));

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  return { toast };
});

import CVService from '../../services/cv.service';
import { toast } from 'sonner';

const entry = { section: 'experience', sortId: 'role-1', title: 'Engineer', company: 'Acme' };

const setup = (props = {}) => {
  const onPush = vi.fn();
  const onFailed = vi.fn();
  const onDone = vi.fn();
  const view = render(
    <AriaStudioProvider>
      <SectionCoach
        draftId="d1"
        entry={entry}
        messages={[]}
        onPush={onPush}
        onFailed={onFailed}
        onApply={vi.fn()}
        onDone={onDone}
        careerStage="experienced"
        {...props}
      />
    </AriaStudioProvider>
  );
  return { onPush, onFailed, onDone, ...view };
};

const ANSWER = 'I ran the night shift on three rigs.';

const answer = (text = ANSWER) => {
  const box = screen.getByPlaceholderText(i18n.t('ariaStudio.sectionCoach.activityPlaceholder'));
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
};

const rejectWith = (status, code) =>
  CVService.coachChat.mockRejectedValueOnce({ response: { status, data: code ? { code } : {} } });

beforeEach(() => {
  vi.clearAllMocks();
  i18n.changeLanguage('en');
});

afterEach(cleanup);

describe('an interview turn that failed', () => {
  it('reports it up instead of raising a toast that disappears', async () => {
    rejectWith(500);
    const { onFailed } = setup();

    answer();

    await waitFor(() => expect(onFailed).toHaveBeenCalledWith('UNREACHABLE'));
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('never writes the failure into the conversation as something Aria said', async () => {
    // The credit and cap cases used to push a real Aria message. It persisted with the
    // transcript and went back to the model on the next turn.
    rejectWith(402, 'INSUFFICIENT_CREDITS');
    const { onPush, onFailed } = setup();

    answer();

    await waitFor(() => expect(onFailed).toHaveBeenCalledWith('INSUFFICIENT_CREDITS'));
    // Their own message is the only thing pushed — no Aria bubble under it.
    expect(onPush.mock.calls.every(([m]) => m.who !== 'aria')).toBe(true);
  });

  it.each([
    [429, undefined, 'RATE_LIMITED'],
    [429, 'RATE_LIMITED', 'RATE_LIMITED'],
    [429, 'CHAT_LIMIT_REACHED', 'CHAT_LIMIT_REACHED'],
    [429, 'BUILD_LIMIT_REACHED', 'BUILD_LIMIT_REACHED'],
  ])('classifies %i/%s as %s', async (status, code, reason) => {
    rejectWith(status, code);
    const { onFailed } = setup();

    answer();

    await waitFor(() => expect(onFailed).toHaveBeenCalledWith(reason));
  });

  // The one failure that is NOT a failed message: the entry was deleted while the turn
  // was in flight. There is nothing to resend it to, so the interview closes as before.
  it('still closes cleanly when the entry itself is gone', async () => {
    rejectWith(404);
    const { onDone, onFailed } = setup();

    answer();

    await waitFor(() => expect(onDone).toHaveBeenCalledWith(null));
    expect(onFailed).not.toHaveBeenCalled();
  });

  it('hands its send to the stream, and takes it back on unmount', async () => {
    const onRegisterSend = vi.fn();
    const { unmount } = setup({ onRegisterSend });

    await waitFor(() => expect(typeof onRegisterSend.mock.calls.at(-1)[0]?.send).toBe('function'));

    unmount();
    expect(onRegisterSend.mock.calls.at(-1)[0]).toBeNull();
  });

  // The retry DROPS the failed message before resending it, so a send that refused would
  // leave it deleted and unsent. `busy` is what lets StudioChat wait instead.
  it('says when it is mid-turn, so the retry does not delete the message for nothing', async () => {
    let settle;
    CVService.coachChat.mockReturnValueOnce(
      new Promise((resolve) => {
        settle = () => resolve({ reply: 'And how many rigs?' });
      })
    );
    const onRegisterSend = vi.fn();
    setup({ onRegisterSend });

    answer();

    await waitFor(() => expect(onRegisterSend.mock.calls.at(-1)[0]?.busy).toBe(true));
    await act(async () => settle());
    await waitFor(() => expect(onRegisterSend.mock.calls.at(-1)[0]?.busy).toBe(false));
  });
});

describe('a failed message is not part of the conversation', () => {
  const thread = [
    { who: 'pinrole', sortId: 'role-1' },
    { who: 'aria', text: 'What did you actually do there?' },
    { who: 'user', text: 'I ran the night shift.', failed: 'UNREACHABLE' },
  ];

  it('is kept out of the payload and out of the turn count', async () => {
    CVService.coachChat.mockResolvedValueOnce({ reply: 'How many rigs?' });
    setup({ messages: thread });

    answer('I ran the night shift.');

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    const payload = CVService.coachChat.mock.calls.at(-1)[0];
    // Resent once, not twice — the copy in the stream never reached the server.
    expect(payload.messages.filter((m) => m.text === 'I ran the night shift.')).toHaveLength(1);
    // And it didn't spend a turn of the interview's budget, which the server turns into a
    // hard "wrap this up now".
    expect(payload.buildTurns).toBe(1);
  });
});
