import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// What now, after a qualification is saved.
//
// Education is the only section that ends the moment its form is saved: experience and
// projects both have an achievements stage after it, so Aria has a real next question to
// ask. Education's form IS the whole entry, so the conversation used to just stop — on a
// line that described an absence ("education doesn't need bullets") and named no way
// forward.
//
// Both ways forward already existed, but ONLY on the pinned build card, which starts
// collapsed by design. So the user was told the section was finished and left with no
// visible means of adding a second degree or moving on.
//
// This asks the question in the conversation, where the Studio puts every other decision.
// It owns no flow logic: the two buttons call the same nextEntry / finishSection the
// pinned card calls. A second door, not a second implementation.
//
// "Add another" leads, exactly as it does for experience and projects. Most people have
// one qualification, but making "done" the loud option would push a second degree out of
// view and make education behave unlike every other section for no visible reason.
const EducationSavedCard = ({ heading, onAddAnother, onDone, busy }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="educationsaved">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.educationSaved.eyebrow')}
        </p>
        <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
          {heading
            ? t('ariaStudio.educationSaved.onYourCv', { heading })
            : t('ariaStudio.educationSaved.onYourCvNoName')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddAnother}
            disabled={!!busy}
            className="btn-primary px-4 py-2 text-[16px] disabled:opacity-50"
          >
            {busy === 'next'
              ? t('ariaStudio.pinnedEntry.saving')
              : t('ariaStudio.educationSaved.addAnother')}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={!!busy}
            className="text-[14px] font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {busy === 'done'
              ? t('ariaStudio.pinnedEntry.finishing')
              : t('ariaStudio.educationSaved.done')}
          </button>
        </div>

        <p className="mt-2.5 text-[14px] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.educationSaved.editHint')}
        </p>
      </div>
    </AriaCard>
  );
};

export default EducationSavedCard;
