import React from 'react';
import { useTranslation } from 'react-i18next';

// The designed shape of an answer, for the two questions that have one.
//
//   options — asked about the choices on the card in front of them. One row per choice.
//             Every label has already been checked against what is actually on screen
//             (backend utils/answerLayout), so this can lay them out as fact.
//   compare — two or three alternatives weighed against each other.
//
// It renders BELOW Aria's prose inside the same message row, so the row keeps its single
// orbit mark as the last child and the `.aria-row` CSS is untouched.
//
// Deliberately not a table. A real <table> in a 92%-wide bubble means horizontal scrolling
// on a phone, and most of these users are on one. `compare` is columns from `sm` up and
// stacked labelled rows below that — the same information, readable on the device it is
// actually read on.
//
// This is the same visual grammar as ResearchCard (eyebrow → content, hairline card on the
// paper ground); the difference is that card renders curated static copy and this one
// renders what Aria just said.

const EYEBROW = {
  options: 'ariaStudio.answerCard.optionsEyebrow',
  compare: 'ariaStudio.answerCard.compareEyebrow',
};

const Row = ({ label, detail }) => (
  <div className="flex flex-col gap-0.5">
    <span className="font-serif text-[15px] leading-snug font-semibold text-slate-900 dark:text-slate-100">
      {label}
    </span>
    <span className="text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-300">
      {detail}
    </span>
  </div>
);

const AriaAnswerCard = ({ layout, blocks }) => {
  const { t } = useTranslation();
  if (!EYEBROW[layout] || !Array.isArray(blocks) || blocks.length < 2) return null;

  return (
    <div className="mt-0.5 w-full self-stretch rounded-2xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-800 dark:bg-slate-900">
      <span className="font-mono text-[10px] tracking-[0.14em] text-slate-400 uppercase dark:text-slate-500">
        {t(EYEBROW[layout])}
      </span>

      {layout === 'compare' ? (
        // Columns once there is room for them; stacked, and still labelled, when there is not.
        <div
          className={`mt-3 grid gap-x-5 gap-y-4 ${
            blocks.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
          }`}
        >
          {blocks.map((b, i) => (
            <Row key={i} label={b.label} detail={b.detail} />
          ))}
        </div>
      ) : (
        // One choice per row, in the order they appear on the card above.
        <ul className="mt-3 flex flex-col gap-3">
          {blocks.map((b, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500" />
              <Row label={b.label} detail={b.detail} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AriaAnswerCard;
