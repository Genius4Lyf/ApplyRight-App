import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, FileUp } from 'lucide-react';
import { BUILD_SECTIONS } from '../../lib/studioFlow';
import { CREDIT_COSTS } from '../../lib/credits';
import AriaCard from './AriaCard';
import CardEyebrow from './CardEyebrow';
import SectionIcon from './SectionIcon';

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
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <CardEyebrow>{t('ariaStudio.buildRoadmap.heresThePlan')}</CardEyebrow>
        <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t('ariaStudio.buildRoadmap.sixSections')}
        </p>

        {/* THE PLAN — two per row, the same at every width.

          It used to render twice: a numbered column on real screens and a flowing
          "Contact · Work history · Projects ·…" line on phones, because six full-height
          rows pushed the card's two actual choices below a phone fold. The flowing version
          solved the height and created a worse problem — the sections wrapped three, then
          two, then one, so a fixed list of six looked like a ragged paragraph rather than
          a plan.

          A two-column grid is three even rows, which is short enough for the phone case
          the split was invented for, so the split is gone and there is one rendering to
          keep honest instead of two.

          The leading badge carries the section's icon, or a tick once it is done — one
          marker, not a number AND an icon competing beside the same four words. */}
        <ol className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
          {BUILD_SECTIONS.map((s) => {
            const done = !!status[s.key];
            return (
              <li key={s.key} className="flex items-center gap-2 min-w-0">
                {/* Bare glyph, no chip behind it. A filled circle gave six list markers the
                    visual weight of six buttons, on a card whose only real control is the
                    one below them — colour alone carries done-vs-pending. */}
                <span
                  className={`shrink-0 ${
                    done
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <SectionIcon section={s.key} className="w-4 h-4" />
                  )}
                </span>
                <span
                  className={`min-w-0 text-[13px] leading-snug ${
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
          className="btn-primary w-full mt-4 py-2 text-[16px] disabled:opacity-50"
        >
          {starting
            ? t('ariaStudio.buildRoadmap.settingUp')
            : t('ariaStudio.buildRoadmap.startBuilding')}
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
