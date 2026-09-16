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
import { render, cleanup, waitFor, screen, fireEvent, act } from '@testing-library/react';

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

// ─── The same message, but typed INTO A ROLE INTERVIEW ───
//
// The interview owns the composer while it runs, so its turns go to /coach/chat FOCUSED on
// the pinned entry, with the interview's turn count on them. A Retry that fell through to
// the general sender would resend the answer as an unfocused question — different prompt,
// different meter, and out of the interview it was an answer to — so the mark records who
// was sending and the retry goes back to them.
describe('a message that failed inside the role interview', () => {
  const ANSWER = 'I ran the night shift on three rigs.';

  // An entry with its fields captured and no bullets yet: the achievements interview,
  // which is where the composer belongs to SectionCoach.
  const interviewDraft = () => ({
    ...draft(),
    experience: [
      {
        _sortId: 'r1',
        entryType: 'job',
        title: 'Engineer',
        company: 'Acme',
        startDate: '2023-01',
        description: '',
      },
    ],
  });

  const mountInterview = async () => {
    localStorage.setItem('ariaStudio:draftId', 'd1');
    CVService.getDraftById.mockResolvedValue(interviewDraft());
    render(
      <AriaStudioProvider>
        <Handle />
        <StudioChat />
      </AriaStudioProvider>
    );
    await waitFor(() => expect(ctx?.draftId).toBe('d1'));
    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'r1');
    });
    return screen.findByPlaceholderText(i18n.t('ariaStudio.sectionCoach.activityPlaceholder'));
  };

  const answer = async (text = ANSWER) => {
    const box = screen.getByPlaceholderText(i18n.t('ariaStudio.sectionCoach.activityPlaceholder'));
    fireEvent.change(box, { target: { value: text } });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
  };

  it('offers the same Retry on an interview answer', async () => {
    rejectWith(500);
    await mountInterview();
    await answer();

    expect(
      await screen.findByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') })
    ).toBeTruthy();
    expect(screen.getByText(ANSWER)).toBeTruthy();
  });

  it('sends it back into the interview — focused, and without burning a turn', async () => {
    rejectWith(500);
    await mountInterview();
    await answer();

    CVService.coachChat.mockResolvedValueOnce({ reply: 'How many rigs was that?' });
    fireEvent.click(
      await screen.findByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') })
    );

    expect(await screen.findByText(/How many rigs/)).toBeTruthy();
    const payload = CVService.coachChat.mock.calls.at(-1)[0];
    // The interview's contract, not the general chat's: a focus, and turn one of ten.
    expect(payload.focus).toEqual({ section: 'experience', sortId: 'r1' });
    expect(payload.buildTurns).toBe(1);
    // Sent once. Retyping by hand is what left two identical messages in the thread.
    expect(payload.messages.filter((m) => m.text === ANSWER)).toHaveLength(1);
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
    expect(
      screen.queryByRole('button', { name: i18n.t('ariaStudio.chat.failed.retry') })
    ).toBeNull();
  });
});

// The PROJECT interview is the same SectionCoach, pointed at a project — one coaching
// path, not two. Asserted rather than assumed, because the project track reaches it by a
// different route (a type chip stands between the pin and the interview) and 'project' is
// singular everywhere it travels: pass 'projects' and the focus silently addresses
// nothing. This is the surface a student with no work history lives on.
describe('a message that failed inside the PROJECT interview', () => {
  const ANSWER = 'I built a bus-tracker app for my campus.';

  const projectDraft = () => ({
    ...draft(),
    experience: [],
    // entryType is the persisted project type, so the type chip is already answered and
    // the pin lands straight in the achievements interview.
    projects: [
      { _sortId: 'p1', entryType: 'personal', title: 'Campus Bus Tracker', description: '' },
    ],
  });

  it('marks it and retries it as a PROJECT turn', async () => {
    localStorage.setItem('ariaStudio:draftId', 'd1');
    CVService.getDraftById.mockResolvedValue(projectDraft());
    CVService.coachChat.mockRejectedValueOnce({ response: { status: 500, data: {} } });
    render(
      <AriaStudioProvider>
        <Handle />
        <StudioChat />
      </AriaStudioProvider>
    );
    await waitFor(() => expect(ctx?.draftId).toBe('d1'));
    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'project', 'p1');
    });

    const box = await screen.findByPlaceholderText(
      i18n.t('ariaStudio.sectionCoach.activityPlaceholder')
    );
    fireEvent.change(box, { target: { value: ANSWER } });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });

    const retry = await screen.findByRole('button', {
      name: i18n.t('ariaStudio.chat.failed.retry'),
    });
    CVService.coachChat.mockResolvedValueOnce({ reply: 'Who ended up using it?' });
    fireEvent.click(retry);

    expect(await screen.findByText(/Who ended up using it/)).toBeTruthy();
    const payload = CVService.coachChat.mock.calls.at(-1)[0];
    expect(payload.focus).toEqual({ section: 'project', sortId: 'p1' });
    expect(payload.currentStepId).toBe('projects');
    expect(screen.getAllByText(ANSWER)).toHaveLength(1);
  });
});
