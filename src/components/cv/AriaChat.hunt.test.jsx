// @vitest-environment jsdom
//
// Tapping a job requirement starts a CONVERSATION, and two rules govern it:
//
//   1. NOTHING is written on the user's behalf. This used to push a sentence into their own
//      bubble — "Can we check whether I've done AI tools anywhere?" — styled exactly like
//      something they had typed. Their side of the transcript must only ever hold words they
//      actually wrote; the tap is recorded as a marker instead.
//   2. An exploring conversation LETS GO. There is no live entry interview here, so a
//      verdict has nowhere to go and nothing has to be settled. When Aria signals the
//      conversation has run its course (intent:'answer'), the hunt releases the chat and
//      records nothing — the right outcome for something that was only ever a question.
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import AriaChat from './AriaChat';

vi.mock('../../services/cv.service', () => ({
  default: {
    coachChat: vi.fn(),
    askAria: vi.fn(),
    generateSkills: vi.fn(),
    coachSummary: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
  },
}));

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  return { toast };
});

// The skills card is the host for the gap chips; the real one is covered by its own suite.
// Here it only needs to expose the affordance so the hunt can be started.
vi.mock('./SkillsCard', () => ({
  default: ({ onProveSkill }) => (
    <button type="button" onClick={() => onProveSkill?.('req_ai', 'AI tools')}>
      prove-ai-tools
    </button>
  ),
}));

import CVService from '../../services/cv.service';

const cvData = {
  _id: 'd1',
  skills: [],
  // Non-empty: the skills flow refuses to start against a CV with nothing in it.
  experience: [{ _sortId: 'e1', title: 'Marketer', company: 'Acme', description: '• Ran ads' }],
  projects: [],
  targetJob: { description: 'A job', brief: { role: 'Marketer' } },
  coachChats: {},
};

const setup = () =>
  render(
    <AriaChat
      draftId="d1"
      currentStepId="skills"
      cvData={cvData}
      updateCvData={vi.fn()}
      ensureDraft={vi.fn().mockResolvedValue('d1')}
      applySummary={vi.fn()}
      applySkills={vi.fn()}
    />
  );

// Get to the gap chips — the only affordance that starts a hunt in this surface:
// find-skills chip → consent → generation → the (mocked) SkillsCard.
const openHunt = async () => {
  CVService.generateSkills.mockResolvedValue({ suggestions: [], bestForRole: [], reviewGroups: {} });

  fireEvent.click(screen.getByText(/find.*skills/i));
  await act(async () => {
    fireEvent.click(await screen.findByText(/find them/i));
  });

  const chip = await screen.findByText('prove-ai-tools');
  await act(async () => {
    fireEvent.click(chip);
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  i18n.changeLanguage('en');
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
});

afterEach(cleanup);

describe('AriaChat — tapping a requirement writes nothing on the user’s behalf', () => {
  it('records the tap as a marker, not as a message from the user', async () => {
    CVService.coachChat.mockResolvedValue({ reply: 'Here is what they mean…', intent: 'building' });
    setup();
    await openHunt();

    // The marker is on screen…
    expect(
      screen.getByText(i18n.t('ariaStudio.chat.hunt.askedAbout', { name: 'AI tools' }))
    ).toBeTruthy();
    // …and the sentence that used to impersonate the user is nowhere.
    expect(screen.queryByText(/Can we check whether/i)).toBeNull();
  });

  it('sends no invented user turn to the server — the probe IS the trigger', async () => {
    CVService.coachChat.mockResolvedValue({ reply: 'Here is what they mean…', intent: 'building' });
    setup();
    await openHunt();

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    const [payload] = CVService.coachChat.mock.calls[0];
    expect(payload.messages.some((m) => m.who === 'user')).toBe(false);
    expect(payload.probe).toEqual({ requirementId: 'req_ai', mode: 'open' });
  });

  it('always explores here — this chat has no live entry interview to settle into', async () => {
    CVService.coachChat.mockResolvedValue({ reply: 'x', intent: 'building' });
    setup();
    await openHunt();

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
    expect(CVService.coachChat.mock.calls[0][0].probe.mode).toBe('open');
  });
});

describe('AriaChat — an exploring conversation hands the chat back', () => {
  it('releases the hunt when Aria signals it has run its course', async () => {
    // First turn keeps the hunt; the second ends it with no verdict.
    CVService.coachChat
      .mockResolvedValueOnce({ reply: 'Here is what they mean…', intent: 'building' })
      .mockResolvedValueOnce({ reply: 'No problem — ask me anything else.', intent: 'answer' });
    CVService.askAria.mockResolvedValue({ answer: 'general reply', freeRemaining: 5 });

    setup();
    await openHunt();

    const box = screen.getByPlaceholderText(/ask aria/i);
    await act(async () => {
      fireEvent.change(box, { target: { value: 'never mind' } });
      fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
    });
    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(2));

    // The hunt has let go: the NEXT message goes to the general coach, not back into it.
    await act(async () => {
      fireEvent.change(box, { target: { value: 'what font should I use?' } });
      fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
    });

    await waitFor(() => expect(CVService.askAria).toHaveBeenCalled());
    expect(CVService.coachChat).toHaveBeenCalledTimes(2);
  });

  it('keeps the hunt while the conversation is still going', async () => {
    CVService.coachChat.mockResolvedValue({ reply: 'Tell me more…', intent: 'building' });
    CVService.askAria.mockResolvedValue({ answer: 'general', freeRemaining: 5 });

    setup();
    await openHunt();

    const box = screen.getByPlaceholderText(/ask aria/i);
    await act(async () => {
      fireEvent.change(box, { target: { value: 'what does that mean?' } });
      fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
    });

    await waitFor(() => expect(CVService.coachChat).toHaveBeenCalledTimes(2));
    expect(CVService.askAria).not.toHaveBeenCalled();
  });
});
