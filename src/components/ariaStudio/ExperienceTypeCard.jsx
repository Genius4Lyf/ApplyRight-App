import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

const TYPES = ['job', 'internship', 'partTime', 'volunteer', 'coursework'];

const ExperienceTypeCard = ({ onPick, busy }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="experiencetype">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.chat.experienceType.heading')}
        </p>
        <p className="mt-2 text-[16px] text-slate-600 dark:text-slate-300">
          {t('ariaStudio.chat.experienceType.body')}
        </p>
        {/* Stacked and full-width on a phone, inline from `sm` up. Wrapped chips put two
            or three choices on a line at phone width, which turns a list of options into a
            shape you have to read around — and leaves the last one stranded on its own row
            looking like a different kind of control. */}
        <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-2">
          {TYPES.map((type) => (
            <button
              key={type}
              type="button"
              disabled={busy}
              onClick={() => onPick(type)}
              className="w-full sm:w-auto rounded-lg border border-slate-900 px-3.5 py-2.5 sm:py-2 text-[16px] font-semibold text-slate-900 hover:bg-slate-900 hover:text-white dark:border-white dark:text-white dark:hover:bg-white dark:hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              {t(`ariaStudio.chat.experienceType.${type}`)}
            </button>
          ))}
        </div>
      </div>
    </AriaCard>
  );
};

export default ExperienceTypeCard;
