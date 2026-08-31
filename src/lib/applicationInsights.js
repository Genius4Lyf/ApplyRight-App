// A pure, JSX-free display helper for job analyses.
//
// This file used to hold three functions; the other two (a stat strip and a per-row "next
// move" chip) belonged to the Applications page and went with it when job analyses moved
// into Aria Studio. What survives is the one thing every surface still needs: turning a
// fit score into a colour.

/**
 * Map a fit score (0–100, or null/undefined when not yet analyzed) to a
 * semantic band used for accent color. Null scores read as 'neutral'.
 * @param {number|null|undefined} score
 * @returns {'ok'|'warn'|'bad'|'neutral'}
 */
export function bandOf(score) {
  if (score == null) return 'neutral';
  if (score >= 75) return 'ok';
  if (score >= 45) return 'warn';
  return 'bad';
}
