import { describe, it, expect } from 'vitest';
import { repairStudioThread, isForeignPrepThread, PREP_ONLY_KINDS } from './studioThread';

// The transcript an analysis leaves behind. It ended up saved on CV drafts, which is what
// this helper exists to undo.
const ANALYSIS = [
  { who: 'prepstart' },
  { who: 'prepcv', title: 'Ernest CV' },
  { who: 'aria', text: 'Analysis chatter.' },
  { who: 'prepjob', jobTitle: 'Field Operator' },
  { who: 'prepresult', applicationId: 'app-9', jobTitle: 'Field Operator' },
];

const OWN_THREAD = [
  { who: 'you', text: 'Here is my work history.' },
  { who: 'aria', text: 'Noted.' },
  { who: 'rolerecord', sortId: 1 },
];

describe('isForeignPrepThread', () => {
  it('recognises a thread by its prep markers', () => {
    expect(isForeignPrepThread(ANALYSIS)).toBe(true);
  });

  it('leaves a CV’s own thread alone, including its build markers', () => {
    expect(isForeignPrepThread(OWN_THREAD)).toBe(false);
  });

  it('treats absent and empty threads as fine', () => {
    expect(isForeignPrepThread(undefined)).toBe(false);
    expect(isForeignPrepThread([])).toBe(false);
  });

  it('names every prep-only kind, and nothing a build session emits', () => {
    // A regression fence: if a new prep kind is added and not listed here, damaged threads
    // carrying only that kind would go unrepaired.
    expect([...PREP_ONLY_KINDS].sort()).toEqual(['prepcv', 'prepjob', 'prepresult', 'prepstart']);
  });
});

describe('repairStudioThread', () => {
  it('drops a foreign thread whole, rather than leaving its chatter behind', () => {
    const { draft, repaired } = repairStudioThread({
      _id: 'd1',
      coachChats: { studio: ANALYSIS },
    });
    expect(repaired).toBe(true);
    expect(draft.coachChats.studio).toEqual([]);
  });

  it('keeps the rest of the draft, and the draft’s other conversations', () => {
    const { draft } = repairStudioThread({
      _id: 'd1',
      title: "Daniel's CV",
      experience: [{ title: 'Operator' }],
      coachChats: { studio: ANALYSIS, target_job: [{ who: 'aria' }] },
    });
    expect(draft.title).toBe("Daniel's CV");
    expect(draft.experience).toEqual([{ title: 'Operator' }]);
    expect(draft.coachChats.target_job).toEqual([{ who: 'aria' }]);
  });

  it('returns the very same object when there is nothing to repair', () => {
    // Identity, not equality: the common path must not churn a new draft object on every
    // bind, or every downstream memo keyed on cvData would invalidate for no reason.
    const healthy = { _id: 'd1', coachChats: { studio: OWN_THREAD } };
    const { draft, repaired } = repairStudioThread(healthy);
    expect(repaired).toBe(false);
    expect(draft).toBe(healthy);
  });

  it('handles an unbind (null) without throwing', () => {
    expect(repairStudioThread(null)).toEqual({ draft: null, repaired: false });
  });
});
