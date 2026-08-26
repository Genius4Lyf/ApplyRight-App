// @vitest-environment jsdom
//
// "What this job asks for" — the panel behind the top-bar tracker.
//
// The honesty rules are the whole point, and they are what these tests hold:
//
//   · THE TARGET IS THE MUST-HAVES. Not a share of everything, and never an invented "ATS
//     pass rate". Nice-to-haves are shown as bonus, outside the count.
//   · Provenance is claimed ONLY where the interview ledger has it — where the user proved
//     something in their own words. A requirement matched in CV text is marked covered and
//     nothing more; inventing a source is exactly the failure this feature exists to stop.
//   · An open must-have offers the cross-history hunt, which is already built.
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import i18n from '../../i18n';
import JobTargetPanel from './JobTargetPanel';

const requestStudioCommand = vi.fn();
let cvData = {};

vi.mock('../../context/AriaStudioContext', () => ({
  useAriaStudio: () => ({ cvData, requestStudioCommand }),
}));

afterEach(() => {
  cleanup();
  requestStudioCommand.mockReset();
});

const KEYWORDS = [
  { name: 'Kubernetes', importance: 'must_have', aliases: [] },
  { name: 'Terraform', importance: 'must_have', aliases: [] },
  { name: 'GraphQL', importance: 'nice_to_have', aliases: [] },
];

const COVERAGE = {
  results: [
    { name: 'Kubernetes', importance: 'must_have', covered: true },
    { name: 'Terraform', importance: 'must_have', covered: false },
    { name: 'GraphQL', importance: 'nice_to_have', covered: true },
  ],
  covered: 2,
  total: 3,
  mustHaveCovered: 1,
  mustHaveTotal: 2,
};

const baseDraft = {
  targetJob: {
    title: 'Platform Engineer',
    brief: {
      role: 'Platform Engineer',
      company: 'Acme',
      requirements: [
        { id: 'req_k8s', name: 'Kubernetes', priority: 'must_have' },
        { id: 'req_tf', name: 'Terraform', priority: 'must_have' },
        { id: 'req_gql', name: 'GraphQL', priority: 'nice_to_have' },
      ],
    },
  },
  experience: [{ _sortId: 'e1', title: 'Engineer', company: 'Northwind' }],
  projects: [],
  // Kubernetes was proved in the interview and filed under e1; GraphQL was only matched
  // in CV text, so it has no ledger entry.
  coachEvidence: {
    e1: { evidence: [{ id: 'ev1', requirementIds: ['req_k8s'] }] },
  },
};

const setup = (over = {}) => {
  cvData = { ...baseDraft, ...over };
  render(<JobTargetPanel coverage={COVERAGE} keywords={KEYWORDS} onClose={vi.fn()} />);
};

describe('JobTargetPanel — the target is the must-haves', () => {
  it('counts must-haves only, with nice-to-haves outside the total', () => {
    setup();
    expect(screen.getByText('1')).toBeTruthy();
    expect(
      screen.getByText(i18n.t('ariaStudio.jobTarget.ofTarget', { total: 2 }))
    ).toBeTruthy();
  });

  it('splits the two groups and labels the bonus as not required', () => {
    setup();
    expect(screen.getByText(i18n.t('ariaStudio.jobTarget.mustHave'))).toBeTruthy();
    expect(screen.getByText(i18n.t('ariaStudio.jobTarget.niceToHave'))).toBeTruthy();
    expect(screen.getByText(i18n.t('ariaStudio.jobTarget.bonus'))).toBeTruthy();
  });

  it('lists every requirement the job named', () => {
    setup();
    ['Kubernetes', 'Terraform', 'GraphQL'].forEach((name) => {
      expect(screen.getByText(name)).toBeTruthy();
    });
  });
});

describe('JobTargetPanel — provenance is only ever claimed, never guessed', () => {
  it('names the entry for something proved in the interview', () => {
    setup();
    expect(
      screen.getByText(i18n.t('ariaStudio.jobTarget.provedAt', { where: 'Engineer · Northwind' }))
    ).toBeTruthy();
  });

  it('claims no source for something merely matched in CV text', () => {
    // GraphQL is covered but has no ledger entry — exactly one provenance line on screen.
    setup();
    const lines = screen.queryAllByText(/you showed this in/i);
    expect(lines).toHaveLength(1);
  });

  it('claims nothing when the ledger is empty', () => {
    setup({ coachEvidence: {} });
    expect(screen.queryByText(/you showed this in/i)).toBeNull();
  });

  it('ignores ledger evidence whose entry has since been deleted', () => {
    // A stale sortId must not resolve to a blank label or the wrong role.
    setup({ coachEvidence: { gone: { evidence: [{ requirementIds: ['req_k8s'] }] } } });
    expect(screen.queryByText(/you showed this in/i)).toBeNull();
  });
});

describe('JobTargetPanel — an open must-have opens the hunt', () => {
  it('offers it only on the ones NOT yet covered', () => {
    setup();
    // Kubernetes and GraphQL are covered; Terraform is the only open row.
    expect(screen.getAllByText(i18n.t('ariaStudio.jobTarget.askAria'))).toHaveLength(1);
  });

  it('dispatches the cross-history hunt for that requirement', () => {
    setup();
    fireEvent.click(screen.getByText(i18n.t('ariaStudio.jobTarget.askAria')));

    expect(requestStudioCommand).toHaveBeenCalledWith('proveSkill', 'skills', null, {
      requirementId: 'req_tf',
      name: 'Terraform',
    });
  });

  it('offers nothing when the requirement has no id to address', () => {
    // Requirement ids live on brief.requirements; without them the hunt cannot be aimed.
    setup({ targetJob: { title: 'Platform Engineer', brief: { role: 'Platform Engineer' } } });
    expect(screen.queryByText(i18n.t('ariaStudio.jobTarget.askAria'))).toBeNull();
  });
});

describe('JobTargetPanel — before the first coverage lands', () => {
  it('shows zero of the target rather than a blank or a guess', () => {
    cvData = baseDraft;
    render(<JobTargetPanel coverage={null} keywords={KEYWORDS} onClose={vi.fn()} />);

    expect(screen.getByText('0')).toBeTruthy();
    // Falls back to counting the must-haves it was handed, so the target is right from
    // the very first paint.
    expect(screen.getByText(i18n.t('ariaStudio.jobTarget.ofTarget', { total: 2 }))).toBeTruthy();
  });
});
