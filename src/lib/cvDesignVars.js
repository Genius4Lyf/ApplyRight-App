import { supportsGround, sidebarFill } from '../data/templates';

// THE DESIGN, AS CSS.
//
// One mapping from the `design` object to the CSS custom properties and classes that
// carry it onto the page — and, because the PDF is a clone of that same node, into the
// downloaded file for free.
//
// It lives here rather than inline in ResumeReview because FOUR things now need to agree
// about it, and three of them are not React:
//
//   1. the live preview (ResumeReview)
//   2. the Studio's off-screen print surface, which had drifted — it hardcoded
//      `--cv-leading: 1.5` and ignored the user's saved design entirely, so the same CV
//      downloaded differently depending on which page you started from
//   3. the "fit to one page" engine, which mutates a real DOM node and measures it
//      synchronously — it cannot go through React and must produce byte-identical styling
//      or it would be measuring something the user never sees
//   4. the print CSS in lib/cvDesignCss
//
// Anything expressed as a var or a class on `#resume-content` rides into the PDF. Anything
// written into `src/index.css` does NOT — the print head loads only the Tailwind v3 CDN.

/** Body text scale. Applied as `zoom`, so it changes layout and the page count with it. */
export const TYPE_SCALE = Object.freeze({ small: 0.94, normal: 1, large: 1.06 });

/** Line height. Today's "Density" control, under the name of what it actually sets. */
export const LEADING = Object.freeze({ compact: 1.35, normal: 1.5, relaxed: 1.7 });

/**
 * Page padding. `normal` is deliberately undefined: with no `--cv-margin` set, each
 * template keeps the padding it was designed with, which is not one shared number.
 */
export const MARGIN = Object.freeze({ narrow: '1.5rem', normal: undefined, wide: '3.5rem' });

/** Section spacing, as a class — see lib/cvDesignCss for why it cannot be a variable. */
export const GAP_CLASS = Object.freeze({ tight: 'cv-gap-tight', normal: '', airy: 'cv-gap-airy' });

/**
 * Can this template take a text-size scale?
 *
 * Derived from `sidebarFill` rather than kept as a hand-written list, so a new sidebar
 * template is excluded the day it is added instead of the day someone notices.
 *
 * WHY sidebar templates are excluded: `buildPrintHtml` switches the sidebar to
 * `position: fixed` so Chrome repeats it on every printed page. A fixed element inside a
 * zoomed ancestor is exactly the kind of thing that resolves differently between the
 * preview and the print engine — and it would fail SILENTLY, in the paid PDF only, which
 * is the worst place in this product to be clever.
 */
export const supportsTypeScale = (templateId) => !sidebarFill(templateId);

/**
 * The element whose height actually flows onto pages.
 *
 * For a sidebar template that is the MAIN COLUMN, not the whole node: on screen the
 * sidebar is in normal flow and the node measures `max(sidebar, main)`, but in the print
 * clone the sidebar is `position: fixed` and repeats per page, so the only thing that
 * pushes content onto page 2 is the main column. Measuring the node meant a long skills
 * sidebar over a short work history reported pages that never printed.
 *
 * @param {HTMLElement|null} root the node holding the rendered template
 * @returns {HTMLElement|null}
 */
export function flowElementFor(root, templateId) {
  if (!root) return null;
  if (!sidebarFill(templateId)) return root;
  const sidebar = root.querySelector('[data-cv-sidebar]');
  // `nextElementSibling` is the same handle buildPrintHtml uses to push the main column
  // clear of the fixed sidebar — same element, same reason.
  return sidebar?.nextElementSibling || root;
}

/**
 * The CSS custom properties for a design, ready to spread into a `style` object.
 *
 * Keys are omitted rather than set to a falsy value wherever "unset" is meaningful: a
 * template with no `--cv-margin` keeps its own designed padding, and `var(--cv-x, fallback)`
 * in nineteen templates only reaches its fallback when the property is genuinely absent.
 *
 * @param {object} design
 * @param {{ templateId?: string, paperWidth?: string }} opts
 */
export function designVars(design = {}, { templateId, paperWidth } = {}) {
  const vars = {};

  if (supportsGround(templateId) && design.ground) vars['--cv-ground'] = design.ground;
  if (design.font) vars['--cv-font'] = design.font;

  vars['--cv-leading'] = LEADING[design.density] ?? LEADING.normal;

  const margin = MARGIN[design.margins];
  if (margin) vars['--cv-margin'] = margin;

  // The paper width has to be a variable, not just a style, because the zoom wrapper
  // divides by the scale to keep its laid-out width equal to one page.
  if (paperWidth) vars['--cv-paper-w'] = paperWidth;

  if (supportsTypeScale(templateId)) {
    vars['--cv-type-scale'] = TYPE_SCALE[design.textSize] ?? TYPE_SCALE.normal;
  }

  return vars;
}

/** The class(es) a design puts on `#resume-content`. Empty string at the defaults. */
export function designClassName(design = {}) {
  return GAP_CLASS[design.sectionGap] || '';
}

/**
 * The `style` for the zoom wrapper that carries text size.
 *
 * `zoom` and not `transform: scale()` because zoom changes the LAYOUT box: the wrapper's
 * parent sees the scaled height, so the page measurement stays honest. A transform would
 * look identical and silently make every page count wrong, which is worse than having no
 * control at all.
 *
 * The width is an explicit length divided by the scale — never `calc(100% / zoom)`, which
 * resolves against an already-zoomed containing block and compounds.
 */
export function typeScaleStyle(templateId) {
  if (!supportsTypeScale(templateId)) return undefined;
  return {
    zoom: 'var(--cv-type-scale, 1)',
    width: 'calc(var(--cv-paper-w, 210mm) / var(--cv-type-scale, 1))',
  };
}

/**
 * Write a design onto a live node and hand back an undo.
 *
 * For the fit engine, which tries a ladder of designs against the real DOM and keeps the
 * one that fits. Going through React would mean a render per rung and an async
 * measurement per render; this way every rung is measured on the same node in the same
 * frame, and the design that is finally committed is exactly the one that was measured.
 *
 * @returns {() => void} restores the node to how it was found
 */
export function applyDesignToNode(node, design, opts) {
  const vars = designVars(design, opts);
  const previous = new Map();
  // Every property this function can set, not just the ones it is setting now — a rung
  // that omits a key must CLEAR it, or the last rung's margin would survive into the next
  // measurement and the ladder would measure a design nobody chose.
  const owned = ['--cv-ground', '--cv-font', '--cv-leading', '--cv-margin', '--cv-type-scale'];

  owned.forEach((prop) => {
    previous.set(prop, node.style.getPropertyValue(prop));
    if (vars[prop] === undefined) node.style.removeProperty(prop);
    else node.style.setProperty(prop, String(vars[prop]));
  });

  const gapClasses = Object.values(GAP_CLASS).filter(Boolean);
  const hadGap = gapClasses.filter((c) => node.classList.contains(c));
  gapClasses.forEach((c) => node.classList.remove(c));
  const nextGap = designClassName(design);
  if (nextGap) node.classList.add(nextGap);

  return () => {
    previous.forEach((value, prop) => {
      if (value) node.style.setProperty(prop, value);
      else node.style.removeProperty(prop);
    });
    gapClasses.forEach((c) => node.classList.remove(c));
    hadGap.forEach((c) => node.classList.add(c));
  };
}
