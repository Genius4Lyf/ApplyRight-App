// THE FIT LADDER.
//
// The measurement is the only part that needs a browser, so it is injected — which leaves
// every decision this feature makes testable: which control gives way first, when it stops,
// and above all what it does when it CANNOT succeed.
import { describe, it, expect, vi } from 'vitest';
import { fitLadder, runFitLadder, TIGHTEN, TIGHTEN_ORDER } from './cvFit';

const START = { sectionGap: 'normal', margins: 'normal', density: 'normal', textSize: 'normal' };

describe('the ladder', () => {
  it('only ever tightens, never loosens', () => {
    // The whole feature is "make this fit". A rung that relaxed anything would be undoing
    // the work of the rung before it.
    let previous = START;
    fitLadder(START).forEach((step) => {
      TIGHTEN_ORDER.forEach((key) => {
        const scale = TIGHTEN[key];
        expect(scale.indexOf(step[key])).toBeGreaterThanOrEqual(scale.indexOf(previous[key]));
      });
      previous = step;
    });
  });

  it('gives up section spacing before it touches text size', () => {
    // Priority is the design opinion in this feature: the reader will not notice tighter
    // section spacing and will notice smaller type.
    const first = fitLadder(START)[0];
    expect(first.sectionGap).toBe('tight');
    expect(first.textSize).toBe('normal');
  });

  it('spreads the loss instead of maxing one control out first', () => {
    // Crushed section spacing beside luxurious margins looks broken, not compact. By the
    // end of the first pass every control has given up exactly one notch.
    const pass = fitLadder(START).slice(0, TIGHTEN_ORDER.length);
    const last = pass[pass.length - 1];
    expect(last).toEqual({
      sectionGap: 'tight',
      margins: 'narrow',
      density: 'compact',
      textSize: 'small',
    });
  });

  it('has a floor, and reaches it', () => {
    // There is no rung below `small` text or `compact` line height. A CV nobody can read
    // has not been fitted onto a page, it has been hidden on one.
    const all = fitLadder(START);
    const final = all[all.length - 1];
    TIGHTEN_ORDER.forEach((key) => {
      expect(final[key]).toBe(TIGHTEN[key][TIGHTEN[key].length - 1]);
    });
  });

  it('offers nothing when everything is already at its tightest', () => {
    expect(
      fitLadder({
        sectionGap: 'tight',
        margins: 'narrow',
        density: 'compact',
        textSize: 'small',
      })
    ).toEqual([]);
  });

  it('has further to go from a loose design than from a normal one', () => {
    const loose = { sectionGap: 'airy', margins: 'wide', density: 'relaxed', textSize: 'large' };
    expect(fitLadder(loose).length).toBeGreaterThan(fitLadder(START).length);
  });

  it('treats an unset control as the default rather than skipping it', () => {
    // A CV saved before these controls existed has neither key. It must still be able to
    // give up spacing — starting from "unknown" and refusing to move would make the
    // feature silently weaker on exactly the oldest documents.
    const ladder = fitLadder({ margins: 'normal', density: 'normal' });
    expect(ladder[0].sectionGap).toBe('tight');
    expect(ladder.some((s) => s.textSize === 'small')).toBe(true);
  });

  it('keeps unrelated design keys intact', () => {
    // font, ground and paper are not levers. Losing them here would silently reset a
    // user's typeface as a side effect of asking for one page.
    const ladder = fitLadder({ ...START, font: 'Lora, serif', ground: '#fcfbf7', paper: 'letter' });
    ladder.forEach((step) => {
      expect(step.font).toBe('Lora, serif');
      expect(step.ground).toBe('#fcfbf7');
      expect(step.paper).toBe('letter');
    });
  });
});

describe('running it', () => {
  it('changes nothing when the CV already fits', () => {
    const measure = vi.fn(() => 900);
    const out = runFitLadder({ design: START, measure, limit: 1084 });
    expect(out).toMatchObject({ fits: true, changed: false, steps: 0 });
    expect(out.design).toBe(START);
    // One measurement, not nine: there was nothing to search.
    expect(measure).toHaveBeenCalledTimes(1);
  });

  it('stops at the FIRST rung that fits', () => {
    // Taking every rung would hand back a CV compressed far past what was needed.
    let calls = 0;
    const measure = () => {
      calls += 1;
      return calls >= 3 ? 1000 : 1200; // fits on the second candidate
    };
    const out = runFitLadder({ design: START, measure, limit: 1084 });
    expect(out.fits).toBe(true);
    expect(out.steps).toBe(2);
    expect(out.design.sectionGap).toBe('tight');
    // Stopped early — it did not walk to the floor.
    expect(out.design.textSize).toBe('normal');
  });

  it('treats exactly one page as fitting', () => {
    const out = runFitLadder({ design: START, measure: () => 1084, limit: 1084 });
    expect(out.fits).toBe(true);
    expect(out.changed).toBe(false);
  });

  it('RESTORES the original design when it cannot fit', () => {
    // The point of the whole feature. A CV squeezed to its tightest setting that is STILL
    // two pages is the worst outcome available: cramped and long. It must come back
    // untouched so the user is pointed at the content instead.
    const out = runFitLadder({ design: START, measure: () => 5000, limit: 1084 });
    expect(out.fits).toBe(false);
    expect(out.changed).toBe(false);
    expect(out.design).toEqual(START);
    expect(out.steps).toBeGreaterThan(0); // it did genuinely try
  });

  it('measures every candidate it reports having tried', () => {
    const measure = vi.fn(() => 5000);
    const out = runFitLadder({ design: START, measure, limit: 1084 });
    // The starting measurement plus one per rung.
    expect(measure).toHaveBeenCalledTimes(out.steps + 1);
  });
});
