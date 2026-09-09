// @vitest-environment jsdom
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import i18n from '../../i18n';
import { AriaStudioProvider, useAriaStudio } from '../../context/AriaStudioContext';
import StudioChat from './StudioChat';

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

// Keep these tests on StudioChat's routing contract. The production children own the
// interview/generation details; these small controls report the same successful Apply.
vi.mock('./SectionCoach', () => ({
  default: ({ onApply, onDone }) => (
    <button
      type="button"
      onClick={async () => {
        const result = await onApply(['Improved an existing achievement'], []);
        if (result?.ok) onDone({ applied: ['Improved an existing achievement'] });
      }}
    >
      Apply entry edit
    </button>
  ),
}));

vi.mock('./SkillsBuildCard', () => ({
  default: ({ onAdd }) => (
    <button type="button" onClick={() => onAdd([{ name: 'Terraform', category: 'Tools' }])}>
      Apply skill edit
    </button>
  ),
}));

import CVService from '../../services/cv.service';

let ctx = null;
const Handle = () => {
  const value = useAriaStudio();
  useEffect(() => {
    ctx = value;
  });
  return null;
};

const completeBuild = () => ({
  _id: 'd1',
  title: 'Complete CV',
  studioKind: 'build',
  personalInfo: { fullName: 'Ada Lovelace' },
  professionalSummary: 'Engineer who turns complex systems into reliable products.',
  experience: [
    {
      _sortId: 'r1',
      title: 'Engineer',
      company: 'Acme',
      entryType: 'job',
      startDate: '2022',
      description: '• Shipped a reliable platform',
    },
  ],
  projects: [{ _sortId: 'p1', title: 'Difference Engine', description: '• Built it' }],
  education: [{ _sortId: 'e1', degree: 'BSc Maths', school: 'UCL' }],
  skills: [{ name: 'JavaScript', category: 'Tools' }],
  coachChats: { studio: [{ who: 'buildstart' }, { who: 'contactdone' }] },
});

const mountStudio = async (draft = completeBuild()) => {
  localStorage.setItem('ariaStudio:draftId', draft._id);
  CVService.getDraftById.mockResolvedValueOnce(draft);
  render(
    <AriaStudioProvider>
      <Handle />
      <StudioChat />
    </AriaStudioProvider>
  );
  await waitFor(() => expect(ctx?.draftId).toBe(draft._id));
  // No per-call timeout here or anywhere else in this file. StudioChat is a large tree and a
  // loaded parallel run takes it well past RTL's 1000ms default, but that is the whole
  // suite's problem and it is solved once in src/test/setup.js. A local override would only
  // mask it here, and a lower one would silently win.
  await screen.findByText('Ready to send');
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  i18n.changeLanguage('en');
  ctx = null;
  CVService.saveDraft.mockResolvedValue({ _id: 'd1' });
  vi.stubGlobal('matchMedia', (query) => ({
    matches: false,
    media: query,
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

describe('StudioChat — applying edits to a completed build', () => {
  it('KEEPS the entry open after applying, so the edit can continue', async () => {
    // Reported by a user: opening "Edit with Aria" on a role, applying the bullets and
    // then wanting to add one more. Applying used to be treated as the completion
    // moment — it unpinned the entry and put the finish card straight back — so the
    // only way to continue was to leave, reopen the preview, and start a whole new
    // interview on the same role, paying for another round to carry on the one they
    // were already in. It read as the edit being cancelled by its own Apply button.
    //
    // Applying is a checkpoint. The user decides when the section is finished.
    await mountStudio();

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'r1');
    });
    const apply = await screen.findByRole('button', { name: 'Apply entry edit' });

    fireEvent.click(apply);

    // Aria invites the next achievement rather than signing off...
    expect(await screen.findByText(/those are on your CV now/i)).toBeTruthy();

    // ...and the entry is STILL in focus. No unpin means no finish card yet, and the
    // pinned card — which owns "Done with work history" — is still on screen to close it.
    expect(ctx.cvData.coachChats.studio.filter((m) => m.who === 'unpinrole')).toHaveLength(0);
  });

  it('returns to the completion card when the user says the section is done', async () => {
    // The other half of the contract above: the finish card still comes back — one
    // click later, when it was actually asked for. finishSection() already knew this
    // was an edit rather than a build step (no duplicate receipt, no DONE marker, no
    // walk down the section chain), so nothing about the destination changed.
    await mountStudio();

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'r1');
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Apply entry edit' }));

    // The pinned card opens collapsed by design, so the section controls are behind its
    // own toggle — the same two clicks a user makes.
    await screen.findByText(/those are on your CV now/i);
    const expand = screen
      .getAllByRole('button')
      .find((node) => node.getAttribute('aria-expanded') === 'false');
    fireEvent.click(expand);

    fireEvent.click(await screen.findByRole('button', { name: /done with work history/i }));

    await screen.findByText('Ready to send');
    await waitFor(() =>
      expect(ctx.cvData.coachChats.studio.filter((m) => m.who === 'unpinrole')).toHaveLength(1)
    );
  });

  it('returns to the completion card after applying a skill edit with Aria', async () => {
    // This is the exact state from the reported failure: the build flow is finished and
    // the card is visible because summarydone is durable, while the document itself does
    // not pass canonical completeness because the summary was deliberately skipped.
    // The old skills handler checked only the latter and incorrectly said summary was next.
    const transcriptCompleteDraft = {
      ...completeBuild(),
      professionalSummary: '',
      coachChats: {
        studio: [
          { who: 'buildstart' },
          { who: 'contactdone' },
          { who: 'skillsdone', n: 1 },
          { who: 'summarydone', skipped: true },
        ],
      },
    };
    await mountStudio(transcriptCompleteDraft);

    await act(async () => {
      ctx.requestStudioCommand('suggestSkills', 'skills', null);
    });
    const apply = await screen.findByRole('button', { name: 'Apply skill edit' });

    fireEvent.click(apply);

    await screen.findByText('Ready to send');
    expect(ctx.cvData.skills.map((skill) => skill.name)).toContain('Terraform');
  });
});
