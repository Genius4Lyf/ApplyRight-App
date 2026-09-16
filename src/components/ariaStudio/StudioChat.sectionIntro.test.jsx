// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import { EXPERIENCE_TYPES } from '../../lib/sectionIntro';
import StudioChat from './StudioChat';

/**
 * The illustrated brief on the section hub, mounted against the REAL StudioChat.
 *
 * SectionIntroCard's own suite proves the card renders what it is handed. What can only be
 * proved here is that the hub actually hands it the right things and that teaching a
 * section did not cost the ability to enter one:
 *
 *   THE BRIEF IS THERE BEFORE THE SECTION IS — asserted on the hub, with no pin open, on a
 *     transcript that has never entered work history.
 *
 *   THE FIVE EXPERIENCE TYPES ARE EXPLAINED BEFORE THE PICKER ASKS — the picker renders at
 *     a later stage entirely (roleStage 'entryType'), so if the brief ever stopped carrying
 *     them the first thing a user would meet is an unexplained five-way choice.
 *
 *   THE CTA STILL OPENS THE SECTION — a `pinrole` marker appears, which is what derivePhase
 *     reads back on a refresh. The card grew an art band and a scroll container between the
 *     eyebrow and that button; this is the assertion that says the button still works.
 *
 *   THE BRIEF FOLLOWS THE SECTION — closing work history moves the hub to projects, and the
 *     brief has to move with it rather than stay on the section just finished.
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

const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const countOf = (who) => transcript().filter((m) => m.who === who).length;

const brief = () => screen.queryByRole('group', { name: t('ariaStudio.sectionIntro.briefLabel') });
const learnMore = () =>
  screen.queryByRole('button', { name: t('ariaStudio.sectionIntro.learnMore') });

// The brief is behind a disclosure, so reaching it is two steps: wait for the hub card, then
// open it. Reading it without opening would pass against no brief at all.
const openBrief = async () => {
  await waitFor(() => expect(learnMore()).toBeTruthy());
  await act(async () => {
    learnMore().click();
  });
  await waitFor(() => expect(brief()).toBeTruthy());
};

// A build session sitting on the section hub with contact done and nothing else — the
// exact moment someone is handed work history for the first time.
const hubDraft = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [],
  projects: [],
  education: [],
  skills: [],
  coachChats: { studio: [{ who: 'buildstart' }, { who: 'contactdone' }] },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  i18n.changeLanguage('en');
  ctx = null;
  CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
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

describe('StudioChat — the section hub teaches before it hands over', () => {
  it('offers the work-history brief while the section is still unopened', async () => {
    await mountStudio(hubDraft());
    await openBrief();

    expect(screen.getByText(t('ariaStudio.sectionIntro.experience.whatItIs'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.sectionIntro.experience.withAria'))).toBeTruthy();
    // Nothing has been entered: no pin is open.
    expect(countOf('pinrole')).toBe(0);
  });

  it('explains all five kinds of experience before the picker ever asks', async () => {
    await mountStudio(hubDraft());
    await openBrief();

    // The picker itself lives at a later stage and is NOT on screen yet — which is exactly
    // why the brief has to carry the explanations.
    expect(screen.queryByText(t('ariaStudio.chat.experienceType.heading'))).toBeNull();

    const text = brief().textContent;
    EXPERIENCE_TYPES.forEach((key) => {
      expect(text).toContain(t(`ariaStudio.sectionIntro.experience.types.${key}`));
    });
  });

  it('still opens the section when the CTA is tapped', async () => {
    await mountStudio(hubDraft());
    await openBrief();

    const cta = screen.getByRole('button', {
      name: t('ariaStudio.chat.sectionMenu.experienceCtaFirst'),
    });
    await act(async () => {
      cta.click();
    });

    // The marker derivePhase reads back on a refresh — proof the button still reaches
    // enterSection through the new card body.
    await waitFor(() => expect(countOf('pinrole')).toBe(1));
  });

  it('moves the brief on with the hub when a section closes', async () => {
    // Work history already closed, so the hub is offering projects.
    await mountStudio(
      hubDraft({
        coachChats: {
          studio: [{ who: 'buildstart' }, { who: 'contactdone' }, { who: 'experiencedone' }],
        },
      })
    );

    await openBrief();
    expect(screen.getByText(t('ariaStudio.sectionIntro.project.whatItIs'))).toBeTruthy();
    // …and no longer the section just finished.
    expect(screen.queryByText(t('ariaStudio.sectionIntro.experience.whatItIs'))).toBeNull();
  });
});
