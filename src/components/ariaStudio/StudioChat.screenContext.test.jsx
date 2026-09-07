// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * Aria is told which CARD is in front of the user.
 *
 * The bug: sitting at "Where are you in your career?" — three buttons — a user asked Aria
 * to explain the three options and she explained the CV SECTIONS. Nothing in the request
 * named the card, `currentStepId` came through as the empty string, and the only list of
 * anything in her prompt was the section list in APP_PRIMER. She answered the only
 * question she could see.
 *
 * These assert on the REQUEST, which is where the fix has to hold. A prompt test on the
 * server can only prove the card is used well once it arrives; this proves it arrives, and
 * that it carries the labels actually on screen rather than a hard-coded copy of them.
 */

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioRecompute: vi.fn().mockResolvedValue({ studioScan: null }),
    studioScan: vi.fn(),
    studioBuildStart: vi.fn(),
    getJobKeywords: vi.fn(),
    studioBriefPreview: vi.fn(),
    studioTailorStart: vi.fn(),
    studioProjectIdeas: vi.fn(),
    coachChat: vi.fn(),
    generateSkills: vi.fn(),
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

const t = (key, params) => i18n.t(key, params);

let ctx = null;
const Handle = () => {
  const api = useAriaStudio();
  useEffect(() => {
    ctx = api;
  });
  return null;
};

const mountStudio = async (draft) => {
  localStorage.setItem('ariaStudio:draftId', draft._id);
  CVService.getDraftById.mockResolvedValueOnce(draft);
  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe(draft._id));
  return ctx;
};

const ask = async (text) => {
  const box = screen.getByPlaceholderText(t('cvBuilder.ariaComposer.placeholder'));
  fireEvent.change(box, { target: { value: text } });
  fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });
  await waitFor(() => expect(CVService.coachChat).toHaveBeenCalled());
  return CVService.coachChat.mock.calls.at(-1)[0];
};

// A brand-new build session: buildstart in the transcript, no career stage yet. That is
// exactly what derivePhase reads as 'build:career-stage' — the card in the report.
const careerStageDraft = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: {},
  experience: [],
  projects: [],
  education: [],
  skills: [],
  coachChats: { studio: [{ who: 'buildstart' }] },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // jsdom has neither, and the chat auto-scrolls on every render.
  window.HTMLElement.prototype.scrollTo = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
  CVService.coachChat.mockResolvedValue({ reply: 'Sure.' });
});

afterEach(() => {
  cleanup();
  ctx = null;
});

describe('StudioChat tells Aria what is on screen', () => {
  it('sends the career-stage card and its three options with the question', async () => {
    await mountStudio(careerStageDraft());
    // The card really is up, so the descriptor is describing what the user can see.
    await waitFor(() =>
      expect(screen.getByText(t('ariaStudio.chat.careerStage.heading'))).toBeTruthy()
    );

    const payload = await ask('can you explain the three options?');

    expect(payload.screen.id).toBe('career-stage');
    expect(payload.screen.title).toBe('Where are you in your career?');
    expect(payload.screen.options.map((o) => o)).toEqual([
      'Student / recent grad',
      'Experienced',
      'Changing careers',
      'Skip for now',
    ]);
  });

  it('sends the career stage too, which this call used to leave off entirely', async () => {
    // Every other coachChat call site sent it; the one place people ask open questions did
    // not, so the general branch never learned they had said they were a student.
    await mountStudio(
      careerStageDraft({
        careerStage: 'grad',
        coachChats: { studio: [{ who: 'buildstart' }, { who: 'careerstage', stage: 'grad' }] },
      })
    );

    const payload = await ask('is my coursework worth putting on here?');

    expect(payload.stage).toBe('grad');
  });

  it('names the section it is in once the user is inside one', async () => {
    // Past the card, the step id does the work it always did — the screen descriptor is
    // an addition, not a replacement.
    await mountStudio(
      careerStageDraft({
        careerStage: 'grad',
        coachChats: {
          studio: [
            { who: 'buildstart' },
            { who: 'careerstage', stage: 'grad' },
            { who: 'jobcard' },
          ],
        },
      })
    );

    const payload = await ask('what should I put here?');

    expect(payload.currentStepId).toBe('target_job');
  });
});
