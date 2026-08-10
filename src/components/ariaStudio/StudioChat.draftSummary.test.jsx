// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * "Draft with Aria" on the summary, arriving on the command channel.
 *
 * Mounted against the REAL StudioChat and the REAL provider, like the suggestSkills suite
 * it mirrors: the branch exists only to reach the summary flow each session kind ALREADY
 * has, so what has to be proved is that it lands on the same card those entry points do.
 *
 * The properties worth guarding:
 *
 *   IT ROUTES BY SESSION KIND — build:summary for a build, fix:summary (through handleFix)
 *     for a tailor. The tailor side is asserted on the fixstart marker, which is both what
 *     handleFix pushes and what derivePhase reads back on a refresh.
 *
 *   IT OPENS ON THE FIRST STEP, NOT STALE OUTPUT — the point of the state reset. Asserted
 *     from a session whose summary card was already showing a generated draft.
 *
 *   THE STORED CAREER STAGE IS USED, NOT RE-ASKED — the chips are absent whenever the
 *     draft carries one, which is what makes this entry point feel like a continuation
 *     rather than a fresh interrogation.
 *
 * The null sortId is the other reason this file exists: like suggestSkills, this command
 * carries no entry id, and it shares the effect with two branches that are both about a
 * specific entry.
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
    // The paid generation behind this card. Never reached — the command stops at the
    // stage/consent step — but stubbed so a stray render can't punch out to a real
    // request, and asserted against so "routes to the flow" can't quietly become
    // "routes to the flow AND buys a draft".
    coachSummary: vi.fn(),
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

// SummaryFixCard's first step, whichever heading it draws: "where are you?" when it still
// needs a stage, "ready to write" when one is already known. Both mean the same thing here
// — the card is open and nothing has been generated yet.
const firstStep = () =>
  screen.queryByText(t('ariaStudio.summaryFix.readyToWrite')) ||
  screen.queryByText(t('ariaStudio.summaryFix.whereAreYou'));
// The three chips are the stage QUESTION. Their absence is how "Aria never re-asks" is
// visible on screen.
const stageChips = () =>
  ['grad', 'experienced', 'changer']
    .map((k) => screen.queryByText(t(`ariaStudio.summaryFix.stages.${k}.label`)))
    .filter(Boolean);

const draftSummary = async () => {
  await act(async () => {
    ctx.requestStudioCommand('draftSummary', 'summary', null);
  });
};

const ROLE = { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• shipped one' };
const PROJECT = { _sortId: 'p1', title: 'Difference Engine', description: '• built it' };

const STALE_DRAFT = 'A summary written on an earlier visit, from an earlier angle.';

// A BUILD session on the section hub — no pin open, which is the state the preview is
// realistically used from.
const buildDraft = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  targetJob: { title: 'Host', description: 'Hospitality experience preferred.' },
  careerStage: 'experienced',
  professionalSummary: '',
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
  careerStage: 'experienced',
  professionalSummary: 'Front desk lead.',
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  education: [],
  skills: [],
  studioScan: {
    scannedAt: '2026-01-01T00:00:00.000Z',
    fitScore: 48,
    sections: [
      {
        key: 'summary',
        label: 'Summary',
        band: 'bad',
        score: 4,
        max: 15,
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

describe('StudioChat — draftSummary in a BUILD session', () => {
  it('opens build:summary on its first step', async () => {
    await mountStudio(buildDraft());
    expect(firstStep()).toBeNull();

    await draftSummary();

    // The same card the section hub's Summary row opens, on the same step.
    await waitFor(() => expect(firstStep()).toBeTruthy());
    // Nothing is bought on the way in — the consent step is the point of it.
    expect(CVService.coachSummary).not.toHaveBeenCalled();
  });

  it('takes the BUILD route, not the fix loop', async () => {
    await mountStudio(buildDraft());

    await draftSummary();

    await waitFor(() => expect(firstStep()).toBeTruthy());
    // fixstart is the tailor track's marker; a build session has no fix to open.
    expect(countOf('fixstart')).toBe(0);
  });

  it('resets a stale draft so the card opens on the first step, not on someone else\u2019s sentence', async () => {
    // The state reset, asserted from the one situation that can produce it: a session
    // whose summary card was already showing a generated draft. Reopening onto that would
    // present an old sentence as though it had just been written — with "Try another
    // angle" already spent.
    await mountStudio(
      buildDraft({
        studioPending: {
          kind: 'summary',
          workflow: 'build',
          draft: STALE_DRAFT,
          wasReroll: true,
          stage: 'experienced',
        },
      })
    );
    // Rehydrated onto the draft, as a refresh would.
    expect(await screen.findByText(STALE_DRAFT)).toBeTruthy();

    await draftSummary();

    await waitFor(() => expect(firstStep()).toBeTruthy());
    expect(screen.queryByText(STALE_DRAFT)).toBeNull();
    // The reroll flag goes with it — the next draft is a first draft, not "another angle".
    expect(screen.queryByText(t('ariaStudio.summaryFix.anotherAngle'))).toBeNull();
    // The PAID pending itself is left alone: it is bought output, and this command is not
    // a decision to throw it away. Same call the skills branch makes.
    expect(ctx.cvData.studioPending?.draft).toBe(STALE_DRAFT);
  });

  it('clears the command, so the button works twice', async () => {
    await mountStudio(buildDraft());

    await draftSummary();
    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    await waitFor(() => expect(firstStep()).toBeTruthy());

    // Identical payload but for the nonce — the re-fire guard must not also block a
    // genuine second request.
    await draftSummary();
    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(firstStep()).toBeTruthy();
  });
});

describe('StudioChat — draftSummary in a TAILOR session', () => {
  it('enters fix:summary exactly as tapping Fix on the summary row does', async () => {
    await mountStudio(tailorDraft());
    expect(countOf('fixstart')).toBe(0);

    await draftSummary();

    // The marker handleFix pushes — and the one derivePhase reads on a refresh to put the
    // user back on fix:summary. Going THROUGH handleFix is what stops this entry point
    // and the Fix button from ever drifting apart.
    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(lastOf('fixstart')).toMatchObject({ mode: 'summary', sectionKey: 'summary' });
    // Aria's own intro for the fix, said once, so the card doesn't arrive unannounced —
    // and said by handleFix, not duplicated by the command branch. Counted on SCREEN, not
    // in cvData: ariaSays renders on a timer and the transcript is persisted separately,
    // so the rendered bubbles are what "said once" actually means here.
    expect(await screen.findByText(t('ariaStudio.chat.fixSummary'))).toBeTruthy();
    expect(screen.getAllByText(t('ariaStudio.chat.fixSummary'))).toHaveLength(1);
    await waitFor(() => expect(firstStep()).toBeTruthy());

    expect(CVService.coachSummary).not.toHaveBeenCalled();
  });

  it("carries the scan row's own gaps as context", async () => {
    await mountStudio(tailorDraft());

    await draftSummary();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(lastOf('fixstart').missingKeywords).toEqual(['Guest relations', 'POS systems']);
  });

  it('works with NO scan at all — the rewrite grounds on the CV, not the gaps', async () => {
    // The preview is reachable before a scan, so the entry point has to survive one being
    // absent. Empty context, same flow.
    await mountStudio(tailorDraft({ studioScan: null, coachChats: { studio: [] } }));

    await draftSummary();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    const marker = lastOf('fixstart');
    expect(marker).toMatchObject({ mode: 'summary', sectionKey: 'summary' });
    expect(marker.missingKeywords).toEqual([]);
    // Labelled from the section vocabulary, so the transcript still names the section.
    expect(marker.sectionLabel).toBe(t('ariaStudio.studioFlow.sections.summary'));
    await waitFor(() => expect(firstStep()).toBeTruthy());
  });

  it('does not take the BUILD route', async () => {
    await mountStudio(tailorDraft());

    await draftSummary();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    // A pin is the build track's field capture; the fix loop never opens one.
    expect(countOf('pinrole')).toBe(0);
  });

  it('clears the command after handling', async () => {
    await mountStudio(tailorDraft());

    await draftSummary();

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
  });
});

describe('StudioChat — draftSummary and the stored career stage', () => {
  // The command branch does nothing about the stage on purpose: SummaryFixCard hides its
  // chips whenever careerStage is set, and that flows from cvData. These two tests are
  // what keep "nothing special" honest — if the card stopped reading the stored stage,
  // the user would be re-interrogated about something the draft already knows.
  it('goes straight to "ready to write" in a build session that stored one', async () => {
    await mountStudio(buildDraft({ careerStage: 'changer' }));

    await draftSummary();

    expect(await screen.findByText(t('ariaStudio.summaryFix.readyToWrite'))).toBeTruthy();
    expect(stageChips()).toHaveLength(0);
  });

  it('goes straight to "ready to write" in a tailor session that stored one', async () => {
    await mountStudio(tailorDraft({ careerStage: 'grad' }));

    await draftSummary();

    expect(await screen.findByText(t('ariaStudio.summaryFix.readyToWrite'))).toBeTruthy();
    expect(stageChips()).toHaveLength(0);
  });

  it('asks — the correct fallback — when the draft has no stage stored', async () => {
    // An older CV, saved before the stage was captured. Guessing would be worse than
    // asking, so the chips are right here and must not be "fixed" away.
    await mountStudio(buildDraft({ careerStage: null }));

    await draftSummary();

    expect(await screen.findByText(t('ariaStudio.summaryFix.whereAreYou'))).toBeTruthy();
    expect(stageChips()).toHaveLength(3);
  });
});

describe('StudioChat — draftSummary is not the other commands', () => {
  // It carries a null sortId and shares the effect with two branches that are both about a
  // specific entry. If either stopped guarding on its own type, this command would fall
  // into it — deleting or pinning something the user never pointed at.
  it('deletes nothing and pins nothing in a build session', async () => {
    await mountStudio(buildDraft());

    await draftSummary();

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a']);
    expect(ctx.cvData.projects.map((e) => e._sortId)).toEqual(['p1']);
    expect(countOf('pinrole')).toBe(0);
    expect(countOf('unpinrole')).toBe(0);
  });

  it('deletes nothing and opens no entry interview in a tailor session', async () => {
    await mountStudio(tailorDraft());

    await draftSummary();

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a']);
    expect(ctx.cvData.projects.map((e) => e._sortId)).toEqual(['p1']);
    // The SECTION fix, not an entry one: editWithAria's marker carries an entry, this one
    // must not.
    expect(lastOf('fixstart').entry ?? null).toBeNull();
    expect(lastOf('fixstart').mode).not.toBe('coach');
  });

  it('never writes the summary itself — the card does that, after the user says so', async () => {
    await mountStudio(buildDraft({ professionalSummary: 'Untouched.' }));

    await draftSummary();

    await waitFor(() => expect(firstStep()).toBeTruthy());
    // Routing is not generating, and it is certainly not applying.
    expect(ctx.cvData.professionalSummary).toBe('Untouched.');
    expect(CVService.coachSummary).not.toHaveBeenCalled();
  });
});
