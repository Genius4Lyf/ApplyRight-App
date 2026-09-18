import { describe, expect, it } from 'vitest';
import { buildRequirementRows, askableRows, REQUIREMENT_STATE } from './requirementRows';

// ONE answer to "where does this requirement stand?", shared by the target panel and the
// bar inside the role interview. The backend learned this the hard way: three files once
// answered "is this covered?" differently and two ran in the same response, so the same
// word could be found in one place and missing in another.
//
// Nothing here decides coverage — that verdict arrives from the server. These assert the
// JOIN: the verdict, the typed ids, the evidence ledger, and the user's refusals.

const CV = {
  targetJob: {
    brief: {
      requirements: [
        { id: 'req_ptw', name: 'Permit-to-Work', type: 'method', priority: 'must_have' },
        { id: 'req_ts', name: 'Troubleshooting', type: 'skill', priority: 'must_have' },
        { id: 'req_rca', name: 'Root-cause analysis', type: 'method', priority: 'must_have' },
        {
          id: 'req_me',
          name: 'Mechanical Engineering',
          type: 'domain',
          priority: 'must_have',
          qualification: true,
        },
      ],
    },
  },
  experience: [{ _sortId: 's1', title: 'Technician', company: 'Dangote' }],
  projects: [],
  coachEvidence: {
    s1: { evidence: [{ id: 'ev_1', requirementIds: ['req_ptw'] }] },
  },
  skillDeclines: [{ requirementId: 'req_rca', name: 'Root-cause analysis', level: 'never' }],
};

const KEYWORDS = [
  { name: 'Permit-to-Work', importance: 'must_have' },
  { name: 'Troubleshooting', importance: 'must_have' },
  { name: 'Root-cause analysis', importance: 'must_have' },
  { name: 'Mechanical Engineering', importance: 'must_have' },
];

const COVERAGE = {
  results: [
    { name: 'Permit-to-Work', covered: true },
    { name: 'Troubleshooting', covered: false },
    { name: 'Root-cause analysis', covered: false },
    { name: 'Mechanical Engineering', covered: false },
  ],
};

const rowsFor = (over = {}) =>
  buildRequirementRows({ cvData: CV, coverage: COVERAGE, keywords: KEYWORDS, ...over });

const byName = (rows) => Object.fromEntries(rows.map((r) => [r.name, r]));

describe('buildRequirementRows', () => {
  it('gives every requirement exactly one of the three states', () => {
    const rows = byName(rowsFor());
    expect(rows['Permit-to-Work'].state).toBe(REQUIREMENT_STATE.COVERED);
    expect(rows.Troubleshooting.state).toBe(REQUIREMENT_STATE.OPEN);
    expect(rows['Root-cause analysis'].state).toBe(REQUIREMENT_STATE.DECLINED);
  });

  it('names WHERE a covered requirement was proved, from the interview ledger only', () => {
    const rows = byName(rowsFor());
    expect(rows['Permit-to-Work'].provenAt).toBe('Technician · Dangote');
    // A text match says covered and stops there. Inventing a source would be the exact
    // failure this feature exists to prevent.
    expect(rows.Troubleshooting.provenAt).toBe('');
  });

  it('carries the requirement id, so a row can be asked about', () => {
    expect(byName(rowsFor()).Troubleshooting.requirementId).toBe('req_ts');
  });

  it('matches a decline on NAME — the skills card writes no id at all', () => {
    const noId = {
      ...CV,
      skillDeclines: [{ name: 'troubleshooting', level: 'never', source: 'skills_card' }],
    };
    expect(byName(rowsFor({ cvData: noId })).Troubleshooting.state).toBe(
      REQUIREMENT_STATE.DECLINED
    );
  });

  it('lets coverage win over a decline — evidence beats an older no', () => {
    const declinedButProved = {
      ...CV,
      skillDeclines: [{ name: 'Permit-to-Work', level: 'never' }],
    };
    expect(byName(rowsFor({ cvData: declinedButProved }))['Permit-to-Work'].state).toBe(
      REQUIREMENT_STATE.COVERED
    );
  });

  it('marks a qualification so no surface can offer it as a question', () => {
    expect(byName(rowsFor())['Mechanical Engineering'].qualification).toBe(true);
    expect(byName(rowsFor()).Troubleshooting.qualification).toBe(false);
  });

  it('survives a draft with no brief, no ledger and no declines', () => {
    const rows = buildRequirementRows({
      cvData: {},
      coverage: null,
      keywords: [{ name: 'Troubleshooting', importance: 'must_have' }],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ state: REQUIREMENT_STATE.OPEN, requirementId: null });
  });

  it('is empty when there are no keywords', () => {
    expect(buildRequirementRows({ cvData: CV, coverage: COVERAGE })).toEqual([]);
  });
});

describe('askableRows', () => {
  it('offers only what is open, addressable, and not a qualification', () => {
    expect(askableRows(rowsFor()).map((r) => r.name)).toEqual(['Troubleshooting']);
  });

  it('caps the list, so a long posting cannot become an interrogation', () => {
    expect(askableRows(rowsFor(), 0)).toEqual([]);
  });
});
