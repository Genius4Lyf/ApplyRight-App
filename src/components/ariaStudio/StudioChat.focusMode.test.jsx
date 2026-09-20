// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen, fireEvent } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * Slice 3e — FOCUS MODE: which entry Aria is currently working on.
 *
 * `activeEntry` is a DERIVED MIRROR of the interview's own state, published on the context
 * so the Live Preview can mark and lock that one row. So these tests never set it by hand
 * (bar the context round-trip below) — they put StudioChat into a real interview state
 * through its real entry points and read what it published.
 *
 * That's deliberate: the value of this slice is entirely in the derivation being RIGHT
 * (the correct entry, and null the moment the interview closes). A test that called
 * setActiveEntry itself would keep passing after the mirror stopped tracking.
 *
 * Aria is "on" an entry in exactly three states, and each is exercised here:
 *   build:<section> + a pinned entry   — the build interview
 *   fix:coach       + the open fix     — the tailor interview
 *   fix:rewrite     + a rewrite target — the before→after card
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
    // The rewrite card fetches its own rows on mount. The fix:rewrite phase is reached
    // here for its FOCUS, not its output, so the rows are empty — but stubbed, so a
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

// With StudioChat — the mirror only exists because StudioChat publishes it.
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

// Provider ONLY — for the plain state contract, with nothing publishing over the top.
const mountProviderOnly = () => {
  render(
    <AriaStudioProvider>
      <Handle />
    </AriaStudioProvider>
  );
};

const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const countOf = (who) => transcript().filter((m) => m.who === who).length;

const ROLE = { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• shipped one' };
const PROJECT = { _sortId: 'p1', title: 'Difference Engine', description: '• built it' };

const buildDraft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  coachChats: { studio: [{ who: 'buildstart' }] },
});

const tailorDraft = () => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  experience: [{ ...ROLE }],
  projects: [{ ...PROJECT }],
  studioScan: {
    fitScore: 48,
    sections: [
      { key: 'experience', label: 'Experience', band: 'bad', score: 20, missingKeywords: ['K8s'] },
      { key: 'projects', label: 'Projects', band: 'bad', score: 15, missingKeywords: ['GraphQL'] },
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

describe('AriaStudioContext — activeEntry is plain, exported state', () => {
  it('starts null and round-trips through setActiveEntry', async () => {
    mountProviderOnly();
    await waitFor(() => expect(ctx).not.toBeNull());

    expect(ctx.activeEntry).toBeNull();
    expect(typeof ctx.setActiveEntry).toBe('function');

    await act(async () => {
      ctx.setActiveEntry({ section: 'experience', sortId: 'a' });
    });
    expect(ctx.activeEntry).toEqual({ section: 'experience', sortId: 'a' });

    await act(async () => {
      ctx.setActiveEntry(null);
    });
    expect(ctx.activeEntry).toBeNull();
  });

  // It's derived UI focus, not document data: persisting it would restore a "locked"
  // row on reload with no interview behind it to unlock it.
  it('is NOT persisted to the draft', async () => {
    mountProviderOnly();
    await waitFor(() => expect(ctx).not.toBeNull());

    await act(async () => {
      ctx.setActiveEntry({ section: 'experience', sortId: 'a' });
    });

    const payloads = CVService.saveDraft.mock.calls.map(([p]) => p || {});
    expect(payloads.every((p) => !('activeEntry' in p))).toBe(true);
  });
});

describe('StudioChat — focus in a BUILD interview', () => {
  it('publishes nothing on the section hub — no pin, no focus', async () => {
    await mountStudio(buildDraft());
    expect(ctx.activeEntry).toBeNull();
  });

  it('publishes the PINNED entry once the interview opens', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'experience', sortId: 'a' })
    );
    await waitFor(() => expect(countOf('focus')).toBe(1));
    expect(screen.getByText(/Focus.*Engineer/)).toBeTruthy();
  });

  // A build interview pins the entry BEFORE its title is captured, so the crumb reads its
  // fallback for most of its life. It must describe what's happening ("New experience"),
  // not read as a defect ("Untitled role").
  it('reads "New experience" — not "Untitled role" — for a titleless pinned entry', async () => {
    const draft = buildDraft();
    draft.experience = [{ _sortId: 'a', title: '', company: '', description: '' }];
    await mountStudio(draft);

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('focus')).toBe(1));
    expect(screen.getByText(/Focus.*New experience/)).toBeTruthy();
    expect(screen.queryByText(/Untitled role/)).toBeNull();
  });

  // The recurring 'project'-singular trap: the pinned section key is what rides along, so
  // the section field reads 'project', matching deleteEntry and ENTRY_SOURCE.
  it('carries the singular project token', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'project', 'p1');
    });

    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'project', sortId: 'p1' })
    );
  });

  // The marker has to disappear the moment the interview closes, or the preview keeps a
  // row locked with nobody working on it. deleteEntry unpins first (that ordering is the
  // whole reason it's a command), so it closes the interview through the real path.
  it('clears the focus when the pin closes', async () => {
    await mountStudio(buildDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });
    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'experience', sortId: 'a' })
    );

    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('unpinrole')).toBe(1));
    await waitFor(() => expect(ctx.activeEntry).toBeNull());
    await waitFor(() => expect(countOf('unfocus')).toBe(1));
    expect(screen.getByText('Focus mode exited')).toBeTruthy();
  });

  // The THIRD thing this mirror publishes, and the reason it exists: whether the interview
  // can be abandoned. The preview panel draws its own Cancel from this and nothing else —
  // it never reads the transcript — so if the flag stopped riding along, the panel would
  // quietly offer a way out of the one interview that must not have one (the first role of
  // a new CV), disagreeing with the pinned card about the same interview.
  it('publishes whether the interview can be cancelled', async () => {
    await mountStudio(buildDraft());

    // "Edit with Aria" is the user picking a row deliberately — always cancellable.
    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });
    await waitFor(() => expect(ctx.activeEntry?.cancellable).toBe(true));
  });

  it('publishes cancellable:false for a role Aria opened herself', async () => {
    // The opening move of a fresh build: Aria creates the first role and interviews on it.
    // The marker carries the decision, so this is what a refresh mid-interview restores.
    const draft = buildDraft();
    draft.coachChats.studio = [
      { who: 'buildstart' },
      { who: 'pinrole', sortId: 'a', section: 'experience', cancellable: false },
    ];
    await mountStudio(draft);

    // Still focused on the right row — withholding the exit must not disturb the mirror.
    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'experience', sortId: 'a' })
    );
    expect(ctx.activeEntry.cancellable).toBe(false);
  });
});

describe('StudioChat — focus in a TAILOR interview', () => {
  it('publishes the entry the coach is on', async () => {
    await mountStudio(tailorDraft());
    expect(ctx.activeEntry).toBeNull();

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'experience', sortId: 'a' })
    );
  });

  it('publishes a focused PROJECT as a project, not experience', async () => {
    await mountStudio(tailorDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'project', 'p1');
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'project', sortId: 'p1' })
    );
  });
});

describe('StudioChat — focus during a REWRITE', () => {
  // The rewrite card is Aria working on an entry just as much as the interview is, so the
  // row is marked and locked there too. Driven the way a user reaches it: Fix a section →
  // pick an entry → the before→after card.
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

  it('publishes the rewrite target, then keeps it through "interview me instead"', async () => {
    await mountStudio(projectFixDraft());
    // fix:pick — a section is open, but no ENTRY is chosen yet, so nothing is focused.
    expect(ctx.activeEntry).toBeNull();

    const entry = await screen.findByRole('button', { name: /Difference Engine/ });
    await act(async () => {
      fireEvent.click(entry);
    });

    // fix:rewrite — the card owns the entry now.
    await waitFor(() => expect(ctx.cvData.studioPending?.kind).toBe('rewrite'));
    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'project', sortId: 'p1' })
    );

    // Handing the same entry from the card to the interview must not blink the marker off:
    // the source changes from the rewrite target to the open fix, the entry does not.
    const instead = await screen.findByRole('button', { name: 'Interview me instead' });
    await act(async () => {
      fireEvent.click(instead);
    });

    await waitFor(() => expect(countOf('fixstart')).toBe(2));
    expect(ctx.activeEntry).toMatchObject({ section: 'project', sortId: 'p1' });
  });
});

// COMING BACK TO AN OPEN INTERVIEW.
//
// The focus rule records where an interview began, so the transcript still says so when
// you return to it. On a refresh the saved thread already ends with that marker — and the
// priming that is supposed to notice can settle a beat before the restored pin arrives,
// at which point the pin reads as a CHANGE and announces it again. Two identical
// "Focus · <role>" rules, one under the other, on every single refresh.
describe('StudioChat — the focus marker survives a refresh without repeating', () => {
  const resumedDraft = () => ({
    ...buildDraft(),
    coachChats: {
      studio: [
        { who: 'buildstart' },
        { who: 'pinrole', sortId: 'a', section: 'experience' },
        { who: 'focus', section: 'experience', sortId: 'a', title: 'Engineer', company: 'Acme' },
      ],
    },
  });

  it('does not announce a focus the conversation already ends with', async () => {
    // A REFRESH, not a command: the pin is restored from the saved thread's own
    // `pinrole` marker, exactly as reloading the page does it.
    await mountStudio(resumedDraft());

    await waitFor(() =>
      expect(ctx.activeEntry).toMatchObject({ section: 'experience', sortId: 'a' })
    );
    expect(countOf('focus')).toBe(1);
  });

  it('still announces a focus when the interview moves to a DIFFERENT entry', async () => {
    // The guard must not silence a real change — only a repeat of the last thing said.
    await mountStudio(resumedDraft());

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'project', 'p1');
    });

    await waitFor(() => expect(countOf('focus')).toBe(2));
  });
});

// A THREAD THAT ALREADY COLLECTED THEM.
//
// Fixing the writer repairs nothing that is already saved: a conversation that gathered
// three identical "Focus · <role>" rules before the guard existed would keep showing all
// three forever. The render collapses a repeat instead — the stored transcript is left
// exactly as it is, because quietly rewriting someone's history to tidy a display bug is
// the worse habit.
describe('StudioChat — markers already stacked up in a saved thread', () => {
  const focusMarker = () => ({
    who: 'focus',
    section: 'experience',
    sortId: 'a',
    title: 'Engineer',
    company: 'Acme',
  });

  it('draws ONE rule however many identical ones were stored', async () => {
    await mountStudio({
      ...buildDraft(),
      coachChats: {
        studio: [
          { who: 'buildstart' },
          { who: 'pinrole', sortId: 'a', section: 'experience' },
          focusMarker(),
          focusMarker(),
          focusMarker(),
        ],
      },
    });

    await waitFor(() => expect(screen.getAllByText(/Focus.*Engineer/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Focus.*Engineer/)).toHaveLength(1);
  });

  it('still draws both when the interview genuinely moved and came back', async () => {
    // Focus A → focus B → focus A is three real events, not a repeat of one.
    await mountStudio({
      ...buildDraft(),
      coachChats: {
        studio: [
          { who: 'buildstart' },
          focusMarker(),
          { who: 'focus', section: 'project', sortId: 'p1', title: 'Difference Engine' },
          focusMarker(),
        ],
      },
    });

    await waitFor(() => expect(screen.getAllByText(/Focus.*Engineer/).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/Focus.*Acme|Focus.*Engineer/).length).toBeGreaterThanOrEqual(2);
  });
});
