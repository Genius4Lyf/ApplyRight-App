// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * THE ROLE OPENER KNOWS WHETHER THERE IS A JOB TO AIM AT.
 *
 * One line served both cases, so a CV being built against a pasted posting opened on
 * exactly the same sentence as one being built against nothing — and the requirement
 * checklist that had just appeared under the composer had nothing anywhere in the
 * conversation saying why it was there. Reported from use.
 *
 * The targeted line deliberately does NOT recite the requirements (the pre-flight card
 * renders directly under it and already names three, tappable). What it adds is the thing
 * that card cannot say: that Aria is holding the posting against the answer herself, so
 * the user should describe what actually happened rather than write toward the advert.
 * That instruction is the whole defence against a tailored interview becoming a
 * fabricated one — which is why the "say what really happened" clause is pinned below
 * rather than left to whoever next edits the string.
 */

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    studioRecompute: vi.fn().mockResolvedValue({ studioScan: null }),
    studioScan: vi.fn(),
    studioBuildStart: vi.fn(),
    getJobKeywords: vi.fn(),
    getKeywordCoverage: vi.fn().mockResolvedValue({ results: [], covered: 0, total: 0 }),
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

const ariaLines = () =>
  (ctx?.cvData?.coachChats?.studio || []).filter((m) => m.who === 'aria').map((m) => m.text || '');

const TARGET = 'Operations & Maintenance Technician';

const draftWith = (targetJob) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  // Seeded so the career-stage card does not stand in front of the capture form. It is
  // asked once per session and has nothing to do with which opener gets chosen.
  careerStage: 'experienced',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [],
  projects: [],
  education: [],
  ...(targetJob ? { targetJob } : {}),
  // Parked on the section hub, past career stage / target job / contact — the build is
  // already underway, which is the only state in which a role interview opens at all.
  coachChats: {
    studio: [{ who: 'buildstart' }, { who: 'buildjobdone' }, { who: 'contactdone' }],
  },
});

// Drive the real capture card to the achievements handoff — the one transition that
// speaks this line. Going through the card rather than calling the helper is the point:
// the bug was in WHICH line gets chosen at that moment, not in either string.
const openARole = async () => {
  await act(async () => {
    ctx.requestStudioCommand('addEntry', 'experience', null);
  });
  // A blank experience entry is asked what KIND it is before the form appears. The
  // generous timeout is real: pinning writes through to the draft and Aria's handoff sits
  // behind a deliberate 600ms beat, so this card lands well past findBy's 1s default.
  // Found OUTSIDE act(): findBy polls on real timers, and inside an act() scope that
  // polling does not let React flush the pin's write-through, so the card never arrives.
  const jobChip = await screen.findByRole('button', { name: 'Job' }, { timeout: 5000 });
  await act(async () => {
    fireEvent.click(jobChip);
  });
  const role = await screen.findByLabelText('Role', {}, { timeout: 5000 });
  fireEvent.change(role, { target: { value: 'Field Technician' } });
  fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'SLB' } });
  fireEvent.change(screen.getByLabelText('Started'), { target: { value: 'Mar 2021' } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  });
  // ariaSays holds the line behind a 600ms "thinking" beat.
  await waitFor(() => expect(ariaLines().join('\n')).toContain('SLB'), { timeout: 3000 });
  return ariaLines().at(-1);
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  i18n.changeLanguage('en');
  ctx = null;
  CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
  CVService.getKeywordCoverage.mockResolvedValue({ results: [], covered: 0, total: 0 });
  vi.stubGlobal('matchMedia', (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  );
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
});

afterEach(cleanup);

describe('the line that opens a role interview', () => {
  it('names the posting it is listening against when there is one', async () => {
    await mountStudio(
      draftWith({
        title: TARGET,
        description: 'Maintain wireline units. Permit-to-Work. Root-cause analysis.',
        brief: {
          role: TARGET,
          mustHaves: [{ name: 'Permit-to-Work', importance: 'must_have' }],
        },
      })
    );
    const said = await openARole();
    expect(said).toContain(TARGET);
  });

  // The de-fabrication clause. Without it the targeted line is just a name-drop, and
  // naming the posting at the top of an interview is exactly the prompt that makes people
  // write toward the advert instead of describing their week.
  it('tells the user to say what really happened rather than write for the advert', async () => {
    await mountStudio(
      draftWith({
        title: TARGET,
        description: 'Maintain wireline units.',
        brief: { role: TARGET, mustHaves: [{ name: 'Permit-to-Work' }] },
      })
    );
    const said = await openARole();
    expect(said.toLowerCase()).toContain('what really happened');
  });

  // The mechanical instruction is load-bearing: the backend splits an answer on full
  // stops to take activities one at a time. Both lines have to carry it.
  it('keeps the full-stop instruction in both versions', async () => {
    await mountStudio(
      draftWith({ title: TARGET, description: 'x', brief: { role: TARGET, mustHaves: [] } })
    );
    expect((await openARole()).toLowerCase()).toContain('full stops');
    cleanup();
    ctx = null;
    await mountStudio(draftWith(null));
    expect((await openARole()).toLowerCase()).toContain('full stops');
  });

  it('falls back to the unaimed line when this CV has no job to aim at', async () => {
    await mountStudio(draftWith(null));
    const said = await openARole();
    expect(said).toBe(i18n.t('ariaStudio.chat.nextLine.achievementsRole', { company: 'SLB' }));
  });

  // An unnamed "the posting" reads as a bluff. A JD can exist with no title — pasted
  // description only — and there the neutral line is not wrong, just unaimed.
  it('falls back to the unaimed line when the posting cannot be named', async () => {
    await mountStudio(draftWith({ description: 'Maintain wireline units.', title: '' }));
    const said = await openARole();
    expect(said).toBe(i18n.t('ariaStudio.chat.nextLine.achievementsRole', { company: 'SLB' }));
  });
});
