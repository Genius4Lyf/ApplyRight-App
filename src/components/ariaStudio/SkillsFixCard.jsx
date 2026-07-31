import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import AriaCard from './AriaCard';

// Skills need no generation. The scan already identified exactly which of the job's
// keywords the CV doesn't claim — so this is a checklist, not an AI call, and it's FREE:
// the user already paid for that list when they paid for the scan.
//
// The honesty guard matters more than the convenience: ticking a skill you don't have
// is how people get caught in interviews, so the card says so plainly and starts with
// NOTHING pre-checked.
const SkillsFixCard = ({ missingSkills = [], onApply, onCancel, applying }) => {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(() => new Set());

  const names = missingSkills.map((s) => (typeof s === 'string' ? s : s?.name)).filter(Boolean);

  const toggle = (name) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <AriaCard cardKey="skillsfix">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
            {t('ariaStudio.skillsFix.heading')}
          </p>
          <span className="shrink-0 rounded-md bg-emerald-50 dark:bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t('ariaStudio.certifications.noCharge')}
          </span>
        </div>

        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
          {t('ariaStudio.skillsFix.body')}
        </p>

        {names.length === 0 ? (
          <p className="mt-3 text-[12px] text-slate-500 dark:text-slate-400">
            {t('ariaStudio.skillsFix.nothingMissing')}
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {names.map((name) => {
              const on = selected.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(name)}
                  className={`text-[11.5px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    on
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white'
                  }`}
                >
                  {on ? '✓ ' : '+ '}
                  {name}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onCancel?.()}
            disabled={applying}
            className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.back')}
          </button>
          <button
            type="button"
            onClick={() => onApply?.([...selected])}
            disabled={applying || selected.size === 0}
            className="btn-primary px-5 py-2 text-sm disabled:opacity-50"
          >
            {applying
              ? t('ariaStudio.skillsFix.adding')
              : selected.size
                ? t('ariaStudio.skillsFix.addCount', { n: selected.size })
                : t('ariaStudio.skillsFix.add')}
          </button>
        </div>
      </div>
    </AriaCard>
  );
};

export default SkillsFixCard;
