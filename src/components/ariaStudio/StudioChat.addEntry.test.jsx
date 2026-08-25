// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * The Live Preview's "Build with Aria" add-entry footer, arriving on the SAME command
 * channel as editWithAria/deleteEntry. `addEntry` carries no sortId — there is no entry
 * yet — so it routes to enterSection, which is the exact tail startEntry already uses for
 * the section-hub "Add a role/project/degree" buttons: create a real (blank) entry so
 * generate-bullets has something to resolve by _sortId, pin it, and drop into the
 * from-scratch interview.
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

const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const countOf = (who) => transcript().filter((m) => m.who === who).length;
const lastOf = (who) =>
  transcript()
    .filter((m) => m.who === who)
    .at(-1);

const ROLE = { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• shipped one' };

const buildDraft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ ...ROLE }],
  projects: [],
  education: [],
  coachChats: { studio: [{ who: 'buildstart' }] },
});

const tailorDraft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ ...ROLE }],
  projects: [],
  education: [],
  studioScan: { fitScore: 60, sections: [] },
  coachChats: { studio: [{ who: 'scan', at: '2026-01-01' }] },
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

afterEach(() => {
  cleanup();
});

describe('StudioChat — addEntry in a BUILD session', () => {
  it('creates a new entry, pins it, and enters the section build phase', async () => {
    await mountStudio(buildDraft());
    expect(countOf('pinrole')).toBe(0);

    await act(async () => {
      ctx.requestStudioCommand('addEntry', 'experience', null);
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    // A SECOND experience entry now exists — the add created one, it didn't reuse 'a'.
    expect(ctx.cvData.experience).toHaveLength(2);
    const newSortId = ctx.cvData.experience.find((e) => e._sortId !== 'a')._sortId;
    expect(lastOf('pinrole')).toMatchObject({ sortId: newSortId, section: 'experience' });
  });

  it('carries the SINGULAR project token through to the new entry', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('addEntry', 'project', null);
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(ctx.cvData.projects).toHaveLength(1);
    expect(lastOf('pinrole')).toMatchObject({
      sortId: ctx.cvData.projects[0]._sortId,
      section: 'project',
    });
  });

  it('creates a new education entry the same way', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('addEntry', 'education', null);
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(ctx.cvData.education).toHaveLength(1);
    expect(lastOf('pinrole')).toMatchObject({
      sortId: ctx.cvData.education[0]._sortId,
      section: 'education',
    });
  });

  // "Let's start with your most recent experience" is right the first time and wrong every
  // time after — "+ Add" can fire on a section that already has entries, where "let's
  // start" reads as if Aria lost the thread.
  describe('the opener matches whether the section is empty', () => {
    const ariaTexts = () =>
      (ctx?.cvData?.coachChats?.studio || []).filter((m) => m.who === 'aria').map((m) => m.text);

    it('opens the SECTION when it is still empty', async () => {
      const draft = buildDraft();
      draft.projects = [];
      await mountStudio(draft);

      await act(async () => {
        ctx.requestStudioCommand('addEntry', 'project', null);
      });

      await waitFor(
        () => expect(ariaTexts()).toContain("Let's add a project. First — what kind is it?"),
        { timeout: 2500 }
      );
    });

    it('says "next one" when the section already has entries', async () => {
      const draft = buildDraft(); // already carries one experience entry
      await mountStudio(draft);

      await act(async () => {
        ctx.requestStudioCommand('addEntry', 'experience', null);
      });

      await waitFor(
        () =>
          expect(ariaTexts()).toContain('Next one — what kind of experience was this?'),
        { timeout: 2500 }
      );
      expect(ariaTexts().some((line) => line.includes("Let's start with your most recent"))).toBe(
        false
      );
    });
  });

  it('clears the command, so a second add is not blocked', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('addEntry', 'experience', null);
    });
    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await act(async () => {
      ctx.requestStudioCommand('addEntry', 'experience', null);
    });
    await waitFor(() => expect(countOf('pinrole')).toBe(2));
    expect(ctx.cvData.experience).toHaveLength(3);
  });
});

describe('StudioChat — addEntry in a TAILOR session', () => {
  // Tailor sessions arrive with a finished CV in hand — there is no from-scratch build
  // track to route into, so the command is a no-op (still cleared, so it can't jam the
  // channel for a later command).
  it('is a NO-OP — no entry created, no pin', async () => {
    await mountStudio(tailorDraft());

    await act(async () => {
      ctx.requestStudioCommand('addEntry', 'experience', null);
    });

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(countOf('pinrole')).toBe(0);
    expect(ctx.cvData.experience).toHaveLength(1);
  });
});
