// @vitest-environment jsdom
//
// The dashboard's door to the CV Studio.
//
// It exists because the studio had become unreachable from here: this page stopped
// listing CVs when the workspace sidebar became their home, and the studio's only address
// is /resume/:id — a document, not a place. So there was nothing on the dashboard that
// could point at it.
//
// Two things are worth holding still. The COUNT has to agree with what the studio then
// shows, or the dashboard advertises three CVs and the sidebar lists one; that means the
// same completeness rule AND the same scope. And the row must not appear at zero, because
// the studio only ever lists finished CVs and a door into an empty room is worse than no
// door.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import '../i18n';

vi.mock('../services/cv.service', () => ({
  default: { listCvs: vi.fn(), deleteDraft: vi.fn() },
}));
// The dashboard's furniture is not what is under test here.
vi.mock('../components/Navbar', () => ({ default: () => null }));
vi.mock('../components/GlobalBanner', () => ({ default: () => null }));
vi.mock('../components/CVUploader', () => ({ default: () => null }));
vi.mock('../components/CreditGate', () => ({ default: ({ children }) => children }));
vi.mock('../hooks/useInterstitial', () => ({ default: () => ({ maybeShow: vi.fn() }) }));
vi.mock('../utils/splash', () => ({ signalReady: vi.fn() }));

import CVService from '../services/cv.service';
import Dashboard from './Dashboard';

// Only the fields lib/cvCompleteness actually checks. Note `experience`, NOT
// `workExperience` — the wrong name silently reads as an unfinished CV.
const finished = (id, over = {}) => ({
  _id: id,
  title: `CV ${id}`,
  updatedAt: '2026-09-01T10:00:00.000Z',
  personalInfo: { fullName: 'Ada Lovelace' },
  professionalSummary: 'Long enough to count as written prose.',
  experience: [{ jobTitle: 'Analyst' }],
  education: [{ institution: 'Uni' }],
  skills: [{ category: 'Tech', items: ['SQL'] }],
  ...over,
});
const unfinished = { _id: 'half', title: 'Half done', updatedAt: '2026-08-30T10:00:00.000Z' };

const mount = () =>
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

const strip = () => screen.queryByRole('button', { name: /ready to design/i });

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', onboardingCompleted: true }));
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('Dashboard — the way into the CV Studio', () => {
  it('counts finished CVs and offers the studio', async () => {
    CVService.listCvs.mockResolvedValue([finished('a'), finished('b'), unfinished]);
    mount();
    await waitFor(() => expect(strip()).toBeTruthy());
    expect(strip().textContent).toContain('2');
  });

  it('says it in the singular for one', async () => {
    CVService.listCvs.mockResolvedValue([finished('a'), unfinished]);
    mount();
    await waitFor(() => expect(strip()).toBeTruthy());
    // "Your finished CV — 1 ready", not "CVs — 1".
    expect(strip().textContent).toMatch(/finished CV\b/);
    expect(strip().textContent).not.toMatch(/finished CVs/);
  });

  it('stays away when nothing is finished', async () => {
    CVService.listCvs.mockResolvedValue([unfinished]);
    mount();
    await waitFor(() => expect(CVService.listCvs).toHaveBeenCalled());
    expect(strip()).toBeNull();
  });

  it('stays away when the list cannot be fetched', async () => {
    // A failed request must not claim CVs the user may not have.
    CVService.listCvs.mockRejectedValue(new Error('offline'));
    mount();
    await waitFor(() => expect(CVService.listCvs).toHaveBeenCalled());
    expect(strip()).toBeNull();
  });

  it('asks for the SAME scope the studio sidebar uses', async () => {
    // The default 'builder' scope excludes CVs born in Aria, which are exactly the ones
    // the studio lists — counting that narrower set would advertise a smaller number than
    // the studio then shows.
    CVService.listCvs.mockResolvedValue([]);
    mount();
    await waitFor(() => expect(CVService.listCvs).toHaveBeenCalled());
    expect(CVService.listCvs).toHaveBeenCalledWith('all');
  });

  it('counts an Aria-built CV like any other', async () => {
    // Same reason: `studioKind` decides who built it, never whether it is finished.
    CVService.listCvs.mockResolvedValue([finished('a', { studioKind: 'build' })]);
    mount();
    await waitFor(() => expect(strip()).toBeTruthy());
    expect(strip().textContent).toContain('1');
  });
});
