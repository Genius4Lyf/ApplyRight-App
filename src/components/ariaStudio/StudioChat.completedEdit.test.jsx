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
  it('returns to the completion card after applying an entry edit with Aria', async () => {
    await mountStudio();

    await act(async () => {
      ctx.requestStudioCommand('editWithAria', 'experience', 'r1');
    });
    const apply = await screen.findByRole('button', { name: 'Apply entry edit' });

    fireEvent.click(apply);

    await screen.findByText('Ready to send', {}, { timeout: 2500 });
    await waitFor(() =>
      expect(ctx.cvData.coachChats.studio.filter((message) => message.who === 'unpinrole')).toHaveLength(
        1
      )
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

    await screen.findByText('Ready to send', {}, { timeout: 2500 });
    expect(ctx.cvData.skills.map((skill) => skill.name)).toContain('Terraform');
  });
});
