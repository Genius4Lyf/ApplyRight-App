import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import GenerationModelRow from '../cv/GenerationModelRow';
import AriaCard from './AriaCard';

// Career stage drives the whole shape of a summary — a student leads with potential,
// a career-changer leads with transferable evidence. The backend's stage enum is
// 'grad' | 'experienced' | 'changer'; these are its human labels.
// Keys, not text — resolved via t() at render so the runtime UI language decides.
const STAGES = [
  {
    key: 'grad',
    labelKey: 'ariaStudio.summaryFix.stages.grad.label',
    hintKey: 'ariaStudio.summaryFix.stages.grad.hint',
  },
  {
    key: 'experienced',
    labelKey: 'ariaStudio.summaryFix.stages.experienced.label',
    hintKey: 'ariaStudio.summaryFix.stages.experienced.hint',
  },
  {
    key: 'changer',
    labelKey: 'ariaStudio.summaryFix.stages.changer.label',
    hintKey: 'ariaStudio.summaryFix.stages.changer.hint',
  },
];

// Summary is regenerated whole rather than interviewed for — it's short, and the
// Role Brief on the tailored copy already grounds it in the job. Two steps: pick the
// stage, then read the draft and decide.
const SummaryFixCard = ({
  onGenerate,
  onApply,
  onCancel,
  draft,
  generating,
  applying,
  wasReroll,
  careerStage,
  cost, // resolved credit cost — priced by the caller off the GENERATION model's tier
  genModelId,
  onSelectGenModel,
  chatTier,
}) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState(careerStage || null);
  const effectiveStage = stage || careerStage || null;

  // Second step — a draft came back; read it, use it, or try another angle.
  if (draft) {
    return (
      <AriaCard cardKey="summarydraft">
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {wasReroll
              ? t('ariaStudio.summaryFix.anotherAngle')
              : t('ariaStudio.summaryFix.yourTailoredSummary')}
          </p>
          <p className="mt-2.5 text-[14px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {draft}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onGenerate?.(effectiveStage, true)}
              disabled={generating || applying}
              className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {generating
                ? t('ariaStudio.summaryFix.rewriting')
                : t('ariaStudio.summaryFix.tryAnother', { cost })}
            </button>
            <button
              type="button"
              onClick={() => onApply?.(draft)}
              disabled={generating || applying}
              className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
            >
              {applying ? t('ariaStudio.summaryFix.applying') : t('ariaStudio.summaryFix.useThis')}
            </button>
          </div>
        </div>
      </AriaCard>
    );
  }

  // First step — which stage are you at?
  return (
    <AriaCard cardKey="summarystage">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {careerStage
              ? t('ariaStudio.summaryFix.readyToWrite')
              : t('ariaStudio.summaryFix.whereAreYou')}
          </p>
          <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            −{cost} cr
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <GenerationModelRow
            action="summary"
            value={genModelId}
            onSelect={onSelectGenModel}
            chatTier={chatTier}
            unit="flat"
          />
        </div>

        {!careerStage && (
          <div className="mt-3 flex flex-col gap-2">
            {STAGES.map((s) => {
              const on = effectiveStage === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setStage(s.key)}
                  className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                    on
                      ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50 dark:border-white dark:ring-white dark:bg-white/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white'
                  }`}
                >
                  <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                    {t(s.labelKey)}
                  </span>
                  <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                    {t(s.hintKey)}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={generating}
            className="text-[14px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={() => onGenerate?.(effectiveStage, false)}
            disabled={!effectiveStage || generating}
            className="btn-primary px-5 py-2 text-[16px] disabled:opacity-50"
          >
            {generating ? t('ariaStudio.summaryFix.writing') : t('ariaStudio.summaryFix.writeIt')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default SummaryFixCard;
