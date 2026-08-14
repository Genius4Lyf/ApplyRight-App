import React from 'react';
import { useTranslation } from 'react-i18next';
import { PROJECT_TYPES } from '../../lib/studioFlow';
import AriaCard from './AriaCard';

// Ask the type FIRST, because it changes what makes a project worth reading: a course
// project is judged on skills demonstrated, a personal one on initiative, a work one on
// impact. Asking after the fact would mean re-framing answers already given.
const ProjectTypeCard = ({ onPick, busy }) => {
  const { t } = useTranslation();
  return (
    <AriaCard cardKey="projecttype">
      <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md dark:shadow-black/20 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
          {t('ariaStudio.projectType.whatKind')}
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {PROJECT_TYPES.map((pt) => (
            <button
              key={pt.key}
              type="button"
              disabled={busy}
              onClick={() => onPick?.(pt)}
              className="text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-slate-900 dark:hover:border-white px-3 py-2.5 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 dark:focus-visible:ring-white"
            >
              <span className="block text-[14px] font-semibold text-slate-800 dark:text-slate-100">
                {t(pt.labelKey)}
              </span>
              <span className="block text-[12px] text-slate-500 dark:text-slate-400">
                {t(pt.hintKey)}
              </span>
            </button>
          ))}
        </div>
      </div>
    </AriaCard>
  );
};

export default ProjectTypeCard;
