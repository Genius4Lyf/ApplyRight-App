// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { PROJECT_TYPES } from '../../lib/studioFlow';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * Slice 3d — a project's TYPE now lives on the entry, not only in the transcript.
 *
 * Mounted against the REAL StudioChat and the REAL provider (same harness as the
 * editWithAria suite) because the claim spans both: the card that asks, the writer that
 * persists, and the gate that decides whether to ask at all. A hand-rolled stand-in for
 * any one of them would keep passing after the shipped path broke.
 *
 * The pin is restored from the seeded transcript rather than driven through the create
 * flow — that IS the refresh path, and it puts each test directly on the state it is
 * about.
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
const markersOf = (who) => transcript().filter((m) => m.who === who);

const COURSE = PROJECT_TYPES.find((pt) => pt.key === 'course');
const ask = () => i18n.t('ariaStudio.projectType.whatKind');
const courseLabel = () => i18n.t(COURSE.labelKey);

// A build session parked on a pinned PROJECT — the state the type question is asked from.
const pinnedProjectDraft = (project, extraMarkers = []) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [],
  projects: [project],
  education: [],
  coachChats: {
    studio: [
      { who: 'buildintro' },
      { who: 'buildstart' },
      { who: 'buildjobdone', skipped: true },
      { who: 'contactdone' },
      ...extraMarkers,
      { who: 'pinrole', sortId: project._sortId, section: 'project' },
    ],
  },
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

describe('StudioChat — picking a project type persists it on the entry', () => {
  const blankProject = { _sortId: 'p1', title: '' };

  it('writes entryType onto the entry AND keeps the transcript marker', async () => {
    await mountStudio(pinnedProjectDraft(blankProject));
    expect(await screen.findByText(ask())).toBeTruthy();

    fireEvent.click(screen.getByText(courseLabel()));

    // The entry is the durable record — a tailored copy and a later interview both read
    // it, and neither can see this thread's markers.
    await waitFor(() => expect(ctx.cvData.projects[0].entryType).toBe('course'));

    // The marker stays: the build flow and refresh recovery still read it, and the
    // backend's project prompt reads the type off the conversation turn beside it.
    const marker = markersOf('projecttype').at(-1);
    expect(marker).toMatchObject({ sortId: 'p1', type: 'course' });
  });

  it('saves through the NARROW patch — only { _id, projects }', async () => {
    await mountStudio(pinnedProjectDraft(blankProject));
    expect(await screen.findByText(ask())).toBeTruthy();

    fireEvent.click(screen.getByText(courseLabel()));

    await waitFor(() => {
      const payload = CVService.saveDraft.mock.calls.map((c) => c[0]).find((p) => p?.projects);
      expect(payload).toBeTruthy();
      // A wider payload is how a concurrent edit elsewhere in the draft gets clobbered.
      expect(Object.keys(payload).sort()).toEqual(['_id', 'projects']);
      expect(payload.projects[0].entryType).toBe('course');
    });
  });

  it('does not block the conversation on the entry save', async () => {
    // Hold ONLY the projects write; everything else (the transcript save) resolves as
    // normal, so what is being timed is the entry save alone.
    let release;
    CVService.saveDraft.mockImplementation((payload) =>
      payload?.projects
        ? new Promise((resolve) => {
            release = () => resolve({ _id: 'd1' });
          })
        : Promise.resolve({ _id: 'd1' })
    );
    await mountStudio(pinnedProjectDraft(blankProject));
    expect(await screen.findByText(ask())).toBeTruthy();

    fireEvent.click(screen.getByText(courseLabel()));

    // The thread moves on and the entry reads as typed while that write is still in
    // flight — awaiting it would stall the conversation behind the network.
    await waitFor(() => expect(markersOf('projecttype')).toHaveLength(1));
    expect(ctx.cvData.projects[0].entryType).toBe('course');
    release?.();
  });
});

describe('StudioChat — a project whose type is already known is not asked again', () => {
  it('SKIPS the type card for an entry carrying entryType', async () => {
    // The tailored-copy / edit-with-Aria case: no marker anywhere in this transcript, and
    // before this slice Aria re-asked a question the user had already answered.
    await mountStudio(pinnedProjectDraft({ _sortId: 'p1', title: '', entryType: 'personal' }));

    // Something is on screen (the pin resolved), but it is not the type question.
    await waitFor(() => expect(ctx.cvData.projects[0].entryType).toBe('personal'));
    expect(screen.queryByText(ask())).toBeNull();
  });

  it('still SKIPS it for a marker-only project — no regression mid-build', async () => {
    // A session that picked its type before the field existed: the transcript is the only
    // record, and the resolver must keep honouring it.
    await mountStudio(
      pinnedProjectDraft({ _sortId: 'p1', title: '' }, [
        { who: 'projecttype', sortId: 'p1', type: 'work' },
      ])
    );

    await waitFor(() => expect(ctx.cvData.projects.length).toBe(1));
    expect(screen.queryByText(ask())).toBeNull();
  });

  it('DOES ask when neither the entry nor the transcript knows', async () => {
    // The control: without this the two assertions above would pass on a card that never
    // renders at all.
    await mountStudio(pinnedProjectDraft({ _sortId: 'p1', title: '' }));
    expect(await screen.findByText(ask())).toBeTruthy();
  });
});
