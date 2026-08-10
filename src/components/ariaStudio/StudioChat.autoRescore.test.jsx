// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor, screen } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * THE AUTO RE-SCORE — tested against the REAL StudioChat.
 *
 * A preview edit or delete changes the CV, so the fit score has to follow: without this,
 * the number on screen describes a document that no longer exists until someone happens
 * to press "Re-score". Recompute is free and deterministic, so it can just run.
 *
 * Two properties are what make it safe to run automatically, and both are asserted here
 * rather than assumed:
 *
 *   SILENT — the silent path must not set the global `scanning` flag. That flag gates
 *     `ready`, which UNMOUNTS every card in the stream, so a background heal would tear
 *     down the conversation the user is reading. The busy indicator is the observable
 *     proxy: it renders if and only if `scanning` is true.
 *
 *   REORDER-NEUTRAL — Slice 3a made reordering score-neutral (the scan joins each
 *     section's entry text order-independently). The content SIGNATURE sorts by _sortId
 *     to reproduce that exactly, so a drag must produce no call at all.
 *
 * The real component is mounted, not a re-implementation of its effects: a copy-pasted
 * proxy would keep passing after the shipped effect broke. CVService.studioRecompute is
 * the observable output — it is the recompute.
 */

vi.mock('../../services/cv.service', () => ({
  default: {
    getDraftById: vi.fn(),
    saveDraft: vi.fn().mockResolvedValue({ _id: 'd1' }),
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
import { toast } from 'sonner';

const t = (key) => i18n.t(key);

// Past the 1500ms debounce, with room for the effect to schedule. Real timers: the
// component debounces with setTimeout, and faking them here would also freeze
// waitFor and the awaited service promises.
const AFTER_DEBOUNCE = 1900;
// Every test spends real seconds waiting out that debounce, so the 5s default is not enough.
const SLOW = 20000;

let ctx = null;
const Handle = () => {
  const api = useAriaStudio();
  useEffect(() => {
    ctx = api;
  });
  return null;
};

const scanSnapshot = (fitScore = 60) => ({
  scannedAt: '2026-01-01T00:00:00.000Z',
  fitScore,
  sections: [
    {
      key: 'experience',
      label: 'Experience',
      score: 12,
      max: 25,
      band: 'warn',
      missingKeywords: ['kubernetes'],
    },
  ],
});

// A scanned TAILORING with a real JD — the one state the auto re-score is allowed to fire
// in. The 'scan' marker is what puts derivePhase on 'results'.
const scannedDraft = (over = {}) => ({
  _id: 'd1',
  title: 'My CV',
  studioKind: 'tailor',
  personalInfo: { fullName: 'Ada Lovelace' },
  targetJob: { title: 'SRE', description: 'We need Kubernetes and Terraform experience.' },
  experience: [
    { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• shipped one' },
    { _sortId: 'b', title: 'Analyst', company: 'Globex', description: '• shipped two' },
  ],
  projects: [],
  education: [],
  skills: [{ name: 'Docker' }],
  professionalSummary: 'Reliability engineer.',
  studioScan: scanSnapshot(),
  coachChats: { studio: [{ who: 'scan', at: '2026-01-01T00:00:00.000Z' }] },
  ...over,
});

const mountStudio = async (draft) => {
  localStorage.setItem('ariaStudio:draftId', draft._id);
  // Persistent, not `...Once`: StudioChat re-reads the draft (refreshDraft) around a
  // recompute, and a drained one-shot queue would hand it `undefined` and blank the mount.
  CVService.getDraftById.mockResolvedValue(draft);

  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe(draft._id));
  // The seeding pass has to land before any assertion: lastScoredSigRef starts null, and
  // the effect deliberately does nothing until it matches the loaded document.
  await waitFor(() => expect(ctx?.cvData?.experience?.length).toBe(draft.experience.length));
  return ctx;
};

// Rewrite one entry's description — a CONTENT change, the thing a preview edit makes.
const editDescription = async (sortId, description) => {
  await act(async () => {
    ctx.updateCvData({
      experience: ctx.cvData.experience.map((e) =>
        e._sortId === sortId ? { ...e, description } : e
      ),
    });
  });
};

// Swap two entries, leaving every field untouched — a drag.
const reorder = async () => {
  await act(async () => {
    ctx.updateCvData({ experience: [...ctx.cvData.experience].reverse() });
  });
};

const wait = (ms) => act(async () => new Promise((r) => setTimeout(r, ms)));

describe('StudioChat — auto re-score after a preview edit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    i18n.changeLanguage('en');
    ctx = null;
    CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
    CVService.studioRecompute.mockResolvedValue({ studioScan: scanSnapshot(68) });
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

  it(
    'recomputes ONCE after a content edit, and does it SILENTLY',
    async () => {
      await mountStudio(scannedDraft());
      // Mounting on an existing scan must not fire anything: the signature ref is seeded to
      // match the loaded document, which is what stops a session merely being OPENED from
      // spending a recompute.
      await wait(AFTER_DEBOUNCE);
      expect(CVService.studioRecompute).not.toHaveBeenCalled();

      await editDescription('a', '• shipped one, on Kubernetes');

      await waitFor(() => expect(CVService.studioRecompute).toHaveBeenCalledTimes(1), {
        timeout: 4000,
      });
      expect(CVService.studioRecompute).toHaveBeenCalledWith('d1');
      // The new snapshot landed on the session, so every card re-reads the current score.
      await waitFor(() => expect(ctx.cvData.studioScan.fitScore).toBe(68));

      // SILENT: the busy indicator is `scanning` made visible. It never appeared, so the
      // chat cards were never unmounted.
      expect(screen.queryByText(t('ariaStudio.chat.thinking.readingCvAgainstJob'))).toBeNull();
      // And the run settles without re-firing.
      await wait(AFTER_DEBOUNCE);
      expect(CVService.studioRecompute).toHaveBeenCalledTimes(1);
    },
    SLOW
  );

  it(
    'does NOT recompute on a reorder — same content, different order (Slice 3a neutrality)',
    async () => {
      await mountStudio(scannedDraft());
      await reorder();
      await wait(AFTER_DEBOUNCE);
      expect(CVService.studioRecompute).not.toHaveBeenCalled();
      // The drag itself still landed — this is a no-op for the SCORE, not for the document.
      expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['b', 'a']);
    },
    SLOW
  );

  it(
    'coalesces rapid successive edits into ONE recompute',
    async () => {
      await mountStudio(scannedDraft());
      await editDescription('a', '• one');
      await wait(200);
      await editDescription('b', '• two');
      await wait(200);
      await editDescription('a', '• one, with Terraform');

      await waitFor(() => expect(CVService.studioRecompute).toHaveBeenCalledTimes(1), {
        timeout: 4000,
      });
      await wait(AFTER_DEBOUNCE);
      expect(CVService.studioRecompute).toHaveBeenCalledTimes(1);
    },
    SLOW
  );

  it(
    'stays quiet when there is no scan yet — nothing to refresh',
    async () => {
      await mountStudio(scannedDraft({ studioScan: undefined, coachChats: { studio: [] } }));
      await editDescription('a', '• shipped one, on Kubernetes');
      await wait(AFTER_DEBOUNCE);
      expect(CVService.studioRecompute).not.toHaveBeenCalled();
    },
    SLOW
  );

  it(
    'stays quiet in a build session with no job description — the backend would 400',
    async () => {
      await mountStudio(scannedDraft({ targetJob: { title: 'SRE', description: '' } }));
      await editDescription('a', '• shipped one, on Kubernetes');
      await wait(AFTER_DEBOUNCE);
      expect(CVService.studioRecompute).not.toHaveBeenCalled();
    },
    SLOW
  );

  it(
    'swallows a silent failure — logs, no toast, no stuck busy state',
    async () => {
      const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
      CVService.studioRecompute.mockRejectedValue(new Error('network'));
      await mountStudio(scannedDraft());

      await editDescription('a', '• shipped one, on Kubernetes');
      await waitFor(() => expect(CVService.studioRecompute).toHaveBeenCalledTimes(1), {
        timeout: 4000,
      });

      // A background heal failing is not the user's problem — a surprise error toast for
      // work nobody asked for would be worse than a score that stays stale.
      expect(toast.error).not.toHaveBeenCalled();
      expect(screen.queryByText(t('ariaStudio.chat.thinking.readingCvAgainstJob'))).toBeNull();
      expect(logged).toHaveBeenCalled();
      logged.mockRestore();
    },
    SLOW
  );

  it('the MANUAL Re-score is untouched — no arg, and it still TOASTS on failure', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    CVService.studioRecompute.mockRejectedValue(new Error('network'));
    await mountStudio(scannedDraft());

    // The breakdown's own button. It calls `onRecompute()` with no argument, which is
    // what makes `silent` default to false — the loud path, exactly as before.
    const button = await screen.findByRole('button', {
      name: new RegExp(t('ariaStudio.sectionBreakdown.rescoreFree'), 'i'),
    });
    await act(async () => {
      button.click();
    });

    await waitFor(() => expect(CVService.studioRecompute).toHaveBeenCalledTimes(1));
    // A re-score the USER asked for must say when it failed — only the silent path stays
    // quiet. This is the guard against `silent` leaking into the existing callers.
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(t('ariaStudio.chat.toast.recomputeFailed'))
    );
    logged.mockRestore();
  });
});
