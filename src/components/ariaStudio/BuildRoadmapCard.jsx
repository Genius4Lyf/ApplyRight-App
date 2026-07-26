import React from 'react';
import { useTranslation } from 'react-i18next';
import { BUILD_SECTIONS } from '../../lib/studioFlow';
import AriaCard from './AriaCard';

// What building a CV with Aria actually involves, shown up front.
//
// The order mirrors the CV builder's steps rather than inventing a Studio-specific one:
// someone who has used the builder should recognise the shape, and contact-first →
// summary-last is the right order regardless (the summary is easiest to write once
// everything it summarises exists).
//
// Section states come from the live document via getCompletionStatus, so a session
// resumed halfway shows what's genuinely done — there is no separate "steps completed"
// flag that could disagree with the CV itself.
const BuildRoadmapCard = ({ status = {}, onStart, starting }) => {
  const { t } = useTranslation();
  return (
  <AriaCard cardKey="roadmap">
    <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t('ariaStudio.buildRoadmap.heresThePlan')}
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
        {t('ariaStudio.buildRoadmap.sixSections')}
      </p>

      <ol className="mt-3 space-y-1.5">
        {BUILD_SECTIONS.map((s, i) => {
          const done = !!status[s.key];
          return (
            <li key={s.key} className="flex items-center gap-2.5">
              <span
                className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  done
                    ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <span
                className={`text-[13px] ${
                  done
                    ? 'text-slate-400 dark:text-slate-500 line-through decoration-1'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {t(s.labelKey)}
              </span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="btn-primary w-full mt-4 py-2 text-sm disabled:opacity-50"
      >
        {starting ? t('ariaStudio.buildRoadmap.settingUp') : t('ariaStudio.buildRoadmap.startBuilding')}
      </button>
    </div>
  </AriaCard>
  );
};

export default BuildRoadmapCard;
