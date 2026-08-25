// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * Slice 3c-ii/iii — "Edit with Aria" arriving on the command channel.
 *
 * Mounted against the REAL StudioChat and the REAL provider, exactly like the deleteEntry
 * suite: the thing under test is an effect branch whose whole job is to reach the SAME
 * entry points the flow already has, and a re-implementation of it in the test would keep
 * passing after the shipped branch broke.
 *
 * BOTH session kinds land on the INTERVIEW (3c-iii): build pins the entry and captures its
 * fields, tailor opens the section coach. Neither generates anything on arrival — the
 * rewrite card stays where it is deliberately chosen, from Fix → pick an entry.
 *
 * The transcript is internal state, but StudioChat persists it to cvData.coachChats.studio,
 * so both the pin and the interview's fixstart marker are observable there. Charged output
 * would land on cvData.studioPending, so the tailor assertions read it to prove NOTHING was
 * bought on this path.
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
    // The rewrite CARD fetches its own before/after rows on mount. Never reached here —
    // these tests assert the target and the phase, not the generation — but stubbed so a
    // render can't punch out to a real request.
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
const PROJECT = { _sortId: 'p1', title: 'Difference Engine', description: '• built it' };
const DEGREE = { _sortId: 'e1', degree: 'BSc Maths', school: 'UCL', graduationDate: '2019' };

// A BUILD session sitting on the section hub — no pin open, which is the state the preview
// is realistically used from.
const buildDraft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  education: [{ ...DEGREE }],
  coachChats: { studio: [{ who: 'buildstart' }] },
});

// A TAILOR session past its scan. Both scanned sections carry DIFFERENT gaps, which is
// what proves the interview read the right row: an experience hand-off must not arrive
// carrying the projects gaps, or vice versa.
const tailorDraft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  education: [{ ...DEGREE }],
  studioScan: {
    fitScore: 48,
    sections: [
      {
        key: 'experience',
        label: 'Experience',
        band: 'bad',
        score: 20,
        missingKeywords: ['Kubernetes', 'Terraform'],
      },
      {
        key: 'projects',
        label: 'Projects',
        band: 'bad',
        score: 15,
        missingKeywords: ['GraphQL'],
      },
    ],
  },
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

describe('StudioChat — editWithAria in a BUILD session', () => {
  // The tail of startEntry: the entry already exists, so no create, just pin and go.
  it('pins the existing entry and drops into its field capture', async () => {
    await mountStudio(buildDraft());
    expect(countOf('pinrole')).toBe(0);

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(lastOf('pinrole')).toMatchObject({ sortId: 'a', section: 'experience' });
    // The entry is PINNED, not recreated — the list is untouched.
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a']);
  });

  it('carries the SINGULAR project token through to the pin', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'project', 'p1');
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(lastOf('pinrole')).toMatchObject({ sortId: 'p1', section: 'project' });
    expect(ctx.cvData.projects.map((e) => e._sortId)).toEqual(['p1']);
  });

  // A build session must NOT take the rewrite path: there may be nothing to rewrite yet,
  // and the interview is the build track's own tool.
  it('does not set a rewrite pending', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(ctx.cvData.studioPending ?? null).toBeNull();
  });

  it('clears the command, so the same entry can be handed over twice', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });
    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    // Identical payload but for the nonce — the guard against a handled command re-firing
    // must not also block a genuine second request.
    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });
    await waitFor(() => expect(countOf('pinrole')).toBe(2));
  });

  // The preview's ✎ is the one route into a pin the user did not walk to
  // conversationally. Pinning a card in silence leaves them re-reading a half-finished
  // entry to work out what Aria wants — so she names it and says what's being picked up.
  describe('Aria greets the hand-off instead of pinning in silence', () => {
    const ariaTexts = () =>
      transcript()
        .filter((m) => m.who === 'aria')
        .map((m) => m.text);

    it('names the ROLE and asks for its type when the entry never got one', async () => {
      await mountStudio(buildDraft());

      await act(async () => {
        ctx.requestStudioCommand('editWithAria', 'experience', 'a');
      });

      await waitFor(
        () =>
          expect(ariaTexts()).toContain(
            "Let's pick up Engineer. First — what kind of experience was it?"
          ),
        { timeout: 2500 }
      );
    });

    it('names the PROJECT and asks for its type', async () => {
      await mountStudio(buildDraft());

      await act(async () => {
        ctx.requestStudioCommand('editWithAria', 'project', 'p1');
      });

      await waitFor(
        () =>
          expect(ariaTexts()).toContain(
            "Let's pick up Difference Engine. First — what kind of project is it?"
          ),
        { timeout: 2500 }
      );
    });

    // A finished entry must not be greeted as if it were half-built — the line has to
    // match where the entry actually stopped, since ✎ can land on any stage.
    it('tells the user a COMPLETE entry is already filled in', async () => {
      const draft = buildDraft();
      draft.experience = [
        {
          _sortId: 'a',
          title: 'Engineer',
          company: 'Acme',
          entryType: 'job',
          startDate: '2020',
          endDate: '2023',
          description: '• Shipped the thing',
        },
      ];
      await mountStudio(draft);

      await act(async () => {
        ctx.requestStudioCommand('editWithAria', 'experience', 'a');
      });

      await waitFor(
        () =>
          expect(ariaTexts().some((line) => line.includes('is already filled in'))).toBe(true),
        { timeout: 2500 }
      );
    });

    // The tailor track already had its opener (startInterview pushes one); this must not
    // start double-greeting it.
    it('does not add a second greeting on the TAILOR track', async () => {
      await mountStudio(tailorDraft());

      await act(async () => {
        ctx.requestStudioCommand('editWithAria', 'experience', 'a');
      });

      await waitFor(() => expect(countOf('fixstart')).toBe(1));
      expect(ariaTexts().filter((line) => line.startsWith("Let's pick up"))).toHaveLength(0);
    });
  });
});

describe('StudioChat — editWithAria in a TAILOR session', () => {
  // 3c-iii, the correction: this is the INTERVIEW, not the rewrite. Aria asks first and
  // only generates at the end, once the user picks a count — so the hand-off opens a
  // coach session (fixstart{mode:'coach'}) and buys nothing on the way in.
  it('opens the interview on the entry — a coach fixstart, no rewrite', async () => {
    await mountStudio(tailorDraft());
    expect(countOf('fixstart')).toBe(0);

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(lastOf('fixstart')).toMatchObject({
      mode: 'coach',
      sectionKey: 'experience',
      entry: { section: 'experience', sortId: 'a', title: 'Engineer', company: 'Acme' },
    });

    // The row's OWN gaps ride along, off the live scan — this is what keeps Aria's first
    // question aimed at the terms the section was actually marked down for.
    expect(lastOf('fixstart').missingKeywords).toEqual(['Kubernetes', 'Terraform']);

    // No pin: the pin is the BUILD track's field capture, and this is the fix loop.
    expect(countOf('pinrole')).toBe(0);
  });

  // The generative path must NOT be taken. A rewrite target would put the before→after
  // card in front of the user (and its rows are charged), which is exactly what 3c-ii
  // got wrong.
  it('sets NO rewrite target — nothing is generated on arrival', async () => {
    await mountStudio(tailorDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(ctx.cvData.studioPending ?? null).toBeNull();
    // The rewrite card is what fetches rows; never mounted, so never asked.
    expect(CVService.studioRewriteRole).not.toHaveBeenCalled();

    // And no pending of ANY kind was persisted, on any save.
    const pendings = CVService.saveDraft.mock.calls
      .map(([payload]) => payload?.studioPending)
      .filter((p) => p != null);
    expect(pendings).toEqual([]);
  });

  // The openFix-fallback bug, tested head-on. With no fix open, startInterview used to
  // derive the section from `openFix(messages)?.sectionKey` and fall back to experience —
  // so a PROJECT was interviewed as a job. The caller's section is authoritative now.
  it('marks a PROJECT hand-off as a project, not experience', async () => {
    await mountStudio(tailorDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'project', 'p1');
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    const marker = lastOf('fixstart');
    expect(marker.entry.section).toBe('project');
    expect(marker.entry.section).not.toBe('experience');
    expect(marker).toMatchObject({
      mode: 'coach',
      // The PLURAL scan key, which is what finishFix re-scores by.
      sectionKey: 'projects',
      entry: { section: 'project', sortId: 'p1', title: 'Difference Engine' },
    });
    // And the gaps came off the PROJECTS row, not the experience one.
    expect(marker.missingKeywords).toEqual(['GraphQL']);
  });

  it('clears the command after handling', async () => {
    await mountStudio(tailorDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
  });
});

describe('StudioChat — editWithAria for EDUCATION', () => {
  // The popover never offers this (ENTRY_SOURCE has no education key — education's fix
  // has always been guidance-only), but the guard is load-bearing: a pinrole or a rewrite
  // on a degree would strand the user on a phase with nothing behind it.
  it('is a NO-OP in a build session — no pin, no rewrite', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'education', 'e1');
    });

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(countOf('pinrole')).toBe(0);
    expect(ctx.cvData.studioPending ?? null).toBeNull();
    // And the degree itself is untouched.
    expect(ctx.cvData.education.map((e) => e._sortId)).toEqual(['e1']);
  });

  it('is a NO-OP in a tailor session — no interview, no rewrite', async () => {
    await mountStudio(tailorDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'education', 'e1');
    });

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(ctx.cvData.studioPending ?? null).toBeNull();
    expect(countOf('pinrole')).toBe(0);
    // Education's fix has always been guidance-only: there is no entry interview to open.
    expect(countOf('fixstart')).toBe(0);
  });

  // Still CLEARED, even though nothing was done: a stuck command would block the next
  // one, since the effect is keyed on the payload.
  it('clears the command even though it does nothing', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'education', 'e1');
    });
    await waitFor(() => expect(ctx.studioCommand).toBeNull());

    // The channel still works afterwards.
    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });
    await waitFor(() => expect(countOf('pinrole')).toBe(1));
  });
});

/**
 * The OTHER caller of startInterview, driven through the UI rather than the command
 * channel: Fix a section → pick an entry → rewrite card → "Interview me instead".
 * Generalising startInterview to trust the caller's entry.section must not disturb it,
 * so this walks the whole path for a PROJECT — the case where the two sources of the
 * section (the caller's singular token and the open fix's plural key) both matter.
 */
describe('StudioChat — rewrite → "interview me instead" (existing path)', () => {
  const projectFixDraft = () => ({
    ...tailorDraft(),
    coachChats: {
      studio: [
        { who: 'scan', at: '2026-01-01' },
        {
          who: 'fixstart',
          mode: 'pick',
          sectionKey: 'projects',
          sectionLabel: 'Projects',
          missingKeywords: ['GraphQL'],
          at: '2026-01-02',
        },
      ],
    },
  });

  it('lands on the interview with the PROJECT section intact', async () => {
    await mountStudio(projectFixDraft());

    // fix:pick — the entry picker, from the open projects fix.
    const entry = await screen.findByRole('button', { name: /Difference Engine/ });
    await act(async () => {
      fireEvent.click(entry);
    });

    // fix:rewrite — the card fetches its rows, then offers the interview instead.
    await waitFor(() => expect(ctx.cvData.studioPending?.kind).toBe('rewrite'));
    const instead = await screen.findByRole('button', { name: 'Interview me instead' });
    await act(async () => {
      fireEvent.click(instead);
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(2));
    expect(lastOf('fixstart')).toMatchObject({
      mode: 'coach',
      sectionKey: 'projects',
      entry: { section: 'project', sortId: 'p1', title: 'Difference Engine' },
    });
    // The abandoned rewrite target is dropped, so a refresh doesn't reopen the card.
    expect(ctx.cvData.studioPending ?? null).toBeNull();
  });
});
