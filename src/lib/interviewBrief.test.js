import { describe, it, expect } from 'vitest';
import { buildRoomBrief, evidenceForStage } from './interviewBrief';
import en from '../i18n/locales/en.json';

// buildRoomBrief/evidenceForStage are plain JS (no react-i18next context), so they
// return i18n KEYS (+ interpolation params) rather than resolved English prose —
// every caller (a React component with useTranslation) resolves them with t().
// These tests assert on the actual COPY the keys point at, by resolving them
// against en.json with the same {{param}} interpolation react-i18next uses.
const getByPath = (obj, path) => path.split('.').reduce((o, k) => o?.[k], obj);

const tt = (key, params) => {
  const str = getByPath(en, key);
  if (typeof str !== 'string') throw new Error(`Missing key in en.json: ${key}`);
  if (!params) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => (params[k] ?? ''));
};

describe('what counts as evidence — career-stage aware', () => {
  it('tells a graduate plainly that a job example is not required', () => {
    const e = evidenceForStage('grad');
    expect(tt(e.headlineKey)).toMatch(/not the only thing that counts/i);
    expect(tt(e.bodyKey)).toMatch(/do not need a paid role/i);
    const all = e.sourceKeys
      .map((k) => tt(k))
      .join(' ')
      .toLowerCase();
    // The evidence sources that actually exist in a Nigerian graduate's life.
    ['project', 'nysc', 'volunteer', 'societ', 'side hustle', 'internship'].forEach((s) =>
      expect(all).toContain(s)
    );
  });

  it('gives a mid-career candidate specificity guidance, not permission', () => {
    const e = evidenceForStage('experienced');
    expect(tt(e.headlineKey)).toMatch(/specifics/i);
    expect(e.sourceKeys.map((k) => tt(k)).join(' ')).toMatch(/numbers/i);
    // And never tells an experienced candidate a job is optional.
    expect(tt(e.bodyKey)).not.toMatch(/do not need a paid role/i);
    // Anti-fabrication carries into the brief too.
    expect(tt(e.closerKey)).toMatch(/rather than inventing one/i);
  });

  it('handles a career changer distinctly', () => {
    expect(tt(evidenceForStage('changer').headlineKey)).toMatch(/old field still counts/i);
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
    expect(tt(b.kind.labelKey, b.kind.labelParams)).toMatch(/Panel interview · 2 interviewers/);
    expect(b.minutes).toBe(15);
    expect(b.caresAbout).toHaveLength(2);
    expect(b.caresAbout[1]).toEqual({ who: 'Bola', role: 'Engineer', focus: 'systems' });
  });

  it('names a chosen one-on-one interviewer', () => {
    const b = buildRoomBrief({
      careerStage: 'experienced',
      interviewer: { name: 'Chidi', role: 'Engineering Manager', focus: 'delivery' },
    });
    expect(tt(b.kind.labelKey, b.kind.labelParams)).toMatch(/One-on-one with Chidi/);
    expect(b.caresAbout[0].focus).toBe('delivery');
  });

  it('falls back to the interview style when there is no panel', () => {
    expect(tt(buildRoomBrief({ style: 'technical' }).kind.labelKey)).toMatch(
      /Technical deep-dive/
    );
    expect(tt(buildRoomBrief({ style: 'screening' }).kind.labelKey)).toMatch(/screening/i);
    expect(tt(buildRoomBrief({}).kind.labelKey)).toMatch(/General interview/);
  });

  it('describes the challenge level as pressure, never as comfort', () => {
    expect(tt(buildRoomBrief({ challenge: 'gentle' }).challengeNoteKey)).toMatch(/low pressure/i);
    expect(tt(buildRoomBrief({ challenge: 'tough' }).challengeNoteKey)).toMatch(/pressure-test/i);
    // No promise of reassurance the room will not deliver.
    ['gentle', 'realistic', 'tough'].forEach((c) => {
      expect(tt(buildRoomBrief({ challenge: c }).challengeNoteKey)).not.toMatch(
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
    const cvNote = tt(b.cvNoteKey);
    expect(cvNote).toMatch(/CV open in front of them/i);
    expect(cvNote).toMatch(/asked to square the two/i);
    // Framed as a CV gap, not as suspicion — matching the room's Phase 1 stance.
    expect(cvNote).toMatch(/your CV is missing something/i);
  });

  it('gives explicit permission to be bad at it', () => {
    const b = buildRoomBrief({});
    const permission = tt(b.permissionKey);
    expect(permission).toMatch(/allowed to freeze/i);
    expect(permission).toMatch(/run it again/i);
  });

  it('never promises the interviewer will be encouraging', () => {
    const b = buildRoomBrief({ careerStage: 'grad', challenge: 'gentle' });
    // Resolve every key the brief references and check the actual copy — not
    // just the object of keys, which would trivially never match this regex.
    const resolvedText = [
      tt(b.kind.labelKey, b.kind.labelParams),
      tt(b.kind.aboutKey, b.kind.aboutParams),
      tt(b.challengeNoteKey),
      tt(b.cvNoteKey),
      tt(b.permissionKey),
      tt(b.evidence.headlineKey),
      tt(b.evidence.bodyKey),
      tt(b.evidence.closerKey),
      ...b.evidence.sourceKeys.map((k) => tt(k)),
      ...b.lookingForKeys.map((k) => tt(k)),
    ].join(' ');
    expect(resolvedText).not.toMatch(/will encourage you/i);
    expect(resolvedText).not.toMatch(/they will reassure/i);
  });

  it('is fully derived — nothing here requires an AI call', () => {
    // Guard against someone later making this async / fetch-backed.
    expect(buildRoomBrief({}).evidence).toBeTruthy();
    expect(typeof buildRoomBrief).toBe('function');
    expect(buildRoomBrief({}) instanceof Promise).toBe(false);
  });
});
