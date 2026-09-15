import useMedia from './useMedia';

// THE BIG CENTRED "ARIA IS WORKING" MARKS WERE ALL SIZED ON A DESKTOP.
//
// AriaOrbit takes a pixel size and scales itself with an inline transform, so nothing in
// CSS can reach it — a media query cannot override an inline style, and the size is
// computed in JS. That is why these marks stayed 44-56px on a 360px-wide phone, where the
// same mark reads as an illustration rather than a spinner.
//
// 32px is not an arbitrary shrink: it is what every full-screen ROUTE loader in the app
// already passes AriaLoader (CVBuilderLayout, Profile), so a phone now sees one consistent
// loading mark instead of a different size per surface.
//
// Deliberately opt-in at the call site rather than built into AriaOrbit, for two reasons:
// the orbit is rendered on every chat row and does not need a media subscription each
// time, and several LARGE orbits are decoration rather than progress — the 160px guide
// headers, the landing page's hero marks, and the CV builder's travelling orbit, which is
// sized to the 56px slot it flies into. Those must not move.
export const ORBIT_MOBILE_MAX = 32;

/**
 * The size this orbit should actually render at, capped on a narrow viewport.
 *
 * @param {number} size the desktop size
 * @param {number} [mobileMax] cap below 640px
 * @returns {number}
 */
export default function useOrbitSize(size, mobileMax = ORBIT_MOBILE_MAX) {
  // The same 640px line the rest of the app treats as "phone".
  const narrow = useMedia('(max-width: 639px)');
  return narrow ? Math.min(size, mobileMax) : size;
}
