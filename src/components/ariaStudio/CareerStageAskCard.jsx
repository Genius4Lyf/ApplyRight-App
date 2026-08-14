import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import { CAREER_STAGES } from '../../lib/careerStages';

// Asked once at the beginning of a new Studio CV, then persisted on the draft as
// CV-wide coaching context before the target-job and work-history flows begin.
const CareerStageAskCard = ({ onPick, onSkip }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="careerstage">
    <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
      <p className="font-mono text-[17px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t('ariaStudio.chat.careerStage.heading')}
      </p>
      <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
        {t('ariaStudio.chat.careerStage.body')}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CAREER_STAGES.map((s) => (
          <button
            key={s.k}
            type="button"
            onClick={() => onPick(s.k)}
            className="text-[16px] font-semibold px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 text-[14px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        {t('ariaStudio.chat.careerStage.skip')}
      </button>
    </div>
    </AriaCard>
  );
};

export default CareerStageAskCard;
