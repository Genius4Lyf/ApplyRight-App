import { describe, it, expect } from 'vitest';
import {
  PREVIEW_ORDER,
  BAND_RANK,
  bandsByKey,
  bandForKey,
  improvedKeys,
  parseBullets,
} from './studioPreview';

describe('PREVIEW_ORDER', () => {
  it('leads with contact and covers every CV section in reading order', () => {
    expect(PREVIEW_ORDER[0]).toBe('contact');
    expect(PREVIEW_ORDER).toEqual([
      'contact',
      'summary',
      'experience',
      'projects',
      'skills',
      'education',
    ]);
  });
});

describe('bandsByKey / bandForKey', () => {
  const scan = {
    fitScore: 60,
    sections: [
      { key: 'summary', band: 'ok' },
      { key: 'experience', band: 'warn' },
      { key: 'skills', band: 'bad' },
    ],
  };

  it('maps section keys to their bands', () => {
    expect(bandsByKey(scan)).toEqual({ summary: 'ok', experience: 'warn', skills: 'bad' });
  });

  it('reads a single band, defaulting to neutral when unscored or scan-less', () => {
    expect(bandForKey(scan, 'summary')).toBe('ok');
    expect(bandForKey(scan, 'education')).toBe('neutral'); // in-scan but unscored
    expect(bandForKey(null, 'summary')).toBe('neutral'); // no scan at all
  });

  it('treats a missing band field as neutral', () => {
    expect(bandsByKey({ sections: [{ key: 'summary' }] })).toEqual({ summary: 'neutral' });
  });
});

describe('improvedKeys', () => {
  it('returns only sections whose band strictly improved', () => {
    const prev = { summary: 'bad', experience: 'warn', skills: 'ok' };
    const next = { summary: 'warn', experience: 'ok', skills: 'ok' };
    expect(improvedKeys(prev, next).sort()).toEqual(['experience', 'summary']);
  });

  it('ignores drops and lateral moves', () => {
    const prev = { summary: 'ok', experience: 'warn' };
    const next = { summary: 'warn', experience: 'warn' }; // summary dropped, experience same
    expect(improvedKeys(prev, next)).toEqual([]);
  });

  it('does NOT fire for first-ever bands (keys absent from prev)', () => {
    // The initial scan populates every band at once — none of those should pulse.
    expect(improvedKeys({}, { summary: 'ok', experience: 'warn' })).toEqual([]);
  });

  it('band rank orders neutral < bad < warn < ok', () => {
    expect(BAND_RANK.neutral).toBeLessThan(BAND_RANK.bad);
    expect(BAND_RANK.bad).toBeLessThan(BAND_RANK.warn);
    expect(BAND_RANK.warn).toBeLessThan(BAND_RANK.ok);
  });

  it('a recompute that only re-bands sections leaves the overall fit untouched', () => {
    // The preview keys pulses off SECTION bands only — fitScore is never part of the
    // computation, so a free recompute can improve a section without moving the score.
    const before = { fitScore: 60, sections: [{ key: 'summary', band: 'warn' }] };
    const after = { fitScore: 60, sections: [{ key: 'summary', band: 'ok' }] };
    expect(improvedKeys(bandsByKey(before), bandsByKey(after))).toEqual(['summary']);
    expect(after.fitScore).toBe(before.fitScore);
  });
});

describe('parseBullets', () => {
  it('splits on newlines and • markers and strips leading markers', () => {
    expect(parseBullets('• Led the team\n- Shipped v2')).toEqual(['Led the team', 'Shipped v2']);
    expect(parseBullets('Did A • Did B • Did C')).toEqual(['Did A', 'Did B', 'Did C']);
  });

  it('is empty for blank/absent descriptions', () => {
    expect(parseBullets('')).toEqual([]);
    expect(parseBullets(undefined)).toEqual([]);
    expect(parseBullets('   \n  •  \n')).toEqual([]);
  });
});
