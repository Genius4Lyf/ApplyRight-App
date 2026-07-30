import React from 'react';
import AriaCard from './AriaCard';
import { CAREER_STAGES, CAREER_STAGE_PROMPT } from '../../lib/careerStages';

// Asked ONCE at the top of Job History — the stage only affects experience-coaching, so
// it lives here rather than in the mode chooser or sprinkled through field capture.
const CareerStageAskCard = ({ onPick, onSkip }) => (
  <AriaCard cardKey="careerstage">
    <div className="w-full min-w-0 rounded-2xl rounded-tl-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {CAREER_STAGE_PROMPT}
      </p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-slate-600 dark:text-slate-300">
        One quick thing before we start on your work history — it changes how I coach you toward it.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CAREER_STAGES.map((s) => (
          <button
            key={s.k}
            type="button"
            onClick={() => onPick(s.k)}
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            {s.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="mt-3 text-[11.5px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
      >
        Skip for now
      </button>
    </div>
  </AriaCard>
);

export default CareerStageAskCard;
