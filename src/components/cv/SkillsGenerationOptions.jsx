import React from 'react';
import { useTranslation } from 'react-i18next';
import GenerationModelRow from './GenerationModelRow';
import { tierOf } from '../../lib/models';

// How many skills to look for, and which model looks. Shared by the Studio's build card
// and the CV builder's chat so the two surfaces cannot drift — the same question, asked
// the same way, in both places.
//
// 20 is the ceiling on purpose. Past that a skills section stops reading as a summary of
// what someone can do and starts reading as keyword stuffing, and every weak entry dilutes
// the strong ones next to it.
export const SKILL_COUNTS = [10, 15, 20];
export const SKILL_COUNT_DEFAULT = 15;

// Unlike the bullet picker, these carry NO per-option credit chip: skills are priced flat,
// so the count changes what Aria looks for and never what it costs. Showing a price beside
// each number would say the opposite.
const SkillsGenerationOptions = ({ count, onCount, modelId, onModel, chatTier }) => {
  const { t } = useTranslation();

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {t('cvBuilder.skillsOptions.howMany')}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1.5 sm:gap-2">
        {SKILL_COUNTS.map((n) => {
          const active = count === n;
          return (
            <button
              key={n}
              type="button"
              aria-pressed={active}
              onClick={() => onCount?.(n)}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2.5 transition-colors ${
                active
                  ? 'border-slate-900 dark:border-white ring-1 ring-slate-900 dark:ring-white bg-slate-50 dark:bg-slate-800'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">{n}</span>
              {n === SKILL_COUNT_DEFAULT && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap rounded-full border border-emerald-300 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200 font-mono text-[9px] uppercase tracking-wide px-1.5 py-0.5">
                  {t('cvBuilder.askAria.bestFit')}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Said plainly, because the alternative is a user counting the results and
          concluding the feature is broken. It is a ceiling, not a promise. */}
      <p className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
        {t('cvBuilder.skillsOptions.ceilingNote')}
      </p>
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 mt-3">
        <GenerationModelRow
          action="skills"
          value={modelId}
          onSelect={onModel}
          chatTier={chatTier || tierOf(modelId)}
          unit="flat"
        />
      </div>
    </div>
  );
};

export default SkillsGenerationOptions;
