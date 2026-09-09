import { effectivePageHeightPx } from './cvPageGeometry';
import { applyDesignToNode } from './cvDesignVars';

// FIT TO ONE PAGE.
//
// A deterministic ladder over the Design tab's own controls: tighten one notch at a time,
// re-measure, stop the moment the CV fits. No model call, no guessing — every rung is a
// setting the user could have reached themselves, which is what makes the result
// explainable and, more importantly, undoable.
//
// TWO DECISIONS WORTH KNOWING ABOUT:
//
// 1. IT MEASURES THE REAL DOM, SYNCHRONOUSLY. The obvious implementation — setDesign, wait
//    for React, wait for the ResizeObserver, read the height, repeat — is a race with
//    itself: the observer is async, so each rung either measures the previous rung's
//    layout or needs an animation frame it cannot be sure settled. Eight rungs of that
//    feels like a button that does nothing. Instead every candidate is written straight
//    onto the node, `offsetHeight` is read back in the same frame (which forces layout),
//    and only the WINNER is committed through React. The design that ships is exactly the
//    one that was measured.
//
// 2. IF IT CANNOT FIT, IT CHANGES NOTHING. Compressing a CV to its tightest setting and
//    still handing back two pages is the worst outcome available: the document is now ugly
//    AND still too long. When the ladder runs out, the original design is restored and the
//    caller is told to point at the content instead — LengthCoach already owns those
//    hand-offs ("Shorten your summary", "Trim your oldest roles").
//
// The readable floor is the enums themselves. There is no rung below `small` text or
// `compact` line height, because a CV nobody can read has not been fitted onto one page,
// it has been hidden on one page.

/** Each control, ordered LOOSEST to TIGHTEST. A step moves one place to the right. */
export const TIGHTEN = Object.freeze({
  sectionGap: ['airy', 'normal', 'tight'],
  margins: ['wide', 'normal', 'narrow'],
  density: ['relaxed', 'normal', 'compact'],
  textSize: ['large', 'normal', 'small'],
});

/**
 * Which control gives way first — least missed to most.
 *
 * Space between sections goes before anything else: it is the only one of the four a
 * reader will not consciously notice. Text size is last because it is the one that makes
 * a CV look like it is hiding something.
 */
export const TIGHTEN_ORDER = Object.freeze(['sectionGap', 'margins', 'density', 'textSize']);

/**
 * The ladder: successively tighter designs, each one notch from the last.
 *
 * ROUND-ROBIN, not one control at a time. Taking a single control to its limit before
 * touching the next produces a CV with crushed section spacing and luxurious margins — a
 * document that looks broken rather than compact. Spreading the loss keeps it looking
 * designed.
 *
 * @param {object} design the current design
 * @returns {object[]} candidates, loosest first. Empty if everything is already at its tightest.
 */
export function fitLadder(design = {}) {
  const index = {};
  TIGHTEN_ORDER.forEach((key) => {
    const scale = TIGHTEN[key];
    const at = scale.indexOf(design[key]);
    // An unset or unrecognised value is treated as the middle setting, which is what the
    // defaults are — so a CV saved before these controls existed starts where a new one does.
    index[key] = at === -1 ? scale.indexOf('normal') : at;
  });

  const candidates = [];
  let current = { ...design };
  let moved = true;

  while (moved) {
    moved = false;
    for (const key of TIGHTEN_ORDER) {
      const scale = TIGHTEN[key];
      if (index[key] >= scale.length - 1) continue; // already at the floor
      index[key] += 1;
      current = { ...current, [key]: scale[index[key]] };
      candidates.push(current);
      moved = true;
    }
  }

  return candidates;
}

/**
 * Walk a ladder against a measurement function.
 *
 * Separated from the DOM so the decision logic is testable without a layout engine —
 * `measure` is the only thing that needs a browser.
 *
 * @param {object} opts
 * @param {object} opts.design      the starting design
 * @param {(design:object) => number} opts.measure returns the content height for a design
 * @param {number} opts.limit       the usable height of one page
 * @returns {{ fits: boolean, changed: boolean, design: object, steps: number, height: number }}
 */
export function runFitLadder({ design, measure, limit }) {
  const startHeight = measure(design);
  if (startHeight <= limit) {
    return { fits: true, changed: false, design, steps: 0, height: startHeight };
  }

  const candidates = fitLadder(design);
  for (let i = 0; i < candidates.length; i += 1) {
    const height = measure(candidates[i]);
    if (height <= limit) {
      return { fits: true, changed: true, design: candidates[i], steps: i + 1, height };
    }
  }

  // Out of rungs. Report the ORIGINAL design, not the tightest one tried — see the note
  // at the top about why a failed fit must not leave the CV compressed.
  return { fits: false, changed: false, design, steps: candidates.length, height: startHeight };
}

/**
 * Try to fit the rendered CV onto one page.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.node    `#resume-content` — the node carrying the design vars
 * @param {HTMLElement} opts.flowEl  the element whose height flows onto pages
 * @param {object} opts.design
 * @param {string} opts.templateId
 * @param {string} opts.paperWidth
 * @param {string} opts.paper        'a4' | 'letter'
 * @returns {{ fits: boolean, changed: boolean, design: object, steps: number, height: number }}
 */
export function fitToOnePage({ node, flowEl, design, templateId, paperWidth, paper }) {
  if (!node || !flowEl) {
    return { fits: false, changed: false, design, steps: 0, height: 0 };
  }

  const limit = effectivePageHeightPx(paper);
  let restore = null;

  const measure = (candidate) => {
    // Each rung restores before the next applies, so a candidate is never measured on top
    // of the one before it.
    if (restore) restore();
    restore = applyDesignToNode(node, candidate, { templateId, paperWidth });
    // Reading offsetHeight forces a synchronous layout, which is the entire point.
    return flowEl.offsetHeight;
  };

  try {
    return runFitLadder({ design, measure, limit });
  } finally {
    // The winner is committed through React by the caller. Leaving the node hand-styled
    // would put it out of step with the state on the very next render.
    if (restore) restore();
  }
}
