import useMedia from './useMedia';

// WHERE THE CV STUDIO'S DESIGN RAIL LIVES, at this width.
//
//   ≥ 1024px   an inline column beside the document — the desktop layout, unchanged
//   < 1024px   a right-hand sheet over it, opened from the palette button
//
// 1024 is Tailwind's `lg`, and pinning it here is not a taste call: every other
// responsive rule on this page still flips at exactly that width — the flex split that
// seats the rail (ResumeReview `lg:flex-row-reverse`), the mobile action bar that holds
// the palette button (`lg:hidden`), and the download chooser sheet. A JS breakpoint that
// disagreed with the CSS by a single pixel would open a band of widths where the action
// bar is hidden and the only door into the design controls has gone with it.
//
// The rail must be MOUNTED conditionally rather than hidden with a class, which is why
// this is a hook and not a media query in the stylesheet: below the threshold it renders
// inside StudioOverlay, which portals to the body, traps focus and pushes a history
// entry. A hidden-but-mounted overlay on a 1920px screen would quietly steal Tab and eat
// a back press.
export const CV_RAIL_MIN = 1024;

/** True when the design rail has an inline home beside the document. */
export default function useCvRailInline() {
  return useMedia(`(min-width: ${CV_RAIL_MIN}px)`);
}
