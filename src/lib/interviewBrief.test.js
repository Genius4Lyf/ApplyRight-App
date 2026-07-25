import { describe, it, expect } from 'vitest';
import { buildRoomBrief, evidenceForStage } from './interviewBrief';

describe('what counts as evidence — career-stage aware', () => {
  it('tells a graduate plainly that a job example is not required', () => {
    const e = evidenceForStage('grad');
    expect(e.headline).toMatch(/not the only thing that counts/i);
    expect(e.body).toMatch(/do not need a paid role/i);
    const all = e.sources.join(' ').toLowerCase();
    // The evidence sources that actually exist in a Nigerian graduate's life.
    ['project', 'nysc', 'volunteer', 'societ', 'side hustle', 'internship'].forEach((s) =>
      expect(all).toContain(s)
    );
  });

  it('gives a mid-career candidate specificity guidance, not permission', () => {
    const e = evidenceForStage('experienced');
    expect(e.headline).toMatch(/specifics/i);
    expect(e.sources.join(' ')).toMatch(/numbers/i);
    // And never tells an experienced candidate a job is optional.
    expect(e.body).not.toMatch(/do not need a paid role/i);
    // Anti-fabrication carries into the brief too.
    expect(e.closer).toMatch(/rather than inventing one/i);
  });

  it('handles a career changer distinctly', () => {
    expect(evidenceForStage('changer').headline).toMatch(/old field still counts/i);
  });

  it('falls back to the graduate copy for an unknown or missing stage', () => {
    expect(evidenceForStage(undefined)).toEqual(evidenceForStage('grad'));
    expect(evidenceForStage('nonsense')).toEqual(evidenceForStage('grad'));
  });
});

describe('the brief describes the room that will actually run', () => {
  it('names a panel and its seats', () => {
    const b = buildRoomBrief({
      careerStage: 'grad',
      panel: [
        { name: 'Ada', role: 'HR', focus: 'fit' },
        { name: 'Bola', role: 'Engineer', focus: 'systems' },
      ],
      plannedSec: 900,
    });
    expect(b.kind.label).toMatch(/Panel interview · 2 interviewers/);
    expect(b.minutes).toBe(15);
    expect(b.caresAbout).toHaveLength(2);
    expect(b.caresAbout[1]).toEqual({ who: 'Bola', role: 'Engineer', focus: 'systems' });
  });

  it('names a chosen one-on-one interviewer', () => {
    const b = buildRoomBrief({
      careerStage: 'experienced',
      interviewer: { name: 'Chidi', role: 'Engineering Manager', focus: 'delivery' },
    });
    expect(b.kind.label).toMatch(/One-on-one with Chidi/);
    expect(b.caresAbout[0].focus).toBe('delivery');
  });

  it('falls back to the interview style when there is no panel', () => {
    expect(buildRoomBrief({ style: 'technical' }).kind.label).toMatch(/Technical deep-dive/);
    expect(buildRoomBrief({ style: 'screening' }).kind.label).toMatch(/screening/i);
    expect(buildRoomBrief({}).kind.label).toMatch(/General interview/);
  });

  it('describes the challenge level as pressure, never as comfort', () => {
    expect(buildRoomBrief({ challenge: 'gentle' }).challengeNote).toMatch(/low pressure/i);
    expect(buildRoomBrief({ challenge: 'tough' }).challengeNote).toMatch(/pressure-test/i);
    // No promise of reassurance the room will not deliver.
    ['gentle', 'realistic', 'tough'].forEach((c) => {
      expect(buildRoomBrief({ challenge: c }).challengeNote).not.toMatch(
        /encourag|reassur|confidence/i
      );
    });
  });

  it('lists JD must-haves as likely topics, capped', () => {
    const b = buildRoomBrief({
      mustHaves: ['SQL', 'Python', 'dbt', 'Airflow', 'AWS', 'Spark', 'Kafka'],
    });
    expect(b.topics).toHaveLength(6);
    expect(b.topics[0]).toBe('SQL');
  });

  it('accepts must-haves as objects or strings', () => {
    expect(buildRoomBrief({ mustHaves: [{ name: 'SQL' }, 'Python', null] }).topics).toEqual([
      'SQL',
      'Python',
    ]);
  });
});

describe('the brief carries what the room stopped saying', () => {
  it('sets the expectation that the interviewer has their CV and will cross-check', () => {
    const b = buildRoomBrief({});
    expect(b.cvNote).toMatch(/CV open in front of them/i);
    expect(b.cvNote).toMatch(/asked to square the two/i);
    // Framed as a CV gap, not as suspicion — matching the room's Phase 1 stance.
    expect(b.cvNote).toMatch(/your CV is missing something/i);
  });

  it('gives explicit permission to be bad at it', () => {
    const b = buildRoomBrief({});
    expect(b.permission).toMatch(/allowed to freeze/i);
    expect(b.permission).toMatch(/run it again/i);
  });

  it('never promises the interviewer will be encouraging', () => {
    const b = buildRoomBrief({ careerStage: 'grad', challenge: 'gentle' });
    const text = JSON.stringify(b);
    expect(text).not.toMatch(/will encourage you/i);
    expect(text).not.toMatch(/they will reassure/i);
  });

  it('is fully derived — nothing here requires an AI call', () => {
    // Guard against someone later making this async / fetch-backed.
    expect(buildRoomBrief({}).evidence).toBeTruthy();
    expect(typeof buildRoomBrief).toBe('function');
    expect(buildRoomBrief({}) instanceof Promise).toBe(false);
  });
});
