// THE CV'S PRESENTATION — the client half of the same contract as the server's
// config/cvDesign.js. Keep the two in step: this decides what is SENT, that decides what
// is STORED, and a key allowed by one and dropped by the other is a setting that appears
// to save and does not.
//
// Whitelisting matters more here than it looks. The Design tab's choices lived in
// localStorage under `cvDesign:<id>` long before they had a home on the server, and some
// of those stored objects still carry keys for controls that no longer exist — `accent`
// above all, removed because it was a no-op on thirteen of the nineteen templates. The
// old load was a blind `{...defaults, ...JSON.parse(saved)}`, so without this those keys
// would ride back in, and now they would ride all the way into the database.

export const DESIGN_ENUMS = Object.freeze({
  margins: ['narrow', 'normal', 'wide'],
  density: ['compact', 'normal', 'relaxed'],
  paper: ['a4', 'letter'],
});

const DESIGN_STRINGS = Object.freeze({ font: 120, ground: 32 });

/** What a CV looks like before anyone has chosen anything. */
export const DEFAULT_DESIGN = Object.freeze({
  margins: 'normal',
  density: 'normal',
  paper: 'a4',
  font: '',
  ground: '',
});

/**
 * Keep only the keys the Design tab owns, and only values it could have produced.
 *
 * Returns `{}` rather than a filled object for unusable input, so it composes as a spread
 * over whatever came before it without overwriting anything with a default.
 */
export function pickDesign(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out = {};
  for (const [key, allowed] of Object.entries(DESIGN_ENUMS)) {
    if (allowed.includes(input[key])) out[key] = input[key];
  }
  for (const [key, max] of Object.entries(DESIGN_STRINGS)) {
    if (typeof input[key] === 'string' && input[key].length <= max) out[key] = input[key];
  }
  return out;
}

/**
 * Resolve the design a CV should open with.
 *
 * ORDER IS THE WHOLE POINT: defaults, then the local copy, then the server's. The server
 * wins because it is the one that crosses devices — but it is applied last only when it
 * HAS something, and the model stores nothing until a choice is made, so a CV that
 * predates the server field still opens with whatever its owner chose locally.
 */
export function resolveDesign(stored, serverDesign) {
  return { ...DEFAULT_DESIGN, ...pickDesign(stored), ...pickDesign(serverDesign) };
}
