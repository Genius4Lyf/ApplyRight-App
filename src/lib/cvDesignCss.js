// SECTION SPACING — the one design control that cannot be a CSS variable.
//
// Line height, margins, typeface and page colour are all `var(--cv-*)` reads inside the
// templates, so a custom property reaches them. Section spacing is not: it lives as
// Tailwind classes (`h2 { mt-6 mb-3 }`, `h3 { mt-4 }`) written INSIDE each of the
// nineteen template files. A variable cannot reach a utility class.
//
// An id-scoped selector can. `#resume-content.cv-gap-tight h2` is specificity 1-1-1 and
// beats an arbitrary-value utility's 0-1-0 — so one stylesheet gets a real control over
// all nineteen templates without editing any of them.
//
// THIS STRING IS THE SINGLE SOURCE. It is rendered into a <style> tag by the app AND
// injected into the PDF's <head> by lib/cvDownload, because the PDF does not load
// src/index.css — its head has the Tailwind v3 CDN and nothing else. Two hand-synced
// copies of this would drift, and the drift would only ever show up in the paid file.

// Baselines, for reference when tuning: ATS Clean is h2 `mt-6 mb-3` (1.5 / 0.75rem),
// h3 `mt-4` (1rem), p `mb-2.5` (0.625rem), ul `mb-3` (0.75rem). Tight is ~0.7x of that,
// airy ~1.4x.
export const CV_DESIGN_CSS = `
/* Tight ------------------------------------------------------------------ */
#resume-content.cv-gap-tight h2:not([data-cv-sidebar] h2) {
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}
#resume-content.cv-gap-tight h3:not([data-cv-sidebar] h3) {
  margin-top: 0.7rem;
}
#resume-content.cv-gap-tight p:not([data-cv-sidebar] p) {
  margin-bottom: 0.42rem;
}
#resume-content.cv-gap-tight ul:not([data-cv-sidebar] ul) {
  margin-bottom: 0.5rem;
}

/* Airy ------------------------------------------------------------------- */
#resume-content.cv-gap-airy h2:not([data-cv-sidebar] h2) {
  margin-top: 2.15rem;
  margin-bottom: 1rem;
}
#resume-content.cv-gap-airy h3:not([data-cv-sidebar] h3) {
  margin-top: 1.45rem;
}
#resume-content.cv-gap-airy p:not([data-cv-sidebar] p) {
  margin-bottom: 0.9rem;
}
#resume-content.cv-gap-airy ul:not([data-cv-sidebar] ul) {
  margin-bottom: 1.05rem;
}

/* Nothing may open the document with a gap above it. The templates express this as
   Tailwind's \`first:mt-0\`, which the rules above out-specify — so it has to be restated
   here or every CV grows a blank band above its first section heading. */
#resume-content.cv-gap-tight h2:first-child,
#resume-content.cv-gap-airy h2:first-child,
#resume-content.cv-gap-tight h3:first-child,
#resume-content.cv-gap-airy h3:first-child {
  margin-top: 0;
}
`;

export default CV_DESIGN_CSS;
