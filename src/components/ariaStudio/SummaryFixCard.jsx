import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CREDIT_COSTS } from '../../lib/credits';
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
}) => {
  const { t } = useTranslation();
  const [stage, setStage] = useState(null);
  const cost = CREDIT_COSTS.GENERATE_SUMMARY ?? 3;

  // Second step — a draft came back; read it, use it, or try another angle.
  if (draft) {
    return (
      <AriaCard cardKey="summarydraft">
        <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {wasReroll
              ? t('ariaStudio.summaryFix.anotherAngle')
              : t('ariaStudio.summaryFix.yourTailoredSummary')}
          </p>
          <p className="mt-2.5 text-[13px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
            {draft}
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => onGenerate?.(stage, true)}
              disabled={generating || applying}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {generating
                ? t('ariaStudio.summaryFix.rewriting')
                : t('ariaStudio.summaryFix.tryAnother', { cost })}
            </button>
            <button
              type="button"
              onClick={() => onApply?.(draft)}
              disabled={generating || applying}
              className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
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
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.summaryFix.whereAreYou')}
          </p>
          <span className="shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            −{cost} cr
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {STAGES.map((s) => {
            const on = stage === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setStage(s.key)}
                className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                  on
                    ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                }`}
              >
                <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                  {t(s.labelKey)}
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {t(s.hintKey)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={generating}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={() => onGenerate?.(stage, false)}
            disabled={!stage || generating}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {generating ? t('ariaStudio.summaryFix.writing') : t('ariaStudio.summaryFix.writeIt')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default SummaryFixCard;
