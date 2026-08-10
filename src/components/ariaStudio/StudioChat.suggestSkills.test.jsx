// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * "Suggest skills with Aria" arriving on the command channel.
 *
 * Mounted against the REAL StudioChat and the REAL provider, like the editWithAria and
 * deleteEntry suites: the branch under test exists only to reach the skills flow each
 * session kind ALREADY has, so what has to be proved is that it lands on the same screen
 * those entry points do. A test that re-implemented the routing would keep passing after
 * the shipped branch stopped matching them.
 *
 * The two properties worth guarding:
 *
 *   IT ROUTES BY SESSION KIND — build:skills for a build, the fix:skills flow for a
 *     tailor. Both are asserted on the CARD the user ends up looking at plus the
 *     transcript marker, which is what derivePhase reads back on a refresh.
 *
 *   IT LANDS ON THE CONSENT PHASE, NOT STALE OUTPUT — the whole point of the state reset.
 *     Asserted from a session whose skills card was already showing suggestions.
 *
 * The null sortId is the other reason this file exists: the command is the first one sent
 * without an entry id, and the branches either side of it (editWithAria, deleteEntry) are
 * both about a specific entry.
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
    // The paid generation. Never reached — this path stops at the consent card — but
    // stubbed so a stray render can't punch out to a real request, and asserted against
    // so "routes to the flow" can't quietly become "starts the flow AND buys the output".
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
const lastOf = (who) =>
  transcript()
    .filter((m) => m.who === who)
    .at(-1);

// The consent phase of the skills card, whichever body it renders — the copy differs on
// whether a target job is set, and that isn't what any of these tests are about.
const consentCard = () =>
  screen.queryByText(t('ariaStudio.skillsBuild.bodyWithJob')) ||
  screen.queryByText(t('ariaStudio.skillsBuild.bodyNoJob'));

const suggest = async () => {
  await act(async () => {
    ctx.requestStudioCommand('suggestSkills', 'skills', null);
  });
};

const ROLE = { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• shipped one' };
const PROJECT = { _sortId: 'p1', title: 'Difference Engine', description: '• built it' };

// Two categories, so a rehydrated picker is unmistakable on screen.
const SUGGESTIONS = [
  { category: 'Guest Service', skills: ['Guest relations'] },
  { category: 'Operations', skills: ['Shift scheduling'] },
];

// A BUILD session on the section hub — no pin open, which is the state the preview is
// realistically used from.
const buildDraft = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  targetJob: { title: 'Host', description: 'Hospitality experience preferred.' },
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  education: [],
  skills: [],
  coachChats: { studio: [{ who: 'buildstart' }] },
  ...over,
});

// A TAILOR session past its scan, sitting on the results.
const tailorDraft = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  targetJob: { title: 'Host', description: 'Hospitality experience preferred.' },
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  education: [],
  skills: [],
  studioScan: {
    scannedAt: '2026-01-01T00:00:00.000Z',
    fitScore: 48,
    sections: [
      {
        key: 'skills',
        label: 'Skills',
        band: 'bad',
        score: 8,
        max: 25,
        missingKeywords: ['Guest relations', 'POS systems'],
      },
    ],
  },
  coachChats: { studio: [{ who: 'scan', at: '2026-01-01T00:00:00.000Z' }] },
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

describe('StudioChat — suggestSkills in a BUILD session', () => {
  it('opens build:skills on its consent phase', async () => {
    await mountStudio(buildDraft());
    expect(consentCard()).toBeNull();

    await suggest();

    // The same card the section hub's Skills row opens, on the same phase: the paid route
    // and the free one, neither taken yet.
    await waitFor(() => expect(consentCard()).toBeTruthy());
    expect(screen.getByText(t('ariaStudio.skillsBuild.typeYourselfFree'))).toBeTruthy();
    // Nothing is bought on the way in — the consent step is the point of it.
    expect(CVService.generateSkills).not.toHaveBeenCalled();
  });

  it('takes the BUILD route, not the fix loop', async () => {
    await mountStudio(buildDraft());

    await suggest();

    await waitFor(() => expect(consentCard()).toBeTruthy());
    // fixstart is the tailor track's marker; a build session has no fix to open.
    expect(countOf('fixstart')).toBe(0);
  });

  it('resets stale suggestions so the card opens on consent, not on an earlier picker', async () => {
    // The state reset, asserted from the one situation that can produce it: a session
    // whose skills card was already showing generated output. Reopening onto that picker
    // would drop the user back into the middle of a flow they just restarted.
    await mountStudio(
      buildDraft({
        studioPending: { kind: 'skills', data: { suggestions: SUGGESTIONS, bestForRole: [] } },
      })
    );
    // Rehydrated onto the picker, as a refresh would.
    expect(await screen.findByText('Guest Service')).toBeTruthy();

    await suggest();

    await waitFor(() => expect(consentCard()).toBeTruthy());
    expect(screen.queryByText('Guest Service')).toBeNull();
    // The PAID pending itself is left alone — it is bought output, and this command is not
    // a decision to throw it away.
    expect(ctx.cvData.studioPending?.data?.suggestions).toHaveLength(2);
  });

  it('clears the command, so the button works twice', async () => {
    await mountStudio(buildDraft());

    await suggest();
    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    await waitFor(() => expect(consentCard()).toBeTruthy());

    // Identical payload but for the nonce — the re-fire guard must not also block a
    // genuine second request.
    await suggest();
    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(consentCard()).toBeTruthy();
  });
});

describe('StudioChat — suggestSkills in a TAILOR session', () => {
  it('enters fix:skills exactly as tapping Fix on the skills row does', async () => {
    await mountStudio(tailorDraft());
    expect(countOf('fixstart')).toBe(0);

    await suggest();

    // The marker handleFix pushes — and the one derivePhase reads on a refresh to put the
    // user back on fix:skills.
    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(lastOf('fixstart')).toMatchObject({ mode: 'skills', sectionKey: 'skills' });
    // Aria's own intro for the fix, said once, so the card doesn't arrive unannounced.
    expect(await screen.findByText(t('ariaStudio.chat.fixSkillsIntro'))).toBeTruthy();
    expect(await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'))).toBeTruthy();
    expect(CVService.generateSkills).not.toHaveBeenCalled();
  });

  it("carries the scan row's own gaps as context", async () => {
    await mountStudio(tailorDraft());

    await suggest();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(lastOf('fixstart').missingKeywords).toEqual(['Guest relations', 'POS systems']);
  });

  it('works with NO scan at all — the generation grounds on the CV, not the gaps', async () => {
    // The preview is reachable before a scan, so the entry point has to survive one being
    // absent. Empty context, same flow.
    await mountStudio(tailorDraft({ studioScan: null, coachChats: { studio: [] } }));

    await suggest();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    const marker = lastOf('fixstart');
    expect(marker).toMatchObject({ mode: 'skills', sectionKey: 'skills' });
    expect(marker.missingKeywords).toEqual([]);
    // Labelled from the section vocabulary, so the transcript still names the section.
    expect(marker.sectionLabel).toBe(t('ariaStudio.studioFlow.sections.skills'));
    expect(await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'))).toBeTruthy();
  });

  it('does not take the BUILD route', async () => {
    await mountStudio(tailorDraft());

    await suggest();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    // A pin is the build track's field capture; the fix loop never opens one.
    expect(countOf('pinrole')).toBe(0);
  });

  it('clears the command after handling', async () => {
    await mountStudio(tailorDraft());

    await suggest();

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
  });
});

describe('StudioChat — suggestSkills is not the other commands', () => {
  // It is the first command sent with a null sortId, and it shares the effect with two
  // branches that are both about a specific entry. If either stopped guarding on its own
  // type, this command would fall into it — deleting or pinning something the user never
  // pointed at.
  it('deletes nothing and pins nothing in a build session', async () => {
    await mountStudio(buildDraft());

    await suggest();

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a']);
    expect(ctx.cvData.projects.map((e) => e._sortId)).toEqual(['p1']);
    expect(countOf('pinrole')).toBe(0);
    expect(countOf('unpinrole')).toBe(0);
  });

  it('deletes nothing and opens no entry interview in a tailor session', async () => {
    await mountStudio(tailorDraft());

    await suggest();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a']);
    expect(ctx.cvData.projects.map((e) => e._sortId)).toEqual(['p1']);
    // The SECTION fix, not an entry one: editWithAria's marker carries an entry, this
    // one must not.
    expect(lastOf('fixstart').entry ?? null).toBeNull();
    expect(lastOf('fixstart').mode).not.toBe('coach');
  });
});
