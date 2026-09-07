import { describe, it, expect } from 'vitest';
import en from '../i18n/locales/en.json';
import fr from '../i18n/locales/fr.json';
import { screenContext, stepIdForPhase } from './ariaScreen';

// A translator that REFUSES to fall back. i18next returns the key itself when a string is
// missing, which would let this file quietly ship "ariaStudio.chat.upload.eyebrow" into a
// system prompt as though it were the card's heading. Throwing here is the only way a
// renamed key gets caught, since nothing else reads these particular strings.
const strictT = (dict) => (key) => {
  const hit = key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict);
  if (typeof hit !== 'string') throw new Error(`missing i18n key: ${key}`);
  return hit;
};
const t = strictT(en);
const tFr = strictT(fr);

// Every phase derivePhase() can return (lib/studioFlow.js). Phases with no card of their
// own are expected to answer null — the point of the list is that none of them THROWS.
const ALL_PHASES = [
  'mode',
  'job',
  'brief',
  'cv',
  'scanoffer',
  'results',
  'prep:cv',
  'prep:job',
  'prep:results',
  'build:roadmap',
  'build:career-stage',
  'build:job',
  'build:brief',
  'build:contact',
  'build:upload',
  'build:sections',
  'build:experience',
  'build:project',
  'build:education',
  'build:skills',
  'build:summary',
  'build:project-ideas',
  'build:done',
  'fix:pick',
  'fix:summary',
  'fix:skills',
  'fix:guide',
  'fix:rewrite',
  'fix:project-ideas',
];

describe('screenContext', () => {
  it('handles every phase derivePhase can return, in both languages', () => {
    for (const phase of ALL_PHASES) {
      for (const translate of [t, tFr]) {
        expect(() =>
          screenContext({ phase, t: translate, entryStage: 'type', nextSection: null })
        ).not.toThrow();
      }
    }
  });

  it('describes the career-stage card with exactly the labels on screen', () => {
    const s = screenContext({ phase: 'build:career-stage', t });

    expect(s.title).toBe('Where are you in your career?');
    // The bug in one assertion: this is what "the three options" has to point at.
    expect(s.options).toEqual([
      'Student / recent grad',
      'Experienced',
      'Changing careers',
      'Skip for now',
    ]);
  });

  it('reads the French card in French', () => {
    const s = screenContext({ phase: 'build:career-stage', t: tFr });

    expect(s.title).toBe(fr.ariaStudio.chat.careerStage.heading);
    expect(s.options[0]).toBe(fr.ariaStudio.chat.careerStage.options.grad);
  });

  it('returns null when no card is on screen', () => {
    expect(screenContext({ phase: 'results', t })).toBeNull();
    expect(screenContext({ phase: '', t })).toBeNull();
    expect(screenContext({ phase: 'build:career-stage', t: null })).toBeNull();
  });

  it('takes the section menu copy from the row it was handed, not a second source', () => {
    const nextSection = {
      key: 'experience',
      eyebrow: 'Work history',
      blurb: 'Work history carries the most weight.',
      cta: 'Start work history',
      skipLabel: "That's all my roles",
    };
    const s = screenContext({ phase: 'build:sections', t, nextSection });

    expect(s.title).toBe('Work history');
    expect(s.options).toEqual(['Start work history', "That's all my roles"]);
    // No row to describe yet → say nothing rather than guess.
    expect(screenContext({ phase: 'build:sections', t, nextSection: null })).toBeNull();
  });

  it('only describes the type choices while the type card is actually up', () => {
    const typeUp = screenContext({ phase: 'build:experience', t, entryStage: 'type' });
    expect(typeUp.options).toEqual([
      'Job',
      'Internship',
      'Part-time / informal',
      'Volunteer / campus leadership',
      'Coursework',
    ]);

    // Past the type step it is a form and then an interview — claiming buttons that are
    // gone would make Aria confidently wrong, which is worse than saying nothing.
    const laterOn = screenContext({ phase: 'build:experience', t, entryStage: 'achievements' });
    expect(laterOn.options).toEqual([]);
  });

  it('never emits an empty or undefined option', () => {
    for (const phase of ALL_PHASES) {
      const s = screenContext({ phase, t, entryStage: 'type' });
      if (!s) continue;
      expect(s.title).toBeTruthy();
      for (const o of s.options) expect(typeof o === 'string' && o.length > 0).toBe(true);
    }
  });
});

describe('stepIdForPhase', () => {
  it('names the section for every phase that sits inside one', () => {
    expect(stepIdForPhase('build:job')).toBe('target_job');
    expect(stepIdForPhase('build:brief')).toBe('target_job');
    expect(stepIdForPhase('build:contact')).toBe('heading');
    expect(stepIdForPhase('build:experience')).toBe('history');
    expect(stepIdForPhase('build:project')).toBe('projects');
    expect(stepIdForPhase('build:education')).toBe('education');
    expect(stepIdForPhase('build:skills')).toBe('skills');
    expect(stepIdForPhase('build:summary')).toBe('summary');
    expect(stepIdForPhase('build:done')).toBe('finalize');
  });

  it('returns empty for the phases that are not inside a section', () => {
    // Not a gap — on the roadmap, the career-stage card or the section menu the user
    // genuinely is not in a section, and the server's "your CV" fallback says so. The card
    // is what was missing, and screenContext supplies that.
    for (const phase of ['mode', 'build:roadmap', 'build:career-stage', 'build:sections', ''])
      expect(stepIdForPhase(phase)).toBe('');
  });
});
