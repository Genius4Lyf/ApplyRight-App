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
