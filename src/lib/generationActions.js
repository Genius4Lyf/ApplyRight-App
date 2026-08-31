/**
 * Which credit action each generation surface charges for.
 *
 * Its own module rather than a constant exported from GenerationModelRow: a component
 * file that also exports values breaks Fast Refresh, and this map has two consumers —
 * the picker that renders the price, and the locale suite that asserts every action in
 * here has copy for both tiers. Adding an action without that copy puts the raw i18n key
 * on screen, which is exactly what shipped when cover letters became model-selectable.
 */
export const ACTION_KEY = {
  experience: 'GENERATE_BULLET',
  project: 'GENERATE_BULLET',
  summary: 'GENERATE_SUMMARY',
  skills: 'GENERATE_SKILLS',
  coverLetter: 'GENERATE_COVER_LETTER',
};

export default ACTION_KEY;
