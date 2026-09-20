// @vitest-environment jsdom
//
// THE POSTING PANEL — just the posting.
//
// It used to carry the requirement checklist and a 0-of-5 target, from back when nothing
// else did. The bar above the composer took that job and took it better: it sits inside
// the interview, it ticks as you work, and its rows can be tapped to steer the questions.
// Two lists of the same requirements on one screen is one too many, and the one that could
// not be acted on was this one.
//
// What these hold is the half the bar cannot: the employer's own words, in full, reachable
// at any time rather than only mid-interview — and NO count, because the same figure was
// being shown in three places at once.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import JobTargetPanel from './JobTargetPanel';

let cvData = {};

vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({ cvData }),
}));

afterEach(cleanup);

const POSTING = 'Operating oil and gas facilities safely.\n\nRequirements\n- Permit-to-Work';

const baseDraft = {
  targetJob: {
    title: 'Operations and Maintenance Technician',
    description: POSTING,
    brief: {
      role: 'Operations and Maintenance Technician',
      company: 'Renaissance',
      mustHaves: [{ name: 'Permit-to-Work', importance: 'must_have' }],
      requirements: [{ id: 'req_ptw', name: 'Permit-to-Work', priority: 'must_have' }],
    },
  },
  experience: [],
  projects: [],
  coachEvidence: {},
};

const setup = (over = {}) => {
  cvData = { ...baseDraft, ...over };
  render(<JobTargetPanel onClose={vi.fn()} />);
};

describe('JobTargetPanel — the employer’s own words', () => {
  it('names the role it belongs to', () => {
    setup();
    expect(screen.getByText('Operations and Maintenance Technician · Renaissance')).toBeTruthy();
  });

  it('shows the posting straight away, with no disclosure to open first', () => {
    // It is the only thing in here now; a panel whose single item has to be unfolded
    // before it says anything wasted the tap that opened it.
    setup();
    expect(screen.getByText(/Operating oil and gas facilities safely/)).toBeTruthy();
  });

  it('keeps the posting’s own line breaks', () => {
    setup();
    const body = screen.getByText(/Operating oil and gas facilities safely/);
    expect(body.className).toContain('whitespace-pre-wrap');
  });

  it('says so plainly when no posting text was saved', () => {
    setup({ targetJob: { ...baseDraft.targetJob, description: '' } });
    expect(screen.getByText(i18n.t('ariaStudio.jobTarget.noPosting'))).toBeTruthy();
  });

  it('falls back to a neutral title when the job has no name yet', () => {
    setup({ targetJob: { description: POSTING } });
    expect(screen.getByText(i18n.t('ariaStudio.jobTarget.thisJob'))).toBeTruthy();
  });
});

// The three copies of one number are down to two, and this is not one of them: the header
// pill opens the posting, the interview bar tracks the work.
describe('JobTargetPanel — no second scoreboard', () => {
  it('shows no requirement checklist', () => {
    setup();
    expect(screen.queryByText(i18n.t('ariaStudio.jobTarget.mustHave'))).toBeNull();
    expect(screen.queryByText(i18n.t('ariaStudio.jobTarget.niceToHave'))).toBeNull();
  });

  it('shows no coverage count', () => {
    setup();
    expect(
      screen.queryByText((_, node) =>
        (node?.textContent || '').includes(i18n.t('ariaStudio.jobTarget.ofTarget', { total: 1 }))
      )
    ).toBeNull();
  });

  it('never offers to start a hunt from here', () => {
    setup();
    expect(screen.queryByText(i18n.t('ariaStudio.jobTarget.askAria'))).toBeNull();
  });
});
