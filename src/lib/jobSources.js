// The job boards a listing can come from, and how to name one on screen.
//
// One place, because the cards and the detail panel both label the same thing and used to
// do it with duplicated inline ternaries — which is how they both still said "Local" /
// "Global" long after that distinction stopped existing.
//
// It stopped existing when Adzuna was removed (2026-09-08). Adzuna was the "global" half
// and it publishes no Nigeria index at all, so every Nigerian query was quietly answered
// from the UNITED KINGDOM one and shown as if it were local. Job search is Nigeria-only
// now, and honest about it.
//
// The label is the BOARD'S NAME rather than a category, because that is the more useful
// fact: a listing is only as trustworthy as the board it came from, and the user is one
// click from going there. Named provenance on every card is what JOB-MATCHES-PLAN asks
// for.
const SOURCE_LABELS = {
  jobberman: 'Jobberman',
  // Retired. Rows cached before the removal can still carry it, and a listing that reaches
  // the screen with no label at all reads as a bug rather than as old data.
  adzuna: 'Adzuna',
};

export const sourceLabel = (source) => SOURCE_LABELS[source] || 'Job board';

export default SOURCE_LABELS;
