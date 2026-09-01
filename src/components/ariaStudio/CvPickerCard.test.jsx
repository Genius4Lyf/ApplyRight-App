// @vitest-environment jsdom
//
// "Which of these?" is the whole job of this card, so what is pinned here is what makes a
// list of CVs answerable at a glance: where each one came from, how far along it is, and
// an honest signal when there are more than fit.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, waitFor } from '@testing-library/react';

import '../../i18n';
import CvPickerCard from './CvPickerCard';

vi.mock('../../services/cv.service', () => ({
  default: { listCvs: vi.fn().mockResolvedValue([]) },
}));

import CVService from '../../services/cv.service';

const cv = (over = {}) => ({
  _id: Math.random().toString(36).slice(2),
  title: 'A CV',
  personalInfo: { fullName: 'Ernest A' },
  professionalSummary: 'Ten years offshore.',
  experience: [{ _id: 'e' }],
  education: [{ _id: 'ed' }],
  skills: [{ _id: 's' }],
  updatedAt: '2026-08-30',
  ...over,
});

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('CvPickerCard', () => {
  it('asks for the lean list, not whole drafts', async () => {
    // This card draws a title, a name, a date and a percentage. Whole drafts would ship
    // every bullet of every CV to do it — and would not carry studioKind either.
    render(<CvPickerCard />);
    await waitFor(() => expect(CVService.listCvs).toHaveBeenCalledWith('all'));
  });

  it('says who wrote each CV', async () => {
    // The two are otherwise indistinguishable in a list — same title, same completion.
    CVService.listCvs.mockResolvedValue([
      cv({ title: 'Aria CV', studioKind: 'build' }),
      cv({ title: 'Typed CV', studioKind: null }),
    ]);
    render(<CvPickerCard />);

    expect(await screen.findByRole('img', { name: /built with aria/i })).toBeTruthy();
    expect(screen.getByRole('img', { name: /built in the cv builder/i })).toBeTruthy();
  });

  it('owns up to the ones it cannot show', async () => {
    // A list that quietly stops at five looks like a list of five. The count says
    // otherwise, and the cut-off row below the fold does the rest.
    CVService.listCvs.mockResolvedValue(
      Array.from({ length: 8 }, (_, i) => cv({ title: `CV ${i}` }))
    );
    render(<CvPickerCard />);
    expect(await screen.findByText(/8 CVs/i)).toBeTruthy();
  });

  it('stays quiet when everything fits', async () => {
    CVService.listCvs.mockResolvedValue([cv(), cv()]);
    render(<CvPickerCard />);
    await screen.findAllByText('A CV');
    expect(screen.queryByText(/scroll for more/i)).toBeNull();
  });
});
