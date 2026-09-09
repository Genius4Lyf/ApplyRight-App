// WHICH DESIGN A CV OPENS WITH, and what is allowed to reach the database.
//
// The Design tab's choices lived only in `localStorage['cvDesign:<id>']` until now, so
// every stored copy out there predates the server field — and some of them carry keys for
// controls that no longer exist. The load used to be a blind spread of that JSON over the
// defaults, which is exactly how a removed control comes back from the dead.
import { describe, it, expect } from 'vitest';
import { pickDesign, resolveDesign, DEFAULT_DESIGN } from './cvDesign';

describe('pickDesign', () => {
  it('keeps the keys the panel owns', () => {
    expect(
      pickDesign({
        margins: 'narrow',
        density: 'compact',
        paper: 'letter',
        font: 'Inter',
        ground: '#fff',
      })
    ).toEqual({
      margins: 'narrow',
      density: 'compact',
      paper: 'letter',
      font: 'Inter',
      ground: '#fff',
    });
  });

  it('drops accent, which no longer exists', () => {
    // The regression this closes: a stale accent in localStorage merging back in and
    // repainting a colour, with nothing on screen able to change or clear it — and now
    // riding all the way into the CV's stored design.
    expect(pickDesign({ margins: 'wide', accent: '#4f46e5' })).toEqual({ margins: 'wide' });
  });

  it('drops a value the control could not have produced', () => {
    expect(pickDesign({ margins: 'enormous', density: 'compact' })).toEqual({
      density: 'compact',
    });
  });

  it('drops anything that is not a design object at all', () => {
    [null, undefined, 'narrow', 42, ['narrow']].forEach((bad) => {
      expect(pickDesign(bad)).toEqual({});
    });
  });

  it('refuses an unbounded string', () => {
    // A font stack is short. Unbounded, this is a place to park arbitrary data on
    // someone's CV.
    expect(pickDesign({ font: 'x'.repeat(500) })).toEqual({});
    expect(pickDesign({ font: 'Georgia, serif' })).toEqual({ font: 'Georgia, serif' });
  });
});

describe('resolveDesign — the order is the whole point', () => {
  it('falls back to the defaults when nothing has been chosen anywhere', () => {
    expect(resolveDesign(null, undefined)).toEqual(DEFAULT_DESIGN);
  });

  it('uses this device’s copy when the server has nothing', () => {
    // A CV designed before the server field existed. Its owner's choices are still real.
    expect(resolveDesign({ margins: 'narrow' }, undefined).margins).toBe('narrow');
  });

  it('lets the server win, because the server is the one that crosses devices', () => {
    const out = resolveDesign({ margins: 'narrow', paper: 'a4' }, { margins: 'wide' });
    expect(out.margins).toBe('wide');
    // ...and only for the keys it actually has. A server value of nothing must not
    // overwrite a local choice with a default.
    expect(out.paper).toBe('a4');
  });

  it('never lets a stale local key survive either source', () => {
    const out = resolveDesign({ accent: '#4f46e5' }, { accent: '#000' });
    expect(out).not.toHaveProperty('accent');
  });

  it('always returns a complete design, whatever it was handed', () => {
    // The consumers read design.paper and design.margins unguarded; a partial object
    // here would render a CV with an undefined page size.
    Object.keys(DEFAULT_DESIGN).forEach((key) => {
      expect(resolveDesign({ margins: 'wide' }, null)).toHaveProperty(key);
    });
  });
});
