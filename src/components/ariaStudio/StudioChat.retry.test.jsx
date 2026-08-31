// @vitest-environment jsdom
//
// A message that didn't get through.
//
// Before this, a failed turn left the user's message sitting in the thread looking sent,
// with an Aria bubble underneath explaining the problem — and the only way forward was to
// retype it by hand. Worse, that explanation was pushed as a real message, so it
// persisted into the transcript and went back to the model on the next turn as something
// Aria had supposedly said.
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioRecompute: vi.fn().mockResolvedValue({ studioScan: null }),
    studioScan: vi.fn(),
    studioBuildStart: vi.fn(),
    setNoTarget: vi.fn().mockResolvedValue({ noJd: null }),
    getJobKeywords: vi.fn(),
    studioBriefPreview: vi.fn(),
    studioTailorStart: vi.fn(),
    coachChat: vi.fn(),
    studioRewriteRole: vi.fn().mockResolvedValue({ rows: [] }),
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

let ctx = null;
const Handle = () => {
  const api = useAriaStudio();
  useEffect(() => {
    ctx = api;
  });
  return null;
};

// A build session parked on the section hub — where the composer is a real question box.
const draft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ _sortId: 'r1', title: 'Engineer', description: '• Built a system' }],
  projects: [],
  education: [],
  skills: [],
  targetJob: { title: 'Field Operator', description: 'A long enough job description here.' },
  coachChats: {
    studio: [
      { who: 'buildintro' },
      { who: 'buildstart', draftId: 'd1' },
      { who: 'careerstage', stage: 'grad' },
      { who: 'buildjobdone' },
      { who: 'contactdone' },
    ],
  },
});

const mountStudio = async () => {
  localStorage.setItem('ariaStudio:draftId', 'd1');
  CVService.getDraftById.mockResolvedValue(draft());
  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe('d1'));
};

const QUESTION = 'Do you know what wireline SLB does?';

const ask = async (text = QUESTION) => {
  const box = screen.getByPlaceholderText(i18n.t('cvBuilder.ariaComposer.placeholder'));
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
};

const rejectWith = (status, code) =>
  CVService.coachChat.mockRejectedValueOnce({ response: { status, data: code ? { code } : {} } });

const transcript = () => ctx?.cvData?.coachChats?.studio || [];

beforeEach(() => {
  ctx = null;
  localStorage.clear();
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollTo = () => {};
});

afterEach(cleanup);

describe('a message that failed to send', () => {
  it('offers a Retry on the message instead of making them retype it', async () => {
    rejectWith(500);
    await mountStudio();
    await ask();

    expect(
      await screen.findByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') })
    ).toBeTruthy();
    // Their message is still there — nothing to copy out and paste back.
    expect(screen.getByText(QUESTION)).toBeTruthy();
  });

  it('names a rate limit as a rate limit, not as "couldn\'t reach me"', async () => {
    // A 429 used to carry no code, so it fell through to the generic unreachable copy —
    // which reads as a broken connection rather than something that clears on its own.
    rejectWith(429, 'RATE_LIMITED');
    await mountStudio();
    await ask();

    expect(await screen.findByText(i18n.t('ariaStudio.chat.failed.rateLimited'))).toBeTruthy();
    expect(screen.queryByText(i18n.t('ariaStudio.chat.chatUnreachable'))).toBeNull();
  });

  it('treats a bare 429 as a rate limit even without a code', async () => {
    // Any proxy or limiter in front of us may answer 429 with no body of ours.
    rejectWith(429);
    await mountStudio();
    await ask();

    expect(await screen.findByText(i18n.t('ariaStudio.chat.failed.rateLimited'))).toBeTruthy();
  });

  it('sends it again on Retry, leaving one copy of the message', async () => {
    rejectWith(500);
    CVService.coachChat.mockResolvedValueOnce({ reply: 'Yes — wireline logging and perforating.' });
    await mountStudio();
    await ask();

    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') })
    );

    expect(await screen.findByText(/wireline logging/)).toBeTruthy();
    // The retry replaced the failed copy rather than adding a second one — the duplicate
    // pair of identical messages was exactly the symptom of retyping by hand.
    expect(screen.getAllByText(QUESTION)).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') })
    ).toBeNull();
  });

  it('never writes the failure into the conversation Aria reads back', async () => {
    rejectWith(500);
    await mountStudio();
    await ask();

    await screen.findByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') });
    await waitFor(() => expect(transcript().some((m) => m.who === 'user')).toBe(true));

    // The old error bubble was pushed as a real Aria message: it persisted, and the next
    // turn sent it back to the model as something she had said.
    const ariaLines = transcript().filter((m) => m.who === 'aria');
    expect(ariaLines.some((m) => m.text === i18n.t('ariaStudio.chat.chatUnreachable'))).toBe(false);
  });
});
