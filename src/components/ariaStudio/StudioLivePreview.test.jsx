// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import i18n from '../../i18n';
import StudioLivePreview from './StudioLivePreview';

// The component reads its CV from the Studio context — drive it through a mutable stub so
// each test controls cvData (and can mutate the scan to prove the pulse).
let mockCvData = null;
vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({ cvData: mockCvData }),
}));

// framer-motion's useReducedMotion reads matchMedia; jsdom lacks it. Return "not reduced"
// so the pulse effect is allowed to run.
beforeEach(() => {
  i18n.changeLanguage('en');
  vi.stubGlobal('matchMedia', (q) => ({
    matches: false,
    media: q,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }));
});
afterEach(() => {
  cleanup();
  mockCvData = null;
});

const withScan = (sections) => ({
  _id: 'd1',
  title: 'My CV',
  personalInfo: { fullName: 'Ada Lovelace', email: 'ada@x.com' },
  professionalSummary: 'Analytical engine pioneer.',
  experience: [{ _sortId: 'e1', title: 'Analyst', company: 'RSA', description: '• Led the notes' }],
  projects: [],
  skills: ['Algorithms'],
  education: [],
  studioScan: { fitScore: 60, sections },
});

describe('StudioLivePreview — empty state', () => {
  it('shows the run-a-scan prompt when there is no scan yet', () => {
    mockCvData = { _id: 'd1', title: 'My CV', personalInfo: {}, studioScan: null };
    render(<StudioLivePreview />);
    expect(screen.getByText(/Run a scan and your CV lights up here/i)).toBeTruthy();
  });
});

describe('StudioLivePreview — section bands from the scan', () => {
  it('renders the document with each section verdict from studioScan', () => {
    mockCvData = withScan([
      { key: 'summary', band: 'ok', score: 80 },
      { key: 'experience', band: 'warn', score: 55 },
      { key: 'skills', band: 'bad', score: 20 },
    ]);
    render(<StudioLivePreview />);

    // Content is rendered from cvData (not markdown).
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Analytical engine pioneer.')).toBeTruthy();
    expect(screen.getByText('Led the notes')).toBeTruthy();

    // Verdict chips reflect each section's band.
    expect(screen.getByText('Strong')).toBeTruthy(); // summary ok
    expect(screen.getByText('Needs work')).toBeTruthy(); // experience warn
    expect(screen.getByText('Weak')).toBeTruthy(); // skills bad
  });
});

describe('StudioLivePreview — section labels track the CV language', () => {
  const sections = [
    { key: 'summary', band: 'ok', score: 80 },
    { key: 'experience', band: 'warn', score: 55 },
    { key: 'skills', band: 'bad', score: 20 },
  ];

  it('renders English section labels by default', () => {
    mockCvData = withScan(sections);
    render(<StudioLivePreview />);
    // The <h3> textContent is the real string; the uppercase is CSS-only.
    for (const l of ['Contact', 'Summary', 'Experience', 'Skills']) {
      expect(screen.getByText(l)).toBeTruthy();
    }
  });

  it('renders FRENCH section labels when outputLang is fr — the FIX', () => {
    mockCvData = { ...withScan(sections), outputLang: 'fr' };
    render(<StudioLivePreview />);
    // Short panel forms: Summary→Résumé, Experience→Expérience, Skills→Compétences.
    for (const l of ['Contact', 'Résumé', 'Expérience', 'Compétences']) {
      expect(screen.getByText(l)).toBeTruthy();
    }
    // The English labels are gone — proving the flip actually did something.
    expect(screen.queryByText('Summary')).toBeNull();
    expect(screen.queryByText('Experience')).toBeNull();
    expect(screen.queryByText('Skills')).toBeNull();
  });
});

describe('StudioLivePreview — transform-on-fix pulse', () => {
  it('pulses ONLY the section whose band improved on re-band', async () => {
    mockCvData = withScan([
      { key: 'summary', band: 'ok', score: 80 },
      { key: 'experience', band: 'bad', score: 20 },
    ]);
    const { rerender, container } = render(<StudioLivePreview />);
    // First render seeds prev bands — nothing pulses.
    expect(container.querySelectorAll('.aria-just-fixed').length).toBe(0);

    // A fix lands: experience improves bad → ok; summary is unchanged.
    mockCvData = withScan([
      { key: 'summary', band: 'ok', score: 80 },
      { key: 'experience', band: 'ok', score: 78 },
    ]);
    rerender(<StudioLivePreview />);

    await waitFor(() => {
      const pulsed = container.querySelectorAll('.aria-just-fixed');
      expect(pulsed.length).toBe(1); // exactly one section pulses
    });
  });
});
