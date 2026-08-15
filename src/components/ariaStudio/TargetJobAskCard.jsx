import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// Ask ONCE whether there's a specific job in mind, because the answer changes every
// question that follows: with a JD, the Role Brief grounds what Aria probes for; without
// one, she builds a strong all-rounder.
//
// Saying no is a first-class answer, not a skip — plenty of people write a CV before
// they have a role picked out, and framing that as opting out would imply they're doing
// it wrong. The Yes branch reuses JobCaptureCard (the caller swaps this card for it);
// there is deliberately no second JD form in the codebase.
const TargetJobAskCard = ({ onYes, onNo }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="jobask">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.targetJobAsk.oneThingFirst')}
        </p>
        <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t('ariaStudio.targetJobAsk.areYouAiming')}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button type="button" onClick={onYes} className="btn-primary px-4 py-2 text-[16px]">
            {t('ariaStudio.targetJobAsk.yesIHaveOne')}
          </button>
          <button
            type="button"
            onClick={onNo}
            className="text-[14px] font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t('ariaStudio.targetJobAsk.notYet')}
          </button>
        </div>

        <p className="mt-2.5 text-[14px] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.targetJobAsk.addLater')}
        </p>
      </div>
    </AriaCard>
  );
};

export default TargetJobAskCard;
