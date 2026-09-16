// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, act, fireEvent, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

/**
 * THE WAY OUT OF AN INTERVIEW.
 *
 * "Build with Aria" dropped the user into a role interview with no exit. The pinned card's
 * "next role" is disabled until the entry is complete, and "done" stamps the section
 * finished — so someone who opened it by mistake, or changed their mind halfway, was stuck.
 *
 * Cancelling is not finishing, and the properties below are what separate the two. All of
 * them are about the TRANSCRIPT rather than about any piece of React state, because the
 * transcript is what survives a refresh: `activeEntry` is re-derived from an open `pinrole`
 * on every render, so a cancel that only cleared state would put the interview straight back
 * on screen, and derivePhase would rebuild the whole thing on the next page load.
 *
 * Mounted against the real StudioChat, like the delete-ordering suite next door, since a
 * re-implementation of the effect would keep passing after the shipped one broke.
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

vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  toast.info = vi.fn();
  return { toast };
});

import CVService from '../../services/cv.service';

const t = (key) => i18n.t(key);

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

// Cancel is TWO steps now. The command only opens the question; a button in the dialog is
// what actually ends the interview, and which button decides whether the role survives.
const askToCancel = async () => {
  await act(async () => {
    ctx.requestStudioCommand('cancelFocus', 'experience', 'a');
  });
  return screen.getByRole('dialog');
};
const answer = async (key) => {
  const label = t(`ariaStudio.cancelInterview.${key}`);
  await act(async () => {
    fireEvent.click(screen.getByText(label));
  });
};
const cancelKeeping = async () => {
  await askToCancel();
  // A role with bullets offers Keep; a blank one has only "delete it and stop", which is
  // the same teardown with the row removed.
  await answer('keep');
};

// A build session mid-interview on role 'a', which has real content on it already.
const pinnedDraft = (over = {}) => ({
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

afterEach(() => cleanup());

describe('cancelling a build interview', () => {
  it('closes the pin, which is the only thing that actually ends it', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));
    expect(countOf('unpinrole')).toBe(0);

    await cancelKeeping();

    // Without this the pin is still open in the persisted transcript, activeEntry is
    // republished from it on the next render, and a refresh reopens the whole interview.
    await waitFor(() => expect(countOf('unpinrole')).toBe(1));
  });

  it('does NOT record the role or stamp the section done', async () => {
    // This is the entire difference between cancel and "Done". Finishing writes a
    // `rolerecord` receipt and a DONE marker that advances the build; cancelling must
    // write neither, or a section the user abandoned is reported as complete.
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await cancelKeeping();
    await waitFor(() => expect(countOf('unpinrole')).toBe(1));

    expect(countOf('rolerecord')).toBe(0);
    expect(countOf('experiencedone')).toBe(0);
  });

  it('keeps the entry and everything already on it', async () => {
    // Applying is a checkpoint, not a verdict: bullets Aria already wrote onto the role
    // were paid for and belong to the user, whatever happens to the conversation.
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await cancelKeeping();
    await waitFor(() => expect(countOf('unpinrole')).toBe(1));

    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'b']);
    expect(ctx.cvData.experience[0].description).toBe('• one');
  });

  it('says so, in Aria’s own voice', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await cancelKeeping();
    await waitFor(() =>
      expect(transcript().some((m) => m.text === t('ariaStudio.chat.buildCancelled'))).toBe(true)
    );
  });
});

describe('cancelling an interview that never got anywhere', () => {
  // "Build with Aria" creates a REAL, blank entry before Aria says a word. Leaving it
  // behind is how the CV ends up with "Role / Company | -" rows nobody can delete — a bug
  // this product has already shipped once.
  const blankDraft = () =>
    pinnedDraft({
      experience: [
        { _sortId: 'a', title: '', company: '', description: '' },
        { _sortId: 'b', title: 'Analyst', company: 'Globex', description: '• two' },
      ],
    });

  it('offers no way to KEEP a role with nothing on it', async () => {
    // Keeping it would put a heading with nothing under it on the CV, which is exactly
    // the ghost-row bug. The only two answers are delete-and-stop, or carry on.
    await mountStudio(blankDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();

    expect(screen.queryByText(t('ariaStudio.cancelInterview.keep'))).toBeNull();
    expect(screen.getByText(t('ariaStudio.cancelInterview.deleteAndStop'))).toBeTruthy();
    expect(screen.getByText(t('ariaStudio.cancelInterview.goBack'))).toBeTruthy();
  });

  it('removes the empty row it created', async () => {
    await mountStudio(blankDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();
    await answer('deleteAndStop');

    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['b']));
    // And the removal is persisted, not just local — a blank that survives the reload is
    // exactly the bug.
    await waitFor(() =>
      expect(
        CVService.saveDraft.mock.calls.some(
          ([payload]) =>
            Array.isArray(payload?.experience) && payload.experience.every((e) => e._sortId !== 'a')
        )
      ).toBe(true)
    );
  });

  it('still closes the pin on the way out', async () => {
    await mountStudio(blankDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();
    await answer('deleteAndStop');
    await waitFor(() => expect(countOf('unpinrole')).toBe(1));
  });
});

describe('it asks before it does anything', () => {
  // Cancel used to take effect on the click, which was wrong in both directions: a
  // mis-tap silently deleted a role Aria had just created, and there was no way to stop
  // the interview while KEEPING a role that already had bullets on it.
  it('changes nothing until an answer is given', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();

    // The question is open; the interview is not over and the role is untouched.
    expect(countOf('unpinrole')).toBe(0);
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'b']);
  });

  it('backs out cleanly, leaving the interview exactly where it was', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();
    await answer('goBack');

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(countOf('unpinrole')).toBe(0);
    expect(countOf('pinrole')).toBe(1);
    expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['a', 'b']);
  });

  it('names the role it is about to act on', async () => {
    // The dialog is reachable from three places, including a panel that may be showing a
    // different part of the CV. Naming the role is what stops it reading as "delete
    // something".
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();
    expect(screen.getByRole('dialog').textContent).toContain('Engineer');
  });

  it('lets the user DELETE a role that has bullets, if that is what they want', async () => {
    await mountStudio(pinnedDraft());
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await askToCancel();
    await answer('deleteInstead');

    await waitFor(() => expect(ctx.cvData.experience.map((e) => e._sortId)).toEqual(['b']));
    await waitFor(() => expect(countOf('unpinrole')).toBe(1));
    // A different line, because a different thing happened to their CV.
    await waitFor(() =>
      expect(transcript().some((m) => m.text === t('ariaStudio.chat.buildCancelledDeleted'))).toBe(
        true
      )
    );
  });
});

// ─── WHERE the way out lives, and who gets one ───
//
// Two rules, both asked for after the first version shipped in three places at once:
//
//   1. Cancel belongs on the pinned "Building" card, and nowhere else in the chat. It
//      briefly also sat under the message box, which is where you ANSWER her question —
//      a quiet abandon-this link directly beneath the box you type into.
//   2. The FIRST role of a new CV has no Cancel at all. Aria opens that one herself as
//      the next step of the build; leaving it would empty the section she is asking about.
describe('where the cancel appears', () => {
  const cancelLabel = () => t('ariaStudio.pinnedEntry.cancel');
  const doneLabel = () => t('ariaStudio.pinnedEntry.copy.experience.done');

  // The pinned card only mounts once the entry is past its form (see showPinnedEntryCard),
  // so a role has to be this complete before there is a card to look for a Cancel on.
  const staged = (over = {}) => ({
    _sortId: 'a',
    entryType: 'job',
    title: 'Engineer',
    company: 'Acme',
    startDate: '2020',
    description: '• one',
    ...over,
  });

  const draftWith = ({ cancellable, experience }) =>
    pinnedDraft({
      experience,
      coachChats: {
        studio: [
          { who: 'buildstart' },
          { who: 'pinrole', sortId: 'a', section: 'experience', cancellable },
        ],
      },
    });

  const byLabel = (label) =>
    screen.queryAllByRole('button').find((b) => b.textContent?.trim() === label);
  const cancelControl = () => byLabel(cancelLabel());

  // The card starts collapsed, and while collapsed its body is `inert` + aria-hidden — so
  // a role query finds nothing inside it either way. Open it the way the user does before
  // asserting anything about the actions, or a test would pass just as happily against a
  // Cancel that is still there.
  const openCard = async () => {
    // By its "Building" label, not just by aria-expanded — the chat has other collapsible
    // controls, and picking the wrong one would leave the card shut and every assertion
    // below it meaningless.
    const header = await waitFor(() => {
      const el = screen
        .queryAllByRole('button')
        .find(
          (b) =>
            b.getAttribute('aria-expanded') === 'false' &&
            b.textContent?.includes(t('ariaStudio.pinnedEntry.copy.experience.label'))
        );
      expect(el).toBeTruthy();
      return el;
    });
    await act(async () => {
      fireEvent.click(header);
    });
    // The card is genuinely open once its other actions are reachable. Asserting this
    // FIRST is what makes a later "no Cancel" mean something.
    await waitFor(() => expect(byLabel(doneLabel())).toBeTruthy());
  };

  it('puts it on the pinned card once the interview is one the user chose', async () => {
    await mountStudio(
      draftWith({ cancellable: true, experience: [staged(), staged({ _sortId: 'b' })] })
    );
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await openCard();
    expect(cancelControl()).toBeTruthy();
  });

  it('withholds it on the first role of a new CV', async () => {
    // Aria opened this one herself as the opening move of the build. There is nothing
    // behind it to go back to, so it has no exit — on this card or on the preview panel.
    await mountStudio(draftWith({ cancellable: false, experience: [staged()] }));
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await openCard();
    expect(cancelControl()).toBeUndefined();
  });

  it('never renders one under the message box', async () => {
    // It briefly lived there too, as a link in the composer footer — directly beneath the
    // box you answer her questions in. The footer is a named node so this can be asserted
    // without depending on the layout around it.
    await mountStudio(
      draftWith({ cancellable: true, experience: [staged(), staged({ _sortId: 'b' })] })
    );
    await waitFor(() => expect(countOf('pinrole')).toBe(1));

    await openCard();
    expect(cancelControl()).toBeTruthy();

    document.querySelectorAll('[data-coach-footer]').forEach((footer) => {
      expect(footer.textContent).not.toMatch(/cancel/i);
    });
  });
});
