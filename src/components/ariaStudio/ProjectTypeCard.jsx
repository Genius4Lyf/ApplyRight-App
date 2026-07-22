import React from 'react';
import { PROJECT_TYPES } from '../../lib/studioFlow';
import AriaCard from './AriaCard';

// Ask the type FIRST, because it changes what makes a project worth reading: a course
// project is judged on skills demonstrated, a personal one on initiative, a work one on
// impact. Asking after the fact would mean re-framing answers already given.
const ProjectTypeCard = ({ onPick, busy }) => (
  <AriaCard cardKey="projecttype">
    <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        What kind of project is it?
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {PROJECT_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            disabled={busy}
            onClick={() => onPick?.(t)}
            className="text-left rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 px-3 py-2.5 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            <span className="block text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              {t.label}
            </span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">{t.hint}</span>
          </button>
        ))}
      </div>
    </div>
  </AriaCard>
);

export default ProjectTypeCard;
