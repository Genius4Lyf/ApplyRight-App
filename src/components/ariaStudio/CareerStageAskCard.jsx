import React from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';
import CardEyebrow from './CardEyebrow';
import { SectionIntroArt, SectionIntroBrief } from './SectionIntroCard';
import { CAREER_STAGES } from '../../lib/careerStages';
import { introFor } from '../../lib/sectionIntro';

// Asked once at the beginning of a new Studio CV, then persisted on the draft as
// CV-wide coaching context before the target-job and work-history flows begin.
//
// It carries a brief for the same reason the sections do, only more so: this answer is the
// single most consequential tap in the build and the least legible one. It re-coaches every
// section after it — what counts as evidence, whether Aria pushes for a number, how high a
// bullet may claim to have reached — and until now the card said only "this helps ARIA
// coach you in the right way", which is true and tells you nothing. The brief spells out
// what each choice actually changes, so picking is an informed decision rather than a
// guess at a label.
//
// It also states the one thing that cannot be recovered by skipping: inference reads career
// stage off the shape of the CV and can only ever return student or experienced. "Changing
// careers" is unreachable that way — it exists only if the user says so here.
const CareerStageAskCard = ({ onPick, onSkip }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="careerstage">
      <div className="w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <SectionIntroArt art={introFor('career_stage')?.art} />

        <div className="p-5">
          <CardEyebrow>{t('ariaStudio.chat.careerStage.heading')}</CardEyebrow>
          <p className="mt-2 text-[16px] leading-relaxed text-slate-600 dark:text-slate-300">
            {t('ariaStudio.chat.careerStage.body')}
          </p>

          <SectionIntroBrief section="career_stage" />

          {/* Stacked and full-width on a phone, inline from `sm` up — three labels of very
              different lengths wrap into a ragged two-and-one on a narrow screen. */}
          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap gap-2">
            {CAREER_STAGES.map((s) => (
              <button
                key={s.k}
                type="button"
                onClick={() => onPick(s.k)}
                className="w-full sm:w-auto text-[16px] font-semibold px-4 py-2.5 sm:py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                {t(s.labelKey)}
              </button>
            ))}
          </div>
          {/* Centred under the stack on a phone, where the choices are full-width and a
              left-aligned link reads as belonging to the last button rather than to all of
              them. Back to the left once the buttons sit inline. */}
          <button
            type="button"
            onClick={onSkip}
            className="mt-3 w-full sm:w-auto text-center sm:text-left text-[14px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            {t('ariaStudio.chat.careerStage.skip')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default CareerStageAskCard;
