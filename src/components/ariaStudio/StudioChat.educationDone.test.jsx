// @vitest-environment jsdom
//
// What happens after a qualification is saved.
//
// Education is the only section that ENDS at its form: experience and projects both have
// an achievements stage after it, so Aria has a real next question. Education's form is
// the whole entry, so the conversation used to stop on a line that described an absence
// ("education doesn't need bullets") and offered nothing.
//
// It was a genuine dead end, not just weak wording: "Add another" and "Done with
// education" existed ONLY on the pinned build card, which starts collapsed by design.
// These tests hold the two ways forward in the conversation, where they can be seen.
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

const t = (key, opts) => i18n.t(key, opts);

// A build session with ONE entry pinned. `complete` (every required field filled) is the
// state a save leaves behind, and it is DERIVED from the entry — which is why a refresh
// mid-decision restores this card without a marker of its own.
const draftWith = (entry, section = 'education') => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: section === 'experience' ? [entry] : [],
  projects: [],
  education: section === 'education' ? [entry] : [],
  skills: [],
  careerStage: 'grad',
  coachChats: {
    studio: [
      { who: 'buildintro' },
      { who: 'buildstart', draftId: 'd1' },
      { who: 'careerstage', stage: 'grad' },
      { who: 'buildjobdone', skipped: true },
      { who: 'contactdone' },
      { who: 'pinrole', sortId: entry._sortId, section },
    ],
  },
});

const COMPLETE_QUALIFICATION = {
  _sortId: 'ed1',
  degree: 'BSc Electrical Engineering',
  school: 'UNIBEN',
  graduationDate: '2021',
};

const mountWith = async (draft) => {
  localStorage.setItem('ariaStudio:draftId', 'd1');
  CVService.getDraftById.mockResolvedValue(draft);
  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe('d1'));
};

const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const markersOf = (who) => transcript().filter((m) => m.who === who);

beforeEach(() => {
  ctx = null;
  localStorage.clear();
  vi.clearAllMocks();
  window.HTMLElement.prototype.scrollTo = () => {};
});

afterEach(cleanup);

describe('a saved qualification offers a way forward', () => {
  it('puts BOTH choices in the conversation', async () => {
    // The regression guard. Neither of these was reachable without expanding a card that
    // starts collapsed and gives the user no reason to open it.
    await mountWith(draftWith(COMPLETE_QUALIFICATION));

    expect(
      await screen.findByRole('button', { name: t('ariaStudio.educationSaved.addAnother') })
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: t('ariaStudio.educationSaved.done') })).toBeTruthy();
  });

  it('names what was saved, rather than what education does not need', async () => {
    await mountWith(draftWith(COMPLETE_QUALIFICATION));

    expect(
      await screen.findByText(/BSc Electrical Engineering · UNIBEN is on your CV/)
    ).toBeTruthy();
  });

  it('opens a fresh, empty qualification on "Add another"', async () => {
    await mountWith(draftWith(COMPLETE_QUALIFICATION));

    fireEvent.click(
      await screen.findByRole('button', { name: t('ariaStudio.educationSaved.addAnother') })
    );

    // The finished one is filed as a record, and a new empty row is opened and pinned.
    await waitFor(() => expect(markersOf('rolerecord').length).toBe(1));
    await waitFor(() => expect(ctx.cvData.education.length).toBe(2));
    const pins = markersOf('pinrole');
    expect(pins[pins.length - 1].sortId).not.toBe('ed1');
  });

  it('returns to the section list on "Done with education"', async () => {
    await mountWith(draftWith(COMPLETE_QUALIFICATION));

    fireEvent.click(
      await screen.findByRole('button', { name: t('ariaStudio.educationSaved.done') })
    );

    await waitFor(() => expect(markersOf('educationdone').length).toBe(1));
    expect(markersOf('unpinrole').length).toBe(1);
    // The qualification stays on the CV — finishing the section is not discarding it.
    expect(ctx.cvData.education.length).toBe(1);
  });

  it('stands down when the user types instead of tapping', async () => {
    // It is a PROMPT card, so it behaves like the others: it shrinks to a line rather
    // than sitting through a conversation it has no part in. The entry is on the CV
    // either way, so nothing is lost by collapsing it.
    CVService.coachChat.mockResolvedValue({ reply: 'Yes — list the degree as awarded.' });
    await mountWith(draftWith(COMPLETE_QUALIFICATION));
    await screen.findByRole('button', { name: t('ariaStudio.educationSaved.addAnother') });

    const box = screen.getByPlaceholderText(t('cvBuilder.ariaComposer.placeholder'));
    fireEvent.change(box, { target: { value: 'Should I include my CGPA?' } });
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' });

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: t('ariaStudio.educationSaved.addAnother') })
      ).toBeNull()
    );
    // …and it is a line they can tap to get back, not something lost.
    expect(screen.getByRole('button', { name: /Qualification saved/i })).toBeTruthy();
  });

  it('leaves work history alone — it has its own next question', async () => {
    // Education is the ONLY section without an achievements stage. A finished role goes
    // to the bullet interview, and must not get this card.
    await mountWith(
      draftWith(
        {
          _sortId: 'r1',
          title: 'Field Operator',
          company: 'SLB',
          startDate: 'Jan 2021',
          endDate: 'Present',
          entryType: 'paid',
        },
        'experience'
      )
    );

    await waitFor(() => expect(ctx?.cvData?._id).toBe('d1'));
    expect(
      screen.queryByRole('button', { name: t('ariaStudio.educationSaved.addAnother') })
    ).toBeNull();
  });
});
