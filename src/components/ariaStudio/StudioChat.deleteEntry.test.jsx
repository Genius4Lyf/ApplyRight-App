// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, act, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * THE ORDERING GUARANTEE — tested against the REAL StudioChat.
 *
 * Deleting the entry Aria is mid-interview on must unpin BEFORE the entry leaves cvData.
 * Get that order wrong and the self-heal effect fires on the cvData change, pushes its own
 * 'unpinrole' + "pin cleared" line, and races removeEntry's save. That is exactly why the
 * preview REQUESTS a delete through the command channel instead of calling removeEntry.
 *
 * This mounts the actual component — not a re-implementation of its effects — because a
 * copy-pasted proxy would keep passing after the shipped effect broke. The transcript is
 * internal state, but StudioChat PERSISTS it to cvData.coachChats.studio, so the assertions
 * read that: a real observable output of the real component.
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
  },
}));

// sonner is the undo surface. Keeping it a spy (rather than rendering a Toaster) is what
// lets the test invoke the action callback directly, which is the undo path itself.
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

// A window handle on the live context, so the test can fire the command the preview would.
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
  // Wait for the draft to bind AND for StudioChat to rehydrate the seeded transcript.
  await waitFor(() => expect(ctx?.draftId).toBe(draft._id));
  return ctx;
};

// The transcript as StudioChat persists it. `_opening` lines are excluded by the component.
const transcript = () => ctx?.cvData?.coachChats?.studio || [];
const countOf = (who) => transcript().filter((m) => m.who === who).length;

describe('StudioChat — commanded delete (Live Preview Remove)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    i18n.changeLanguage('en');
    ctx = null;
    CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
    // useReducedMotion + any responsive hooks read matchMedia; jsdom has none.
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

  // A build session mid-interview on role 'a': buildstart puts the flow in the build
  // branch, and the pinrole marker is what makes 'a' the focused entry.
  const pinnedDraft = () => ({
    _id: 'd1',
    title: 'My CV',
    studioKind: 'build',
    personalInfo: { fullName: 'Ada Lovelace' },
    experience: [
      { _sortId: 'a', title: 'Engineer', company: 'Acme', description: '• one' },
      { _sortId: 'b', title: 'Analyst', company: 'Globex', description: '• two' },
    ],
    coachChats: {
      studio: [{ who: 'buildstart' }, { who: 'pinrole', sortId: 'a', section: 'experience' }],
    },
  });

  it('pushes unpinrole BEFORE the entry leaves cvData — and the self-heal stays SILENT', async () => {
    await mountStudio(pinnedDraft());
    // The seeded pin rehydrated, and nothing has torn it down yet.
    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(countOf('unpinrole')).toBe(0);

    // The command the preview's confirmed Remove sends.
    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'a');
    });

    // The delete lands: the entry is gone from cvData and the narrow save went out.
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['b']));

    // THE CORE SAFETY PROPERTY, two halves:
    //  1. Exactly ONE unpinrole — the commanded teardown. A second would mean the
    //     self-heal also fired, i.e. the pin was still live when cvData changed.
    await waitFor(() => expect(countOf('unpinrole')).toBe(1));
    //  2. The self-heal's line is ABSENT. A deliberate delete doesn't get told its
    //     pin was cleared — that's noise for an action the user just took.
    expect(transcript().some((m) => m.text === t('ariaStudio.chat.pinCleared'))).toBe(false);
  });

  it('keeps the pin ALONE when a DIFFERENT entry is deleted', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    // Delete 'b' while 'a' is pinned — no teardown should happen at all.
    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'b');
    });
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a']));

    // 'a' is still there, so neither the command nor the self-heal has anything to clear.
    expect(countOf('unpinrole')).toBe(0);
    expect(transcript().some((m) => m.text === t('ariaStudio.chat.pinCleared'))).toBe(false);
  });

  it('toasts with an UNDO action that puts the entry back at its index and _sortId', async () => {
    await mountStudio({
      _id: 'd1',
      title: 'My CV',
      studioKind: 'build',
      personalInfo: { fullName: 'Ada' },
      experience: [
        { _sortId: 'a', title: 'Analyst', company: 'RSA', description: '• one' },
        { _sortId: 'b', title: 'Builder', company: 'BBC', description: '• two' },
        { _sortId: 'c', title: 'Chief', company: 'CDC', description: '• three' },
      ],
      coachChats: { studio: [{ who: 'buildstart' }] },
    });

    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'b');
    });
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'c']));

    // The removal toast carries the undo action.
    await waitFor(() => expect(toast).toHaveBeenCalled());
    const [message, opts] = toast.mock.calls.at(-1);
    expect(message).toBe(t('ariaStudio.livePreview.entryRemoved'));
    expect(opts.action.label).toBe(t('ariaStudio.livePreview.undo'));

    await act(async () => {
      await opts.action.onClick();
    });

    // Back at index 1 with the ORIGINAL _sortId — so any transcript marker pointing at
    // this entry (rolerecord, pinrole) still resolves after an undo.
    await waitFor(() =>
      expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'b', 'c'])
    );
    expect(ctx.cvData.experience[1]).toMatchObject({
      _sortId: 'b',
      title: 'Builder',
      company: 'BBC',
    });
  });

  it('closes an open coach focused on the entry with fixend, not an orphaned session', async () => {
    await mountStudio({
      _id: 'd1',
      title: 'My CV',
      personalInfo: { fullName: 'Ada' },
      // TWO roles, so deleting 'x' isn't emptying the section — the required-section
      // backstop (a CV must keep at least one role) would otherwise refuse the delete and
      // this test would never reach the fixend it exists to prove. 'y' is the survivor.
      experience: [
        { _sortId: 'x', title: 'Job', company: 'Co', description: '• work' },
        { _sortId: 'y', title: 'Other', company: 'Co2', description: '• more' },
      ],
      studioScan: { fitScore: 40, sections: [{ key: 'experience', band: 'bad', score: 20 }] },
      coachChats: {
        studio: [
          { who: 'scan', at: '2026-01-01' },
          {
            who: 'fixstart',
            mode: 'coach',
            sectionKey: 'experience',
            sectionLabel: 'Experience',
            entry: { section: 'experience', sortId: 'x', title: 'Job', company: 'Co' },
          },
        ],
      },
    });
    await waitFor(() => expect(countOf('fixstart')).toBe(1));
    expect(countOf('fixend')).toBe(0);

    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'x');
    });
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['y']));

    // The coach was closed BEFORE the entry vanished, so a refresh can't reopen a coach
    // pointed at a role that no longer exists.
    await waitFor(() => expect(countOf('fixend')).toBe(1));
  });

  it('clears the command channel, so the same entry can be deleted → undone → deleted', async () => {
    await mountStudio({
      _id: 'd1',
      title: 'My CV',
      studioKind: 'build',
      personalInfo: { fullName: 'Ada' },
      experience: [
        { _sortId: 'a', title: 'A', company: 'X', description: '• a' },
        { _sortId: 'b', title: 'B', company: 'Y', description: '• b' },
      ],
      coachChats: { studio: [{ who: 'buildstart' }] },
    });

    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'a');
    });
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['b']));
    // Consumed exactly once.
    await waitFor(() => expect(ctx.studioCommand).toBeNull());

    // Undo, then delete the SAME entry again. This is the case the nonce exists for: the
    // payload is otherwise identical, so without it the effect would never re-fire.
    const opts = toast.mock.calls.at(-1)[1];
    await act(async () => {
      await opts.action.onClick();
    });
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'b']));

    await act(async () => {
      ctx.requestStudioCommand('deleteEntry', 'experience', 'a');
    });
    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['b']));
  });

  it('self-heal STILL covers a delete from another tab — the backstop is intact', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    // The entry vanishes WITHOUT going through the command channel — a delete in the CV
    // builder, or another tab. Nothing pushed unpinrole first, so the pin is still live
    // when cvData changes and the self-heal is the only thing that can clear it.
    await act(async () => {
      ctx.updateCvData({ experience: [{ _sortId: 'b', title: 'Analyst', company: 'Globex' }] });
    });

    await waitFor(() => expect(countOf('unpinrole')).toBe(1));
    // And THIS path DOES explain itself, because the disappearance is a surprise.
    await waitFor(() =>
      expect(transcript().some((m) => m.text === t('ariaStudio.chat.pinCleared'))).toBe(true)
    );
  });

  it('never DELETES for another command type — editWithAria (3c-ii) leaves the CV intact', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    CVService.saveDraft.mockClear();

    // 3c-ii added an editWithAria branch to the same effect. It has its own behaviour
    // (covered in StudioChat.editWithAria.test.jsx); what THIS suite guards is that the
    // delete branch stays exclusive to its own type — no entry may leave cvData, and no
    // teardown may fire, because another command happened to travel the same channel.
    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'a');
    });

    await waitFor(() => expect(ctx.studioCommand).toBeNull());
    expect(countOf('unpinrole')).toBe(0);
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'b']);
    expect(toast).not.toHaveBeenCalledWith(
      t('ariaStudio.livePreview.entryRemoved'),
      expect.anything()
    );
  });
});
