// @vitest-environment jsdom
//
// A full analysis is five cards deep, and rendered end-to-end in a chat column it is a
// very long scroll. Most of it is detail you want ON DEMAND — so each section collapses to
// its finding and opens on a tap.
//
// What these tests hold is the part that makes that safe: a collapsed section still tells
// you what it FOUND. A disclosure that collapses to a bare title hides information rather
// than tidying it.
import React, { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, screen, fireEvent, waitFor, within } from '@testing-library/react';

import '../i18n';
import FitScoreCard from './FitScoreCard';

vi.mock('../services/api', () => ({ default: { post: vi.fn() } }));
vi.mock('sonner', () => {
  const toast = vi.fn();
  toast.error = vi.fn();
  toast.success = vi.fn();
  return { toast };
});

const ANALYSIS = {
  overallFeedback: 'Solid for the level.',
  recommendation: 'good_match',
  matchedSkills: [{ name: 'HV switching' }, { name: 'CompEx' }],
  missingSkills: [{ name: 'PLC', importance: 'must_have' }],
  experienceAnalysis: { candidateYears: 4, requiredYears: 4, match: true },
  seniorityAnalysis: { candidateLevel: 'mid', requiredLevel: 'mid', match: true },
  scoreBreakdown: {
    skillsScore: 50,
    experienceScore: 60,
    educationScore: 55,
    seniorityScore: 100,
    overallScore: 100,
  },
  evidence: [
    { quote: 'Maintained HV switchgear offshore', issue: 'No numbers attached.' },
    { quote: 'Electrical and Electronic Engineering', issue: 'Coursework not named.' },
  ],
};

const ACTION_PLAN = [{ action: 'Add PLC experience', importance: 'must_have' }];

const mount = (props = {}) =>
  render(
    <StrictMode>
      <FitScoreCard
        fitScore={63}
        fitAnalysis={ANALYSIS}
        actionPlan={ACTION_PLAN}
        applicationId="a1"
        {...props}
      />
    </StrictMode>
  );

// A section's own disclosure button, found by the heading it carries.
const sectionToggle = (name) => screen.getByRole('button', { name: new RegExp(name, 'i') });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe('the analysis opens on demand', () => {
  it('keeps the verdict itself visible — that is the answer', () => {
    mount();
    // The score is never behind a disclosure. Collapsing the thing someone came to read
    // would leave an analysis that says nothing until you tap it.
    expect(screen.getByText('63%')).toBeTruthy();
  });

  it('collapses detail sections but still says what each one found', () => {
    mount();

    // Not the detail…
    expect(screen.queryByText(/Maintained HV switchgear offshore/)).toBeNull();
    // …but the finding, yes.
    expect(screen.getByText(/2 lines from your CV/i)).toBeTruthy();
    expect(screen.getByText('2/3 matched')).toBeTruthy();
    expect(screen.getByText(/Skills 50/)).toBeTruthy();
  });

  it('opens a section on its header, and closes it from the bottom', async () => {
    mount();

    fireEvent.click(sectionToggle('what stood out'));
    expect(screen.getByText(/Maintained HV switchgear offshore/)).toBeTruthy();

    // The close is INSIDE the section it closes. After a long read the header is off
    // screen, and scrolling back up to shut what you just read is the friction this
    // whole thing exists to remove.
    const evidence = sectionToggle('what stood out').closest('section');
    fireEvent.click(within(evidence).getByRole('button', { name: /close/i }));
    // waitFor: the section collapses through a height animation, so it is still in the
    // DOM for a beat after the click.
    await waitFor(() => expect(screen.queryByText(/Maintained HV switchgear offshore/)).toBeNull());
  });

  it('opens the action plan by default — a to-do list nobody opens is one nobody does', () => {
    mount();
    expect(screen.getByText('Add PLC experience')).toBeTruthy();
  });

  it('leaves each section independent', () => {
    mount();
    fireEvent.click(sectionToggle('what stood out'));
    fireEvent.click(sectionToggle('score breakdown'));

    // Opening one must not close another — they answer different questions.
    expect(screen.getByText(/Maintained HV switchgear offshore/)).toBeTruthy();
    expect(screen.getByText('50/100')).toBeTruthy();
  });
});

describe('the section labels', () => {
  it('all render identically, tooltip or not', () => {
    // "The math" carries a help icon and the others do not. Hosting that icon by wrapping
    // the label in its own element made THAT eyebrow render visibly larger than its three
    // siblings — the text was no longer a direct child of the styled span. The icon has
    // its own slot now, so every label takes the same path; this pins that.
    mount();
    const labels = ['The gap', 'Read from your résumé', 'The math', 'Your move'].map(
      (name) => screen.getByText(new RegExp(name, 'i')).className
    );
    expect(new Set(labels).size).toBe(1);
    expect(labels[0]).toContain('text-[0.7rem]');
  });
});

describe('the per-dimension verdict', () => {
  it('is carried by colour and a dash, not a bordered pill', () => {
    mount();
    const verdict = screen.getByText('Meets');
    // The colour IS the meaning; a box around two words in a line of plain text read as a
    // control you could press.
    expect(verdict.className).toMatch(/text-emerald-600/);
    expect(verdict.className).not.toMatch(/border/);
    expect(verdict.className).not.toMatch(/rounded-full/);
  });
});
