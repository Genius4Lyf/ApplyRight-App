import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp } from 'lucide-react';
import { BUILD_SECTIONS } from '../../lib/studioFlow';
import { CREDIT_COSTS } from '../../lib/credits';
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
// `onUploadInstead` is optional — the card renders exactly as it always did without it,
// so any surface that only offers building from scratch is unaffected.
const BuildRoadmapCard = ({ status = {}, onStart, starting, onUploadInstead }) => {
  const { t } = useTranslation();
  return (
  <AriaCard cardKey="roadmap">
    <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t('ariaStudio.buildRoadmap.heresThePlan')}
      </p>
      <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
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
                className={`text-[14px] ${
                  done
                    ? 'text-slate-400 dark:text-slate-500 line-through decoration-1'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                <span aria-hidden="true">{s.icon}</span> <span>{t(s.labelKey)}</span>
              </span>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={onStart}
        disabled={starting}
        className="btn-primary w-full mt-4 py-2 text-[16px] disabled:opacity-50"
      >
        {starting ? t('ariaStudio.buildRoadmap.settingUp') : t('ariaStudio.buildRoadmap.startBuilding')}
      </button>

      {/* The other way in: bring the CV you already have. Deliberately the QUIETER of the
          two — building with Aria is the Studio's own path, and this is the shortcut for
          people who don't need to start from a blank page. The price is stated on the
          button itself rather than discovered after the file is chosen. */}
      {onUploadInstead && (
        <>
          <div className="mt-4 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              {t('ariaStudio.buildRoadmap.or')}
            </span>
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <button
            type="button"
            onClick={onUploadInstead}
            disabled={starting}
            className="mt-3 w-full flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-slate-100 bg-white dark:bg-slate-900 p-3 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-slate-100 disabled:opacity-50"
          >
            <span className="shrink-0 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center">
              <FileUp className="w-4 h-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                {t('ariaStudio.buildRoadmap.uploadTitle')}
              </span>
              <span className="block mt-0.5 text-[13px] leading-snug text-slate-500 dark:text-slate-400">
                {t('ariaStudio.buildRoadmap.uploadBody')}
              </span>
            </span>
            <span className="shrink-0 inline-flex items-center rounded border border-slate-200 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              {t('ariaStudio.buildRoadmap.uploadCost', { n: CREDIT_COSTS.CREATE_FROM_UPLOAD })}
            </span>
          </button>
        </>
      )}
    </div>
  </AriaCard>
  );
};

export default BuildRoadmapCard;
