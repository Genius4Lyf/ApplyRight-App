// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * THE SKILLS FIX — grounded and categorized, not a JD keyword dump.
 *
 * The old fix listed the scan's raw missing keywords and wrote whatever was ticked
 * straight onto the CV. Those "keywords" are JD requirement SENTENCES ("Previous
 * experience in a hospitality role"), so the section filled up with prose nobody would
 * ever put under Skills, all of it stacked under one 'Uncategorized' heading.
 *
 * The replacement is the flow the BUILD track already ships — SkillsBuildCard: consent →
 * paid generation read from this CV's own history → SkillsCard's grouped picker → apply.
 * What each test below protects is a property of that swap, not the wiring:
 *
 *   CATEGORIES ARE REAL — the picks carry the categories the generation gave them. This
 *     is the actual complaint being fixed, so it is asserted on the SKILLS THAT LAND ON
 *     THE CV rather than on a callback argument.
 *
 *   PAID OUTPUT SURVIVES — the generation is charged, so it is persisted with
 *     workflow:'fix' and cleared on apply. Without the flag a refresh re-derives to
 *     build:skills and hands the user the wrong card for suggestions they already own.
 *
 *   NO WORK, NO RECEIPT — an all-duplicate apply must not close the fix: finishFix spends
 *     a recompute and lands an "added" record, and both would be lying.
 *
 * The real StudioChat is mounted. The observable outputs are CVService (generateSkills,
 * saveDraft, studioRecompute) and ctx.cvData.
 */

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
    generateSkills: vi.fn(),
    studioRecompute: vi.fn(),
    studioScan: vi.fn(),
    getJobKeywords: vi.fn(),
    studioBriefPreview: vi.fn(),
    studioTailorStart: vi.fn(),
    studioProjectIdeas: vi.fn(),
    coachChat: vi.fn(),
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

// Two categories from the generation. 'Uncategorized' never appears — that is the point.
const SUGGESTIONS = [
  { category: 'Guest Service', skills: ['Guest relations', 'Complaint resolution'] },
  { category: 'Operations', skills: ['Shift scheduling'] },
];

// A scanned TAILORING sitting in an OPEN skills fix. The fixstart marker is what puts
// derivePhase on 'fix:skills'; the scan's missingKeywords are the JD sentences the old
// card used to render as tickable "skills".
const fixingSkills = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  targetJob: { title: 'Host', description: 'Previous experience in a hospitality role.' },
  experience: [{ _sortId: 'a', title: 'Server', company: 'Acme', description: '• served' }],
  projects: [],
  education: [],
  skills: [],
  professionalSummary: 'Front of house.',
  studioScan: {
    scannedAt: '2026-01-01T00:00:00.000Z',
    fitScore: 55,
    sections: [
      {
        key: 'skills',
        label: 'Skills',
        score: 8,
        max: 25,
        band: 'bad',
        missingKeywords: ['Previous experience in a hospitality role'],
      },
    ],
  },
  coachChats: {
    studio: [
      { who: 'scan', at: '2026-01-01T00:00:00.000Z' },
      { who: 'fixstart', mode: 'skills', sectionKey: 'skills', sectionLabel: 'Skills' },
    ],
  },
  ...over,
});

const mountStudio = async (draft) => {
  localStorage.setItem('ariaStudio:draftId', draft._id);
  CVService.getDraftById.mockResolvedValue(draft);
  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe(draft._id));
  return ctx;
};

// The generate button carries the price, and the price is read from the model tier — so
// it is matched on the copy either side of {{cost}} rather than on a hard-coded number.
const clickGenerate = () => fireEvent.click(screen.getByText(/Find my skills/i));

// The last studioPending written to the server — the thing a refresh would read back.
const lastPersistedPending = () => {
  const calls = CVService.saveDraft.mock.calls.filter((c) => 'studioPending' in (c[0] || {}));
  return calls.length ? calls[calls.length - 1][0].studioPending : undefined;
};

// The transcript as StudioChat persists it — a real observable output, same as the
// sibling StudioChat suites read.
const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const has = (who) => transcript().some((m) => m.who === who);

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  ctx = null;
  // jsdom implements neither; the chat's stick-to-bottom hook calls them on mount.
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};

  CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
  CVService.studioRecompute.mockResolvedValue({
    fitScore: 62,
    sections: [{ key: 'skills', label: 'Skills', score: 18, max: 25, band: 'warn' }],
  });
  CVService.generateSkills.mockResolvedValue({
    suggestions: SUGGESTIONS,
    bestForRole: ['Guest relations'],
    remainingCredits: 40,
  });
});

afterEach(cleanup);

describe('fix:skills renders the grounded card, not the keyword checklist', () => {
  it('opens on the consent phase of the BUILD skills card', async () => {
    await mountStudio(fixingSkills());

    // The consent copy and both routes onto it: paid generation and free manual entry.
    expect(await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.skillsBuild.typeYourselfFree'))).toBeTruthy();
  });

  it('never offers a raw JD requirement SENTENCE as a tickable skill', async () => {
    // The exact string the user reported landing on their CV as a "skill".
    await mountStudio(fixingSkills());
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));
    expect(screen.queryByText(/Previous experience in a hospitality role/i)).toBeNull();
  });
});

describe('the paid generation', () => {
  it('reads THIS CV and persists the result under workflow:"fix"', async () => {
    await mountStudio(fixingSkills());
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));

    clickGenerate();

    await waitFor(() => expect(CVService.generateSkills).toHaveBeenCalled());

    // Grounded: the generation is handed the CV's own history plus the JD.
    const [education, experience, projects, jd] = CVService.generateSkills.mock.calls[0];
    expect(experience[0].title).toBe('Server');
    expect(jd).toMatch(/hospitality/i);
    expect(education).toEqual([]);
    expect(projects).toEqual([]);

    // Charged output, so it has to survive a refresh — and `workflow` is what sends
    // derivePhase back to fix:skills rather than the build card.
    await waitFor(() => {
      const pending = lastPersistedPending();
      expect(pending?.kind).toBe('skills');
      expect(pending?.workflow).toBe('fix');
      expect(pending?.data?.suggestions).toHaveLength(2);
    });
  });

  it('says so and stays put when credits run out', async () => {
    // 402 must read as a priced refusal, not a crash: the card stays, nothing is charged,
    // and no pending is written for output that was never produced.
    CVService.generateSkills.mockRejectedValue({ response: { status: 402 } });
    await mountStudio(fixingSkills());
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));

    clickGenerate();

    await waitFor(() => expect(CVService.generateSkills).toHaveBeenCalled());
    // The insufficient-credits line lands — matched on its opening clause, which sits
    // before the {{cost}} placeholder — and the consent card is still there to retry from.
    expect(await screen.findByText(/Finding your skills costs/i)).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.skillsBuild.bodyWithJob'))).toBeTruthy();

    expect(lastPersistedPending()).toBeUndefined();
  });
});

describe('applying picks', () => {
  const withPending = (over = {}) =>
    fixingSkills({
      studioPending: {
        kind: 'skills',
        workflow: 'fix',
        data: { suggestions: SUGGESTIONS, bestForRole: ['Guest relations'] },
      },
      ...over,
    });

  it('a fix-workflow pending rehydrates straight onto the picker', async () => {
    // The refresh case: the user already paid, so they must land on the suggestions —
    // not back on a consent card offering to sell them the same thing again.
    await mountStudio(withPending());
    expect(await screen.findByText('Guest Service')).toBeTruthy();
    expect(screen.getByText('Operations')).toBeTruthy();
    expect(screen.queryByText(t('ariaStudio.skillsBuild.bodyWithJob'))).toBeNull();
  });

  it('lands the skills WITH their real categories, clears the pending, and re-scores', async () => {
    await mountStudio(withPending());
    await screen.findByText('Guest Service');

    fireEvent.click(screen.getByText('Guest relations'));
    fireEvent.click(screen.getByText('Shift scheduling'));
    fireEvent.click(screen.getByText(t('cvBuilder.skillsCard.addNToCv', { n: 2 })));

    await waitFor(() => expect(ctx.cvData.skills.length).toBe(2));

    // THE FIX: every skill carries the category the generation gave it. A single
    // 'Uncategorized' bucket is exactly the flat wall this replaced.
    const byName = Object.fromEntries(ctx.cvData.skills.map((s) => [s.name, s.category]));
    expect(byName['Guest relations']).toBe('Guest Service');
    expect(byName['Shift scheduling']).toBe('Operations');
    ctx.cvData.skills.forEach((s) => expect(s.category).not.toBe('Uncategorized'));

    // The bought output is consumed: the pending is cleared so a refresh doesn't re-offer it.
    await waitFor(() => expect(lastPersistedPending()).toBeNull());
    // And the fix CLOSES like every other one — free recompute, then back to the results.
    await waitFor(() => expect(CVService.studioRecompute).toHaveBeenCalled());
    await waitFor(() => expect(has('fixend')).toBe(true));
  });

  it('marks skills already on the CV as unpickable rather than re-adding them', async () => {
    // SkillsCard refuses the duplicate upstream — it renders an "on CV" tag and disables
    // the row, so an all-duplicate apply is not reachable from the generated picker at
    // all. (The dupe GUARD still matters, and is exercised through the manual input,
    // which accepts free text and so can produce one.)
    await mountStudio(withPending({ skills: [{ name: 'Guest relations', category: 'Other' }] }));
    await screen.findByText('Guest Service');

    expect(screen.getByText(t('cvBuilder.skillsCard.onCv'))).toBeTruthy();
    // Nothing selectable is selected, so the footer offers no count to add.
    expect(screen.getByText(t('cvBuilder.skillsCard.addToCv')).disabled).toBe(true);
  });
});

describe('the free manual route', () => {
  const typeSkills = (text) => {
    const input = screen.getByPlaceholderText(t('ariaStudio.skillsBuild.manualPlaceholder'));
    fireEvent.change(input, { target: { value: text } });
    fireEvent.keyDown(input, { key: 'Enter' });
  };

  it('adds comma-separated skills under a REAL category, without closing the fix', async () => {
    await mountStudio(fixingSkills());
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));

    typeSkills('Guest relations, Shift scheduling');

    await waitFor(() => expect(ctx.cvData.skills.length).toBe(2));
    // 'Other' is a real bucket a reader understands; 'Uncategorized' is the blanket that
    // made the old section read as one undifferentiated wall.
    ctx.cvData.skills.forEach((s) => expect(s.category).toBe('Other'));
    // Typing is not finishing — the user keeps going until they press Done.
    expect(CVService.studioRecompute).not.toHaveBeenCalled();
    expect(has('fixend')).toBe(false);
  });

  it('re-typing a skill already on the CV adds nothing and says so', async () => {
    // The manual box takes free text, so it IS the route that can produce a duplicate.
    // Nothing is added, so nothing is reported as added, and the fix stays open.
    await mountStudio(fixingSkills({ skills: [{ name: 'Guest relations', category: 'Other' }] }));
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));

    typeSkills('Guest relations');

    expect(await screen.findByText(t('ariaStudio.chat.manualSkillsAllDupes'))).toBeTruthy();
    expect(ctx.cvData.skills.length).toBe(1);
    expect(has('fixend')).toBe(false);
  });

  it('Done closes the fix and reports what was actually added', async () => {
    await mountStudio(fixingSkills());
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));

    typeSkills('Guest relations, Shift scheduling');
    await waitFor(() => expect(ctx.cvData.skills.length).toBe(2));

    // Done only appears once something has been added — before that the card offers Skip.
    fireEvent.click(await screen.findByText(t('ariaStudio.skillsBuild.doneNextSection')));

    await waitFor(() => expect(CVService.studioRecompute).toHaveBeenCalled());
    const applied = transcript().find((m) => m.who === 'applied');
    expect(applied.sectionKey).toBe('skills');
    expect(applied.what).toBe(t('ariaStudio.chat.nSkills', { n: 2 }));
  });

  it('backing out without adding anything closes quietly — no receipt, no recompute', async () => {
    // With nothing added the card shows Skip, not Done, and skipping must not spend a
    // recompute or land an "applied" record for work that never happened.
    await mountStudio(fixingSkills());
    await screen.findByText(t('ariaStudio.skillsBuild.bodyWithJob'));

    expect(screen.queryByText(t('ariaStudio.skillsBuild.doneNextSection'))).toBeNull();
    fireEvent.click(screen.getByText(t('ariaStudio.skillsBuild.skipForNow')));

    await waitFor(() => expect(has('fixend')).toBe(true));
    expect(CVService.studioRecompute).not.toHaveBeenCalled();
    expect(has('applied')).toBe(false);
  });
});
