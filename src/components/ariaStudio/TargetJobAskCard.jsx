import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import CardEyebrow from './CardEyebrow';
import { SectionIntroArt, SectionIntroBrief } from './SectionIntroCard';
import { introFor } from '../../lib/sectionIntro';

// Ask ONCE whether there's a specific job in mind, because the answer changes every
// question that follows: with a JD, the Role Brief grounds what Aria probes for; without
// one, she builds a strong all-rounder.
//
// Saying no is a first-class answer, not a skip — plenty of people write a CV before
// they have a role picked out, and framing that as opting out would imply they're doing
// it wrong. The Yes branch reuses JobCaptureCard (the caller swaps this card for it);
// there is deliberately no second JD form in the codebase.
//
// This card carries the illustrated brief too. The target job never passes through the
// section hub — it is asked for here, before the build proper starts — but it is the same
// "about to walk into a section you may not understand" moment, and pasting a whole job
// advert is exactly the step people get wrong by summarising it instead.
const TargetJobAskCard = ({ onYes, onNo }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="jobask">
      <div className="w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <SectionIntroArt art={introFor('target_job')?.art} />

        <div className="p-5">
          <CardEyebrow>{t('ariaStudio.targetJobAsk.oneThingFirst')}</CardEyebrow>
          <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
            {t('ariaStudio.targetJobAsk.areYouAiming')}
          </p>

          <SectionIntroBrief section="target_job" />

          {/* Stacked and full-width on a phone, inline from `sm` up. Saying no is a
              first-class answer here, so it gets the same width as saying yes. */}
          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
            <button
              type="button"
              onClick={onYes}
              className="btn-primary w-full sm:w-auto px-4 py-2.5 sm:py-2 text-[16px]"
            >
              {t('ariaStudio.targetJobAsk.yesIHaveOne')}
            </button>
            <button
              type="button"
              onClick={onNo}
              className="w-full sm:w-auto text-[14px] font-semibold px-3 py-2.5 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {t('ariaStudio.targetJobAsk.notYet')}
            </button>
          </div>

          <p className="mt-2.5 text-center sm:text-left text-[14px] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.targetJobAsk.addLater')}
          </p>
        </div>
      </div>
    </AriaCard>
  );
};

export default TargetJobAskCard;
