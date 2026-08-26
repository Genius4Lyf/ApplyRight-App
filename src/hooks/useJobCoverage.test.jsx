// @vitest-environment jsdom
//
// The live job tracker's data source. Three properties matter more than the numbers:
//
//   1. It NEVER charges. It rides POST /ai/keyword-coverage — free, no AI, no draft write.
//      A passive tracker that quietly spends a credit, or that mutates studioScan (which is
//      the tailor track's state), would be worse than having no tracker at all.
//   2. A burst of edits is ONE call. Applying four bullets then a skill is one recompute,
//      not five.
//   3. A dropped request keeps the last good number. Blanking out reads as "you lost
//      progress" — alarming, and false.
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/cv.service', () => ({
  default: { getKeywordCoverage: vi.fn() },
}));

import CVService from '../services/cv.service';
import { useJobCoverage } from './useJobCoverage';

const COVERAGE = {
  results: [
    { name: 'Kubernetes', importance: 'must_have', covered: true },
    { name: 'Terraform', importance: 'must_have', covered: false },
    { name: 'GraphQL', importance: 'nice_to_have', covered: false },
  ],
  covered: 1,
  total: 3,
  mustHaveCovered: 1,
  mustHaveTotal: 2,
};

const draft = (over = {}) => ({
  targetJob: {
    description: 'A job',
    brief: {
      mustHaves: [
        { name: 'Kubernetes', importance: 'must_have', aliases: ['K8s'] },
        { name: 'Terraform', importance: 'must_have', aliases: [] },
      ],
      niceToHaves: [{ name: 'GraphQL', importance: 'nice_to_have', aliases: [] }],
    },
  },
  experience: [{ _sortId: 'e1', title: 'Engineer', description: 'Ran K8s in production.' }],
  projects: [],
  skills: ['Docker'],
  professionalSummary: '',
  ...over,
});

let latest = null;
const Probe = ({ cvData }) => {
  latest = useJobCoverage(cvData);
  return null;
};

beforeEach(() => {
  vi.useFakeTimers();
  latest = null;
  CVService.getKeywordCoverage.mockReset();
  CVService.getKeywordCoverage.mockResolvedValue(COVERAGE);
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

const flush = async () => {
  await act(async () => {
    vi.advanceTimersByTime(1200);
  });
};

describe('useJobCoverage', () => {
  it('reports a target as soon as the brief has must-haves', () => {
    render(<Probe cvData={draft()} />);
    expect(latest.ready).toBe(true);
    // must-haves lead, so the checklist's target group comes first.
    expect(latest.keywords.map((k) => k.name)).toEqual(['Kubernetes', 'Terraform', 'GraphQL']);
  });

  it('sends the JD aliases along, so the posting’s own second name counts', async () => {
    render(<Probe cvData={draft()} />);
    await flush();

    const [keywords] = CVService.getKeywordCoverage.mock.calls[0];
    expect(keywords.find((k) => k.name === 'Kubernetes').aliases).toEqual(['K8s']);
  });

  it('matches against bullets and skills, never titles', async () => {
    render(<Probe cvData={draft()} />);
    await flush();

    const [, payload] = CVService.getKeywordCoverage.mock.calls[0];
    expect(payload.text).toContain('Ran K8s in production.');
    // "Engineer" is a job TITLE — a requirement is not met by a title containing the word.
    expect(payload.text).not.toContain('Engineer');
    expect(payload.skills).toEqual(['Docker']);
  });

  it('coalesces a burst of edits into ONE call', async () => {
    const { rerender } = render(<Probe cvData={draft()} />);
    rerender(<Probe cvData={draft({ skills: ['Docker', 'Go'] })} />);
    rerender(<Probe cvData={draft({ skills: ['Docker', 'Go', 'Rust'] })} />);
    await flush();

    expect(CVService.getKeywordCoverage).toHaveBeenCalledTimes(1);
    // ...and it is the LAST state that gets sent, not the first.
    const [, payload] = CVService.getKeywordCoverage.mock.calls[0];
    expect(payload.skills).toEqual(['Docker', 'Go', 'Rust']);
  });

  it('does not refetch when the draft object changes but the content does not', async () => {
    // The context hands back a fresh cvData on every autosave; refetching on each of those
    // would hammer the endpoint for an identical answer.
    const { rerender } = render(<Probe cvData={draft()} />);
    await flush();
    expect(CVService.getKeywordCoverage).toHaveBeenCalledTimes(1);

    rerender(<Probe cvData={draft()} />);
    await flush();
    expect(CVService.getKeywordCoverage).toHaveBeenCalledTimes(1);
  });

  it('exposes the coverage once it lands', async () => {
    render(<Probe cvData={draft()} />);
    await flush();
    expect(latest.coverage).toEqual(COVERAGE);
  });

  it('keeps the last good number when a later request fails', async () => {
    const { rerender } = render(<Probe cvData={draft()} />);
    await flush();
    expect(latest.coverage).toEqual(COVERAGE);

    // The user keeps building, and this recompute drops. The tracker must not blank out —
    // that reads as "you lost progress", which is both alarming and untrue.
    CVService.getKeywordCoverage.mockRejectedValueOnce(new Error('offline'));
    rerender(<Probe cvData={draft({ skills: ['Docker', 'Go'] })} />);
    await flush();

    expect(CVService.getKeywordCoverage).toHaveBeenCalledTimes(2);
    expect(latest.coverage).toEqual(COVERAGE);
  });

  it('starts empty rather than inventing a number when the FIRST request fails', async () => {
    CVService.getKeywordCoverage.mockRejectedValueOnce(new Error('offline'));
    render(<Probe cvData={draft()} />);
    await flush();

    expect(latest.coverage).toBeNull();
  });

  it('stays silent with no job to target', async () => {
    const noJd = { targetJob: {}, experience: [], projects: [], skills: [] };
    render(<Probe cvData={noJd} />);
    await flush();

    expect(latest.ready).toBe(false);
    expect(latest.coverage).toBeNull();
    expect(CVService.getKeywordCoverage).not.toHaveBeenCalled();
  });

  it('stays silent when the brief has ONLY nice-to-haves', async () => {
    // There is no target to count toward, so a "0 of 0" pill would be nonsense.
    const noMust = draft();
    noMust.targetJob.brief.mustHaves = [];
    render(<Probe cvData={noMust} />);
    await flush();

    expect(latest.ready).toBe(false);
    expect(CVService.getKeywordCoverage).not.toHaveBeenCalled();
  });
});
