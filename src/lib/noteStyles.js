// Shared editorial "paper note" style tokens, reused by the Applications and
// Interview Prep workspaces so a band's color and the note chrome are identical
// everywhere. Copied verbatim from JobHistory's local copies — do not diverge.

// Band → text color (score stamps, row readiness values).
export const BAND_TEXT = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-500 dark:text-slate-400',
};

// Band → solid background (margin rules, row left edges).
export const BAND_RULEBG = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
  neutral: 'bg-slate-400',
};

// Kind → tag colour, for the Recents rows that hold more than one kind of work.
//
// The colour is on the TEXT. No fill, no border — the same move the analysis card's
// per-dimension verdicts made: a box around two words sitting inside a line of plain text
// reads as a control you could press, and the colour was already carrying the meaning on
// its own.
//
// That constraint chose the pair. Once the fill goes, a mid-grey label just looks like
// unstyled text, so the CV tag takes INK — the brand's own colour, and unmistakably
// deliberate at 9px — while the analysis tag takes navy, which is the one that has to
// stay tellable apart from the band-coloured score sitting next to it.
//
// What the pair avoids is as deliberate as what it is. No green: it was read as a verdict
// rather than a label. No indigo: the rest of the product has been retiring it. And
// nothing from the band palette — emerald/amber/rose all mean "how good is this" here, so
// a tag borrowing one would look like it were grading the row its own score already
// grades.

export const TAG_TONE = {
  cv: 'text-slate-900 dark:text-slate-100',
  analysis: 'text-blue-800 dark:text-blue-400',
};

// Next-move tone → text color.
export const NEXT_TONE = {
  accent: 'text-indigo-600 dark:text-indigo-300',
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-slate-500 dark:text-slate-400',
};

// Paper-note chrome for CardDeck's front/receding cards. CardDeck owns only
// transform/opacity/position; this supplies the page look.
export const PAPER_CARD =
  'rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_6px_16px_-8px_rgba(15,23,42,0.14)] dark:shadow-[0_16px_36px_-22px_rgba(0,0,0,.5)] overflow-hidden';

// Ruled-paper backdrop for the verdict text — faint horizontal lines like a
// legal pad, offset so the baselines sit on the rules.
export const RULED_PAPER = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, transparent 0, transparent 27px, rgba(148,163,184,.16) 27px, rgba(148,163,184,.16) 28px)',
  backgroundPosition: '0 7px',
};
